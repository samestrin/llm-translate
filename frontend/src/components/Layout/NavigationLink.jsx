import React from 'react';
import { Link } from 'react-router-dom';
import { ButtonBase, alpha, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const NavigationLink = React.memo(({ item, isActive, onClick }) => {
  const theme = useTheme();
  const active = isActive(item.href);
  
  return (
    <ButtonBase
      component={Link}
      to={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 1,
        fontSize: theme.typography.body2.fontSize,
        fontWeight: 500,
        transition: 'all 0.2s',
        ...(active
          ? {
              bgcolor: alpha('#fff', 0.2),
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }
          : {
              '&:hover': {
                bgcolor: alpha('#fff', 0.1),
                transform: 'scale(1.05)',
              },
            }),
      }}
    >
      <item.icon size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
      <Typography
        component="span"
        sx={{
          transition: 'transform 0.2s',
          '.MuiButtonBase-root:hover &': {
            transform: 'translateX(2px)',
          },
        }}
      >
        {item.name}
      </Typography>
    </ButtonBase>
  );
});

// Add display name for better debugging
NavigationLink.displayName = 'NavigationLink';

export default NavigationLink;