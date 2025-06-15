import { Notification } from '@jupyterlab/apputils';
import pRetry, { AbortError } from 'p-retry';

import { NaaVRECatalogue } from '../naavre-common/types';
import { NaaVREExternalService } from '../naavre-common/handler';
import { IVREPanelSettings } from '../VREPanel';

declare type ContainerizeResponse = {
  workflow_id: string;
  dispatched_github_workflow: boolean;
  container_image: string;
  workflow_url: string;
  source_url: string;
};

declare type StatusResponse = {
  job: {
    html_url: string;
    status:
      | 'queued'
      | 'in_progress'
      | 'completed'
      | 'waiting'
      | 'requested'
      | 'pending';
    conclusion:
      | 'success'
      | 'failure'
      | 'neutral'
      | 'cancelled'
      | 'skipped'
      | 'timed_out'
      | 'action_required'
      | null;
  };
} | null;

declare type CatalogueResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: { url: string }[];
};

async function callContainerizeAPI(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  forceContainerize: boolean,
  settings: IVREPanelSettings
) {
  const resp = await NaaVREExternalService(
    'POST',
    `${settings.containerizerServiceUrl}/containerize`,
    {},
    {
      virtual_lab: settings.virtualLab || undefined,
      cell: cell,
      force_containerize: forceContainerize
    }
  );
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content) as ContainerizeResponse;
}

async function callStatusAPI(workflowId: string, settings: IVREPanelSettings) {
  const resp = await NaaVREExternalService(
    'GET',
    `${settings.containerizerServiceUrl}/status/${settings.virtualLab}/${workflowId}/`,
    {},
    {}
  );
  if (resp.status_code === 200) {
    return JSON.parse(resp.content) as StatusResponse;
  } else if (resp.status_code === 404) {
    return null;
  } else {
    throw `${resp.status_code} ${resp.reason}`;
  }
}

async function findCellInCatalogue({
  cell,
  settings
}: {
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  settings: IVREPanelSettings;
}): Promise<CatalogueResponse> {
  cell.virtual_lab = settings.virtualLab || undefined;

  const resp = await NaaVREExternalService(
    'GET',
    `${settings.catalogueServiceUrl}/workflow-cells/?title=${cell.title}&virtual_lab=${settings.virtualLab}`
  );
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function addCellToCatalogue({
  cell,
  containerizeResponse,
  settings
}: {
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  containerizeResponse: ContainerizeResponse;
  settings: IVREPanelSettings;
}): Promise<CatalogueResponse> {
  cell.container_image = containerizeResponse?.container_image || '';
  cell.source_url = containerizeResponse?.source_url || '';
  cell.description = cell.title;
  cell.virtual_lab = settings.virtualLab || undefined;

  const resp = await NaaVREExternalService(
    'POST',
    `${settings.catalogueServiceUrl}/workflow-cells/`,
    {},
    cell
  );
  if (resp.status_code !== 201) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function updateCellInCatalogue({
  cellUrl,
  cell,
  containerizeResponse,
  settings
}: {
  cellUrl: string;
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  containerizeResponse: ContainerizeResponse;
  settings: IVREPanelSettings;
}): Promise<CatalogueResponse> {
  cell.container_image = containerizeResponse?.container_image || '';
  cell.source_url = containerizeResponse?.source_url || '';
  cell.description = cell.title;
  cell.virtual_lab = settings.virtualLab || undefined;

  const resp = await NaaVREExternalService('PUT', cellUrl, {}, cell);
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function addOrUpdateCellInCatalogue(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  containerizeResponse: ContainerizeResponse,
  settings: IVREPanelSettings
): Promise<'added' | 'updated'> {
  const res = await findCellInCatalogue({ cell, settings });
  if (res.count === 0) {
    await addCellToCatalogue({
      cell,
      containerizeResponse: containerizeResponse,
      settings
    });
    return 'added';
  } else {
    await updateCellInCatalogue({
      cellUrl: res.results[0].url,
      cell,
      containerizeResponse: containerizeResponse,
      settings
    });
    return 'updated';
  }
}

export async function createCell(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  forceContainerize: boolean
) {
  const notificationId = Notification.emit(
    `Containerizing ${cell.title}: submitting cell`,
    'in-progress',
    { autoClose: false }
  );
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
    return;
  }
  if (!containerizeResponse.dispatched_github_workflow) {
    Notification.update({
      id: notificationId,
      type: 'warning',
      message: `Cell ${cell.title} is already containerized`,
      autoClose: 5000
    });
    return;
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
    return;
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
    return;
  }

  Notification.update({
    id: notificationId,
    message: `Containerizing ${cell.title}: saving to the catalogue`,
    actions: []
  });
  try {
    const catalogueResponse = await addOrUpdateCellInCatalogue(
      cell,
      containerizeResponse,
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
    return;
  }

  Notification.update({
    id: notificationId,
    type: 'success',
    message: `Containerized ${cell.title}`,
    autoClose: 5000
  });
}
