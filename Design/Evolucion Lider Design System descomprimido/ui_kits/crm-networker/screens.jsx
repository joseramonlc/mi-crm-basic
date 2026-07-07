// CRM Networker — screens. Composes design-system primitives + shell.
const _NS = window.EvoluciNLDerDesignSystem_8c407a;
const { Icon: _Icon, Button: _Btn, ProspectCard: _PCard, FilterChip: _Chip, CountBadge: _Count,
        StageBadge: _Stage, PriorityBadge: _Prio, Avatar: _Av, Input: _Input, Select: _Select,
        EmptyState: _Empty } = _NS;
const _Div = _NS.Divider || ((p) => <div style={{ height:1, background:'var(--border-default)', ...(p && p.style) }} />);

const ACCOUNT = { name:'Laura Giménez', email:'laura@evolucionlider.com' };

// ── Account avatar button + bottom sheet with logout ────────────────
function AccountButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Cuenta" style={{ all:'unset', cursor:'pointer', display:'flex', borderRadius:'50%' }}>
      <_Av name={ACCOUNT.name} size={28} />
    </button>
  );
}
function AccountSheet({ onClose, onLogout }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:35, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.45)', animation:'el-fade-in var(--duration-base) ease' }} />
      <div style={{ position:'relative', background:'var(--surface-card)', borderRadius:'var(--radius-lg) var(--radius-lg) 0 0', boxShadow:'var(--shadow-3)', padding:'10px 20px 24px', animation:'el-sheet-up var(--duration-slow) var(--ease-out)' }}>
        <div style={{ width:40, height:4, borderRadius:2, background:'var(--color-neutral-200)', margin:'0 auto 18px' }} />
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <_Av name={ACCOUNT.name} size={48} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--color-neutral-900)' }}>{ACCOUNT.name}</div>
            <div style={{ fontSize:13, color:'var(--color-neutral-500)', fontFeatureSettings:'var(--num-features)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ACCOUNT.email}</div>
          </div>
        </div>
        <div style={{ margin:'16px 0' }}><_Div /></div>
        <button onClick={onLogout} style={{ all:'unset', cursor:'pointer', boxSizing:'border-box', width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px', borderRadius:'var(--radius-md)', color:'var(--color-error-text)' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--color-error-bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <_Icon name="log-out" size={19} color="var(--color-error-text)" />
          <span style={{ fontSize:15, fontWeight:600 }}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

const STAGE_LABELS = { new:'Nuevo', contacted:'Contactado', presented:'Presentación realizada', evaluating:'En valoración', joined:'Incorporado', discarded:'Descartado' };

// ── Inicio · Actividad Diaria ────────────────────────────────────────
function ActividadDiaria({ onOpen, onAction }) {
  const today = window.PROSPECTS.filter(p => ['hoy','hace 3 h','ayer'].includes(p.time));
  const tasks = [
    { id:1, name:'María Fernández', task:'Llamar para confirmar presentación', icon:'phone', prio:'high' },
    { id:2, name:'Diego Soto', task:'Enviar propuesta por WhatsApp', icon:'message-circle', prio:'high' },
    { id:3, name:'Javier Moreno', task:'Hacer seguimiento', icon:'clock', prio:'medium' },
  ];
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 96px' }}>
      <div style={{ fontSize:13, color:'var(--color-neutral-500)' }}>Lunes, 29 de junio</div>
      <div style={{ fontSize:15, color:'var(--color-neutral-600)', marginTop:2 }}>Tienes <strong style={{ color:'var(--color-neutral-900)' }}>3 tareas</strong> y <strong style={{ color:'var(--color-neutral-900)' }}>2 nuevos prospectos</strong> hoy.</div>

      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        <Kpi value="3" label="Pendientes hoy" tone="warning" />
        <Kpi value="12" label="Esta semana" tone="primary" />
      </div>

      <SectionTitle icon="star">Para hoy</SectionTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {tasks.map(t => (
          <div key={t.id} onClick={() => onOpen(window.PROSPECTS.find(p=>p.name===t.name)||window.PROSPECTS[0])}
            style={{ display:'flex', alignItems:'center', gap:12, background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-1)', padding:'12px 14px', cursor:'pointer' }}>
            <span style={{ width:36, height:36, borderRadius:'50%', background:'var(--color-primary-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}>
              <_Icon name={t.icon} size={18} color="var(--color-primary-600)" />
            </span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--color-neutral-900)' }}>{t.name}</div>
              <div style={{ fontSize:13, color:'var(--color-neutral-500)' }}>{t.task}</div>
            </div>
            <_Prio level={t.prio} dotOnly size={10} />
          </div>
        ))}
      </div>

      <SectionTitle icon="clock">Actividad reciente</SectionTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {today.map(p => (
          <_PCard key={p.id} name={p.name} stage={p.stage} priority={p.priority} channel={p.channel}
            lastInteraction={p.last} timeAgo={p.time}
            onOpen={() => onOpen(p)} onCall={() => onAction('Llamando a '+p.name)} onWhatsApp={() => onAction('WhatsApp a '+p.name)} onNote={() => onAction('Nota para '+p.name)} />
        ))}
      </div>
    </div>
  );
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

function SectionTitle({ icon, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, margin:'22px 0 12px' }}>
      <_Icon name={icon} size={16} color="var(--color-neutral-400)" />
      <span style={{ fontSize:13, fontWeight:700, letterSpacing:'.02em', textTransform:'uppercase', color:'var(--color-neutral-500)' }}>{children}</span>
    </div>
  );
}

// ── Prospectos · Pipeline ────────────────────────────────────────────
function Pipeline({ onOpen, onAction }) {
  const [active, setActive] = React.useState('all');
  const chips = [['all','Todos'],['high','Alta prioridad'],['contacted','Contactado'],['new','Nuevos'],['evaluating','En valoración']];
  const list = window.PROSPECTS.filter(p => active==='all' ? true : active==='high' ? p.priority==='high' : p.stage===active);
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'var(--surface-card)', borderBottom:'1px solid var(--border-default)' }}>
        <div style={{ display:'flex', gap:8, overflowX:'auto', flex:1, scrollbarWidth:'none' }}>
          {chips.map(([k,l]) => <_Chip key={k} active={active===k} onClick={()=>setActive(k)}>{l}</_Chip>)}
        </div>
        <button style={{ position:'relative', width:34, height:34, borderRadius:'50%', border:'1px solid var(--border-strong)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flex:'none', cursor:'pointer' }}>
          <_Icon name="menu" size={18} color="var(--color-neutral-600)" />
          <span style={{ position:'absolute', top:-5, right:-5 }}><_Count count={2} /></span>
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 96px', display:'flex', flexDirection:'column', gap:10 }}>
        {list.length === 0 ? (
          <_Empty icon="users" title="Sin resultados" description="No hay prospectos en este filtro todavía." />
        ) : list.map(p => (
          <_PCard key={p.id} name={p.name} stage={p.stage} priority={p.priority} channel={p.channel}
            lastInteraction={p.last} timeAgo={p.time}
            onOpen={() => onOpen(p)} onCall={() => onAction('Llamando a '+p.name)} onWhatsApp={() => onAction('WhatsApp a '+p.name)} onNote={() => onAction('Nota para '+p.name)} />
        ))}
      </div>
    </div>
  );
}

// ── Resumen · Dashboard ──────────────────────────────────────────────
function Resumen() {
  const counts = {};
  window.PROSPECTS.forEach(p => { counts[p.stage] = (counts[p.stage]||0)+1; });
  const total = window.PROSPECTS.length;
  const order = ['new','contacted','presented','evaluating','joined','discarded'];
  const max = Math.max(...order.map(s => counts[s]||0), 1);
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 96px' }}>
      <div style={{ display:'flex', gap:10 }}>
        <Kpi value={String(total)} label="Prospectos activos" tone="primary" />
        <Kpi value="1" label="Incorporados" tone="primary" />
      </div>
      <SectionTitle icon="layers">Embudo por etapa</SectionTitle>
      <div style={{ background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-1)', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
        {order.map(s => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ width:118, flex:'none', fontSize:12, color:'var(--color-neutral-600)' }}>{STAGE_LABELS[s]}</span>
            <div style={{ flex:1, height:10, borderRadius:5, background:'var(--color-neutral-100)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:5, width:`${((counts[s]||0)/max)*100}%`, background:`var(--color-stage-${s}-dot)` }} />
            </div>
            <span style={{ width:18, textAlign:'right', fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:14, fontWeight:600, color:'var(--color-neutral-900)' }}>{counts[s]||0}</span>
          </div>
        ))}
      </div>
      <SectionTitle icon="bar-chart-3">Conversión</SectionTitle>
      <div style={{ background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-1)', padding:'18px 16px', display:'flex', justifyContent:'space-between' }}>
        <Stat n="50%" l="Contacto → Pres." />
        <Stat n="33%" l="Pres. → Valoración" />
        <Stat n="17%" l="Tasa de cierre" />
      </div>
    </div>
  );
}
function Stat({ n, l }) {
  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ fontFamily:'var(--font-numeric)', fontFeatureSettings:'var(--num-features)', fontSize:22, fontWeight:700, color:'var(--color-primary-600)' }}>{n}</div>
      <div style={{ fontSize:11, color:'var(--color-neutral-500)', marginTop:3 }}>{l}</div>
    </div>
  );
}

// ── Ficha del Prospecto ──────────────────────────────────────────────
function Ficha({ prospect, onAction }) {
  const p = prospect;
  const timeline = [
    { icon:'phone', text:'Llamada · 8 min', time:p.time, note:'Interesado, pide más info.' },
    { icon:'message-circle', text:'WhatsApp enviado', time:'hace 4 días', note:'Compartido vídeo de presentación.' },
    { icon:'user', text:'Prospecto creado', time:'hace 1 sem', note:'Contacto desde Instagram.' },
  ];
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center' }}>
        <_Av name={p.name} size={56} priority={p.priority} />
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--color-neutral-900)', letterSpacing:'-0.01em' }}>{p.name}</div>
          <div style={{ fontSize:14, color:'var(--color-neutral-500)', marginTop:2, fontFeatureSettings:'var(--num-features)' }}>{p.phone}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}><_Stage stage={p.stage} /><_Prio level={p.priority} /></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:20 }}>
        <QuickAction icon="phone" label="Llamar" onClick={() => onAction('Llamando a '+p.name)} />
        <QuickAction icon="message-circle" label="WhatsApp" onClick={() => onAction('WhatsApp a '+p.name)} />
        <QuickAction icon="square-pen" label="Interacción" onClick={() => onAction('Registrar interacción')} />
      </div>

      <SectionTitle icon="layers">Historial</SectionTitle>
      <div style={{ display:'flex', flexDirection:'column' }}>
        {timeline.map((e, i) => (
          <div key={i} style={{ display:'flex', gap:12 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <span style={{ width:32, height:32, borderRadius:'50%', background:'var(--color-primary-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}>
                <_Icon name={e.icon} size={15} color="var(--color-primary-600)" />
              </span>
              {i < timeline.length-1 && <span style={{ width:2, flex:1, background:'var(--border-default)', margin:'4px 0' }} />}
            </div>
            <div style={{ paddingBottom:18, flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--color-neutral-900)' }}>{e.text}</span>
                <span style={{ fontSize:12, color:'var(--color-neutral-400)', flex:'none' }}>{e.time}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--color-neutral-500)', marginTop:2 }}>{e.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function QuickAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ all:'unset', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 0', background:'var(--surface-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)' }}>
      <_Icon name={icon} size={20} color="var(--color-primary-600)" />
      <span style={{ fontSize:12, fontWeight:600, color:'var(--color-neutral-700)' }}>{label}</span>
    </button>
  );
}

// ── Nuevo Prospecto (bottom sheet) ───────────────────────────────────
function NuevoProspecto({ onClose, onSave }) {
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
          <_Input label="Nombre" placeholder="Nombre y apellidos" value={name} onChange={e=>setName(e.target.value)} />
          <_Select label="Etapa" value={stage} onChange={setStage}
            options={Object.keys(STAGE_LABELS).map(k => ({ value:k, label:STAGE_LABELS[k] }))} />
          <_Select label="Prioridad" value={prio} onChange={setPrio}
            options={[{value:'high',label:'Alta'},{value:'medium',label:'Media'},{value:'low',label:'Baja'}]} />
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <_Btn variant="secondary" fullWidth onClick={onClose}>Cancelar</_Btn>
            <_Btn variant="primary" fullWidth onClick={() => onSave(name || 'Nuevo prospecto')}>Guardar</_Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ActividadDiaria, Pipeline, Resumen, Ficha, NuevoProspecto, AccountButton, AccountSheet });
