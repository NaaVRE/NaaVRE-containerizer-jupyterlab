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
