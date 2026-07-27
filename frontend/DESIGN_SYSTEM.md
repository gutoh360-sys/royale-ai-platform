# Royale Design System

## Philosophy

Minimalist, premium, and functional. Inspired by Linear.app — not as imitation, but as standard.

Every pixel serves a purpose. Nothing decorative. The interface breathes through typography, spacing, and hierarchy — not gradients, heavy shadows, or visual noise.

## Core Principles

- **Dark-first**: Dark mode is the default. Light mode is a first-class citizen using the same token set.
- **Typography-driven**: Geist Sans leads. Hierarchy comes from weight and size, not color.
- **Subtle surfaces**: Cards and surfaces separate through luminosity, not borders or shadows.
- **Consistent rhythm**: 4px base unit. All spacing follows the established scale.
- **Motion with purpose**: Animations are micro-interactions, not spectacles.

## Tokens

All tokens live in `src/app/globals.css` as CSS custom properties and are mapped into Tailwind v4 via `@theme inline`.

### Colors

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--background` | Near-black | Near-white | Page background |
| `--foreground` | Near-white | Near-black | Body text |
| `--surface` | Elevated dark | White | Card/surface bg |
| `--primary` | Indigo-violet | Indigo-violet | CTAs, active states |
| `--secondary` | Dark surface | Light gray | Subtle surfaces |
| `--muted` | Muted dark | Muted light | Disabled, subdued |
| `--accent` | Same as secondary | Same as secondary | Highlight surfaces |
| `--destructive` | Muted red | Muted red | Errors, dangerous actions |
| `--success` | Muted green | Muted green | Positive feedback |
| `--warning` | Muted amber | Muted amber | Attention-required |
| `--info` | Muted blue | Muted blue | Informational |
| `--border` | Subtle border | Subtle border | Dividers, outlines |
| `--input` | Subtle border | Subtle border | Form inputs |
| `--ring` | Same as primary | Same as primary | Focus rings |

### Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-sans` | Geist Sans | Body, UI text |
| `--font-mono` | Geist Mono | Code, numbers |
| `--font-heading` | Geist Sans | Titles, headings |

Size hierarchy: use Tailwind's `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.

### Spacing

Spacing follows Tailwind's default scale with 4px (0.25rem) base:

| Tailwind | Pixels | Usage |
|----------|--------|-------|
| `1` | 4px | Micro spacing |
| `2` | 8px | Tight spacing |
| `3` | 12px | Compact spacing |
| `4` | 16px | Default spacing |
| `5` | 20px | Comfortable spacing |
| `6` | 24px | Section gap |
| `8` | 32px | Large gap |
| `10` | 40px | Section padding |
| `12` | 48px | XL gap |
| `16` | 64px | Page sections |

### Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `calc(var(--radius) * 0.6)` ~ 4.8px |
| `--radius-md` | `calc(var(--radius) * 0.8)` ~ 6.4px |
| `--radius-lg` | `var(--radius)` = 8px |
| `--radius-xl` | `calc(var(--radius) * 1.4)` ~ 11.2px |

### Shadows

Minimal elevation. Dark mode shadows are nearly imperceptible by design. Use `shadow-sm` for cards, `shadow-md` for dropdowns/modals.

## UI Components

All UI components live in `src/components/ui/` and are built on `@base-ui/react` primitives via shadcn/ui.

Available components:

| Component | Default Variants | Notes |
|-----------|-----------------|-------|
| Button | default, outline, secondary, ghost, destructive, link | 6 sizes + icon sizes |
| Input | — | With focus, error, disabled states |
| Textarea | — | Matches input styling |
| Select | — | With search, scroll, keyboard nav |
| Badge | default, secondary, destructive, outline, ghost, link | Pill-shaped |
| Card | default, sm | Header, title, description, content, footer, action |
| Dialog | — | With overlay, close button, footer |
| Tooltip | — | With arrow, side/align control |
| Table | — | Responsive with header, body, footer |
| Skeleton | — | Pulse animation for loading |
| Separator | horizontal, vertical | Section dividers |
| Alert | default, destructive | With title, description, action |

## Dark / Light Mode

Dark mode is active by default (`.dark` class on `<html>`). To switch:

```tsx
document.documentElement.classList.toggle("dark")
```

Both themes use exactly the same token structure. Changing `--background` and `--foreground` is sufficient — all components react automatically via CSS variables.

## Creating New Components

1. Use existing shadcn components as building blocks.
2. Never hardcode colors, spacing, or radius — use Tailwind tokens.
3. Framer Motion is for purposeful micro-interactions (fade, slide, scale). Avoid decorative animation.
4. Follow the naming conventions of existing components.
5. Add new CSS variables to `globals.css` if needed, then map them in `@theme inline`.

## Conventions

- Use `cn()` from `@/lib/utils` for conditional class merging.
- Use `data-slot="component-name"` for component identification.
- Prefer `@base-ui/react` primitives for interactive components (accessibility, keyboard nav, focus management).
- Keep components small and composable.
