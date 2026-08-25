import React from 'react';

import { NaaVRECatalogue } from '../naavre-common/types';

import CloseIcon from '@mui/icons-material/Close';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';

interface ICellIOTable {
  title: string;
  ioItems: Array<NaaVRECatalogue.WorkflowCells.IBaseVariable>;
  updateType: (
    event: SelectChangeEvent,
    port: NaaVRECatalogue.WorkflowCells.IBaseVariable
  ) => Promise<void>;
  removeEntry: (
    v: NaaVRECatalogue.WorkflowCells.IBaseVariable
  ) => Promise<void>;
}

export const CellIOTable: React.FC<ICellIOTable> = ({
  title,
  ioItems,
  updateType,
  removeEntry
}) => {
  return (
    <div>
      <p>{title}</p>
      <TableContainer component={Paper}>
        <Table aria-label="simple table" size="small">
          <TableBody>
            {ioItems.map(
              (ioItem: NaaVRECatalogue.WorkflowCells.IBaseVariable) => (
                <TableRow key={ioItem.name}>
                  <TableCell
                    component="th"
                    scope="row"
                    style={{
                      width: '70%',
                      maxWidth: '150px',
                      overflow: 'hidden'
                    }}
                  >
                    <p style={{ fontSize: '1em' }}>{ioItem.name}</p>
                  </TableCell>
                  <TableCell
                    component="th"
                    scope="row"
                    style={{
                      width: '15%'
                    }}
                  >
                    <FormControl fullWidth>
                      <Select
                        labelId="io-types-select-label"
                        id={ioItem.name + '-select'}
                        value={ioItem.type || ''}
                        error={ioItem.type === null}
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
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
