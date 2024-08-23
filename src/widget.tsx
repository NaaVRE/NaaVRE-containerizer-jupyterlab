import { ReactWidget } from '@jupyterlab/ui-components';

import React from 'react';

import {
  VREPanelComponent,
  IVREPanelSettings,
  DefaultVREPanelSettings
} from './VREPanel';

export class VREPanelWidget extends ReactWidget {
  settings: IVREPanelSettings = DefaultVREPanelSettings;

  constructor() {
    super();
  }

  updateSettings(settings: Partial<IVREPanelSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.update();
  }

  render(): React.ReactElement {
    return <VREPanelComponent settings={this.settings} />;
  }
}
