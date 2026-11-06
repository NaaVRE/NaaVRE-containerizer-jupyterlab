import { NaaVRECatalogue } from '../../naavre-common/types';
import { IVREPanelSettings } from '../../VREPanel';
import {
  callContainerizeAPI,
  ContainerizeResponse
} from '../../services/containerizer';
import { Notification } from '@jupyterlab/apputils';
import {
  addCellToCatalogueAndLinkPreviousVersion,
  ICatalogCell
} from '../../services/catalogue';
import IBaseImage = NaaVRECatalogue.WorkflowCells.IBaseImage;

/**
 * Return a copy of the base image in one of the formats accepted by the
 * containerizer `/containerize` endpoint and the catalogue `/workflow-cells/`
 * endpoint:
 *  - `{build: string, runtime: string}` (two-stage flavor image), or
 *  - `{binder_environment: string}` (binder environment image).
 *
 * Throws if the base image matches neither format.
 */
export function normalizeBaseImage(image: unknown): IBaseImage {
  if (image !== null && typeof image === 'object') {
    const obj = image as Record<string, unknown>;
    const isNonEmptyString = (v: unknown) => typeof v === 'string' && v !== '';
    const hasFlavorKeys = !!obj.build || !!obj.runtime;
    const hasBinderKeys = !!obj.binder_environment;
    const isFlavor =
      isNonEmptyString(obj.build) && isNonEmptyString(obj.runtime);
    const isBinder = isNonEmptyString(obj.binder_environment);
    if (isFlavor && !hasBinderKeys) {
      return { build: obj.build as string, runtime: obj.runtime as string };
    }
    if (isBinder && !hasFlavorKeys) {
      return { binder_environment: obj.binder_environment as string };
    }
  }
  throw `Invalid base image: ${JSON.stringify(image)}`;
}

async function triggerCellContainerization(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  forceContainerize: boolean,
  notificationId: string
): Promise<ContainerizeResponse | null> {
  let containerizeResponse: ContainerizeResponse;
  try {
    containerizeResponse = await callContainerizeAPI(
      cell,
      forceContainerize,
      settings
    );
    console.debug('containerizeResponse', containerizeResponse);
  } catch {
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed to containerize ${cell.title}: cannot submit cell`,
      autoClose: 5000
    });
    return null;
  }
  if (!containerizeResponse.dispatched_github_workflow) {
    Notification.update({
      id: notificationId,
      type: 'warning',
      message: `Cell ${cell.title} is already containerized`,
      autoClose: 5000
    });
    return null;
  }

  return containerizeResponse;
}

async function createCellInCatalogue(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  notificationId: string
): Promise<ICatalogCell | null> {
  Notification.update({
    id: notificationId,
    message: `Containerizing ${cell.title}: saving to the catalogue`,
    actions: []
  });
  try {
    return await addCellToCatalogueAndLinkPreviousVersion(cell, settings);
  } catch {
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed to containerize ${cell.title}: could not save to the catalogue`,
      autoClose: 5000
    });
    return null;
  }
}

export async function startBuild(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  forceContainerize: boolean
): Promise<{ createdCell: ICatalogCell; notificationId: string } | undefined> {
  const notificationId = Notification.emit(
    `Containerizing ${cell.title}: submitting cell`,
    'in-progress',
    { autoClose: false }
  );

  try {
    cell = {
      ...cell,
      base_container_image: normalizeBaseImage(cell.base_container_image)
    };
  } catch (e) {
    console.error(e);
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed to containerize ${cell.title}: invalid base image`,
      autoClose: 5000
    });
    return;
  }

  const containerizeResponse = await triggerCellContainerization(
    cell,
    settings,
    forceContainerize,
    notificationId
  );
  if (containerizeResponse === null) {
    return;
  }

  const createdCell = await createCellInCatalogue(
    {
      ...cell,
      container_image: containerizeResponse?.container_image || '',
      source_url: containerizeResponse?.source_url || '',
      containerization_workflow_id: containerizeResponse.workflow_id,
      containerization_job: {
        html_url: '',
        status: 'requested',
        conclusion: null
      }
    },
    settings,
    notificationId
  );

  if (createdCell === null) {
    return;
  }

  return { createdCell, notificationId };
}
