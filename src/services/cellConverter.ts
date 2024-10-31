import { NaaVRECatalogue, VRECell } from '../naavre-common/types';
import { IVREPanelSettings } from '../VREPanel';

export function containerizerToCatalogueCell(
  c: VRECell,
  settings: IVREPanelSettings
): NaaVRECatalogue.WorkflowCells.ICell {
  return {
    title: c.title,
    description: '',
    virtual_lab: settings.virtualLab || undefined,
    base_container_image: c.base_image || undefined,
    dependencies: c.dependencies,
    inputs: c.inputs.map(e => {
      return {
        name: e,
        type: c.types[e] || ''
      };
    }),
    outputs: c.outputs.map(e => {
      return {
        name: e,
        type: c.types[e] || ''
      };
    }),
    confs: Object.entries(c.confs).map(([k, v]) => {
      return {
        name: k,
        assignation: v
      };
    }),
    params: c.params.map(e => {
      return {
        name: e,
        type: c.types[e] || '',
        default_value: c.param_values[e] || undefined
      };
    }),
    secrets: c.secrets.map(e => {
      return {
        name: e,
        type: c.types[e] || ''
      };
    }),
    kernel: c.kernel,
    // FIXME: the following values should come from backend because we don't
    // FIXME: have enough information to infer them here
    container_image: 'FIXME-dummy-container-image:latest', // docker image tag, including version
    source_url: '' // link to the source folder on GitHub
  };
}
