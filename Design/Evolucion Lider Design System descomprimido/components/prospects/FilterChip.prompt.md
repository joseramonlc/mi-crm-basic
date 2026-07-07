Filter pill for the scrolling filter bar. Active = green fill + white text; inactive = slate-100.

```jsx
<FilterChip active>Todos</FilterChip>
<FilterChip onClick={…}>Alta prioridad</FilterChip>
```

~4 chips show at once; the rest reveal by horizontal scroll, with a fixed `menu` button (CountBadge) on the right.
