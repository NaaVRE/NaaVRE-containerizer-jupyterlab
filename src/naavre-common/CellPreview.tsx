import * as React from 'react';
import { cloneDeep, mapValues } from 'lodash';
import * as actions from '@mrblenny/react-flow-chart/src/container/actions';
import { FlowChart, IChart, INodeDefaultProps } from '@mrblenny/react-flow-chart';

import { NodeCustom } from './NodeCustom';
import { NodeInnerCustom } from './NodeInnerCustom';
import { PortCustom } from './PortCustom';

const defaultChart: IChart = {
  offset: {
    x: 0,
    y: 0
  },
  scale: 1,
  nodes: {},
  links: {},
  selected: {},
  hovered: {}
};

export class CellPreview extends React.Component {
  public state = cloneDeep(defaultChart);

  updateChart = (chart: IChart) => {
    this.setState(chart);
  };

  public render() {
    const chart = this.state;
    const stateActions = mapValues(
      actions,
      (func: any) =>
        (...args: any) =>
          this.setState(func(...args))
    ) as typeof actions;

    return (
      <div>
        <div className={'lw-panel-editor'}>
          <FlowChart
            chart={chart}
            callbacks={stateActions}
            Components={{
              Node: (NodeCustom as React.FunctionComponent<INodeDefaultProps>),
              NodeInner: NodeInnerCustom,
              Port: PortCustom
            }}
          />
        </div>
      </div>
    );
  }
}
