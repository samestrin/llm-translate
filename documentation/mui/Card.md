# MUI Component: Card

## 1. Card Component

### 1.1. Overview
The `Card` component is a versatile surface container that groups related content and actions about a single subject. Cards in Material UI provide a flexible and extensible content container with multiple variants and options. They serve as entry points to more detailed information and function as a styled container without any predefined layout restrictions.

### 1.2. Import Statement
```jsx
import Card from '@mui/material/Card';
```

For additional card-related components:
```jsx
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
```

### 1.3. Basic Usage
```jsx
import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export default function BasicCard() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Basic Card
        </Typography>
        <Typography variant="body2">
          Simple card with some text content.
        </Typography>
      </CardContent>
    </Card>
  );
}
```

### 1.4. Component Variants
Cards can be customized in various ways to suit different needs:

- **Outlined Card**: Uses the `variant="outlined"` prop to create a card with just an outline.
```jsx
<Card variant="outlined">
  <CardContent>
    <Typography variant="body2">Outlined card variant</Typography>
  </CardContent>
</Card>
```

- **Elevated Card**: The default variant that shows elevation with a shadow.
```jsx
<Card elevation={3}>
  <CardContent>
    <Typography variant="body2">Card with custom elevation</Typography>
  </CardContent>
</Card>
```

### 1.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | No | The content of the component |
| `classes` | `object` | - | No | Override or extend the styles applied to the component |
| `component` | `elementType` | `'div'` | No | The component used for the root node |
| `elevation` | `number` | `1` | No | Shadow depth, corresponds to `dp` in the spec |
| `raised` | `bool` | `false` | No | If `true`, the card will use raised styling |
| `square` | `bool` | `false` | No | If `true`, rounded corners are disabled |
| `sx` | `object` | - | No | The system prop that allows defining system overrides |
| `variant` | `'elevation'｜'outlined'` | `'elevation'` | No | The variant to use |

### 1.6. Common Patterns/Advanced Usage

#### Complex Card with Media
```jsx
import * as React from 'react';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function MediaCard() {
  return (
    <Card sx={{ maxWidth: 345 }}>
      <CardMedia
        sx={{ height: 140 }}
        image="/static/images/cards/contemplative-reptile.jpg"
        title="green iguana"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Lizard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lizards are a widespread group of squamate reptiles, with over 6,000
          species, ranging across all continents except Antarctica
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">Share</Button>
        <Button size="small">Learn More</Button>
      </CardActions>
    </Card>
  );
}
```

#### Card with Header
```jsx
import * as React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function HeaderCard() {
  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar aria-label="recipe">
            R
          </Avatar>
        }
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
        title="Shrimp and Chorizo Paella"
        subheader="September 14, 2016"
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          This impressive paella is a perfect party dish and a fun meal to cook
          together with your guests. Add 1 cup of frozen peas along with the mussels,
          if you like.
        </Typography>
      </CardContent>
    </Card>
  );
}
```

### 1.7. Accessibility (A11y)

#### 1.7.1 Screen Reader Considerations
- Ensure that cards have proper headings or labels to convey their purpose to screen reader users.
- Use semantic elements within the card (like headings for titles) to provide structure.

#### 1.7.2 Keyboard Navigation
- Interactive elements inside cards (buttons, links) should be focusable and operable with keyboard navigation.
- Maintain a logical tab order within complex cards.

#### 1.7.3 ARIA Attributes
- Use appropriate ARIA roles if the card serves a specific purpose beyond being a container.
- For cards that act as buttons or links, ensure proper `aria-label` or other required attributes are added.

```jsx
<Card 
  role="button" 
  aria-label="Open product details" 
  tabIndex={0}
  onClick={handleCardClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCardClick();
    }
  }}
>
  {/* Card content */}
</Card>
```

### 1.8. Styling/Customization

#### 1.8.1 Style Overrides (theme)
You can override the Card component styles at the theme level:

```jsx
const theme = createTheme({
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});
```

#### 1.8.2 CSS Classes
The Card component comes with the following CSS classes that can be overridden:

| CSS Class | Description |
|-----------|-------------|
| `.MuiCard-root` | Styles applied to the root element |
| `.MuiPaper-root` | Styles applied to the Paper component used as the base |
| `.MuiPaper-elevation1` | Styles applied for the default elevation |
| `.MuiPaper-outlined` | Styles applied when using the outlined variant |

#### 1.8.3 sx Prop Examples
The `sx` prop provides a shortcut to apply custom styles:

```jsx
<Card 
  sx={{ 
    maxWidth: 345, 
    borderRadius: 4,
    boxShadow: 3,
    '&:hover': {
      boxShadow: 6,
      transform: 'scale(1.03)',
      transition: 'transform 0.3s ease-in-out'
    }
  }}
>
  {/* Card content */}
</Card>
```

### 1.9. Performance Considerations
- Consider using the `component` prop to optimize the DOM structure when necessary.
- For lists of cards, implement virtualization for large datasets to improve rendering performance.
- Use appropriate image sizes and formats in `CardMedia` to optimize loading times.

### 1.10. Testing Guidelines
- Test different card variants and prop combinations.
- Ensure interactive elements within cards function correctly.
- Test accessibility features including keyboard navigation and screen reader compatibility.

```jsx
// Example test with React Testing Library
test('renders card with correct content', () => {
  render(<BasicCard title="Test Card" description="Card Description" />);
  expect(screen.getByText('Test Card')).toBeInTheDocument();
  expect(screen.getByText('Card Description')).toBeInTheDocument();
});
```

### 1.11. Version Specific Notes

#### 1.11.1 Migration Guides
When migrating from MUI v4 to v5:
- Card component API remains mostly the same.
- Note that the default theme values for shadows and other styles might have changed.

#### 1.11.2 Deprecation Warnings
- No current deprecation warnings for the Card component as of MUI v5.

### 1.12. Related Components

#### 1.12.1 Component Hierarchy
The Card component is composed of several sub-components that work together:
- `Card`: The main container
- `CardHeader`: For the card's header section
- `CardContent`: For the main content area
- `CardActions`: For the action buttons area
- `CardMedia`: For media content like images or videos
- `CardActionArea`: Makes the entire card clickable (often used in product cards)

#### 1.12.2 Complementary Components
- `Paper`: The Card component uses Paper internally; for simpler surfaces consider using Paper directly
- `Typography`: Often used within cards for text styling
- `Divider`: Can be used to separate sections within a card
- `Button`, `IconButton`: Common in `CardActions` for interactive elements

#### 1.12.3 Alternative Components
- `Box` with custom styling: For simpler container needs
- `Paper`: For basic surface needs without the Card's sub-components
- `Grid` or `Stack`: For layout arrangements that don't need the card's contained styling

### 1.13. Common Pitfalls
- **Not providing sufficient spacing**: Cards look best with proper padding between content elements.
  ```jsx
  // Good practice
  <Card>
    <CardContent sx={{ pb: 1 }}>
      <Typography variant="h5" gutterBottom>
        Card Title
      </Typography>
      <Typography variant="body2">
        Card content with proper spacing
      </Typography>
    </CardContent>
    <CardActions>
      <Button size="small">Action</Button>
    </CardActions>
  </Card>
  ```

- **Inconsistent elevation**: Mixing elevation levels across multiple cards can create visual inconsistency.
- **Overloading cards with too many actions**: Cards work best with a limited set of clear actions.
- **Missing responsive design**: Cards should adapt well to different screen sizes.
  ```jsx
  <Card sx={{ 
    maxWidth: { xs: '100%', sm: 345 }, 
    mx: 'auto' 
  }}>
    {/* Content */}
  </Card>
  ```

## 2. Further Research Notes & Links
- [MUI Card Component Documentation](https://mui.com/material-ui/react-card/)
- [MUI Card API Reference](https://mui.com/material-ui/api/card/)
- [Material Design Guidelines for Cards](https://material.io/components/cards)
- [MUI Paper Component](https://mui.com/material-ui/react-paper/) (Used internally by Card)
