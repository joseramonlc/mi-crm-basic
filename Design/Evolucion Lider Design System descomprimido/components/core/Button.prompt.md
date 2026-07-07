Action button — green primary for the single main action per view; secondary/ghost for the rest. Loading state uses gerund copy ("Guardando…").

```jsx
<Button variant="primary" size="lg" fullWidth>Añadir prospecto</Button>
<Button variant="secondary" iconLeft={icon('phone')}>Llamar</Button>
<Button variant="ghost">Cancelar</Button>
<Button variant="destructive" size="sm">Eliminar</Button>
```

Variants: `primary` · `secondary` · `destructive` · `ghost`. Sizes: `lg` (48px CTA) · `md` (40px default) · `sm` (36px list rows). Props: `loading`, `disabled`, `fullWidth`, `iconLeft`, `iconRight`.
