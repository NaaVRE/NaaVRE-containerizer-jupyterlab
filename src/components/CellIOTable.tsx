import React from 'react';

import {
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

interface ICellIOTable {
  title: string;
  ioItems: [];
  nodeId: string;
  getType: (v: string) => string | null;
  updateType: (
    event: React.ChangeEvent<{ name?: string; value: unknown }>,
    port: string
  ) => Promise<void>;
  removeEntry: (v: string) => void;
}

export const CellIOTable: React.FC<ICellIOTable> = ({
  title,
  ioItems,
  nodeId,
  getType,
  updateType,
  removeEntry
}) => {
  return (
    <div>
      <p className={'lw-panel-preview'}>{title}</p>
      <TableContainer component={Paper} className={'lw-panel-table'}>
        <Table aria-label="simple table">
          <TableBody>
            {ioItems.map((ioItem: string) => (
              <TableRow key={nodeId + '-' + ioItem}>
                <TableCell
                  component="th"
                  scope="row"
                  style={{
                    width: '70%',
                    maxWidth: '150px',
                    overflow: 'hidden'
                  }}
                >
                  <p style={{ fontSize: '1em' }}>{ioItem}</p>
                </TableCell>
                <TableCell
                  component="th"
                  scope="row"
                  style={{
                    width: '15%',
                  }}
                >
                  <FormControl fullWidth>
                    <Select
                      labelId="io-types-select-label"
                      id={nodeId + '-' + ioItem + '-select'}
                      label="Type"
                      value={getType(ioItem)}
                      error={getType(ioItem) === null}
                      onChange={event => {
                        updateType(event, ioItem);
                      }}
                    >
                      <MenuItem value={'int'}>Integer</MenuItem>
                      <MenuItem value={'float'}>Float</MenuItem>
                      <MenuItem value={'str'}>String</MenuItem>
                      <MenuItem value={'list'}>List</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell
                  component="th"
                  scope="row"
                  style={{
                    width: '15%',
                    paddingLeft: '0',
                    paddingRight: '0'
                  }}
                >
                  <IconButton
                    aria-label="delete"
                    onClick={() => removeEntry(ioItem)}
                  >
                    <CloseIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
