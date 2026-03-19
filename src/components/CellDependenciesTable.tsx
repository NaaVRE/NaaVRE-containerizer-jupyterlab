import React from 'react';

import { NaaVRECatalogue } from '../naavre-common/types';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@material-ui/core';

interface ICellDependenciesTable {
  title: string;
  items: Array<NaaVRECatalogue.WorkflowCells.IDependency>;
}

export const CellDependenciesTable: React.FC<ICellDependenciesTable> = ({
  title,
  items
}) => {
  return (
    <div>
      <p>{title}</p>
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableBody>
            {items.map((dep: any) => (
              <TableRow key={`${dep.module}-${dep.name}`}>
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
