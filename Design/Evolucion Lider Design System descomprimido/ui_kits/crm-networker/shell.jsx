// CRM Networker — shell pieces: phone frame, screen header, tab bar, FAB.
// Reads primitives from the design-system bundle (window namespace).
const NS = window.EvoluciNLDerDesignSystem_8c407a;
const { Icon } = NS;

// ── Sample data (fake) ──────────────────────────────────────────────
window.PROSPECTS = [
  { id: 1, name: 'María Fernández',  stage: 'contacted',  priority: 'high',   channel: 'whatsapp',  last: 'Último WhatsApp', time: 'hace 2 días', phone: '+34 612 345 678' },
  { id: 2, name: 'Carlos Ruiz',      stage: 'presented',  priority: 'medium', channel: 'phone',     last: 'Última llamada', time: 'ayer',       phone: '+34 698 112 233' },
  { id: 3, name: 'Lucía Gómez',      stage: 'new',        priority: 'low',    channel: 'instagram', last: 'Mensaje IG',     time: 'hace 5 días', phone: '+34 677 889 900' },
  { id: 4, name: 'Diego Soto',       stage: 'evaluating', priority: 'high',   channel: 'phone',     last: 'Última llamada', time: 'hace 3 h',   phone: '+34 654 321 098' },
  { id: 5, name: 'Ana López',        stage: 'joined',     priority: 'medium', channel: 'mail',      last: 'Último email',   time: 'hace 1 sem', phone: '+34 611 223 344' },
  { id: 6, name: 'Javier Moreno',    stage: 'contacted',  priority: 'medium', channel: 'whatsapp',  last: 'Último WhatsApp', time: 'hoy',        phone: '+34 622 334 455' },
];

// ── Phone frame (mobile-first 375px) ─────────────────────────────────
function PhoneFrame({ children }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}>
      <div style={{
        width: 390, height: 800, background:'#000', borderRadius: 44, padding: 11,
        boxShadow:'0 30px 70px rgba(15,23,42,.30)', flex:'none',
      }}>
        <div style={{
          position:'relative', width:'100%', height:'100%', background:'var(--surface-app)',
          borderRadius: 34, overflow:'hidden', display:'flex', flexDirection:'column',
          fontFamily:'var(--font-sans)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark = false }) {
  const c = dark ? '#fff' : 'var(--color-neutral-900)';
  return (
    <div style={{ height: 44, flex:'none', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', color:c, fontSize:13, fontWeight:600 }}>
      <span style={{ fontFeatureSettings:'var(--num-features)' }}>9:41</span>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <Icon name="bar-chart-3" size={15} color={c} />
        <Icon name="info" size={14} color={c} />
        <div style={{ width:22, height:11, border:`1.5px solid ${c}`, borderRadius:3, position:'relative', opacity:.9 }}>
          <div style={{ position:'absolute', inset:1.5, background:c, borderRadius:1, width:'72%' }} />
        </div>
      </div>
    </div>
  );
}

// ── Screen header (56px). Root = no back; detail = back arrow. ───────
function ScreenHeader({ title, onBack, action }) {
  return (
    <div style={{ height:56, flex:'none', display:'flex', alignItems:'center', gap:8, padding:'0 16px', background:'var(--surface-card)', borderBottom:'1px solid var(--border-default)' }}>
      {onBack && (
        <button onClick={onBack} style={{ all:'unset', cursor:'pointer', display:'flex', width:36, height:36, alignItems:'center', justifyContent:'center', marginLeft:-6 }}>
          <Icon name="arrow-left" size={22} color="var(--color-neutral-700)" />
        </button>
      )}
      <span style={{ fontSize:18, fontWeight:600, color:'var(--color-neutral-900)', letterSpacing:'-0.01em', flex:1 }}>{title}</span>
      {action}
    </div>
  );
}

// ── Bottom tab bar (3 destinations) + floating FAB ───────────────────
const TABS = [
  { key:'home',   icon:'home',         label:'Inicio' },
  { key:'pipe',   icon:'users',        label:'Prospectos' },
  { key:'resumen',icon:'bar-chart-3',  label:'Resumen' },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ height:64, flex:'none', display:'flex', background:'var(--surface-card)', borderTop:'1px solid var(--border-default)', boxShadow:'0 -1px 3px rgba(15,23,42,.04)' }}>
      {TABS.map(t => {
        const on = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{ all:'unset', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', position:'relative', paddingBottom:8 }}>
            {on && <span style={{ position:'absolute', top:0, width:28, height:3, borderRadius:'0 0 3px 3px', background:'var(--color-primary-500)' }} />}
            <Icon name={t.icon} size={22} color={on ? 'var(--color-primary-600)' : 'var(--color-neutral-400)'} />
            <span style={{ fontSize:11, fontWeight:on?700:500, color:on ? 'var(--color-primary-700)' : 'var(--color-neutral-400)' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Fab({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Nuevo prospecto"
      style={{ position:'absolute', right:16, bottom:80, width:56, height:56, borderRadius:'50%', border:'none',
        background:'var(--color-primary-500)', color:'#fff', boxShadow:'0 4px 12px rgba(22,163,74,.4)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <Icon name="plus" size={26} color="#fff" />
    </button>
  );
}

Object.assign(window, { PhoneFrame, StatusBar, ScreenHeader, TabBar, Fab });
