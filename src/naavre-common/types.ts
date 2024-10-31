import { IChart } from '@mrblenny/react-flow-chart';

export declare type VRECell = {
  title: string;
  task_name: string;
  original_source: string;
  inputs: Array<string>;
  outputs: Array<string>;
  params: Array<string>;
  param_values: { [name: string]: string | null };
  secrets: Array<string>;
  confs: { [name: string]: string };
  dependencies: Array<{
    name: string;
    module?: string;
    asname?: string;
  }>;
  types: { [id: string]: string | null };
  chart_obj: IChart;
  node_id: string;
  container_source: string;
  global_conf: object;
  base_image: { build: string; runtime: string } | null;
  image_version: string;
  kernel: string;
  notebook_dict: object;
};

export namespace NaaVRECatalogue {
  export namespace BaseAssets {
    export interface IBaseAsset {
      id?: string;
      title: string;
      description?: string;
      created?: string;
      modified?: string;
      owner?: string;
      virtual_lab?: string;
    }
  }
  export namespace WorkflowCells {
    interface IBaseImage {
      build: string;
      runtime: string;
    }

    interface IDependency {
      name: string;
      module?: string;
      asname?: string;
    }

    interface IBaseVariable {
      name: string;
      type: string;
    }

    interface IInput extends IBaseVariable {}

    interface IOutput extends IBaseVariable {}

    interface IConf {
      name: string;
      assignation: string;
    }

    interface IParam extends IBaseVariable {
      default_value?: string;
    }

    interface ISecret extends IBaseVariable {}

    export interface ICell extends BaseAssets.IBaseAsset {
      container_image: string;
      base_container_image?: IBaseImage;
      dependencies?: Array<IDependency>;
      inputs?: Array<IInput>;
      outputs?: Array<IOutput>;
      confs?: Array<IConf>;
      params?: Array<IParam>;
      secrets?: Array<ISecret>;
      kernel?: string;
      source_url?: string;
    }
  }
}
