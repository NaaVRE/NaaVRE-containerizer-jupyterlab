import { NaaVRECatalogue } from '../naavre-common/types';
import { IVREPanelSettings } from '../VREPanel';
import { createDraft } from './cell-creation/create-draft';
import { startBuild } from './cell-creation/start-build';
import { trackBuild } from './cell-creation/track-build';

export async function createCell(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  settings: IVREPanelSettings,
  forceContainerize: boolean,
  isDraft: boolean
) {
  if (isDraft) {
    await createDraft(cell, settings);
  } else {
    const buildResult = await startBuild(cell, settings, forceContainerize);
    await new Promise(r => setTimeout(r, 3000));
    if (buildResult !== undefined) {
      await trackBuild(
        buildResult.createdCell,
        settings,
        buildResult.notificationId
      );
    }
  }
}
