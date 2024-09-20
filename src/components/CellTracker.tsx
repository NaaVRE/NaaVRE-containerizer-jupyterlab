import * as React from 'react';
import { NaaVREExternalService } from '../naavre-common/mockHandler';
import { CellPreview } from '../naavre-common/CellPreview';
import { VRECell } from '../naavre-common/types';
import { INotebookModel, Notebook, NotebookPanel } from '@jupyterlab/notebook';
import { Dialog, ReactWidget, showDialog } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { theme } from '../Theme';
import TableContainer from '@material-ui/core/TableContainer';
import { Button, TextField, ThemeProvider } from '@material-ui/core';
import { Alert, Autocomplete, Box, LinearProgress } from '@mui/material';
import CircularProgress from '@material-ui/core/CircularProgress';
import { AddCellDialog } from './AddCellDialog';
import { emptyChart } from '../naavre-common/emptyChart';
import { Slot } from '@lumino/signaling';
import { IVREPanelSettings } from '../VREPanel';
import { CellIOTable } from './CellIOTable';
import { CellDependenciesTable } from './CellDependenciesTable';
import { detectType } from '../services/rTypes';

interface IProps {
  notebook: NotebookPanel | null;
  settings: IVREPanelSettings;
}

const DefaultCell: VRECell = {
  title: '',
  task_name: '',
  original_source: '',
  inputs: [],
  outputs: [],
  params: [],
  param_values: {},
  secrets: [],
  confs: {},
  dependencies: [],
  types: {},
  chart_obj: emptyChart,
  node_id: '',
  container_source: '',
  global_conf: {},
  base_image: null,
  image_version: '',
  kernel: '',
  notebook_dict: {}
};

interface IState {
  baseImageSelected: boolean;
  baseImages: any[];
  cellAnalyzed: boolean;
  currentCell: VRECell;
  currentCellIndex: number;
  extractorError: string;
  isDialogOpen: boolean;
  loading: boolean;
  typeSelections: { [type: string]: boolean };
}

const DefaultState: IState = {
  baseImageSelected: false,
  baseImages: [],
  cellAnalyzed: false,
  currentCell: DefaultCell,
  currentCellIndex: -1,
  extractorError: '',
  isDialogOpen: false,
  loading: false,
  typeSelections: {}
};

export class CellTracker extends React.Component<IProps, IState> {
  state = DefaultState;
  cellPreviewRef: React.RefObject<CellPreview>;

  constructor(props: IProps) {
    super(props);
    this.cellPreviewRef = React.createRef();
  }

  loadBaseImages = async () => {
    NaaVREExternalService(
      'GET',
      `${this.props.settings.containerizerServiceUrl}/base-image-tags`
    )
      .then(data => {
        const updatedBaseImages = Object.entries(data).map(([name, image]) => ({
          name,
          image
        }));
        console.log('updatedBaseImages');
        console.log(updatedBaseImages);
        this.setState({ baseImages: updatedBaseImages });
      })
      .catch(reason => {
        console.log(reason);
      });
  };

  resetState = () => {
    const newState = DefaultState;
    newState.baseImages = this.state.baseImages;
    this.setState(newState);
    if (this.cellPreviewRef.current !== null) {
      this.cellPreviewRef.current.updateChart(emptyChart);
    }
  };

  onActiveCellChanged: Slot<Notebook, Cell | null> = async (
    notebook,
    _activeCell
  ) => {
    this.resetState();
    this.setState({ currentCellIndex: notebook.activeCellIndex });
  };

  connectAndInitWhenReady = (notebook: NotebookPanel) => {
    notebook.context.ready.then(() => {
      if (this.props.notebook !== null) {
        this.props.notebook.content.activeCellChanged.connect(
          this.onActiveCellChanged
        );
      }
    });
  };

  componentDidMount = async () => {
    await this.loadBaseImages();
    if (this.props.notebook) {
      this.connectAndInitWhenReady(this.props.notebook);
    }
  };

  componentDidUpdate = async (
    prevProps: Readonly<IProps>,
    _prevState: Readonly<IState>
  ) => {
    const preNotebookId = prevProps.notebook ? prevProps.notebook.id : '';
    const notebookId = this.props.notebook ? this.props.notebook.id : '';

    if (preNotebookId !== notebookId) {
      if (prevProps.notebook) {
        prevProps.notebook.content.activeCellChanged.disconnect(
          this.onActiveCellChanged
        );
      }
      if (this.props.notebook) {
        this.connectAndInitWhenReady(this.props.notebook);
      }
    }
  };

  getKernel = async () => {
    const sessionContext = this.props.notebook!.context.sessionContext;
    const kernelObject = sessionContext?.session?.kernel; // https://jupyterlab.readthedocs.io/en/stable/api/interfaces/services.kernel.ikernelconnection-1.html#serversettings
    return (await kernelObject!.info).implementation;
  };

  getVarType = (var_name: string): string | null => {
    if (
      this.state.currentCell !== null &&
      var_name in this.state.currentCell.types
    ) {
      return this.state.currentCell.types[var_name];
    } else {
      return null;
    }
  };

  extractCell = async (notebookModel: INotebookModel | null, save = false) => {
    if (notebookModel === null) {
      return null;
    }
    const kernel = await this.getKernel();
    this.setState({
      loading: true,
      extractorError: ''
    });

    NaaVREExternalService(
      'POST',
      `${this.props.settings.containerizerServiceUrl}/extract`,
      {},
      {
        save: save,
        kernel,
        cell_index: this.state.currentCellIndex,
        notebook: notebookModel.toJSON()
      }
    )
      .then(data => {
        const extractedCell = data as VRECell;
        this.setState({ currentCell: extractedCell });

        const typeSelections: { [type: string]: boolean } = {};
        extractedCell.inputs.forEach((el: string) => {
          typeSelections[el] = this.getVarType(el) !== null;
        });
        extractedCell.outputs.forEach((el: string) => {
          typeSelections[el] = this.getVarType(el) !== null;
        });
        extractedCell.params.forEach((el: string) => {
          typeSelections[el] = this.getVarType(el) !== null;
        });
        extractedCell.secrets.forEach((el: string) => {
          typeSelections[el] = this.getVarType(el) !== null;
        });

        this.setState({
          cellAnalyzed: true,
          extractorError: '',
          loading: false,
          typeSelections: typeSelections
        });

        if (this.cellPreviewRef.current !== null) {
          this.cellPreviewRef.current.updateChart(extractedCell['chart_obj']);
        }
      })
      .catch(reason => {
        console.log(reason);
        this.setState({
          loading: false,
          extractorError: String(reason)
        });
      });
  };

  onAnalyzeCell = () => {
    this.extractCell(this.props.notebook!.model)
      .then(() => {})
      .catch(reason => {
        console.log('Error extracting cell', reason);
      });
  };

  onDetectType = async () => {
    this.setState({ loading: true });
    detectType({
      notebook: this.props.notebook,
      currentCell: this.state.currentCell
    })
      .then(res => {
        this.setState({
          currentCell: res.updatedCell,
          typeSelections: res.updatedTypeSelections
        });
        console.log(this.state);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  removeInput = (input: string) => {
    const updatedInputs = this.state.currentCell.inputs.filter(
      (i: string) => i !== input
    );
    const updatedCell = {
      ...this.state.currentCell,
      inputs: updatedInputs
    } as VRECell;

    const updatedTypeSelections = this.state.typeSelections;
    delete updatedTypeSelections[input];
    this.setState({
      currentCell: updatedCell,
      typeSelections: updatedTypeSelections
    });
  };

  removeOutput = (output: string) => {
    const updatedOutputs = this.state.currentCell.outputs.filter(
      (o: string) => o !== output
    );
    const updatedCell = {
      ...this.state.currentCell,
      outputs: updatedOutputs
    } as VRECell;

    const updatedTypeSelections = this.state.typeSelections;
    delete updatedTypeSelections[output];
    this.setState({
      currentCell: updatedCell,
      typeSelections: updatedTypeSelections
    });
  };

  removeParam = (param: string) => {
    const updatedParams = this.state.currentCell.params.filter(
      (p: string) => p !== param
    );
    const updatedCell = {
      ...this.state.currentCell,
      params: updatedParams
    } as VRECell;

    const updatedTypeSelections = this.state.typeSelections;
    delete updatedTypeSelections[param];
    this.setState({
      currentCell: updatedCell,
      typeSelections: updatedTypeSelections
    });
  };

  removeSecret = (secret: string) => {
    const updatedSecrets = this.state.currentCell.secrets.filter(
      (p: string) => p !== secret
    );
    const updatedCell = {
      ...this.state.currentCell,
      secrets: updatedSecrets
    } as VRECell;

    const updatedTypeSelections = this.state.typeSelections;
    delete updatedTypeSelections[secret];
    this.setState({
      currentCell: updatedCell,
      typeSelections: updatedTypeSelections
    });
  };

  updateType = async (
    event: React.ChangeEvent<{ name?: string; value: unknown }>,
    port: string
  ) => {
    const currTypeSelections = this.state.typeSelections;
    currTypeSelections[port] = true;
    const currCurrentCell = this.state.currentCell;
    currCurrentCell.types[port] = event.target.value
      ? String(event.target.value)
      : null;
    this.setState({
      typeSelections: currTypeSelections,
      currentCell: currCurrentCell
    });
  };

  updateBaseImage = async (value: any) => {
    const currCurrentCell = this.state.currentCell;
    console.log('updateBaseImage', value);
    currCurrentCell.base_image = value;
    this.setState({
      baseImageSelected: true,
      currentCell: currCurrentCell
    });
  };

  allTypesSelected = () => {
    if (Object.values(this.state.typeSelections).length > 0) {
      return Object.values(this.state.typeSelections).reduce((prev, curr) => {
        return prev && curr;
      });
    }
    return false;
  };

  onContainerize = async () => {
    const AddCellDialogOptions: Partial<Dialog.IOptions<any>> = {
      title: '',
      body: ReactWidget.create(
        <AddCellDialog
          cell={this.state.currentCell}
          closeDialog={() => this.setState({ isDialogOpen: false })}
          settings={this.props.settings}
        />
      ) as Dialog.IBodyWidget<any>,
      buttons: this.state.loading ? [] : [Dialog.okButton({ label: 'Close' })]
    };
    showDialog(AddCellDialogOptions).then(() => {
      this.setState({ loading: false });
    });
  };

  render() {
    return (
      <ThemeProvider theme={theme}>
        <div>
          <CellPreview ref={this.cellPreviewRef} />
          <Button
            variant="contained"
            className={'lw-panel-button'}
            onClick={this.onAnalyzeCell}
            color="primary"
            disabled={!this.state.currentCell || this.state.loading}
          >
            {this.state.loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Analyze cell'
            )}
          </Button>
          {this.state.currentCell.kernel === 'IRKernel' && (
            <Button
              variant="contained"
              className={'lw-panel-button'}
              onClick={this.onDetectType}
              color="primary"
              disabled={
                !this.state.currentCell ||
                this.state.loading ||
                this.allTypesSelected()
              }
            >
              Detect types
            </Button>
          )}
          {this.state.extractorError && (
            <div>
              <Alert severity="error">
                <p>Notebook cannot be analyzed: {this.state.extractorError}</p>
              </Alert>
            </div>
          )}
          {this.state.loading ? (
            <div>
              {this.state.loading ? (
                <div>
                  <p className={'lw-panel-preview'}>
                    <span>Analyzing notebook</span>
                    <br />
                    <span style={{ color: '#aaaaaa' }}>
                      This can take up to a minute
                    </span>
                  </p>
                  <Box className={'lw-panel-table'} sx={{ width: '100%' }}>
                    <LinearProgress />
                  </Box>
                </div>
              ) : (
                <TableContainer></TableContainer>
              )}
            </div>
          ) : (
            <div>
              {this.state.currentCell.inputs.length > 0 && (
                <CellIOTable
                  title={'Inputs'}
                  ioItems={this.state.currentCell.inputs}
                  nodeId={this.state.currentCell.node_id}
                  getType={v => this.getVarType(v)}
                  updateType={this.updateType}
                  removeEntry={this.removeInput}
                ></CellIOTable>
              )}
              {this.state.currentCell.outputs.length > 0 && (
                <CellIOTable
                  title={'Outputs'}
                  ioItems={this.state.currentCell.outputs}
                  nodeId={this.state.currentCell.node_id}
                  getType={v => this.getVarType(v)}
                  updateType={this.updateType}
                  removeEntry={this.removeOutput}
                ></CellIOTable>
              )}
              {this.state.currentCell.params.length > 0 && (
                <CellIOTable
                  title={'Parameters'}
                  ioItems={this.state.currentCell.params}
                  nodeId={this.state.currentCell.node_id}
                  getType={v => this.getVarType(v)}
                  updateType={this.updateType}
                  removeEntry={this.removeParam}
                ></CellIOTable>
              )}
              {this.state.currentCell.secrets.length > 0 && (
                <CellIOTable
                  title={'Secrets'}
                  ioItems={this.state.currentCell.secrets}
                  nodeId={this.state.currentCell.node_id}
                  getType={v => this.getVarType(v)}
                  updateType={this.updateType}
                  removeEntry={this.removeSecret}
                ></CellIOTable>
              )}
              {this.state.currentCell.dependencies.length > 0 && (
                <CellDependenciesTable
                  items={this.state.currentCell.dependencies}
                ></CellDependenciesTable>
              )}
              {this.state.cellAnalyzed && (
                <div>
                  <p className={'lw-panel-preview'}>Base Image</p>
                  <Autocomplete
                    getOptionLabel={option => option.name}
                    options={this.state.baseImages}
                    disablePortal
                    onChange={(_event: any, newValue: any | null) => {
                      this.updateBaseImage(newValue.image);
                    }}
                    id="combo-box-demo"
                    sx={{ width: 330, margin: '20px' }}
                    renderInput={params => <TextField {...params} />}
                  />
                  <Button
                    variant="contained"
                    className={'lw-panel-button'}
                    onClick={this.onContainerize}
                    color="primary"
                    disabled={
                      !this.allTypesSelected() ||
                      !this.state.baseImageSelected ||
                      this.state.loading
                    }
                  >
                    Containerize
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ThemeProvider>
    );
  }
}
