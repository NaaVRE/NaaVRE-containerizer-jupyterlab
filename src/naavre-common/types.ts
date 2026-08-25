export namespace NaaVRECatalogue {
  export namespace BaseAssets {
    export interface IBaseAsset {
      id?: string;
      title: string;
      description?: string;
      created?: string;
      modified?: string;
      owner?: string;
      virtual_lab?: string | null;
    }
  }

  export interface IAssetVersionsRef {
    version: number;
    url: string;
  }

  export namespace WorkflowCells {
    export interface IBaseImage {
      build: string;
      runtime: string;
    }

    export interface IContainerizationJob {
      html_url: string;
      status:
        | 'queued'
        | 'in_progress'
        | 'completed'
        | 'waiting'
        | 'requested'
        | 'pending';
      conclusion:
        | 'success'
        | 'failure'
        | 'neutral'
        | 'cancelled'
        | 'skipped'
        | 'timed_out'
        | 'action_required'
        | null;
    }

    export interface IDependency {
      name: string;
      module?: string;
      asname?: string;
    }

    export interface IBaseVariable {
      name: string;
      type: string | null;
    }

    export interface IInput extends IBaseVariable {}

    export interface IOutput extends IBaseVariable {}

    export interface IConf {
      name: string;
      assignation: string;
    }

    export interface IParam extends IBaseVariable {
      default_value?: string;
    }

    export interface ISecret extends IBaseVariable {}

    export interface ICell extends BaseAssets.IBaseAsset {
      version: number;
      versions: IAssetVersionsRef[];
      container_image: string | null;
      base_container_image?: IBaseImage | null;
      containerization_job?: IContainerizationJob | null;
      containerization_workflow_id?: string | null;
      dependencies: Array<IDependency>;
      inputs: Array<IInput>;
      outputs: Array<IOutput>;
      confs: Array<IConf>;
      params: Array<IParam>;
      secrets: Array<ISecret>;
      kernel?: string;
      source_url?: string;
      is_draft?: boolean;
    }
  }
}
