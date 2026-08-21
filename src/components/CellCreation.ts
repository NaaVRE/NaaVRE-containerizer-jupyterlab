import { Notification } from '@jupyterlab/apputils';
import pRetry, { AbortError } from 'p-retry';

import { NaaVRECatalogue } from '../naavre-common/types';
import { IVREPanelSettings } from '../VREPanel';
import { addCellToCatalogueAndLinkPreviousVersion } from '../services/catalogue';
import {
  callContainerizeAPI,
  callStatusAPI,
  ContainerizeResponse,
  StatusResponse
} from '../services/containerizer';

async function createCellContainer(
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

  await new Promise(r => setTimeout(r, 5000));

  Notification.update({
    id: notificationId,
    message: `Containerizing ${cell.title}: starting build job`
  });
  let statusResponse: StatusResponse;
  try {
    statusResponse = await pRetry(
      async () => {
        const res = await callStatusAPI(
          containerizeResponse.workflow_id,
          settings
        );
        console.debug(res);
        if (res === null) {
          throw Error('job not found');
        }
        return res;
      },
      {
        retries: 5,
        factor: 2,
        minTimeout: 3000
      }
    );
    console.debug('statusResponse', statusResponse);
  } catch {
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed to containerize ${cell.title}: could not start build job`,
      autoClose: 5000
    });
    return null;
  }

  Notification.update({
    id: notificationId,
    message: `Containerizing ${cell.title}: building image (this can take up to several minutes)`,
    actions: [
      {
        label: 'See progress on GitHub',
        callback: event => {
          event.preventDefault();
          window.open(statusResponse?.job.html_url);
        }
      }
    ]
  });
  try {
    statusResponse = await pRetry(
      async () => {
        const res = await callStatusAPI(
          containerizeResponse.workflow_id,
          settings
        );
        if (res === null) {
          throw Error('job not found');
        }
        console.debug(res.job);
        if (res.job.status !== 'completed') {
          throw Error('job not complete');
        }
        if (
          res.job.conclusion === null ||
          [
            'action_required',
            'cancelled',
            'failure',
            'stale',
            'timed_out'
          ].includes(res.job.conclusion)
        ) {
          throw new AbortError('job was not successful');
        }
        return res;
      },
      {
        retries: 180,
        factor: 1,
        minTimeout: 20000
      }
    );
    console.debug('statusResponse', statusResponse);
  } catch {
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed to containerize ${cell.title}: could not run build job`,
      actions: [
        {
          label: 'See status on GitHub',
          callback: event => {
            event.preventDefault();
            window.open(statusResponse?.job.html_url);
          }
        }
      ],
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
): Promise<boolean> {
  Notification.update({
    id: notificationId,
    message: `Containerizing ${cell.title}: saving to the catalogue`,
    actions: []
  });
  try {
    const catalogueResponse = await addCellToCatalogueAndLinkPreviousVersion(
      cell,
      settings
    );
    console.debug('catalogueResponse', catalogueResponse);
  } catch {
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed to containerize ${cell.title}: save to the catalogue`,
      autoClose: 5000
    });
    return false;
  }
  return true;
}

export async function createCell(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  forceContainerize: boolean,
  createDraft: boolean
) {
  const notificationId = Notification.emit(
    createDraft
      ? `Creating draft ${cell.title}`
      : `Containerizing ${cell.title}: submitting cell`,
    'in-progress',
    { autoClose: false }
  );
  if (!createDraft) {
    const containerizeResponse = await createCellContainer(
      cell,
      settings,
      forceContainerize,
      notificationId
    );
    if (containerizeResponse === null) {
      return;
    }
    cell.container_image = containerizeResponse?.container_image || '';
    cell.source_url = containerizeResponse?.source_url || '';
  } else {
    cell.container_image = null;
    delete cell.base_container_image;
    delete cell.source_url;
    cell.is_draft = true;
  }

  const success = await createCellInCatalogue(cell, settings, notificationId);
  if (!success) {
    return;
  }

  Notification.update({
    id: notificationId,
    type: 'success',
    message: `${createDraft ? 'Created draft' : 'Containerized'} ${cell.title}`,
    autoClose: 5000
  });
}
