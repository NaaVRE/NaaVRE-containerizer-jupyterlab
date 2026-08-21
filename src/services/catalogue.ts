import { NaaVRECatalogue } from '../naavre-common/types';
import { IVREPanelSettings } from '../VREPanel';
import { NaaVREExternalService } from '../naavre-common/handler';

declare type CataloguePayloadCreateCell = Omit<
  NaaVRECatalogue.WorkflowCells.ICell,
  'version' | 'versions'
> & {
  previous_version?: string;
};
declare type CatalogueResponseItem = {
  url: string;
} & NaaVRECatalogue.WorkflowCells.ICell;
declare type CatalogueResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CatalogueResponseItem[];
};

async function findCellInCatalogue({
  searchParams,
  settings
}: {
  searchParams: URLSearchParams;
  settings: IVREPanelSettings;
}): Promise<CatalogueResponse> {
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
}): Promise<CatalogueResponseItem | null> {
  cell.virtual_lab = settings.virtualLab || undefined;
  if (settings.virtualLab === null) {
    throw 'Virtual lab is null, check @naavre/containerizer-jupyterlab settings';
  }
  const res = await findCellInCatalogue({
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
}): Promise<CatalogueResponseItem> {
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

export async function addCellToCatalogueAndLinkPreviousVersion(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings
): Promise<'added' | 'updated'> {
  let msg: 'added' | 'updated';
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
    msg = 'updated';
  } else {
    msg = 'added';
  }

  await addCellToCatalogue({
    cell: payloadCell,
    settings: settings
  });
  return msg;
}
