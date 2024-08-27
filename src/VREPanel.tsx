import React, { useEffect, useState } from 'react';
import { theme } from './Theme';
import { ThemeProvider } from '@material-ui/core/styles';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { CellTracker } from './components/CellTracker';
import { Slot } from '@lumino/signaling';
import { Divider } from '@material-ui/core';

export interface IVREPanelSettings {}

export const DefaultVREPanelSettings: IVREPanelSettings = {};

export const VREPanelComponent = ({
  tracker,
  settings
}: {
  tracker: INotebookTracker;
  settings: IVREPanelSettings;
}): React.ReactElement => {
  const [notebookPath, setNotebookPath] = useState('');

  useEffect(() => {
    tracker.currentChanged.connect(handleNotebookChanged, this);
    if (tracker.currentWidget instanceof NotebookPanel) {
      setNotebookPath(tracker.currentWidget.context.path);
    }
  }, [tracker]);

  const handleNotebookChanged: Slot<INotebookTracker, NotebookPanel | null> = (
    tracker,
    notebook
  ) => {
    if (notebook) {
      setNotebookPath(notebook.context.path);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className={'lifewatch-widget'}>
        <div className={'lifewatch-widget-content'}>
          <div>
            <p className={'lw-panel-header'}>Component containerizer</p>
            <Divider />
            <div>
              <p className={'lw-panel-curr-nb'}>{notebookPath}</p>
            </div>
            <Divider />
          </div>
          <div style={{ marginTop: 5 }}>
            <CellTracker notebook={tracker.currentWidget} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};