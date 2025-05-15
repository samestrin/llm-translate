# MUI Component: ListItemText

##1. Select Component

###1.1. Overview
The `ListItemText` component is used to display text within `ListItem` components, typically for primary and secondary content.

###1.2. Import Statement
```jsx
import ListItemText from '@mui/material/ListItemText';
// or
import { ListItemText } from '@mui/material';
```

###1.3. Basic Usage
```jsx
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
export default function SimpleList() {
 return (
 <List>
 <ListItem>
 <ListItemText primary="Primary Text" secondary="Secondary Text" />
 </ListItem>
 </List>
 );
}
```

###1.4. Component Variants
**PLACEHOLDER FOR COMPONENT VARIANTS IF APPLICABLE**

###1.5. Key Props
| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `children` | `node` | - | No | Alias for the `primary` prop. |
| `classes` | `object` | - | No | Override or extend the styles applied to the component. See [https://mui.com/material-ui/api/list-item-text/](https://mui.com/material-ui/api/list-item-text/) for details. |
| `disableTypography` | `bool` | `false` | No | If `true`, the children won't be wrapped by a `Typography` component. |
| `inset` | `bool` | `false` | No | If `true`, the children are indented. This should be used if there is no left avatar or left icon. |
| `primary` | `node` | - | No | The main content element. |
| `primaryTypographyProps` | `object` | - | No | Props applied to the primary `Typography` component. |
| `secondary` | `node` | - | No | The secondary content element. |
| `secondaryTypographyProps` | `object` | - | No | Props applied to the secondary `Typography` component. |
| `sx` | `Array<func | object | bool> | func | object` | - | No | The system prop that allows defining system overrides as well as additional CSS styles. |

###1.6. Common Patterns/Advanced Usage
#### With Icons and Avatars
`ListItemText` is commonly used with `ListItemIcon` or `ListItemAvatar`.
```jsx
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/Inbox';
import DraftsIcon from '@mui/icons-material/Drafts';
export default function IconList() {
 return (
 <List>
 <ListItem button>
 <ListItemIcon>
 <InboxIcon />
 </ListItemIcon>
 <ListItemText primary="Inbox" />
 </ListItem>
 <ListItem button>
 <ListItemIcon>
 <DraftsIcon />
 </ListItemIcon>
 <ListItemText primary="Drafts" />
 </ListItem>
 </List>
 );
}
```
#### Disabling Typography
If you need to render an alternative Typography variant or a custom component for the text.
```jsx
<ListItemText
 primary="My Custom Primary Text"
 disableTypography
 primaryTypographyProps={{ variant: 'h6', color: 'primary' }} // These props are ignored if disableTypography is true
/>
// Manual control:
<ListItemText disableTypography>
 <Typography variant="h6" color="primary">
 My Custom Primary Text
 </Typography>
 {secondaryText && (
 <Typography variant="body2" color="textSecondary">
 {secondaryText}
 </Typography>
 )}
</ListItemText>
```

###1.7. Accessibility (A11y)
- Ensure that the primary and secondary text provide meaningful information.
- When `ListItemText` is used within interactive `ListItem` components (e.g., with `button` prop), ensure the overall list item has appropriate ARIA roles and attributes (`aria-label` if text is not descriptive enough).
####1.7.1 Screen Reader Considerations
**PLACEHOLDER FOR SCREEN READER CONSIDERATIONS**
####1.7.2 Keyboard Navigation
**PLACEHOLDER FOR KEYBOARD NAVIGATION**
####1.7.3 ARIA Attributes
**PLACEHOLDER FOR ARIA ATTRIBUTES**

###1.8. Styling/Customization
- **`sx` prop:** For ad-hoc styling. See [https://mui.com/material-ui/api/list-item-text/](https://mui.com/material-ui/api/list-item-text/) for details.
- **`classes` prop:** To override specific CSS classes. See [https://mui.com/material-ui/api/list-item-text/](https://mui.com/material-ui/api/list-item-text/) for details.
 - `.MuiListItemText-root`
 - `.MuiListItemText-primary`
 - `.MuiListItemText-secondary`
 - `.MuiListItemText-inset`
 - `.MuiListItemText-dense`
 - `.MuiListItemText-multiline`
- **Theme Overrides:** Customize globally through the theme. See [https://mui.com/material-ui/api/list-item-text/](https://mui.com/material-ui/api/list-item-text/) for details.
####1.8.1 Style Overrides (theme)
**PLACEHOLDER FOR STYLE OVERRIDES**
####1.8.2 CSS Classes
**PLACEHOLDER FOR CSS CLASSES**
####1.8.3 sx Prop Examples
**PLACEHOLDER FOR SX PROP EXAMPLES**

###1.9. Performance Considerations
**PLACEHOLDER FOR PERFORMANCE CONSIDERATIONS IF APPLICABLE**

###1.10. Testing Guidelines
**PLACEHOLDER FOR TESTING GUIDELINES**

###1.11. Version Specific Notes
- The `ListItemText` component has been stable. Always refer to the official MUI documentation for the specific version you are using.
####1.11.1 Migration Guides
**PLACEHOLDER FOR MIGRATION GUIDES**
####1.11.2 Deprecation Warnings
**PLACEHOLDER FOR DEPRECATION WARNINGS**

###1.12. Related Components
- [`List`](./List.md) (Parent component)
- [`ListItem`](./ListItem.md) (Parent component)
- [`ListItemIcon`](./ListItemIcon.md)
- [`ListItemAvatar`](https://mui.com/material-ui/api/list-item-avatar/)
- [`Typography`](./Typography.md) (Used internally unless `disableTypography` is true)
####1.12.1 Component Hierarchy
**PLACEHOLDER FOR COMPONENT HIERARCHY**
####1.12.2 Complementary Components
**PLACEHOLDER FOR COMPLEMENTARY COMPONENTS**
####1.12.3 Alternative Components
**PLACEHOLDER FOR ALTERNATIVE COMPONENTS**

###1.13. Common Pitfalls
**PLACEHOLDER FOR COMMON PITFALLS**

##2. Further Research Notes & Links
- [https://mui.com/material-ui/api/list-item-text/](https://mui.com/material-ui/api/list-item-text/)
