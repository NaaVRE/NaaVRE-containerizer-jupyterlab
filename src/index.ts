import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Initialization data for the NaaVRE-containerizer-jupyterlab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'NaaVRE-containerizer-jupyterlab:plugin',
  description: 'NaaVRE cells containerizer frontend on Jupyter Lab',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension NaaVRE-containerizer-jupyterlab is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('NaaVRE-containerizer-jupyterlab settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for NaaVRE-containerizer-jupyterlab.', reason);
        });
    }
  }
};

export default plugin;
