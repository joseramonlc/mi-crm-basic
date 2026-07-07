// CRM Networker — DESKTOP surface. Self-contained, gated on the compiled bundle.
// Layout: fixed 224px sidebar + fluid content. Reuses DS primitives; no FAB (spec).
function useNS() {
  const [ns, setNs] = React.useState(window.EvoluciNLDerDesignSystem_8c407a);
  React.useEffect(() => {
    if (ns) return;
    const t = setInterval(() => {
      const g = window.EvoluciNLDerDesignSystem_8c407a;
      if (g) { setNs(g); clearInterval(t); }
    }, 40);
    return () => clearInterval(t);
  }, [ns]);
  return ns;
}

const DESK_PROSPECTS = [
  { id:1, name:'María Fernández', stage:'contacted', priority:'high', channel:'whatsapp', last:'Último WhatsApp', time:'hace 2 días', phone:'+34 612 345 678' },
  { id:2, name:'Carlos Ruiz', stage:'presented', priority:'medium', channel:'phone', last:'Última llamada', time:'ayer', phone:'+34 698 112 233' },
  { id:3, name:'Lucía Gómez', stage:'new', priority:'low', channel:'instagram', last:'Mensaje IG', time:'hace 5 días', phone:'+34 677 889 900' },
  { id:4, name:'Diego Soto', stage:'evaluating', priority:'high', channel:'phone', last:'Última llamada', time:'hace 3 h', phone:'+34 654 321 098' },
  { id:5, name:'Ana López', stage:'joined', priority:'medium', channel:'mail', last:'Último email', time:'hace 1 sem', phone:'+34 611 223 344' },
  { id:6, name:'Javier Moreno', stage:'contacted', priority:'medium', channel:'whatsapp', last:'Último WhatsApp', time:'hoy', phone:'+34 622 334 455' },
];
const DESK_STAGE_LABELS = { new:'Nuevo', contacted:'Contactado', presented:'Presentación realizada', evaluating:'En valoración', joined:'Incorporado', discarded:'Descartado' };
const DESK_SCREEN_TITLE = { home:'Actividad Diaria', pipe:'Prospectos', resumen:'Resumen' };
const DESK_NAV = [{ key:'home', icon:'home', label:'Inicio' }, { key:'pipe', icon:'users', label:'Prospectos' }, { key:'resumen', icon:'bar-chart-3', label:'Resumen' }];
const DESK_ACCOUNT = { name:'Laura Giménez', email:'laura@evolucionlider.com' };

// ── Sidebar ──────────────────────────────────────────────────────────
function Sidebar({ NS, active, onNav, onAdd, onFire, onLogout }) {
  const { Icon, Button, Avatar, Divider } = NS;
  const Div = Divider || ((p) => <div style={{ height:1, background:'var(--border-default)', ...(p && p.style) }} />);
  const [menu, setMenu] = React.useState(false);
  return (
    <aside style={{ width:224, flex:'none', height:'100%', boxSizing:'border-box', background:'var(--surface-card)', borderRight:'1px solid var(--border-default)', display:'flex', flexDirection:'column', padding:'20px 14px 14px' }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 6px 4px' }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'var(--color-primary-500)', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:2.5, padding:'0 0 8px', flex:'none' }}>
          <span style={{ width:3.5, height:8, borderRadius:1.5, background:'#fff', opacity:.55 }} />
          <span style={{ width:3.5, height:13, borderRadius:1.5, background:'#fff', opacity:.8 }} />
          <span style={{ width:3.5, height:17, borderRadius:1.5, background:'#fff' }} />
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--color-neutral-900)', letterSpacing:'-0.02em', lineHeight:1.1 }}>Evolución<br/>Líder</div>
      </div>

      {/* Primary action — replaces the FAB on desktop */}
      <div style={{ margin:'18px 0 8px' }}>
        <Button variant="primary" size="md" fullWidth iconLeft={<Icon name="plus" size={18} />} onClick={onAdd}>Añadir prospecto</Button>
      </div>

      {/* Nav */}
      <nav style={{ display:'flex', flexDirection:'column', gap:2, marginTop:8 }}>
        {DESK_NAV.map(n => {
          const on = active === n.key;
          return (
            <button key={n.key} onClick={() => onNav(n.key)} style={{ all:'unset', cursor:'pointer', boxSizing:'border-box', display:'flex', alignItems:'center', gap:11, padding:'9px 10px', borderRadius:'var(--radius-md)', background:on ? 'var(--color-primary-50)' : 'transparent', color:on ? 'var(--color-primary-700)' : 'var(--color-neutral-600)' }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.background='var(--color-neutral-50)'; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background='transparent'; }}>
              <Icon name={n.icon} size={19} color={on ? 'var(--color-primary-600)' : 'var(--color-neutral-400)'} />
              <span style={{ fontSize:14, fontWeight:on ? 700 : 500 }}>{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ flex:1 }} />

      {/* Account block — interactive → account menu */}
      <div style={{ position:'relative' }}>
        {menu && (
          <>
            <div onClick={() => setMenu(false)} style={{ position:'fixed', inset:0, zIndex:5 }} />
            <div style={{ position:'absolute', left:0, right:0, bottom:'calc(100% + 8px)', zIndex:6, background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-2)', padding:4, animation:'el-fade-in var(--duration-fast) var(--ease-out)' }}>
              <button onClick={() => { setMenu(false); onFire('Sesión cerrada'); onLogout && onLogout(); }} style={{ all:'unset', cursor:'pointer', boxSizing:'border-box', width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:'var(--radius-sm)', color:'var(--color-error-text)' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--color-error-bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <Icon name="log-out" size={17} color="var(--color-error-text)" />
                <span style={{ fontSize:14, fontWeight:600 }}>Cerrar sesión</span>
              </button>
            </div>
          </>
        )}
        <div style={{ marginBottom:8 }}><Div /></div>
        <button onClick={() => setMenu(m => !m)} style={{ all:'unset', cursor:'pointer', boxSizing:'border-box', width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 8px', borderRadius:'var(--radius-md)', background:menu ? 'var(--color-neutral-50)' : 'transparent' }}
          onMouseEnter={e => { if (!menu) e.currentTarget.style.background='var(--color-neutral-50)'; }}
          onMouseLeave={e => { if (!menu) e.currentTarget.style.background='transparent'; }}>
          <Avatar name={DESK_ACCOUNT.name} size={34} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--color-neutral-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{DESK_ACCOUNT.name}</div>
            <div style={{ fontSize:11, color:'var(--color-neutral-500)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{DESK_ACCOUNT.email}</div>
          </div>
          <Icon name={menu ? 'chevron-right' : 'more-vertical'} size={16} color="var(--color-neutral-400)" />
        </button>
      </div>
    </aside>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────
function ContentHeader({ title, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 32px 18px', borderBottom:'1px solid var(--border-default)' }}>
      <h1 style={{ margin:0, fontSize:24, fontWeight:700, color:'var(--color-neutral-900)', letterSpacing:'-0.02em' }}>{title}</h1>
      {right}
    </div>
  );
}
function DeskKpi({ value, label, tone }) {
  const bg = tone==='warning' ? 'var(--color-warning-bg)' : 'var(--color-primary-50)';
  const fg = tone==='warning' ? 'var(--color-warning-text)' : 'var(--color-primary-700)';
  return (
    <div style={{ background:bg, borderRadius:'var(--radius-lg)', padding:'16px 18px' }}>
      <div style={{ fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:30, fontWeight:700, color:fg, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:13, color:fg, opacity:.85, marginTop:2 }}>{label}</div>
    </div>
  );
}
function DeskSectionTitle({ NS, icon, children }) {
  const { Icon } = NS;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, margin:'26px 0 14px' }}>
      <Icon name={icon} size={16} color="var(--color-neutral-400)" />
      <span style={{ fontSize:13, fontWeight:700, letterSpacing:'.02em', textTransform:'uppercase', color:'var(--color-neutral-500)' }}>{children}</span>
    </div>
  );
}

// ── Inicio (desktop) ─────────────────────────────────────────────────
function HomeView({ NS, onOpen, onAction }) {
  const { ProspectCard } = NS;
  const today = DESK_PROSPECTS.filter(p => ['hoy','hace 3 h','ayer'].includes(p.time));
  return (
    <div style={{ padding:'24px 32px 40px' }}>
      <div style={{ fontSize:14, color:'var(--color-neutral-500)' }}>Miércoles, 2 de julio</div>
      <div style={{ fontSize:16, color:'var(--color-neutral-600)', marginTop:2 }}>Tienes <strong style={{ color:'var(--color-neutral-900)' }}>3 tareas</strong> y <strong style={{ color:'var(--color-neutral-900)' }}>2 nuevos prospectos</strong> hoy.</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginTop:18 }}>
        <DeskKpi value="3" label="Pendientes hoy" tone="warning" />
        <DeskKpi value="12" label="Esta semana" tone="primary" />
        <DeskKpi value="6" label="Prospectos activos" tone="primary" />
        <DeskKpi value="1" label="Incorporados" tone="primary" />
      </div>
      <DeskSectionTitle NS={NS} icon="clock">Actividad reciente</DeskSectionTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
        {today.map(p => <ProspectCard key={p.id} name={p.name} stage={p.stage} priority={p.priority} channel={p.channel} lastInteraction={p.last} timeAgo={p.time} onOpen={() => onOpen(p)} onCall={() => onAction('Llamando a '+p.name)} onWhatsApp={() => onAction('WhatsApp a '+p.name)} onNote={() => onAction('Nota para '+p.name)} />)}
      </div>
    </div>
  );
}

// ── Prospectos (desktop grid) ────────────────────────────────────────
function PipelineView({ NS, onOpen, onAction }) {
  const { ProspectCard, FilterChip } = NS;
  const [active, setActive] = React.useState('all');
  const chips = [['all','Todos'],['high','Alta prioridad'],['contacted','Contactado'],['new','Nuevos'],['evaluating','En valoración']];
  const list = DESK_PROSPECTS.filter(p => active==='all' ? true : active==='high' ? p.priority==='high' : p.stage===active);
  return (
    <div style={{ padding:'20px 32px 40px' }}>
      <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>{chips.map(([k,l]) => <FilterChip key={k} active={active===k} onClick={()=>setActive(k)}>{l}</FilterChip>)}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
        {list.map(p => <ProspectCard key={p.id} name={p.name} stage={p.stage} priority={p.priority} channel={p.channel} lastInteraction={p.last} timeAgo={p.time} onOpen={() => onOpen(p)} onCall={() => onAction('Llamando a '+p.name)} onWhatsApp={() => onAction('WhatsApp a '+p.name)} onNote={() => onAction('Nota para '+p.name)} />)}
      </div>
    </div>
  );
}

// ── Resumen (desktop) ────────────────────────────────────────────────
function ResumenView({ NS }) {
  const counts = {}; DESK_PROSPECTS.forEach(p => { counts[p.stage] = (counts[p.stage]||0)+1; });
  const order = ['new','contacted','presented','evaluating','joined','discarded'];
  const max = Math.max(...order.map(s => counts[s]||0), 1);
  const Stat = ({ n, l }) => <div style={{ textAlign:'center', flex:1 }}><div style={{ fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:26, fontWeight:700, color:'var(--color-primary-600)' }}>{n}</div><div style={{ fontSize:12, color:'var(--color-neutral-500)', marginTop:3 }}>{l}</div></div>;
  return (
    <div style={{ padding:'24px 32px 40px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18, alignItems:'start' }}>
        <div>
          <DeskSectionTitle NS={NS} icon="layers">Embudo por etapa</DeskSectionTitle>
          <div style={{ background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-1)', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
            {order.map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ width:150, flex:'none', fontSize:13, color:'var(--color-neutral-600)' }}>{DESK_STAGE_LABELS[s]}</span>
                <div style={{ flex:1, height:12, borderRadius:6, background:'var(--color-neutral-100)', overflow:'hidden' }}><div style={{ height:'100%', borderRadius:6, width:`${((counts[s]||0)/max)*100}%`, background:`var(--color-stage-${s}-dot)` }} /></div>
                <span style={{ width:22, textAlign:'right', fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:15, fontWeight:600, color:'var(--color-neutral-900)' }}>{counts[s]||0}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <DeskSectionTitle NS={NS} icon="bar-chart-3">Conversión</DeskSectionTitle>
          <div style={{ background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-1)', padding:'22px 18px', display:'flex', flexDirection:'column', gap:18 }}>
            <Stat n="50%" l="Contacto → Presentación" />
            <div style={{ height:1, background:'var(--border-default)' }} />
            <Stat n="33%" l="Presentación → Valoración" />
            <div style={{ height:1, background:'var(--border-default)' }} />
            <Stat n="17%" l="Tasa de cierre" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ficha (desktop drawer) ───────────────────────────────────────────
function FichaDrawer({ NS, prospect, onClose, onAction }) {
  const { Icon, Avatar, StageBadge, PriorityBadge, Button } = NS;
  const p = prospect;
  const timeline = [
    { icon:'phone', text:'Llamada · 8 min', time:p.time, note:'Interesado, pide más info.' },
    { icon:'message-circle', text:'WhatsApp enviado', time:'hace 4 días', note:'Compartido vídeo de presentación.' },
    { icon:'user', text:'Prospecto creado', time:'hace 1 sem', note:'Contacto desde Instagram.' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.45)', animation:'el-fade-in var(--duration-base) ease' }} />
      <div style={{ position:'relative', width:400, height:'100%', boxSizing:'border-box', background:'var(--surface-card)', boxShadow:'var(--shadow-3)', overflowY:'auto', padding:'22px 24px 32px', animation:'el-fade-in var(--duration-base) ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <Avatar name={p.name} size={52} priority={p.priority} />
          <button onClick={onClose} style={{ all:'unset', cursor:'pointer', padding:4 }}><Icon name="x" size={20} color="var(--color-neutral-400)" /></button>
        </div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--color-neutral-900)', letterSpacing:'-0.01em', marginTop:12 }}>{p.name}</div>
        <div style={{ fontSize:14, color:'var(--color-neutral-500)', marginTop:2, fontFeatureSettings:'var(--num-features)' }}>{p.phone}</div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}><StageBadge stage={p.stage} /><PriorityBadge level={p.priority} /></div>
        <div style={{ display:'flex', gap:8, marginTop:18 }}>
          <Button variant="primary" size="sm" iconLeft={<Icon name="phone" size={16} />} onClick={() => onAction('Llamando a '+p.name)}>Llamar</Button>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="message-circle" size={16} />} onClick={() => onAction('WhatsApp a '+p.name)}>WhatsApp</Button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, margin:'26px 0 14px' }}>
          <Icon name="layers" size={16} color="var(--color-neutral-400)" />
          <span style={{ fontSize:13, fontWeight:700, letterSpacing:'.02em', textTransform:'uppercase', color:'var(--color-neutral-500)' }}>Historial</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          {timeline.map((e, i) => (
            <div key={i} style={{ display:'flex', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <span style={{ width:32, height:32, borderRadius:'50%', background:'var(--color-primary-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}><Icon name={e.icon} size={15} color="var(--color-primary-600)" /></span>
                {i < timeline.length-1 && <span style={{ width:2, flex:1, background:'var(--border-default)', margin:'4px 0' }} />}
              </div>
              <div style={{ paddingBottom:18, flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}><span style={{ fontSize:14, fontWeight:600, color:'var(--color-neutral-900)' }}>{e.text}</span><span style={{ fontSize:12, color:'var(--color-neutral-400)', flex:'none' }}>{e.time}</span></div>
                <div style={{ fontSize:13, color:'var(--color-neutral-500)', marginTop:2 }}>{e.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Nuevo prospecto (centered modal on desktop) ──────────────────────
function NuevoModal({ NS, onClose, onSave }) {
  const { Button, Input, Select } = NS;
  const [name, setName] = React.useState('');
  const [stage, setStage] = React.useState('new');
  const [prio, setPrio] = React.useState('medium');
  return (
    <div style={{ position:'absolute', inset:0, zIndex:25, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.45)', animation:'el-fade-in var(--duration-base) ease' }} />
      <div style={{ position:'relative', width:420, boxSizing:'border-box', background:'var(--surface-card)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-3)', padding:'22px 24px 24px', animation:'el-fade-in var(--duration-base) ease' }}>
        <div style={{ fontSize:20, fontWeight:700, color:'var(--color-neutral-900)', marginBottom:18 }}>Nuevo prospecto</div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Nombre" placeholder="Nombre y apellidos" value={name} onChange={e=>setName(e.target.value)} />
          <Select label="Etapa" value={stage} onChange={setStage} options={Object.keys(DESK_STAGE_LABELS).map(k => ({ value:k, label:DESK_STAGE_LABELS[k] }))} />
          <Select label="Prioridad" value={prio} onChange={setPrio} options={[{value:'high',label:'Alta'},{value:'medium',label:'Media'},{value:'low',label:'Baja'}]} />
          <div style={{ display:'flex', gap:10, marginTop:6, justifyContent:'flex-end' }}><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => onSave(name || 'Nuevo prospecto')}>Guardar</Button></div>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', bottom:24, zIndex:40, background:'var(--color-neutral-900)', color:'#fff', borderRadius:'var(--radius-md)', padding:'12px 18px', fontSize:14, fontWeight:500, boxShadow:'var(--shadow-3)', animation:'el-fade-in var(--duration-base) ease' }}>{msg}</div>;
}

function CrmDesktop({ onLogout }) {
  const NS = useNS();
  const [tab, setTab] = React.useState('home');
  const [ficha, setFicha] = React.useState(null);
  const [modal, setModal] = React.useState(false);
  const [toast, setToast] = React.useState('');
  if (!NS) return <div style={{ height:'100%', background:'var(--surface-app)' }} />;
  const fire = (m) => { setToast(m); clearTimeout(window.__dT); window.__dT = setTimeout(() => setToast(''), 1800); };
  return (
    <div style={{ position:'relative', display:'flex', height:'100%', background:'var(--surface-app)', fontFamily:'var(--font-sans)', overflow:'hidden' }}>
      <Sidebar NS={NS} active={tab} onNav={setTab} onAdd={() => setModal(true)} onFire={fire} onLogout={onLogout} />
      <main style={{ flex:1, minWidth:0, overflowY:'auto', display:'flex', flexDirection:'column' }}>
        <ContentHeader title={DESK_SCREEN_TITLE[tab]} />
        {tab === 'home' ? <HomeView NS={NS} onOpen={setFicha} onAction={fire} />
          : tab === 'pipe' ? <PipelineView NS={NS} onOpen={setFicha} onAction={fire} />
          : <ResumenView NS={NS} />}
      </main>
      {ficha && <FichaDrawer NS={NS} prospect={ficha} onClose={() => setFicha(null)} onAction={fire} />}
      {modal && <NuevoModal NS={NS} onClose={() => setModal(false)} onSave={(n) => { setModal(false); fire(n + ' añadido'); }} />}
      <Toast msg={toast} />
    </div>
  );
}

if (typeof module !== 'undefined') module.exports = { CrmDesktop };
window.CrmDesktop = CrmDesktop;
