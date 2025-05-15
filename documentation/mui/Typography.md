# MUI Component: Typography

The Typography component is used to standardize text and still allow for easy customization. It applies the theme's typography styles.

##1. Select Component

###1.1. Overview
The Typography component is used to standardize text and still allow for easy customization. It applies the theme's typography styles.

###1.2. Import Statement
```javascript
import Typography from '@mui/material/Typography';
// or
import { Typography } from '@mui/material';
```
Consult the [guide on minimizing bundle size](https://mui.com/material-ui/guides/minimizing-bundle-size/) to learn about the difference.

###1.3. Basic Usage
```jsx
import Typography from '@mui/material/Typography';

function App() {
 return (
 <div>
 <Typography variant="h1" component="h2" gutterBottom>
 h1. Heading
 </Typography>
 <Typography variant="subtitle1">
 subtitle1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
 </Typography>
 <Typography variant="body1">
 body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
 unde suscipit, quam beatae rerum inventore consectetur, neque doloribus, cupiditate numquam
 dignissimos laborum fugiat deleniti? Eum quasi quidem quibusdam.
 </Typography>
 <Typography variant="body2" color="textSecondary">
 body2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
 unde suscipit, quam beatae rerum inventore consectetur, neque doloribus, cupiditate numquam
 dignissimos laborum fugiat deleniti? Eum quasi quidem quibusdam.
 </Typography>
 </div>
 );
}

export default App;
```

###1.4. Component Variants
- No specific variants mentioned in the original document.

###1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `align` | `'inherit' | 'left' | 'center' | 'right' | 'justify'` | `'inherit'` | No | Sets the `text-align` on the component. |
| `children` | `node` | - | - | The content of the component. |
| `color` | `'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'textPrimary' | 'textSecondary' | 'textDisabled' | string` | - | No | The color of the component. It supports both default and custom theme colors. |
| `component` | `elementType` | - | - | The component used for the root node. Either a string to use an HTML element or a component. |
| `gutterBottom` | `bool` | `false` | No | If `true`, the text will have a bottom margin. |
| `noWrap` | `bool` | `false` | No | If `true`, the text will not wrap, but instead will truncate with a text overflow ellipsis. Note that text overflow can only happen with block or inline-block level elements. |
| `paragraph` | `bool` | `false` | No | If `true`, the element will be a paragraph element (`<p>`). |
| `sx` | `Array<func | object | bool> | func | object` | - | No | The system prop that allows defining system overrides as well as additional CSS styles. See the [`sx` page](https://mui.com/system/the-sx-prop/) for more details. |
| `variant` | `'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'button' | 'caption' | 'overline' | 'inherit' | string` | `'body1'` | No | Applies the theme typography styles. |
| `variantMapping` | `object` | `{ h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6', subtitle1: 'h6', subtitle2: 'h6', body1: 'p', body2: 'p', inherit: 'p' }` | No | The component maps the `variant` prop to a range of different HTML element types. This prop allows you to customize that mapping. |

###1.6. Common Patterns/Advanced Usage
#### Changing the semantic element
You can change the underlying HTML element for a `Typography` component using the `component` prop. This is useful for SEO or accessibility.
```jsx
<Typography variant="h1" component="div">
 This looks like an H1, but it's a DIV.
</Typography>

<Typography variant="body1" component="span">
 This looks like a paragraph, but it's a SPAN.
</Typography>
```
#### Using with `sx` prop for custom styles
```jsx
<Typography
 variant="h4"
 sx={{
 color: 'primary.main',
 fontWeight: 'bold',
 mt:2, // margin-top
 mb:1, // margin-bottom
 }}
>
 Custom Styled Title
</Typography>
```

###1.7. Accessibility (A11y)
- Ensure that the chosen `variant` and `component` props result in a logical HTML structure for assistive technologies. For example, heading variants (`h1`-`h6`) should typically map to their respective HTML heading elements.
- If you override the `component` prop, ensure the chosen element is semantically appropriate for the text content.

###1.8. Styling/Customization
- **`sx` prop**: The most direct way to apply custom styles.
- **Theme Overrides**: Customize Typography styles globally via the theme.
```javascript
// Example in theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
 components: {
 MuiTypography: {
 styleOverrides: {
 root: { // Style applied to the root element.
 // your global typography styles here
 },
 h1: {
 fontSize: '3rem',
 },
 // ... other variants
 },
 defaultProps: {
 // gutterBottom: true, // Example: make all typography have gutterBottom by default
 }
 },
 },
});
```
- **CSS Classes**: MUI applies global class names like `.MuiTypography-root`, `.MuiTypography-h1`, etc., which can be targeted with CSS.

###1.9. Performance Considerations
- No specific performance considerations mentioned in the original document.

###1.10. Testing Guidelines
- No specific testing guidelines mentioned in the original document.

###1.11. Version Specific Notes
- Refer to the official MUI documentation for the specific version you are using for any recent changes or deprecations. The information here is based on general Typography API principles.

###1.12. Related Components
- Often used with layout components like `Box`, `Container`, `Grid`.
- Used within virtually all other components to display text (e.g., `Button`, `Card`, `Dialog`).

###1.13. Common Pitfalls
- No specific common pitfalls mentioned in the original document.

##2. Further Research Notes & Links
- [MUI Typography API Documentation](https://mui.com/material-ui/api/typography/)
- [Guide on minimizing bundle size](https://mui.com/material-ui/guides/minimizing-bundle-size/)
- [`sx` prop documentation](https://mui.com/system/the-sx-prop/)