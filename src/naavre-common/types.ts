import { IChart } from '@mrblenny/react-flow-chart';

export declare type VRECell = {
  title: string;
  task_name: string;
  original_source: string;
  inputs: [];
  outputs: [];
  params: [];
  param_values: { [name: string]: string | null };
  secrets: [];
  confs: {};
  dependencies: [];
  types: { [id: string]: string | null };
  chart_obj: IChart;
  node_id: string;
  container_source: string;
  global_conf: {};
};
