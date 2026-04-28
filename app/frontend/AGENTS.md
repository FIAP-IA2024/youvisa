# AGENTS.md - Frontend Development Guidelines

This file provides guidance to AI agents (Claude Code, Cursor, etc.) when working on this frontend project.

## Design Philosophy

**Minimalist and Modern** - Always prioritize clean, simple, and modern designs. Avoid cluttered interfaces. White space is your friend.

Key principles:

- Less is more - remove unnecessary elements
- Consistent spacing and alignment
- Clear visual hierarchy
- Smooth, subtle animations (not distracting)
- Accessible and responsive by default

## Component Libraries

This project has access to three component libraries, all installed via the same shadcn CLI. Choose the best fit for each situation:

### shadcn/ui (Primary)

**Purpose:** Core UI components for application functionality.

**Best for:**

- Forms (Input, Select, Checkbox, Radio, Textarea)
- Data display (Table, Card, Badge, Avatar)
- Navigation (Tabs, Breadcrumb, Pagination)
- Overlays (Dialog, Sheet, Popover, Dropdown)
- Feedback (Toast, Alert, Progress)
- Layout (Separator, Scroll Area)

**Install command:**

```bash
npx shadcn@latest add <component-name>
```

**Documentation:** <https://ui.shadcn.com>

---

### Magic UI (Animations & Effects)

**Purpose:** Animated components and visual effects for landing pages and marketing sections.

**Best for:**

- Hero sections with animated text
- Eye-catching buttons (shimmer, pulsating)
- Background effects (particles, meteors, grid patterns)
- Interactive elements (globe, beam effects)
- Text animations (gradient text, typing effect, morphing)
- Device mockups (iPhone, browser frames)
- Marquee and scrolling effects

**Install command:**

```bash
npx shadcn@latest add "https://magicui.design/r/<component-name>"
```

**Documentation:** <https://magicui.design>

**When to use:**

- Landing pages
- Hero sections
- Feature showcases
- Call-to-action areas
- Marketing content
- First impressions

**When NOT to use:**

- Data-heavy interfaces
- Forms and inputs
- Admin dashboards (keep them clean)
- Anywhere animation would distract from the task

---

### Coss UI (Extended Components)

**Purpose:** Additional accessible components built on Base UI primitives.

**Best for:**

- Extended alert variants (info, success, warning, error)
- Spinners and loading states
- Notifications with actions
- Components not available in shadcn/ui
- Alternative implementations with different APIs

**Install command:**

```bash
npx shadcn@latest add @coss/<component-name>
```

**Documentation:** <https://coss.com/ui/docs>

---

## Decision Matrix

| Scenario | Recommended Library |
|----------|-------------------|
| Form inputs | shadcn/ui |
| Data tables | shadcn/ui |
| Modal dialogs | shadcn/ui |
| Landing page hero | Magic UI |
| Animated buttons (CTA) | Magic UI |
| Background effects | Magic UI |
| Status alerts with colors | Coss UI |
| Loading spinners | Coss UI |
| Navigation menus | shadcn/ui |
| Toast notifications | shadcn/ui or Coss UI |

## Styling Guidelines

### Theme Compatibility

**ALWAYS use theme-aware colors.** Never hardcode colors.

```tsx
// CORRECT - uses theme variables
<div className="bg-background text-foreground">
<p className="text-muted-foreground">
<div className="border-border">
<button className="bg-primary text-primary-foreground">

// WRONG - hardcoded colors break dark mode
<div className="bg-white text-black">
<p className="text-gray-500">
<div className="border-gray-200">
<button className="bg-blue-500 text-white">
```

### Available Theme Colors

```
background / foreground     - Main background and text
card / card-foreground      - Card surfaces
popover / popover-foreground - Popover surfaces
primary / primary-foreground - Primary actions
secondary / secondary-foreground - Secondary actions
muted / muted-foreground    - Muted/subtle elements
accent / accent-foreground  - Accent highlights
destructive / destructive-foreground - Destructive actions
border                      - Border color
input                       - Input border color
ring                        - Focus ring color
```

### Spacing and Layout

Use Tailwind's spacing scale consistently:

- `gap-2` (8px) - Tight spacing
- `gap-4` (16px) - Default spacing
- `gap-6` (24px) - Comfortable spacing
- `gap-8` (32px) - Section spacing

### Typography

Use the semantic text classes:

- `text-4xl font-bold` - Page titles
- `text-2xl font-semibold` - Section titles
- `text-lg` - Emphasized text
- `text-base` - Body text
- `text-sm text-muted-foreground` - Secondary text

## Component Patterns

### Page Layout

```tsx
export default function Page() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Page Title</h1>
      {/* Content */}
    </main>
  );
}
```

### Card Pattern

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Form Pattern

```tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="email@example.com" />
  </div>
  <Button type="submit">Submit</Button>
</form>
```

## File Organization

```
src/
├── app/                    # Routes and pages
│   ├── (auth)/             # Auth-related routes (grouped)
│   ├── dashboard/          # Dashboard routes
│   └── ...
├── components/
│   ├── ui/                 # shadcn/ui components (auto-generated)
│   ├── magicui/            # Magic UI components (auto-generated)
│   ├── layout/             # Layout components (header, footer, sidebar)
│   ├── forms/              # Form-specific components
│   └── [feature]/          # Feature-specific components
├── lib/
│   ├── utils.ts            # Utility functions
│   └── api.ts              # API client
└── hooks/                  # Custom React hooks
```

## Best Practices

1. **Check existing components first** - Before creating new components, check if shadcn/ui, Magic UI, or Coss UI already has what you need.

2. **Composition over customization** - Compose existing components rather than heavily customizing them.

3. **Responsive by default** - Always consider mobile-first design.

4. **Accessibility** - Use semantic HTML, proper labels, and keyboard navigation.

5. **Performance** - Use `next/image` for images, lazy load heavy components.

6. **Consistency** - Follow existing patterns in the codebase.

## Adding New Components

When you need a component that doesn't exist:

1. First, search in shadcn/ui: <https://ui.shadcn.com/docs/components>
2. Then, search in Magic UI: <https://magicui.design/docs>
3. Then, search in Coss UI: <https://coss.com/ui/docs>
4. Only create custom components if none of the above fit

## References

- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Magic UI Components](https://magicui.design/docs)
- [Coss UI Components](https://coss.com/ui/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
