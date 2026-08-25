import { NaaVREExternalService } from '@naavre/communicator-jupyterlab';
import { IVREPanelSettings } from '../VREPanel';
import { NaaVRECatalogue } from '../naavre-common/types';

export declare type ContainerizeResponse = {
  workflow_id: string;
  dispatched_github_workflow: boolean;
  container_image: string;
  source_url: string;
};
export declare type StatusResponse = {
  job: NaaVRECatalogue.WorkflowCells.IContainerizationJob;
};

export async function callContainerizeAPI(
  cell: NaaVRECatalogue.WorkflowCells.ICell,
  forceContainerize: boolean,
  settings: IVREPanelSettings
) {
  const resp = await NaaVREExternalService(
    'POST',
    `${settings.containerizerServiceUrl}/containerize`,
    {},
    {
      virtual_lab: settings.virtualLab || undefined,
      cell: cell,
      force_containerize: forceContainerize
    }
  );
  if (resp.status_code !== 200) {
    throw `${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content) as ContainerizeResponse;
}

export async function callStatusAPI(
  workflowId: string,
  settings: IVREPanelSettings
) {
  const resp = await NaaVREExternalService(
    'GET',
    `${settings.containerizerServiceUrl}/status/${settings.virtualLab}/${workflowId}/`,
    {},
    {}
  );
  if (resp.status_code === 200) {
    return JSON.parse(resp.content) as StatusResponse;
  } else if (resp.status_code === 404) {
    return null;
  } else {
    throw `${resp.status_code} ${resp.reason}`;
  }
}
