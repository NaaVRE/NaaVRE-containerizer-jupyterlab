import { NotebookPanel } from '@jupyterlab/notebook';
import { VRECell } from '../naavre-common/types';
import { Cell } from '@jupyterlab/cells';
import { IOutputAreaModel } from '@jupyterlab/outputarea';

export const detectType = async ({
  notebook,
  currentCell
}: {
  notebook: NotebookPanel | null;
  currentCell: VRECell;
}): Promise<{
  updatedCell: VRECell;
  updatedTypeSelections: { [key: string]: boolean };
}> => {
  const activeCell = notebook!.content.activeCell;
  if (!activeCell) {
    throw 'No cell selected';
  } else if (activeCell.model.type !== 'code') {
    throw 'Selected cell is not a code cell';
  }

  // Clear output of currently selected cell
  const cell = notebook!.content.activeCell;
  const codeCell = cell as Cell & { model: { outputs: IOutputAreaModel } };
  codeCell.model.outputs.clear();

  // Get kernel
  const kernel = notebook!.sessionContext.session?.kernel;
  if (!kernel) {
    throw 'No kernel found';
  }

  // Get original source code
  // const cellContent = currentCell.model.value.text; // FIXME
  const cellContent = 'xyz';

  // Retrieve inputs, outputs, and params from extractedCell
  const extractedCell = currentCell;
  const types = extractedCell['types'];
  const inputs = extractedCell['inputs'];
  const outputs = extractedCell['outputs'];
  const params = extractedCell['params'];

  // Function to send code to kernel and handle response
  const sendCodeToKernel = async (
    code: string,
    vars: string[]
  ): Promise<{ [key: string]: string }> => {
    const future = kernel.requestExecute({ code });
    const detectedTypes: { [key: string]: string } = {};

    return new Promise((resolve, reject) => {
      future.onIOPub = msg => {
        if (msg.header.msg_type === 'execute_result') {
          console.log('Execution Result:', msg.content);
        } else if (msg.header.msg_type === 'display_data') {
          console.log('Display Data:', msg.content);

          let typeString = (
            'data' in msg.content
              ? msg.content.data['text/html']
              : 'No data found'
          ) as string;
          typeString = typeString.replace(/['"]/g, '');
          const varName = vars[0];

          let detectedType = null;
          if (typeString === 'integer') {
            detectedType = 'int';
          } else if (typeString === 'character') {
            detectedType = 'str';
          } else if (typeString === 'double') {
            detectedType = 'float';
          } else if (typeString === 'list') {
            detectedType = 'list';
          } else {
            detectedType = types[varName];
          }

          if (detectedType !== null) {
            detectedTypes[varName] = detectedType;
          }

          const output = {
            output_type: 'display_data',
            data: {
              'text/plain':
                vars[0] +
                ': ' +
                ('data' in msg.content
                  ? msg.content.data['text/html']
                  : 'No data found')
            },
            metadata: {}
          };

          codeCell.model.outputs.add(output);
          vars.shift();
        } else if (msg.header.msg_type === 'stream') {
          console.log('Stream:', msg);
        } else if (msg.header.msg_type === 'error') {
          const output = {
            output_type: 'display_data',
            data: {
              'text/plain':
                'evalue' in msg.content ? msg.content.evalue : 'No data found'
            },
            metadata: {}
          };
          codeCell.model.outputs.add(output);
          console.error('Error:', msg.content);
        }
      };

      future.onReply = msg => {
        if ((msg.content.status as string) === 'ok') {
          resolve(detectedTypes);
        } else if ((msg.content.status as string) === 'error') {
          reject(msg.content);
        }
      };
    });
  };

  // Create code with typeof() for inputs and params
  let inputParamSource = '';
  inputs.forEach(input => {
    inputParamSource += `\ntypeof(${input})`;
  });
  params.forEach(param => {
    inputParamSource += `\ntypeof(${param})`;
  });

  // Send code to check types of inputs and params
  const detectedInputParamTypes = await sendCodeToKernel(inputParamSource, [
    ...inputs,
    ...params
  ]);
  console.log('Detected Input and Param Types:', detectedInputParamTypes);

  // Send original source code
  await kernel.requestExecute({ code: cellContent }).done;

  // Create code with typeof() for outputs
  let outputSource = '';
  outputs.forEach(output => {
    outputSource += `\ntypeof(${output})`;
  });

  // Send code to check types of outputs
  const detectedOutputTypes = await sendCodeToKernel(outputSource, [
    ...outputs
  ]);
  console.log('Detected Output Types:', detectedOutputTypes);

  // Update the state with the detected types
  const newTypes = {
    ...currentCell.types,
    ...detectedInputParamTypes,
    ...detectedOutputTypes
  };
  const updatedCell = { ...currentCell, types: newTypes };

  const typeSelections: { [key: string]: boolean } = {};

  updatedCell.inputs.forEach(el => {
    typeSelections[el] = newTypes[el] !== null;
  });

  updatedCell.outputs.forEach(el => {
    typeSelections[el] = newTypes[el] !== null;
  });

  updatedCell.params.forEach(el => {
    typeSelections[el] = newTypes[el] !== null;
  });

  return {
    updatedCell: updatedCell,
    updatedTypeSelections: typeSelections
  };
};
