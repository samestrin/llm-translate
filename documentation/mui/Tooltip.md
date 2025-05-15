# MUI Component: Tooltip

##1. Tooltip Component

###1.1. Overview
Tooltips display informative text when users hover over, focus on, or tap an element. When activated, Tooltips display a text label identifying an element, such as a description of its function. They are used to provide context or additional information that isn't critical enough to be always visible.

###1.2. Import Statement
```jsx
import Tooltip from '@mui/material/Tooltip';
```

###1.3. Basic Usage
```jsx
export default function BasicTooltip() {
  return (
    <Tooltip title="Add">
      <Button>My button</Button>
    </Tooltip>
  );
}
```

###1.4. Component Variants

###1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `title` | `node` |  | Yes | Tooltip title. Zero-length titles string are never displayed. |
| `children` | `element` |  | Yes | The element to wrap. It needs to be able to hold a ref. |
| `arrow` | `bool` | `false` | No | If `true`, adds an arrow to the tooltip. |
| `describeChild` | `bool` | `false` | No | If `true`, the tooltip is used as an accessible description. |
| `disableFocusListener` | `bool` | `false` | No | Do not respond to focus events. |
| `disableHoverListener` | `bool` | `false` | No | Do not respond to hover events. |
| `disableInteractive` | `bool` | `false` | No | Makes the tooltip not interactive. |
| `disableTouchListener` | `bool` | `false` | No | Do not respond to long press touch events. |
| `enterDelay` | `number` | `100` | No | The number of milliseconds to wait before showing the tooltip. |
| `enterNextDelay` | `number` | `0` | No | The number of milliseconds to wait before showing the tooltip when one was already recently opened. |
| `enterTouchDelay` | `number` | `700` | No | The number of milliseconds a user must touch the element before showing the tooltip. |
| `followCursor` | `bool` | `false` | No | If `true`, the tooltip follows the cursor over the wrapped element. |
| `leaveDelay` | `number` | `0` | No | The number of milliseconds to wait before hiding the tooltip. |
| `leaveTouchDelay` | `number` | `1500` | No | The number of milliseconds after the user stops touching an element before hiding the tooltip. |
| `onClose` | `func` |  | No | Callback fired when the component requests to be closed. |
| `onOpen` | `func` |  | No | Callback fired when the component requests to be open. |
| `open` | `bool` |  | No | If `true`, the tooltip is shown. |
| `placement` | `string` | `'bottom'` | No | Tooltip placement. |
| `PopperComponent` | `elementType` | `Popper` | No | The component used for the popper. |
| `PopperProps` | `object` |  | No | Props applied to the `PopperComponent`. |
| `slotProps` | `object` |  | No | The props used for each slot inside. |
| `slots` | `object` |  | No | The components used for each slot inside. |
| `sx` | `object` |  | No | The system prop that allows defining system overrides as well as additional CSS styles. |
| `TransitionComponent` | `elementType` | `Grow` | No | The component used for the transition. |
| `TransitionProps` | `object` |  | No | Props applied to the `TransitionComponent`. |

###1.6. Common Patterns/Advanced Usage
- Positioned Tooltips: Using the `placement` prop for different positions.
- Arrow Tooltips: Using the `arrow` prop.
- Custom Child Element: Ensuring custom React components spread props and forward refs.
- Triggers: Customizing open/close behavior with `disable...Listener` props or `enterDelay`/`leaveDelay`.
- Controlled Tooltips: Using `open`, `onOpen`, and `onClose` props.
- Variable Width: Tooltips wrap long text by default.
- Interactive Tooltips: Default behavior allows hovering over the tooltip itself.
- Disabled Elements: Wrapping disabled elements in a `<span>` to enable tooltip activation.
- Custom Transitions: Using `TransitionComponent` with `Fade` or `Zoom`.
- Follow Cursor: Using `followCursor={true}`.
- Virtual Element: Using `anchorEl` with a custom `VirtualElement` object for custom placement.
- Adjusting Distance from Anchor: Using `slotProps.popper.modifiers` or `slotProps.popper.sx`.

###1.7. Accessibility (A11y)
- By default, the tooltip only labels its child element.
- If the tooltip should act as an accessible description, use the `describeChild` prop.
- Ensure the child element is focusable if the tooltip is meant to appear on focus.
- Refer to WAI-ARIA Authoring Practices for tooltips.

###1.8. Styling/Customization
- Using the `sx` prop for instance-specific overrides.
- Using `styled()` for creating reusable custom Tooltip components.
- Theme customization for global Tooltip styles via `styleOverrides` in `MuiTooltip`.
- CSS global class names.
- Customizing `PopperProps` for styling the popper.
- Customizing `TransitionComponent` and `TransitionProps`.

###1.9. Performance Considerations
PLACEHOLDER: Add performance optimization tips if applicable.

###1.10. Testing Guidelines
PLACEHOLDER: Add tips for testing the component.

###1.11. Version Specific Notes
- Review the main Tooltip page on mui.com for any recent changes or deprecation notices if using a specific version.

###1.12. Related Components
- `Button` (often wrapped by Tooltip)
- `IconButton` (often wrapped by Tooltip)
- `Popper` (underlying positioning component)
- `Grow` (default transition)
- `Fade`, `Zoom` (alternative transitions)

###1.13. Common Pitfalls
PLACEHOLDER: Add common issues and how to solve them.

##2. Further Research Notes & Links
- [MUI Tooltip Documentation](https://mui.com/material-ui/react-tooltip/)
- [MUI Tooltip API Documentation](https://mui.com/material-ui/api/tooltip/)
- [WAI-ARIA Authoring Practices - Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- *Add any other relevant links or notes here.*