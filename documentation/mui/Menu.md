# MUI Component: Menu

##1. Menu Component

###1.1. Overview
The `Menu` component displays a list of choices on temporary surfaces. It's often used in conjunction with the `MenuItem` component.

###1.2. Import Statement
```jsx
import Menu from '@mui/material/Menu';
// or
import { Menu } from '@mui/material';
```

###1.3. Basic Usage
```jsx
import * as React from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export default function BasicMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <Button
        id="basic-button"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        Dashboard
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={handleClose}>Profile</MenuItem>
        <MenuItem onClick={handleClose}>My account</MenuItem>
        <MenuItem onClick={handleClose}>Logout</MenuItem>
      </Menu>
    </div>
  );
}
```

###1.4. Component Variants
The `Menu` component has different variants that can be used based on the requirements. For example, the `variant` prop can be set to `'menu'` or `'selectedMenu'`.

###1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `open` | `bool` | - | Yes | If `true`, the component is shown. |
| `anchorEl` | `HTML element | func` | - | Yes | An HTML element, or a function that returns one. It's used to set the position of the menu. |
| `onClose` | `func` | - | - | Callback fired when the component requests to be closed. |
| `children` | `node` | - | - | Menu contents, normally `MenuItem` components. |
| `variant` | `'menu' | 'selectedMenu'` | `'selectedMenu'` | - | The variant to use. Use `menu` to prevent selected items from impacting the initial focus. |
| `autoFocus` | `bool` | `true` | - | If `true`, will focus the `[role="menu"]` if no focusable child is found. |
| `disableAutoFocusItem` | `bool` | `false` | - | When opening the menu will not focus the active item but the `[role="menu"]` unless `autoFocus` is also set to `false`. |
| `MenuListProps` | `object` | `{}` | - | Props applied to the `MenuList` element. |
| `PopoverClasses` | `object` | - | - | Classes prop applied to the Popover element. |
| `transitionDuration` | `'auto' | number | { appear?: number, enter?: number, exit?: number }` | `'auto'` | - | The length of the transition in ms, or `'auto'`. |
| `TransitionProps` | `object` | `{}` | - | Props applied to the transition element. |

###1.6. Common Patterns/Advanced Usage
- Positioning: `anchorEl` is crucial for positioning.
- Transitions: Can be customized using `TransitionComponent` and `TransitionProps`.
- Selected Menu: The `variant="selectedMenu"` (default) is used when a menu item should be visibly selected.
- Context Menu: Menus can be triggered on right-click (context menu).

###1.7. Accessibility (A11y)
####1.7.1. Screen Reader Considerations
The `Menu` component is built on top of `Popover` and `MenuList` which handle many accessibility aspects.
####1.7.2. Keyboard Navigation
Keyboard navigation is supported (arrow keys, Enter, Escape).
####1.7.3. ARIA Attributes
Ensure `aria-controls`, `aria-haspopup`, and `aria-expanded` are correctly set on the element that triggers the menu. Use `MenuListProps={{ 'aria-labelledby': 'button-id' }}` if the menu is controlled by a button.

###1.8. Styling/Customization
####1.8.1. Style Overrides (theme)
The `sx` prop can be used for system overrides and additional CSS.
####1.8.2. CSS Classes
The `classes` prop can be used to override or extend the styles applied to the component.
####1.8.3. sx Prop Examples
```jsx
<Menu sx={{ backgroundColor: 'background.paper' }}>
  {/* Menu items */}
</Menu>
```

###1.9. Performance Considerations
When using the `Menu` component, be mindful of the performance impact of complex menu items or large menus.

###1.10. Testing Guidelines
Test the `Menu` component by verifying its opening and closing behavior, as well as the functionality of its menu items.

###1.11. Version Specific Notes
No specific version notes are available for this component.

###1.12. Related Components
- `MenuItem`
- `MenuList`
- `Popover`
- `Button`

###1.13. Common Pitfalls
- Failing to set `anchorEl` correctly can lead to positioning issues.
- Not handling `onClose` properly can result in the menu not closing as expected.

##2. Further Research Notes & Links
- [MUI Menu API Documentation](https://mui.com/material-ui/api/menu/)

# MUI Component: MenuItem

##1. MenuItem Component

###1.1. Overview
The `MenuItem` component is typically used as a child of `Menu` or `MenuList`. It represents an individual item within a menu.

###1.2. Import Statement
```jsx
import MenuItem from '@mui/material/MenuItem';
// or
import { MenuItem } from '@mui/material';
```

###1.3. Basic Usage
See the example under the `Menu` component. `MenuItem` is typically used as a child of `Menu` or `MenuList`.

###1.4. Component Variants
`MenuItem` can be customized using various props such as `selected`, `disabled`, and `dense`.

###1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | - | The content of the component. |
| `onClick` | `func` | - | - | Callback fired when the menu item is clicked. |
| `selected` | `bool` | `false` | - | If `true`, the component is selected. |
| `disabled` | `bool` | `false` | - | If `true`, the component is disabled. |
| `dense` | `bool` | `false` | - | If `true`, compact vertical padding is used. |
| `divider` | `bool` | `false` | - | If `true`, a 1px light border is added to the bottom of the menu item. |
| `autoFocus` | `bool` | `false` | - | If `true`, the list item is focused during the first mount. |
| `component` | `elementType` | - | - | The component used for the root node. |
| `disableGutters` | `bool` | `false` | - | If `true`, the left and right padding is removed. |

###1.6. Common Patterns/Advanced Usage
- Using `ListItemIcon` and `ListItemText` inside `MenuItem` for icons and rich text.
- Customizing with `Link` component from `react-router-dom` for navigation.
```jsx
import { Link as RouterLink } from 'react-router-dom';
// ...
<MenuItem component={RouterLink} to="/profile">
  Profile
</MenuItem>
```
- Grouping items with dividers.

###1.7. Accessibility (A11y)
####1.7.1. Screen Reader Considerations
`MenuItem` has a `role` of `menuitem`.
####1.7.2. Keyboard Navigation
Keyboard navigation is handled by the parent `Menu` or `MenuList` component.
####1.7.3. ARIA Attributes
If `disabled` is `true`, `aria-disabled="true"` is set.

###1.8. Styling/Customization
####1.8.1. Style Overrides (theme)
The `sx` prop can be used for styling.
####1.8.2. CSS Classes
The `classes` prop can be used for CSS customization.
####1.8.3. sx Prop Examples
```jsx
<MenuItem sx={{ backgroundColor: 'background.paper' }}>
  Menu Item
</MenuItem>
```

###1.9. Performance Considerations
No specific performance considerations are noted for `MenuItem`.

###1.10. Testing Guidelines
Test `MenuItem` by verifying its functionality within a `Menu` or `MenuList`.

###1.11. Version Specific Notes
No specific version notes are available for this component.

###1.12. Related Components
- `Menu`
- `MenuList`
- `ListItemIcon`
- `ListItemText`
- `ButtonBase`

###1.13. Common Pitfalls
- Not handling `onClick` properly can result in unexpected behavior.

##2. Further Research Notes & Links
- [MUI MenuItem API Documentation](https://mui.com/material-ui/api/menu-item/)