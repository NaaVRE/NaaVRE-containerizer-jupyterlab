import { Notification } from '@jupyterlab/apputils';
import { PromiseDelegate, ReadonlyJSONValue } from '@lumino/coreutils';

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

declare type CatalogueResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: { url: string }[];
};

async function addCellToGitHub({
  cell,
  settings
}: {
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  settings: IVREPanelSettings;
}) {
  const resp = await NaaVREExternalService(
    'POST',
    `${settings.containerizerServiceUrl}/containerize`,
    {},
    {
      virtual_lab: settings.virtualLab || undefined,
      cell: cell
    }
  );
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content) as ContainerizeResponse;
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

async function addOrUpdateCellInCatalogue({
  cell,
  containerizeResponse,
  settings
}: {
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  containerizeResponse: ContainerizeResponse;
  settings: IVREPanelSettings;
}): Promise<'added' | 'updated'> {
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

async function actionNotification<Props, Res extends ReadonlyJSONValue>(
  props: Props,
  action: (props: Props) => Promise<Res>,
  messages: {
    pending: string;
    success: string;
    error: string;
  }
) {
  const delegate = new PromiseDelegate<Res>();
  action(props)
    .then(res => delegate.resolve(res))
    .catch(err => delegate.reject(err));
  const id = Notification.promise<Res>(delegate.promise, {
    pending: {
      message: messages.pending,
      options: { autoClose: false }
    },
    // Message when the task finished successfully
    success: {
      message: result => {
        return messages.success;
      },
      options: { autoClose: 5000 }
    },
    // Message when the task finished with errors
    error: {
      message: reason => {
        if (typeof reason === 'string') {
          return `${messages.error} (${reason as string})`;
        } else {
          return messages.error;
        }
      }
    }
  });
  const res = await delegate.promise;
  return { res: res, id: id };
}

export async function createCell(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings
) {
  const { res, id } = await actionNotification(
    { cell: cell, settings: settings },
    addCellToGitHub,
    {
      pending: `Creating cell ${cell.title}`,
      success: `Created cell ${cell.title}`,
      error: `Failed to create cell ${cell.title}`
    }
  );
  if (!res.dispatched_github_workflow) {
    Notification.update({
      id: id,
      message:
        'The cell already exists, nothing to do. To rebuild the cell, update its title or content'
    });
    return;
  }
  Notification.update({
    id: id,
    actions: [
      {
        label: 'Containerization status',
        callback: event => {
          event.preventDefault();
          window.open(res.workflow_url);
        }
      }
    ]
  });
  await actionNotification(
    { cell: cell, containerizeResponse: res, settings: settings },
    addOrUpdateCellInCatalogue,
    {
      pending: `Adding cell ${cell.title} to the catalogue`,
      success: `Added cell ${cell.title} to the catalogue`,
      error: `Failed to add cell ${cell.title} to the catalogue`
    }
  );
}
