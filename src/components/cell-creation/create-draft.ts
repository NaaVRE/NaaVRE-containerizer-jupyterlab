import { NaaVRECatalogue } from '../../naavre-common/types';
import { IVREPanelSettings } from '../../VREPanel';
import { Notification } from '@jupyterlab/apputils';
import {
  addCellToCatalogueAndLinkPreviousVersion,
  ICatalogCell
} from '../../services/catalogue';

export async function createDraftCellInCatalogue(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  notificationId: string
): Promise<ICatalogCell | null> {
  try {
    return await addCellToCatalogueAndLinkPreviousVersion(cell, settings);
  } catch {
    Notification.update({
      id: notificationId,
      type: 'error',
      message: `Failed create draft ${cell.title}: could not save to the catalogue`,
      autoClose: 5000
    });
    return null;
  }
}

export async function createDraft(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings
) {
  const notificationId = Notification.emit(
    `Creating draft ${cell.title}`,
    'in-progress',
    { autoClose: false }
  );

  cell.container_image = null;
  delete cell.base_container_image;
  delete cell.source_url;
  cell.is_draft = true;

  const success = await createDraftCellInCatalogue(
    cell,
    settings,
    notificationId
  );
  if (!success) {
    return;
  }

  Notification.update({
    id: notificationId,
    type: 'success',
    message: `Created draft ${cell.title}`,
    autoClose: 5000
  });
}
