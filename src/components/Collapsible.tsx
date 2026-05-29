import React, { ReactNode, useState } from 'react';
import { Box, ButtonBase, Collapse, SxProps, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface ICollapsible {
  summary: ReactNode;
  children: ReactNode;
  sx?: SxProps;
}

export const Collapsible: React.FC<ICollapsible> = ({
  summary,
  children,
  sx
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={sx}>
      <ButtonBase
        onClick={() => setOpen(v => !v)}
        disableRipple
        sx={{
          gap: 0.5
        }}
      >
        <ChevronRightIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            flexShrink: 0,
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)'
          }}
        />
        <Typography variant="body2">{summary}</Typography>
      </ButtonBase>
      <Collapse in={open} timeout={200}>
        <Box
          sx={{
            mt: 0.5,
            px: 2,
            py: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};
