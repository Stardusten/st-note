# Editor Indentation System

## Overview

The editor supports free-form indentation where any block (paragraph, bullet, ordered, quote) can be indented, not just lists. This document explains the CSS-based approach we use to implement this feature.

## Why CSS-Based Approach?

We considered several approaches:

| Approach | Pros | Cons |
|----------|------|------|
| **CSS selectors + variables** | No JS overhead, declarative | More CSS rules |
| NodeView dynamic calculation | Fewer CSS rules | JS overhead on every update |
| Absolute positioned markers | Simpler CSS | Content misalignment (see below) |

### Why Not Absolute Positioned Markers?

A simpler approach would be to use absolute positioning for all markers (bullets, numbers) and a uniform indent for all block types. However, this causes **visual misalignment**:

- Paragraphs have no marker, so content starts at the block's left edge
- Lists have markers, so content starts after the marker
- With uniform indent + absolute markers, list content would align with paragraph content, but the list marker would extend further left

**Our requirement**: Same-level blocks should have their **leftmost edge** aligned (not content). When converting a bullet to a paragraph, the content should shift left to align with where the bullet marker was.

This means different block types need different margin-left values, and nested combinations need specific adjustments.

## Implementation

### CSS Variables (em units)

All indent values are defined as CSS custom properties using `em` units, making them **font-size responsive**:

```css
.prosemirror-editor {
  /* Top-level block indent */
  --indent-top-paragraph: 0;
  --indent-top-bullet: 0.94em;
  --indent-top-ordered: 1.125em;

  /* Default nested indent (parent is paragraph/quote) */
  --indent-default-paragraph: 1.5em;
  --indent-default-bullet: 2.5em;
  --indent-default-ordered: 2.8em;

  /* Parent is bullet */
  --indent-bullet-paragraph: 0.5em;
  --indent-bullet-bullet: 1.5em;
  --indent-bullet-ordered: 1.75em;

  /* Parent is ordered */
  --indent-ordered-paragraph: 0.19em;
  --indent-ordered-bullet: 1.19em;
  --indent-ordered-ordered: 1.5em;

  /* Quote */
  --quote-border-width: 3px;
  --quote-padding: 0.75em;

  /* Collapse toggle */
  --toggle-offset: 1.125em;
  --toggle-offset-top: 1.25em;
}
```

### Selector Structure

The CSS uses parent-child selectors to apply the correct indent based on context:

```css
/* Default (parent is paragraph/quote) */
.block[data-kind="bullet"] {
  margin-left: var(--indent-default-bullet);
}

/* Parent is ordered */
.block[data-kind="ordered"] > .block-content > .block[data-kind="bullet"] {
  margin-left: var(--indent-ordered-bullet);
}

/* Parent is bullet */
.block[data-kind="bullet"] > .block-content > .block[data-kind="bullet"] {
  margin-left: var(--indent-bullet-bullet);
}
```

### Collapse Toggle Positioning

The collapse toggle uses `calc()` with variables to maintain correct positioning:

```css
.block-collapse-toggle {
  left: calc(-1 * var(--toggle-offset));
}

.block[data-kind="bullet"] > .block-collapse-toggle {
  left: calc(-1 * var(--toggle-offset) - var(--indent-default-bullet) + var(--indent-default-paragraph));
}
```

## Font Size Adaptation

By using `em` units instead of `px`:

- **Before**: `margin-left: 24px` - fixed regardless of font size
- **After**: `margin-left: 1.5em` - scales proportionally with font size

When the editor's `--editor-font-size` changes, all indentation automatically scales to maintain proper visual proportions.

## Maintenance

To adjust indentation values:

1. Modify the CSS variables at the top of `note-editor.css`
2. All rules reference these variables, so changes propagate automatically
3. No need to hunt for magic numbers scattered across the file
