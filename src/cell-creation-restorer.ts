import { getContainerizingCells } from './services/catalogue';
import { IVREPanelSettings } from './VREPanel';
import { trackBuild } from './components/cell-creation/track-build';

export function restoreCellCreationTrackers(settings: IVREPanelSettings) {
  getContainerizingCells(settings).then(cells => {
    for (const cell of cells) {
      trackBuild(cell, settings, null).then(() => {});
    }
  });
}