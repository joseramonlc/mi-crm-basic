Labelled text field with green focus halo and red error state. Set `multiline` for a textarea.

```jsx
<Input label="Nombre" placeholder="Nombre y apellidos" />
<Input label="Email" error="Introduce un email válido" value="maria@" />
<Input label="Notas" multiline rows={4} placeholder="Añade una nota…" />
```

States: default / focus / filled / error / disabled.
