import { IChart } from '@mrblenny/react-flow-chart';

export const emptyChart: IChart = {
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
