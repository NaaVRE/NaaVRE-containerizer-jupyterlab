// Mock for NaaVREExternalService
// TODO: this should be removed once NaaVRE-containerizer-service and NaaVRE-catalogue-service are implemented

import { INaaVREExternalServiceResponse } from './handler';

const baseImageTagsResponse = {
  python: {
    build: 'ghcr.io/qcdis/naavre/naavre-cell-build-python:v0.18',
    runtime: 'ghcr.io/qcdis/naavre/naavre-cell-runtime-python:v0.18'
  },
  r: {
    build: 'ghcr.io/qcdis/naavre/naavre-cell-build-r:v0.18',
    runtime: 'ghcr.io/qcdis/naavre/naavre-cell-runtime-r:v0.18'
  }
};

const extractResponse = {
  all_inputs: ['a', 'b', 'c', 'd', 'e'],
  chart_obj: {
    hovered: {},
    links: {},
    nodes: {
      '22777e1': {
        id: '22777e1',
        ports: {
          a: {
            id: 'a',
            properties: {
              color: '#77862d'
            },
            type: 'left'
          },
          b: {
            id: 'b',
            properties: {
              color: '#5366ac'
            },
            type: 'left'
          },
          c: {
            id: 'c',
            properties: {
              color: '#2dc5d2'
            },
            type: 'left'
          },
          d: {
            id: 'd',
            properties: {
              color: '#53ac8b'
            },
            type: 'left'
          },
          e: {
            id: 'e',
            properties: {
              color: '#87c5a6'
            },
            type: 'left'
          },
          f: {
            id: 'f',
            properties: {
              color: '#40bf44'
            },
            type: 'right'
          }
        },
        position: {
          x: 35,
          y: 15
        },
        properties: {
          inputs: ['d', 'c', 'a', 'e', 'b'],
          og_node_id: '22777e1',
          outputs: ['f'],
          params: ['param_test'],
          secrets: ['secret_test'],
          title: 'Cell-title-test-user',
          vars: [
            {
              color: '#53ac8b',
              direction: 'input',
              name: 'd',
              type: 'datatype'
            },
            {
              color: '#2dc5d2',
              direction: 'input',
              name: 'c',
              type: 'datatype'
            },
            {
              color: '#77862d',
              direction: 'input',
              name: 'a',
              type: 'datatype'
            },
            {
              color: '#87c5a6',
              direction: 'input',
              name: 'e',
              type: 'datatype'
            },
            {
              color: '#5366ac',
              direction: 'input',
              name: 'b',
              type: 'datatype'
            },
            {
              color: '#40bf44',
              direction: 'output',
              name: 'f',
              type: 'datatype'
            }
          ]
        },
        type: 'input-output'
      }
    },
    offset: {
      x: 0,
      y: 0
    },
    scale: 1,
    selected: {}
  },
  confs: {},
  container_source: '',
  dependencies: [
    {
      asname: 'm',
      module: '',
      name: 'math'
    },
    {
      asname: null,
      module: 'math',
      name: 'nan'
    }
  ],
  inputs: ['a', 'b', 'c', 'd', 'e'],
  kernel: 'ipython',
  node_id: '22777e1',
  notebook_dict: {
    cells: [
      {
        cell_type: 'code',
        execution_count: 4,
        id: '6654893e-0685-4b13-a759-3f6a4b7e0c66',
        metadata: {},
        outputs: [
          {
            name: 'stdout',
            output_type: 'stream',
            text: 'param secret 1 1.1 d [1, 2, 3] None\n'
          }
        ],
        source:
          'import math as m\nfrom math import nan\nprint(param_test, secret_test, a, b, c, d, e)\nf = [m.pi, nan]'
      }
    ],
    metadata: {
      kernelspec: {
        display_name: 'python3',
        language: 'python3',
        name: 'python3'
      },
      language_info: {
        codemirror_mode: {
          name: 'ipython',
          version: 3
        },
        file_extension: '.py',
        mimetype: 'text/x-python',
        name: 'python',
        nbconvert_exporter: 'python',
        pygments_lexer: 'ipython3',
        version: '3.9.7'
      }
    },
    nbformat: 4,
    nbformat_minor: 5
  },
  original_source:
    'import math as m\nfrom math import nan\nprint(param_test, secret_test, a, b, c, d, e)\nf = [m.pi, nan]',
  outputs: ['f'],
  param_values: {
    param_test: 'param'
  },
  params: ['param_test'],
  secrets: ['secret_test'],
  task_name: 'cell-title-test-user',
  title: 'Cell-title-test-user',
  types: {
    a: 'int',
    b: 'float',
    c: 'str',
    d: 'list',
    e: null,
    f: 'list',
    param_test: 'str',
    secret_test: 'str'
  }
};

const containerizeResponse = {
  wf_id: '7f798cdb-45fc-4db3-8293-5825147bdf56',
  dispatched_github_workflow: true,
  image_version: '07b50c4'
};

export async function NaaVREExternalService(
  method: string,
  url: string,
  headers = {},
  data = {}
): Promise<INaaVREExternalServiceResponse | string | object> {
  let resp: INaaVREExternalServiceResponse | string | object;

  if (url.endsWith('/NaaVRE-containerizer-service/base-image-tags')) {
    resp = baseImageTagsResponse;
  } else if (url.endsWith('/NaaVRE-containerizer-service/extract')) {
    resp = extractResponse;
  } else if (url.endsWith('/NaaVRE-containerizer-service/containerize')) {
    resp = containerizeResponse;
  } else {
    resp = {
      status_code: 404,
      reason: 'Cannot mock this request',
      header: {},
      content: ''
    };
  }

  console.log('Mocking NaaVREExternalService', {
    query: {
      method: method,
      url: url,
      headers: headers,
      data: data
    },
    response: resp
  });
  await new Promise(r => setTimeout(r, 2000));
  return resp;
}
