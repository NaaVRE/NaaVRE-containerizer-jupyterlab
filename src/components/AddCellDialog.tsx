import { CircularProgress, styled, ThemeProvider } from '@material-ui/core';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { green } from '@mui/material/colors';
import * as React from 'react';
import { theme } from '../Theme';
import { VRECell } from '../naavre-common/types';
import { NaaVREExternalService } from '../naavre-common/mockHandler';
import { IVREPanelSettings } from '../VREPanel';

const CatalogBody = styled('div')({
  padding: '20px',
  display: 'flex',
  overflow: 'hidden',
  flexDirection: 'column'
});

interface IAddCellDialog {
  cell: VRECell;
  closeDialog: () => void;
  settings: IVREPanelSettings;
}

interface IState {
  loading: boolean;
}

const DefaultState: IState = {
  loading: true
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
        cell: this.props.cell
      }
    )
      .then(() => {
        this.setState({ loading: false });
      })
      .catch(reason => {
        console.log(reason);
        alert(
          'Error creating  cell : ' +
            String(reason).replace('{"message": "Unknown HTTP Error"}', '')
        );
      });
  };

  render(): React.ReactElement {
    return (
      <ThemeProvider theme={theme}>
        <p className="section-header">Create Cell</p>
        <CatalogBody>
          {!this.state.loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <div className="cell-submit-box">
                <CheckCircleOutlineIcon
                  fontSize="large"
                  sx={{ color: green[500] }}
                />
                <p className="cell-submit-text">
                  The cell has been successfully created!
                </p>
              </div>
            </div>
          ) : (
            <div>
              <CircularProgress />
              <p>Creating or updating cell ..</p>
            </div>
          )}
        </CatalogBody>
      </ThemeProvider>
    );
  }
}
