import { CircularProgress, styled, ThemeProvider } from '@material-ui/core';
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material';
import { green, red } from '@mui/material/colors';
import * as React from 'react';
import { theme } from '../Theme';
import { NaaVRECatalogue } from '../naavre-common/types';
import { NaaVREExternalService } from '../naavre-common/handler';
import { IVREPanelSettings } from '../VREPanel';

const CatalogBody = styled('div')({
  padding: '20px',
  display: 'flex',
  overflow: 'hidden',
  flexDirection: 'column'
});

interface IAddCellDialog {
  cell: NaaVRECatalogue.WorkflowCells.ICell;
  closeDialog: () => void;
  settings: IVREPanelSettings;
}

declare type CellContainerizationWorkflow = {
  workflow_id: string;
  dispatched_github_workflow: boolean;
  container_image: string;
  workflow_url: string;
  source_url: string;
};

interface IState {
  loading: boolean;
  error: string;
  cellWorkflow?: CellContainerizationWorkflow;
}

const DefaultState: IState = {
  loading: true,
  error: '',
  cellWorkflow: undefined
};

export class AddCellDialog extends React.Component<IAddCellDialog, IState> {
  state = DefaultState;

  async componentDidMount(): Promise<void> {
    await this.createCell();
  }

  createCell = async () => {
    NaaVREExternalService(
      'POST',
      `${this.props.settings.containerizerServiceUrl}/containerize`,
      {},
      {
        virtual_lab: this.props.settings.virtualLab || undefined,
        cell: this.props.cell
      }
    )
      .then(resp => {
        if (resp.status_code !== 200) {
          throw `${resp.status_code} ${resp.reason}`;
        }
        const cellWorkflow: CellContainerizationWorkflow = JSON.parse(
          resp.content
        );
        this.setState({ cellWorkflow: cellWorkflow });
        return cellWorkflow;
      })
      .catch(reason => {
        const msg = `Could not containerize cell: ${reason}`;
        console.log(msg);
        console.log(reason);
        this.setState({ error: msg });
      })
      .then(cellWorkflow => {
        this.props.cell.container_image = cellWorkflow?.container_image || '';
        this.props.cell.source_url = cellWorkflow?.source_url || '';
        this.props.cell.description = this.props.cell.title;
        this.props.cell.virtual_lab =
          this.props.settings.virtualLab || undefined;

        return NaaVREExternalService(
          'POST',
          `${this.props.settings.catalogueServiceUrl}/workflow-cells/`,
          {},
          this.props.cell
        );
      })
      .then(resp => {
        if (resp.status_code !== 201) {
          throw `${resp.status_code} ${resp.reason}`;
        }
      })
      .catch(reason => {
        const msg = `Could not add cell to catalogue: ${reason}`;
        console.log(msg);
        console.log(reason);
        this.setState({ error: msg });
      })
      .then(() => {
        this.setState({ loading: false });
      });
  };

  render(): React.ReactElement {
    return (
      <ThemeProvider theme={theme}>
        <CatalogBody>
          <div
            style={{
              padding: '10px',
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {this.state.loading ? (
              <>
                <CircularProgress />
                <p>Creating or updating cell</p>
              </>
            ) : this.state.error ? (
              <>
                <ErrorOutline fontSize="large" sx={{ color: red[500] }} />
                <p>{this.state.error}</p>
              </>
            ) : (
              <>
                <CheckCircleOutline
                  fontSize="large"
                  sx={{ color: green[500] }}
                />
                <p>The cell has been successfully created!</p>
                {this.state.cellWorkflow?.dispatched_github_workflow && (
                  <p>
                    You can check the containerization progress{' '}
                    <a
                      target={'_blank'}
                      href={this.state.cellWorkflow?.workflow_url}
                    >
                      here
                    </a>
                  </p>
                )}
              </>
            )}
          </div>
        </CatalogBody>
      </ThemeProvider>
    );
  }
}
