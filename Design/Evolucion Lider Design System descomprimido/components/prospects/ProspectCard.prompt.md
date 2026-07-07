The app's main list unit. Avatar + name + priority dot, stage badge, channel/last-interaction meta, and three always-visible actions (Llamar · WhatsApp · Nota).

```jsx
<ProspectCard
  name="María Fernández" stage="contacted" priority="high"
  channel="whatsapp" lastInteraction="Último WhatsApp" timeAgo="hace 2 días"
  onCall={…} onWhatsApp={…} onNote={…} onOpen={…} />
```

Tapping the body fires `onOpen` (→ Ficha del Prospecto). The footer actions never hide.
