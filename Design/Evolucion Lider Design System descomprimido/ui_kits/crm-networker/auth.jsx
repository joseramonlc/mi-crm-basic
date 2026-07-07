// CRM Networker — auth screens (Login + Registro). Reuses design-system primitives.
const _ANS = window.EvoluciNLDerDesignSystem_8c407a;
const { Icon: _AIcon, Button: _ABtn } = _ANS;

// ── Password field with show/hide toggle + error state ───────────────
function PasswordField({ label = 'Contraseña', value, onChange, placeholder = 'Tu contraseña', error }) {
  const [show, setShow] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const border = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? (error ? 'var(--focus-ring-error)' : 'var(--focus-ring)') : 'none';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontFamily:'var(--font-sans)', fontSize:13, fontWeight:600, color:'var(--color-neutral-700)' }}>{label}</label>
      <div style={{ position:'relative', display:'flex' }}>
        <input
          type={show ? 'text' : 'password'} value={value} placeholder={placeholder}
          onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-sans)', fontSize:15, color:'var(--color-neutral-900)',
            padding:'10px 42px 10px 12px', background:'#fff', border:`1px solid ${border}`, borderRadius:'var(--radius-md)',
            boxShadow:ring, outline:'none', transition:'border-color var(--duration-base), box-shadow var(--duration-base)' }}
        />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{ all:'unset', cursor:'pointer', position:'absolute', right:10, top:0, bottom:0, display:'flex', alignItems:'center', color:'var(--color-neutral-400)' }}>
          <_AIcon name={show ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
      {error && <span style={{ fontFamily:'var(--font-sans)', fontSize:12, color:'var(--color-error-text)' }}>{error}</span>}
    </div>
  );
}

// ── Plain labelled text field with focus/error (email, nombre) ───────
function Field({ label, type = 'text', value, onChange, placeholder, error, autoComplete }) {
  const [focused, setFocused] = React.useState(false);
  const border = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? (error ? 'var(--focus-ring-error)' : 'var(--focus-ring)') : 'none';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontFamily:'var(--font-sans)', fontSize:13, fontWeight:600, color:'var(--color-neutral-700)' }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-sans)', fontSize:15, color:'var(--color-neutral-900)',
          padding:'10px 12px', background:'#fff', border:`1px solid ${border}`, borderRadius:'var(--radius-md)',
          boxShadow:ring, outline:'none', transition:'border-color var(--duration-base), box-shadow var(--duration-base)' }}
      />
      {error && <span style={{ fontFamily:'var(--font-sans)', fontSize:12, color:'var(--color-error-text)' }}>{error}</span>}
    </div>
  );
}

// ── Brand header (logo mark + wordmark) ──────────────────────────────
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

function LinkText({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ all:'unset', cursor:'pointer', color:'var(--color-primary-600)', fontWeight:600 }}>{children}</button>
  );
}

// ── LOGIN ────────────────────────────────────────────────────────────
function Login({ onSubmit, onGoRegister, onForgot }) {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Demo: any credentials → error, unless email contains "hola" (happy path)
      if (email.includes('hola')) { onSubmit && onSubmit(); }
      else setError(true);
    }, 700);
  };
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', overflowY:'auto' }}>
      <div style={{ padding:'24px 0' }}>
        <AuthBrand subtitle="Inicia sesión en tu CRM" />
        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-error-bg)', border:'1px solid #FECACA', borderRadius:'var(--radius-md)', padding:'10px 12px', marginBottom:16 }}>
            <_AIcon name="alert-circle" size={16} color="var(--color-error-text)" />
            <span style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--color-error-text)', fontWeight:500 }}>Email o contraseña incorrectos</span>
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Field label="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setError(false); }} placeholder="tucorreo@ejemplo.com" autoComplete="email" error={error ? ' ' : ''} />
          <div>
            <PasswordField value={pass} onChange={e => { setPass(e.target.value); setError(false); }} error={error ? ' ' : ''} />
            <div style={{ textAlign:'right', marginTop:8, fontFamily:'var(--font-sans)', fontSize:13 }}>
              <LinkText onClick={onForgot}>¿Olvidaste tu contraseña?</LinkText>
            </div>
          </div>
          <_ABtn variant="primary" size="lg" fullWidth loading={loading} onClick={submit}>Iniciar sesión</_ABtn>
        </div>
        <div style={{ textAlign:'center', marginTop:24, fontFamily:'var(--font-sans)', fontSize:14, color:'var(--color-neutral-500)' }}>
          ¿No tienes cuenta? <LinkText onClick={onGoRegister}>Regístrate</LinkText>
        </div>
      </div>
    </div>
  );
}

// ── REGISTRO ─────────────────────────────────────────────────────────
function Registro({ onSubmit, onGoLogin }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
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
      setTimeout(() => { setLoading(false); onSubmit && onSubmit(); }, 700);
    }
  };
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', overflowY:'auto' }}>
      <div style={{ padding:'24px 0' }}>
        <AuthBrand subtitle="Crea tu cuenta gratis" />
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Field label="Nombre" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name:'' })); }} placeholder="Nombre y apellidos" autoComplete="name" error={errors.name} />
          <Field label="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email:'' })); }} placeholder="tucorreo@ejemplo.com" autoComplete="email" error={errors.email} />
          <PasswordField label="Contraseña" placeholder="Crea una contraseña" value={pass} onChange={e => { setPass(e.target.value); setErrors(p => ({ ...p, pass:'' })); }} error={errors.pass} />
          <_ABtn variant="primary" size="lg" fullWidth loading={loading} onClick={submit}>Crear cuenta</_ABtn>
        </div>
        <div style={{ textAlign:'center', marginTop:24, fontFamily:'var(--font-sans)', fontSize:14, color:'var(--color-neutral-500)' }}>
          ¿Ya tienes cuenta? <LinkText onClick={onGoLogin}>Inicia sesión</LinkText>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Login, Registro, AuthBrand, AuthField: Field, PasswordField });
