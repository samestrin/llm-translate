import * as React from "react";
import { 
  Tooltip as MuiTooltip, 
  tooltipClasses,
  Zoom
} from "@mui/material";
import { styled } from '@mui/material/styles';

// Create a styled version of MUI Tooltip
const StyledTooltip = styled(({ className, ...props }) => (
  <MuiTooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.mode === 'dark' ? 'var(--secondary-800)' : 'var(--white)',
    color: theme.palette.mode === 'dark' ? 'var(--secondary-100)' : 'var(--secondary-900)',
    boxShadow: theme.shadows[3],
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '8px 16px',
    border: `1px solid ${theme.palette.mode === 'dark' ? 'var(--secondary-700)' : 'var(--secondary-200)'}`,
    borderRadius: '0.375rem',
    maxWidth: 300,
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.mode === 'dark' ? 'var(--secondary-800)' : 'var(--white)',
    '&::before': {
      border: `1px solid ${theme.palette.mode === 'dark' ? 'var(--secondary-700)' : 'var(--secondary-200)'}`,
      backgroundColor: theme.palette.mode === 'dark' ? 'var(--secondary-800)' : 'var(--white)',
      boxSizing: 'border-box',
    },
  },
}));

// Main Tooltip component that accepts both 'title' and 'content' props for compatibility
const Tooltip = React.memo(({ 
  children, 
  content, 
  title,
  delayDuration = 300, 
  className = '', 
  ...props 
}) => (
  <StyledTooltip
    title={title || content} // Support both title (for compatibility) and content props
    placement={props.placement || "top"}
    arrow={props.arrow !== false} // Default to arrow=true
    enterDelay={props.enterDelay || delayDuration}
    leaveDelay={props.leaveDelay || 100}
    TransitionComponent={props.TransitionComponent || Zoom}
    {...props}
  >
    {children}
  </StyledTooltip>
));

Tooltip.displayName = "Tooltip";

export { Tooltip };
// For direct compatibility with MUI's Tooltip when imported
export default Tooltip;