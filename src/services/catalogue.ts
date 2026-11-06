import { NaaVREExternalService } from '@naavre/communicator-jupyterlab';
import { NaaVRECatalogue } from '../naavre-common/types';
import { IVREPanelSettings } from '../VREPanel';

declare type CataloguePayloadCreateCell = Omit<
  NaaVRECatalogue.WorkflowCells.ICell,
  'version' | 'versions'
> & {
  previous_version?: string;
};
export declare type ICatalogCell = {
  url: string;
} & NaaVRECatalogue.WorkflowCells.ICell;
export declare type ICatalogBinderEnvironment = {
  url: string;
} & NaaVRECatalogue.BinderEnvironments.IBinderEnvironment;
declare type CatalogueResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

async function findCellsInCatalogue({
  searchParams,
  settings
}: {
  searchParams: URLSearchParams;
  settings: IVREPanelSettings;
}): Promise<CatalogueResponse<ICatalogCell>> {
  const resp = await NaaVREExternalService(
    'GET',
    `${settings.catalogueServiceUrl}/workflow-cells/?${searchParams}`
  );
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function getLatestCellVersionFromCatalogue({
  cell,
  settings
}: {
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  settings: IVREPanelSettings;
}): Promise<ICatalogCell | null> {
  cell.virtual_lab = settings.virtualLab || undefined;
  if (settings.virtualLab === null) {
    throw 'Virtual lab is null, check @naavre/containerizer-jupyterlab settings';
  }
  const res = await findCellsInCatalogue({
    searchParams: new URLSearchParams({
      title: cell.title,
      virtual_lab: settings.virtualLab,
      ordering: '-created'
    }),
    settings
  });
  if (res.count === 0) {
    return null;
  }
  return res.results.reduce((max, item) =>
    item.version > max.version ? item : max
  );
}

async function addCellToCatalogue({
  cell,
  settings
}: {
  cell: CataloguePayloadCreateCell;
  settings: IVREPanelSettings;
}): Promise<ICatalogCell> {
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

export async function patchCellInCatalogue(
  cell: ICatalogCell,
  cellUpdate: Partial<NaaVRECatalogue.WorkflowCells.ICell>
): Promise<ICatalogCell> {
  const resp = await NaaVREExternalService('PATCH', cell.url, {}, cellUpdate);
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

export async function addCellToCatalogueAndLinkPreviousVersion(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings
): Promise<ICatalogCell> {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    version,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    versions,
    ...payloadCell
  }: { version: unknown; versions: unknown } & CataloguePayloadCreateCell =
    cell;
  const previousCell = await getLatestCellVersionFromCatalogue({
    cell: cell,
    settings: settings
  });
  if (previousCell !== null) {
    payloadCell.previous_version = previousCell.url;
  }

  return await addCellToCatalogue({
    cell: payloadCell,
    settings: settings
  });
}

export async function getContainerizingCells(
  settings: IVREPanelSettings
): Promise<ICatalogCell[]> {
  const res = await findCellsInCatalogue({
    searchParams: new URLSearchParams({
      containerization_completed: 'false'
    }),
    settings
  });
  return res.results;
}

export async function getBinderEnvironmentsWithContainerImage(
  settings: IVREPanelSettings
): Promise<ICatalogBinderEnvironment[]> {
  const environments: ICatalogBinderEnvironment[] = [];
  // The catalogue paginates results: follow `next` until it is null
  let url: string | null =
    `${settings.catalogueServiceUrl}/binder-environments/?` +
    new URLSearchParams({ has_container_image: 'true' });
  while (url !== null) {
    const resp = await NaaVREExternalService('GET', url);
    if (resp.status_code !== 200) {
      throw `${resp.status_code} ${resp.reason}`;
    }
    const page: CatalogueResponse<ICatalogBinderEnvironment> = JSON.parse(
      resp.content
    );
    environments.push(...page.results);
    url = page.next;
  }
  return environments;
}
