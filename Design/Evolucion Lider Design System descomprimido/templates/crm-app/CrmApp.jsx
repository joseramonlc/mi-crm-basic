// CRM Networker — full interactive app, self-contained for the template.
// Gated on the compiled bundle global.
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

const PROSPECTS = [
  { id:1, name:'María Fernández', stage:'contacted', priority:'high', channel:'whatsapp', last:'Último WhatsApp', time:'hace 2 días', phone:'+34 612 345 678' },
  { id:2, name:'Carlos Ruiz', stage:'presented', priority:'medium', channel:'phone', last:'Última llamada', time:'ayer', phone:'+34 698 112 233' },
  { id:3, name:'Lucía Gómez', stage:'new', priority:'low', channel:'instagram', last:'Mensaje IG', time:'hace 5 días', phone:'+34 677 889 900' },
  { id:4, name:'Diego Soto', stage:'evaluating', priority:'high', channel:'phone', last:'Última llamada', time:'hace 3 h', phone:'+34 654 321 098' },
  { id:5, name:'Ana López', stage:'joined', priority:'medium', channel:'mail', last:'Último email', time:'hace 1 sem', phone:'+34 611 223 344' },
  { id:6, name:'Javier Moreno', stage:'contacted', priority:'medium', channel:'whatsapp', last:'Último WhatsApp', time:'hoy', phone:'+34 622 334 455' },
];
const STAGE_LABELS = { new:'Nuevo', contacted:'Contactado', presented:'Presentación realizada', evaluating:'En valoración', joined:'Incorporado', discarded:'Descartado' };
const SCREEN_TITLE = { home:'Actividad Diaria', pipe:'Prospectos', resumen:'Resumen' };
const ACCOUNT = { name:'Laura Giménez', email:'laura@evolucionlider.com' };
const TABS = [{ key:'home', icon:'home', label:'Inicio' }, { key:'pipe', icon:'users', label:'Prospectos' }, { key:'resumen', icon:'bar-chart-3', label:'Resumen' }];

function PhoneFrame({ children }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'32px 0', fontFamily:'var(--font-sans)' }}>
      <div style={{ width:390, height:800, background:'#000', borderRadius:44, padding:11, boxShadow:'0 30px 70px rgba(15,23,42,.30)', flex:'none' }}>
        <div style={{ position:'relative', width:'100%', height:'100%', background:'var(--surface-app)', borderRadius:34, overflow:'hidden', display:'flex', flexDirection:'column' }}>{children}</div>
      </div>
    </div>
  );
}
function StatusBar({ Icon }) {
  const c = 'var(--color-neutral-900)';
  return (
    <div style={{ height:44, flex:'none', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', color:c, fontSize:13, fontWeight:600 }}>
      <span style={{ fontFeatureSettings:'var(--num-features)' }}>9:41</span>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <Icon name="bar-chart-3" size={15} color={c} /><Icon name="info" size={14} color={c} />
        <div style={{ width:22, height:11, border:`1.5px solid ${c}`, borderRadius:3, position:'relative', opacity:.9 }}><div style={{ position:'absolute', inset:1.5, background:c, borderRadius:1, width:'72%' }} /></div>
      </div>
    </div>
  );
}
function ScreenHeader({ Icon, title, onBack, action }) {
  return (
    <div style={{ height:56, flex:'none', display:'flex', alignItems:'center', gap:8, padding:'0 16px', background:'var(--surface-card)', borderBottom:'1px solid var(--border-default)' }}>
      {onBack && <button onClick={onBack} style={{ all:'unset', cursor:'pointer', display:'flex', width:36, height:36, alignItems:'center', justifyContent:'center', marginLeft:-6 }}><Icon name="arrow-left" size={22} color="var(--color-neutral-700)" /></button>}
      <span style={{ fontSize:18, fontWeight:600, color:'var(--color-neutral-900)', letterSpacing:'-0.01em', flex:1 }}>{title}</span>
      {action}
    </div>
  );
}
function TabBar({ Icon, active, onChange }) {
  return (
    <div style={{ height:64, flex:'none', display:'flex', background:'var(--surface-card)', borderTop:'1px solid var(--border-default)', boxShadow:'0 -1px 3px rgba(15,23,42,.04)' }}>
      {TABS.map(t => {
        const on = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{ all:'unset', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', position:'relative', paddingBottom:8 }}>
            {on && <span style={{ position:'absolute', top:0, width:28, height:3, borderRadius:'0 0 3px 3px', background:'var(--color-primary-500)' }} />}
            <Icon name={t.icon} size={22} color={on ? 'var(--color-primary-600)' : 'var(--color-neutral-400)'} />
            <span style={{ fontSize:11, fontWeight:on?700:500, color:on ? 'var(--color-primary-700)' : 'var(--color-neutral-400)' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function Fab({ Icon, onClick }) {
  return <button onClick={onClick} aria-label="Nuevo prospecto" style={{ position:'absolute', right:16, bottom:80, width:56, height:56, borderRadius:'50%', border:'none', background:'var(--color-primary-500)', color:'#fff', boxShadow:'0 4px 12px rgba(22,163,74,.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}><Icon name="plus" size={26} color="#fff" /></button>;
}
function Kpi({ value, label, tone }) {
  const bg = tone==='warning' ? 'var(--color-warning-bg)' : 'var(--color-primary-50)';
  const fg = tone==='warning' ? 'var(--color-warning-text)' : 'var(--color-primary-700)';
  return (
    <div style={{ flex:1, background:bg, borderRadius:'var(--radius-lg)', padding:'14px 16px' }}>
      <div style={{ fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:32, fontWeight:700, color:fg, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:13, color:fg, opacity:.85, marginTop:2 }}>{label}</div>
    </div>
  );
}
function SectionTitle({ Icon, icon, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, margin:'22px 0 12px' }}>
      <Icon name={icon} size={16} color="var(--color-neutral-400)" />
      <span style={{ fontSize:13, fontWeight:700, letterSpacing:'.02em', textTransform:'uppercase', color:'var(--color-neutral-500)' }}>{children}</span>
    </div>
  );
}

function ActividadDiaria({ NS, onOpen, onAction }) {
  const { Icon, ProspectCard, PriorityBadge } = NS;
  const today = PROSPECTS.filter(p => ['hoy','hace 3 h','ayer'].includes(p.time));
  const tasks = [
    { id:1, name:'María Fernández', task:'Llamar para confirmar presentación', icon:'phone', prio:'high' },
    { id:2, name:'Diego Soto', task:'Enviar propuesta por WhatsApp', icon:'message-circle', prio:'high' },
    { id:3, name:'Javier Moreno', task:'Hacer seguimiento', icon:'clock', prio:'medium' },
  ];
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 96px' }}>
      <div style={{ fontSize:13, color:'var(--color-neutral-500)' }}>Lunes, 29 de junio</div>
      <div style={{ fontSize:15, color:'var(--color-neutral-600)', marginTop:2 }}>Tienes <strong style={{ color:'var(--color-neutral-900)' }}>3 tareas</strong> y <strong style={{ color:'var(--color-neutral-900)' }}>2 nuevos prospectos</strong> hoy.</div>
      <div style={{ display:'flex', gap:10, marginTop:16 }}><Kpi value="3" label="Pendientes hoy" tone="warning" /><Kpi value="12" label="Esta semana" tone="primary" /></div>
      <SectionTitle Icon={Icon} icon="star">Para hoy</SectionTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {tasks.map(t => (
          <div key={t.id} onClick={() => onOpen(PROSPECTS.find(p=>p.name===t.name)||PROSPECTS[0])} style={{ display:'flex', alignItems:'center', gap:12, background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-1)', padding:'12px 14px', cursor:'pointer' }}>
            <span style={{ width:36, height:36, borderRadius:'50%', background:'var(--color-primary-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}><Icon name={t.icon} size={18} color="var(--color-primary-600)" /></span>
            <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:15, fontWeight:600, color:'var(--color-neutral-900)' }}>{t.name}</div><div style={{ fontSize:13, color:'var(--color-neutral-500)' }}>{t.task}</div></div>
            <PriorityBadge level={t.prio} dotOnly size={10} />
          </div>
        ))}
      </div>
      <SectionTitle Icon={Icon} icon="clock">Actividad reciente</SectionTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {today.map(p => <ProspectCard key={p.id} name={p.name} stage={p.stage} priority={p.priority} channel={p.channel} lastInteraction={p.last} timeAgo={p.time} onOpen={() => onOpen(p)} onCall={() => onAction('Llamando a '+p.name)} onWhatsApp={() => onAction('WhatsApp a '+p.name)} onNote={() => onAction('Nota para '+p.name)} />)}
      </div>
    </div>
  );
}

function Pipeline({ NS, onOpen, onAction }) {
  const { Icon, ProspectCard, FilterChip, CountBadge, EmptyState } = NS;
  const [active, setActive] = React.useState('all');
  const chips = [['all','Todos'],['high','Alta prioridad'],['contacted','Contactado'],['new','Nuevos'],['evaluating','En valoración']];
  const list = PROSPECTS.filter(p => active==='all' ? true : active==='high' ? p.priority==='high' : p.stage===active);
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'var(--surface-card)', borderBottom:'1px solid var(--border-default)' }}>
        <div style={{ display:'flex', gap:8, overflowX:'auto', flex:1, scrollbarWidth:'none' }}>{chips.map(([k,l]) => <FilterChip key={k} active={active===k} onClick={()=>setActive(k)}>{l}</FilterChip>)}</div>
        <button style={{ position:'relative', width:34, height:34, borderRadius:'50%', border:'1px solid var(--border-strong)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flex:'none', cursor:'pointer' }}><Icon name="menu" size={18} color="var(--color-neutral-600)" /><span style={{ position:'absolute', top:-5, right:-5 }}><CountBadge count={2} /></span></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 96px', display:'flex', flexDirection:'column', gap:10 }}>
        {list.length === 0 ? <EmptyState icon="users" title="Sin resultados" description="No hay prospectos en este filtro todavía." /> : list.map(p => <ProspectCard key={p.id} name={p.name} stage={p.stage} priority={p.priority} channel={p.channel} lastInteraction={p.last} timeAgo={p.time} onOpen={() => onOpen(p)} onCall={() => onAction('Llamando a '+p.name)} onWhatsApp={() => onAction('WhatsApp a '+p.name)} onNote={() => onAction('Nota para '+p.name)} />)}
      </div>
    </div>
  );
}

function Resumen({ NS }) {
  const { Icon } = NS;
  const counts = {}; PROSPECTS.forEach(p => { counts[p.stage] = (counts[p.stage]||0)+1; });
  const order = ['new','contacted','presented','evaluating','joined','discarded'];
  const max = Math.max(...order.map(s => counts[s]||0), 1);
  const Stat = ({ n, l }) => <div style={{ textAlign:'center', flex:1 }}><div style={{ fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:22, fontWeight:700, color:'var(--color-primary-600)' }}>{n}</div><div style={{ fontSize:11, color:'var(--color-neutral-500)', marginTop:3 }}>{l}</div></div>;
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 96px' }}>
      <div style={{ display:'flex', gap:10 }}><Kpi value={String(PROSPECTS.length)} label="Prospectos activos" tone="primary" /><Kpi value="1" label="Incorporados" tone="primary" /></div>
      <SectionTitle Icon={Icon} icon="layers">Embudo por etapa</SectionTitle>
      <div style={{ background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-1)', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
        {order.map(s => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ width:118, flex:'none', fontSize:12, color:'var(--color-neutral-600)' }}>{STAGE_LABELS[s]}</span>
            <div style={{ flex:1, height:10, borderRadius:5, background:'var(--color-neutral-100)', overflow:'hidden' }}><div style={{ height:'100%', borderRadius:5, width:`${((counts[s]||0)/max)*100}%`, background:`var(--color-stage-${s}-dot)` }} /></div>
            <span style={{ width:18, textAlign:'right', fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:14, fontWeight:600, color:'var(--color-neutral-900)' }}>{counts[s]||0}</span>
          </div>
        ))}
      </div>
      <SectionTitle Icon={Icon} icon="bar-chart-3">Conversión</SectionTitle>
      <div style={{ background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-1)', padding:'18px 16px', display:'flex', justifyContent:'space-between' }}>
        <Stat n="50%" l="Contacto → Pres." /><Stat n="33%" l="Pres. → Valoración" /><Stat n="17%" l="Tasa de cierre" />
      </div>
    </div>
  );
}

function Ficha({ NS, prospect, onAction }) {
  const { Icon, Avatar, StageBadge, PriorityBadge } = NS;
  const p = prospect;
  const timeline = [
    { icon:'phone', text:'Llamada · 8 min', time:p.time, note:'Interesado, pide más info.' },
    { icon:'message-circle', text:'WhatsApp enviado', time:'hace 4 días', note:'Compartido vídeo de presentación.' },
    { icon:'user', text:'Prospecto creado', time:'hace 1 sem', note:'Contacto desde Instagram.' },
  ];
  const QuickAction = ({ icon, label, onClick }) => <button onClick={onClick} style={{ all:'unset', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 0', background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)' }}><Icon name={icon} size={20} color="var(--color-primary-600)" /><span style={{ fontSize:12, fontWeight:600, color:'var(--color-neutral-700)' }}>{label}</span></button>;
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center' }}>
        <Avatar name={p.name} size={56} priority={p.priority} />
        <div><div style={{ fontSize:22, fontWeight:700, color:'var(--color-neutral-900)', letterSpacing:'-0.01em' }}>{p.name}</div><div style={{ fontSize:14, color:'var(--color-neutral-500)', marginTop:2, fontFeatureSettings:'var(--num-features)' }}>{p.phone}</div></div>
        <div style={{ display:'flex', gap:8 }}><StageBadge stage={p.stage} /><PriorityBadge level={p.priority} /></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:20 }}>
        <QuickAction icon="phone" label="Llamar" onClick={() => onAction('Llamando a '+p.name)} />
        <QuickAction icon="message-circle" label="WhatsApp" onClick={() => onAction('WhatsApp a '+p.name)} />
        <QuickAction icon="square-pen" label="Interacción" onClick={() => onAction('Registrar interacción')} />
      </div>
      <SectionTitle Icon={Icon} icon="layers">Historial</SectionTitle>
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
  );
}

function NuevoProspecto({ NS, onClose, onSave }) {
  const { Button, Input, Select } = NS;
  const [name, setName] = React.useState('');
  const [stage, setStage] = React.useState('new');
  const [prio, setPrio] = React.useState('medium');
  return (
    <div style={{ position:'absolute', inset:0, zIndex:30, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.45)', animation:'el-fade-in var(--duration-base) ease' }} />
      <div style={{ position:'relative', background:'var(--surface-card)', borderRadius:'20px 20px 0 0', boxShadow:'var(--shadow-3)', padding:'10px 20px 24px', animation:'el-sheet-up var(--duration-slow) var(--ease-out)' }}>
        <div style={{ width:40, height:4, borderRadius:2, background:'var(--color-neutral-200)', margin:'0 auto 14px' }} />
        <div style={{ fontSize:20, fontWeight:700, color:'var(--color-neutral-900)', marginBottom:18 }}>Nuevo prospecto</div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Nombre" placeholder="Nombre y apellidos" value={name} onChange={e=>setName(e.target.value)} />
          <Select label="Etapa" value={stage} onChange={setStage} options={Object.keys(STAGE_LABELS).map(k => ({ value:k, label:STAGE_LABELS[k] }))} />
          <Select label="Prioridad" value={prio} onChange={setPrio} options={[{value:'high',label:'Alta'},{value:'medium',label:'Media'},{value:'low',label:'Baja'}]} />
          <div style={{ display:'flex', gap:10, marginTop:6 }}><Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button><Button variant="primary" fullWidth onClick={() => onSave(name || 'Nuevo prospecto')}>Guardar</Button></div>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position:'absolute', left:16, right:16, bottom:84, zIndex:40, background:'var(--color-neutral-900)', color:'#fff', borderRadius:'var(--radius-md)', padding:'12px 16px', fontSize:14, fontWeight:500, boxShadow:'var(--shadow-3)', animation:'el-fade-in var(--duration-base) ease' }}>{msg}</div>;
}

// Account avatar button (top-right of root headers)
function AccountButton({ NS, onClick }) {
  const { Avatar } = NS;
  return (
    <button onClick={onClick} aria-label="Cuenta" style={{ all:'unset', cursor:'pointer', display:'flex', borderRadius:'50%' }}>
      <Avatar name={ACCOUNT.name} size={28} />
    </button>
  );
}

// Account bottom sheet with logout
function AccountSheet({ NS, onClose, onLogout }) {
  const { Avatar, Icon } = NS;
  const Divider = NS.Divider || ((p) => <div style={{ height:1, background:'var(--border-default)', ...(p && p.style) }} />);
  return (
    <div style={{ position:'absolute', inset:0, zIndex:35, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.45)', animation:'el-fade-in var(--duration-base) ease' }} />
      <div style={{ position:'relative', background:'var(--surface-card)', borderRadius:'var(--radius-lg) var(--radius-lg) 0 0', boxShadow:'var(--shadow-3)', padding:'10px 20px 24px', animation:'el-sheet-up var(--duration-slow) var(--ease-out)' }}>
        <div style={{ width:40, height:4, borderRadius:2, background:'var(--color-neutral-200)', margin:'0 auto 18px' }} />
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Avatar name={ACCOUNT.name} size={48} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--color-neutral-900)' }}>{ACCOUNT.name}</div>
            <div style={{ fontSize:13, color:'var(--color-neutral-500)', fontFeatureSettings:'var(--num-features)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ACCOUNT.email}</div>
          </div>
        </div>
        <div style={{ margin:'16px 0' }}><Divider /></div>
        <button onClick={onLogout} style={{ all:'unset', cursor:'pointer', boxSizing:'border-box', width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px', borderRadius:'var(--radius-md)', color:'var(--color-error-text)' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--color-error-bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <Icon name="log-out" size={19} color="var(--color-error-text)" />
          <span style={{ fontSize:15, fontWeight:600 }}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

function CrmApp() {
  const NS = useNS();
  const [tab, setTab] = React.useState('home');
  const [ficha, setFicha] = React.useState(null);
  const [sheet, setSheet] = React.useState(false);
  const [account, setAccount] = React.useState(false);
  const [toast, setToast] = React.useState('');
  if (!NS) return <PhoneFrame><div /></PhoneFrame>;
  const { Icon } = NS;
  const fire = (m) => { setToast(m); clearTimeout(window.__crmT); window.__crmT = setTimeout(() => setToast(''), 1800); };
  const isRoot = !ficha;
  return (
    <PhoneFrame>
      <StatusBar Icon={Icon} />
      {ficha
        ? <ScreenHeader Icon={Icon} title="Ficha del prospecto" onBack={() => setFicha(null)} action={<button style={{ all:'unset', cursor:'pointer', padding:6 }}><Icon name="more-vertical" size={20} color="var(--color-neutral-500)" /></button>} />
        : <ScreenHeader Icon={Icon} title={SCREEN_TITLE[tab]} action={<AccountButton NS={NS} onClick={() => setAccount(true)} />} />}
      {ficha ? <Ficha NS={NS} prospect={ficha} onAction={fire} />
        : tab === 'home' ? <ActividadDiaria NS={NS} onOpen={setFicha} onAction={fire} />
        : tab === 'pipe' ? <Pipeline NS={NS} onOpen={setFicha} onAction={fire} />
        : <Resumen NS={NS} />}
      {isRoot && <Fab Icon={Icon} onClick={() => setSheet(true)} />}
      {isRoot && <TabBar Icon={Icon} active={tab} onChange={setTab} />}
      {sheet && <NuevoProspecto NS={NS} onClose={() => setSheet(false)} onSave={(n) => { setSheet(false); fire(n + ' añadido'); }} />}
      {account && <AccountSheet NS={NS} onClose={() => setAccount(false)} onLogout={() => { setAccount(false); fire('Sesión cerrada'); }} />}
      <Toast msg={toast} />
    </PhoneFrame>
  );
}

if (typeof module !== 'undefined') module.exports = { CrmApp };
window.CrmApp = CrmApp;
