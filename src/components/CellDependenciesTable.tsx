import React from 'react';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@material-ui/core';

interface ICellDependenciesTable {
  items: [];
}

export const CellDependenciesTable: React.FC<ICellDependenciesTable> = ({
  items,
}) => {
  return (
    <div>
      <p className={'lw-panel-preview'}>Dependencies</p>
      <TableContainer
        component={Paper}
        className={'lw-panel-table'}
      >
        <Table aria-label="simple table">
          <TableBody>
            {items.map((dep: any) => (
              <TableRow>
                <TableCell component="th" scope="row">
                  {dep['module'] !== ''
                    ? dep['module'] + ' • ' + dep['name']
                    : dep['name']}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
