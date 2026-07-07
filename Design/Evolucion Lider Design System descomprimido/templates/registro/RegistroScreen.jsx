// Registro — self-contained screen for the Registro template.
// On success routes to Actividad Diaria (empty state). Gated on the bundle global.
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

function PhoneFrame({ children }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'32px 0', fontFamily:'var(--font-sans)' }}>
      <div style={{ width:390, height:800, background:'#000', borderRadius:44, padding:11, boxShadow:'0 30px 70px rgba(15,23,42,.30)', flex:'none' }}>
        <div style={{ position:'relative', width:'100%', height:'100%', background:'var(--surface-app)', borderRadius:34, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {children}
        </div>
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
        <Icon name="bar-chart-3" size={15} color={c} />
        <Icon name="info" size={14} color={c} />
        <div style={{ width:22, height:11, border:`1.5px solid ${c}`, borderRadius:3, position:'relative', opacity:.9 }}>
          <div style={{ position:'absolute', inset:1.5, background:c, borderRadius:1, width:'72%' }} />
        </div>
      </div>
    </div>
  );
}

function AuthBrand({ subtitle }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, marginBottom:28 }}>
      <div style={{ width:60, height:60, borderRadius:16, background:'var(--color-primary-500)', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4, padding:'0 0 15px', boxShadow:'0 6px 16px rgba(22,163,74,.3)' }}>
        <span style={{ width:6, height:14, borderRadius:2, background:'#fff', opacity:.55 }} />
        <span style={{ width:6, height:22, borderRadius:2, background:'#fff', opacity:.8 }} />
        <span style={{ width:6, height:30, borderRadius:2, background:'#fff' }} />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--color-neutral-900)', letterSpacing:'-0.02em' }}>Evolución Líder</div>
        <div style={{ fontSize:14, color:'var(--color-neutral-500)', marginTop:3 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, error, autoComplete }) {
  const [focused, setFocused] = React.useState(false);
  const border = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? (error ? 'var(--focus-ring-error)' : 'var(--focus-ring)') : 'none';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:13, fontWeight:600, color:'var(--color-neutral-700)' }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-sans)', fontSize:15, color:'var(--color-neutral-900)', padding:'10px 12px', background:'#fff', border:`1px solid ${border}`, borderRadius:'var(--radius-md)', boxShadow:ring, outline:'none', transition:'border-color var(--duration-base), box-shadow var(--duration-base)' }} />
      {error && error.trim() && <span style={{ fontSize:12, color:'var(--color-error-text)' }}>{error}</span>}
    </div>
  );
}

function PasswordField({ Icon, label = 'Contraseña', value, onChange, placeholder = 'Crea una contraseña', error }) {
  const [show, setShow] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const border = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? (error ? 'var(--focus-ring-error)' : 'var(--focus-ring)') : 'none';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:13, fontWeight:600, color:'var(--color-neutral-700)' }}>{label}</label>
      <div style={{ position:'relative', display:'flex' }}>
        <input type={show ? 'text' : 'password'} value={value} placeholder={placeholder}
          onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-sans)', fontSize:15, color:'var(--color-neutral-900)', padding:'10px 42px 10px 12px', background:'#fff', border:`1px solid ${border}`, borderRadius:'var(--radius-md)', boxShadow:ring, outline:'none', transition:'border-color var(--duration-base), box-shadow var(--duration-base)' }} />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{ all:'unset', cursor:'pointer', position:'absolute', right:10, top:0, bottom:0, display:'flex', alignItems:'center', color:'var(--color-neutral-400)' }}>
          <Icon name={show ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
      {error && error.trim() && <span style={{ fontSize:12, color:'var(--color-error-text)' }}>{error}</span>}
    </div>
  );
}

function LinkText({ children, onClick }) {
  return <button type="button" onClick={onClick} style={{ all:'unset', cursor:'pointer', color:'var(--color-primary-600)', fontWeight:600 }}>{children}</button>;
}

function RegistroScreen() {
  const NS = useNS();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  if (!NS) return <PhoneFrame><div /></PhoneFrame>;
  const { Icon, Button, EmptyState } = NS;

  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (!email.trim()) e.email = 'El email es obligatorio';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Introduce un email válido';
    if (!pass) e.pass = 'La contraseña es obligatoria';
    else if (pass.length < 6) e.pass = 'Mínimo 6 caracteres';
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setLoading(true);
      setTimeout(() => { setLoading(false); setDone(true); }, 700);
    }
  };

  return (
    <PhoneFrame>
      <StatusBar Icon={Icon} />
      {done ? (
        <>
          <div style={{ height:56, flex:'none', display:'flex', alignItems:'center', padding:'0 16px', background:'var(--surface-card)', borderBottom:'1px solid var(--border-default)' }}>
            <span style={{ fontSize:18, fontWeight:600, color:'var(--color-neutral-900)' }}>Actividad Diaria</span>
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <EmptyState icon="users" title="Aún no tienes prospectos" description="Añade tu primer prospecto para empezar a construir tu red." ctaLabel="Añadir prospecto" />
          </div>
        </>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', overflowY:'auto' }}>
          <div style={{ padding:'24px 0' }}>
            <AuthBrand subtitle="Crea tu cuenta gratis" />
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Field label="Nombre" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name:'' })); }} placeholder="Nombre y apellidos" autoComplete="name" error={errors.name} />
              <Field label="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email:'' })); }} placeholder="tucorreo@ejemplo.com" autoComplete="email" error={errors.email} />
              <PasswordField Icon={Icon} value={pass} onChange={e => { setPass(e.target.value); setErrors(p => ({ ...p, pass:'' })); }} error={errors.pass} />
              <Button variant="primary" size="lg" fullWidth loading={loading} onClick={submit}>Crear cuenta</Button>
            </div>
            <div style={{ textAlign:'center', marginTop:24, fontSize:14, color:'var(--color-neutral-500)' }}>
              ¿Ya tienes cuenta? <LinkText>Inicia sesión</LinkText>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}

if (typeof module !== 'undefined') module.exports = { RegistroScreen };
window.RegistroScreen = RegistroScreen;
