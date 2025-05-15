# MUI Component: Card-Related Components

## 1. Card Sub-Components

### 1.1. Overview
Card-related components in Material UI provide specialized functionality for different parts of a Card. These include `CardHeader`, `CardContent`, `CardActions`, `CardMedia`, and `CardActionArea`. Each component serves a specific purpose within the Card container, helping to structure content and provide consistent spacing and styling.

## 2. CardHeader Component

### 2.1. Overview
The `CardHeader` component is used to display header information in a Card, typically including a title, subheader, avatar, and action items.

### 2.2. Import Statement
```jsx
import CardHeader from '@mui/material/CardHeader';
```

### 2.3. Basic Usage
```jsx
import * as React from 'react';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';

export default function BasicCardHeader() {
  return (
    <CardHeader
      avatar={<Avatar>R</Avatar>}
      title="Card Title"
      subheader="September 14, 2021"
    />
  );
}
```

### 2.4. Component Variants
The CardHeader component doesn't have specific variants, but its appearance can be customized using the available props.

### 2.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `action` | `node` | - | No | The action to display in the card header |
| `avatar` | `node` | - | No | The Avatar element to display |
| `classes` | `object` | - | No | Override or extend the styles applied to the component |
| `component` | `elementType` | `'div'` | No | The component used for the root node |
| `disableTypography` | `bool` | `false` | No | If `true`, subheader and title won't use Typography components |
| `subheader` | `node` | - | No | The content of the subheader |
| `subheaderTypographyProps` | `object` | - | No | Props applied to the subheader Typography element |
| `sx` | `object` | - | No | The system prop that allows defining system overrides |
| `title` | `node` | - | No | The content of the title |
| `titleTypographyProps` | `object` | - | No | Props applied to the title Typography element |

### 2.6. Common Patterns/Advanced Usage
```jsx
import * as React from 'react';
import { red } from '@mui/material/colors';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function AdvancedCardHeader() {
  return (
    <CardHeader
      avatar={
        <Avatar sx={{ bgcolor: red[500] }} aria-label="recipe">
          R
        </Avatar>
      }
      action={
        <IconButton aria-label="settings">
          <MoreVertIcon />
        </IconButton>
      }
      title="Shrimp and Chorizo Paella"
      subheader="September 14, 2021"
      titleTypographyProps={{ variant: 'h6' }}
      subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
    />
  );
}
```

## 3. CardContent Component

### 3.1. Overview
The `CardContent` component is used to display the main content of a Card with proper padding and spacing.

### 3.2. Import Statement
```jsx
import CardContent from '@mui/material/CardContent';
```

### 3.3. Basic Usage
```jsx
import * as React from 'react';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export default function BasicCardContent() {
  return (
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        This is the main content of the card with proper padding applied.
      </Typography>
    </CardContent>
  );
}
```

### 3.4. Component Variants
The CardContent component doesn't have specific variants.

### 3.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | No | The content of the component |
| `classes` | `object` | - | No | Override or extend the styles applied to the component |
| `component` | `elementType` | `'div'` | No | The component used for the root node |
| `sx` | `object` | - | No | The system prop that allows defining system overrides |

## 4. CardActions Component

### 4.1. Overview
The `CardActions` component is used to display actions at the bottom of a Card, typically containing buttons.

### 4.2. Import Statement
```jsx
import CardActions from '@mui/material/CardActions';
```

### 4.3. Basic Usage
```jsx
import * as React from 'react';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';

export default function BasicCardActions() {
  return (
    <CardActions>
      <Button size="small">Learn More</Button>
      <Button size="small">Share</Button>
    </CardActions>
  );
}
```

### 4.4. Component Variants
The CardActions component doesn't have specific variants.

### 4.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | No | The content of the component |
| `classes` | `object` | - | No | Override or extend the styles applied to the component |
| `component` | `elementType` | `'div'` | No | The component used for the root node |
| `disableSpacing` | `bool` | `false` | No | If `true`, the actions do not have additional margin |
| `sx` | `object` | - | No | The system prop that allows defining system overrides |

## 5. CardMedia Component

### 5.1. Overview
The `CardMedia` component is used to display media content like images or videos within a Card.

### 5.2. Import Statement
```jsx
import CardMedia from '@mui/material/CardMedia';
```

### 5.3. Basic Usage
```jsx
import * as React from 'react';
import CardMedia from '@mui/material/CardMedia';

export default function BasicCardMedia() {
  return (
    <CardMedia
      component="img"
      height="194"
      image="/static/images/cards/paella.jpg"
      alt="Paella dish"
    />
  );
}
```

### 5.4. Component Variants
The CardMedia component supports different media types by changing the `component` prop:

- Image (default): `component="img"`
- Video: `component="video"`
- Audio: `component="audio"`
- Custom: Any valid HTML element or React component

### 5.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | No | The content of the component |
| `classes` | `object` | - | No | Override or extend the styles applied to the component |
| `component` | `elementType` | `'div'` | No | The component used for the root node |
| `image` | `string` | - | No | Image URL, only works with `img` component or CSS background |
| `src` | `string` | - | No | The `src` attribute for the `img` element |
| `sx` | `object` | - | No | The system prop that allows defining system overrides |

### 5.6. Common Patterns/Advanced Usage
```jsx
// Using CardMedia with CSS background
import * as React from 'react';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';

export default function MediaWithOverlay() {
  return (
    <CardMedia
      sx={{
        height: 0,
        paddingTop: '56.25%', // 16:9
        position: 'relative',
        backgroundSize: 'cover',
      }}
      image="/static/images/cards/contemplative-reptile.jpg"
      title="Contemplative Reptile"
    >
      <Typography
        variant="h5"
        color="white"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          padding: '10px',
          width: '100%',
          bgcolor: 'rgba(0, 0, 0, 0.54)',
        }}
      >
        Text Overlay on Media
      </Typography>
    </CardMedia>
  );
}
```

## 6. CardActionArea Component

### 6.1. Overview
The `CardActionArea` component is used to make an entire area of the Card clickable, often used for product cards or interactive cards.

### 6.2. Import Statement
```jsx
import CardActionArea from '@mui/material/CardActionArea';
```

### 6.3. Basic Usage
```jsx
import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';

export default function ActionAreaCard() {
  return (
    <Card>
      <CardActionArea onClick={() => console.log('Card clicked')}>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Clickable Card
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click anywhere on this card to trigger an action.
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
```

### 6.4. Component Variants
The CardActionArea component doesn't have specific variants.

### 6.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | No | The content of the component |
| `classes` | `object` | - | No | Override or extend the styles applied to the component |
| `centerRipple` | `bool` | `false` | No | If `true`, the ripple starts at the center rather than at the pointer |
| `disabled` | `bool` | `false` | No | If `true`, the component is disabled |
| `disableRipple` | `bool` | `false` | No | If `true`, the ripple effect is disabled |
| `focusRipple` | `bool` | `false` | No | If `true`, the ripple effect appears when the component receives focus |
| `sx` | `object` | - | No | The system prop that allows defining system overrides |

### 6.6 Common Patterns/Advanced Usage
```jsx
import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';

export default function ActionAreaCardWithMedia() {
  return (
    <Card>
      <CardActionArea
        focusRipple
        onClick={() => console.log('Card clicked')}
        sx={{ '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' } }}
      >
        <CardMedia
          component="img"
          height="140"
          image="/static/images/cards/contemplative-reptile.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Name
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click anywhere on this card to view product details.
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
```

## 7. Accessibility (A11y) for Card Sub-Components

### 7.1 Screen Reader Considerations
- Ensure proper labeling of interactive elements in card sub-components.
- When using `CardActionArea`, provide an appropriate `aria-label` to describe the action.

### 7.2 Keyboard Navigation
- `CardActionArea` automatically supports keyboard focus and interaction.
- For complex cards with multiple interactive elements, ensure proper tab order.

### 7.3 ARIA Attributes
- Add appropriate ARIA attributes to custom interactive elements within cards.
- For `CardActionArea`, use `aria-label` or `aria-labelledby` to describe the purpose.

```jsx
<CardActionArea
  aria-label="View product details for Green Iguana"
  onClick={handleCardClick}
>
  {/* Content */}
</CardActionArea>
```

## 8. Styling/Customization for Card Sub-Components

### 8.1 Style Overrides (theme)
Example of styling Card sub-components at the theme level:

```jsx
const theme = createTheme({
  components: {
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
        title: {
          fontSize: '1.25rem',
          fontWeight: 600,
        },
      },
    },
    MuiCardMedia: {
      styleOverrides: {
        root: {
          borderRadius: '4px 4px 0 0',
        },
      },
    },
  },
});
```

### 8.2 CSS Classes
Each Card sub-component comes with specific CSS classes that can be targeted:

**CardHeader**:
- `.MuiCardHeader-root`: Applied to the root element
- `.MuiCardHeader-avatar`: Applied to the avatar element
- `.MuiCardHeader-action`: Applied to the action element
- `.MuiCardHeader-content`: Applied to the content wrapper element
- `.MuiCardHeader-title`: Applied to the title Typography element
- `.MuiCardHeader-subheader`: Applied to the subheader Typography element

**CardContent**:
- `.MuiCardContent-root`: Applied to the root element

**CardActions**:
- `.MuiCardActions-root`: Applied to the root element
- `.MuiCardActions-spacing`: Applied to the root element if `disableSpacing={false}`

**CardMedia**:
- `.MuiCardMedia-root`: Applied to the root element
- `.MuiCardMedia-media`: Applied when using `component="img|video|audio"`

**CardActionArea**:
- `.MuiCardActionArea-root`: Applied to the root element
- `.MuiCardActionArea-focusHighlight`: Applied to the focus highlight element

### 8.3 sx Prop Examples
Examples of styling Card sub-components using the `sx` prop:

```jsx
// CardHeader sx example
<CardHeader
  sx={{
    bgcolor: 'primary.light',
    '& .MuiCardHeader-title': {
      color: 'primary.contrastText',
      fontWeight: 'bold',
    },
  }}
  title="Custom Header"
/>

// CardMedia sx example
<CardMedia
  component="img"
  image="/static/images/cards/contemplative-reptile.jpg"
  alt="green iguana"
  sx={{
    height: { xs: 150, sm: 200, md: 250 },
    transition: 'transform 0.3s',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  }}
/>

// CardActionArea sx example
<CardActionArea
  sx={{
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: 'action.hover',
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  }}
>
  {/* Content */}
</CardActionArea>
```

## 9. Common Pitfalls for Card Sub-Components

- **Missing alt text for CardMedia images**: Always provide descriptive alt text for accessibility.
  ```jsx
  // Good practice
  <CardMedia
    component="img"
    image="/static/images/cards/contemplative-reptile.jpg"
    alt="A green iguana on a wooden surface"
  />
  ```

- **Overriding built-in spacing**: The Card sub-components have carefully designed spacing; be cautious when overriding it.
  ```jsx
  // Better to use the built-in props than to override spacing
  <CardActions disableSpacing>
    <Button size="small">Action</Button>
  </CardActions>
  ```

- **Not considering responsive behavior**: Card sub-components should adapt to different screen sizes.
  ```jsx
  <CardMedia
    component="img"
    sx={{
      height: { xs: 140, sm: 200, md: 240 },
    }}
    image="/static/images/cards/contemplative-reptile.jpg"
    alt="green iguana"
  />
  ```

- **Improper nesting of components**: Follow the recommended structure for card layout.
  ```jsx
  // Correct structure
  <Card>
    <CardHeader title="Title" />
    <CardMedia component="img" image="image.jpg" alt="description" />
    <CardContent>
      {/* Content */}
    </CardContent>
    <CardActions>
      {/* Actions */}
    </CardActions>
  </Card>
  ```

## 10. Further Research Notes & Links
- [MUI Card Component Documentation](https://mui.com/material-ui/react-card/)
- [MUI CardHeader API Reference](https://mui.com/material-ui/api/card-header/)
- [MUI CardContent API Reference](https://mui.com/material-ui/api/card-content/)
- [MUI CardActions API Reference](https://mui.com/material-ui/api/card-actions/)
- [MUI CardMedia API Reference](https://mui.com/material-ui/api/card-media/)
- [MUI CardActionArea API Reference](https://mui.com/material-ui/api/card-action-area/)
- [Material Design Guidelines for Cards](https://material.io/components/cards)
