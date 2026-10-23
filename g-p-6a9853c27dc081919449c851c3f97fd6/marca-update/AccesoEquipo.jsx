import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./AccesoEquipo.css";

export default function AccesoEquipo({ children }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
      setCargando(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  async function entrar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true); setError("");
    try {
      const { error: fallo } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
      if (fallo) throw fallo;
      setClave("");
    } catch {
      setError("No se pudo iniciar sesión. Revisa el correo, la contraseña y tu conexión.");
    } finally { setEnviando(false); }
  }
  if (cargando) return <main className="access-page" role="status">Cargando sesión…</main>;
  if (sesion) return <div key={sesion.user.id}>{children}</div>;
  return <main className="mila-login">
    <div className="mila-login-shell">
      <section className="mila-welcome" aria-labelledby="welcome-title">
        <div className="mila-brand">
          <img className="mila-brand-logo" src="/brand/creativa-logo.png" alt="Corporación Gráfica Creativa Impresos" width="2172" height="724" />
        </div>
        <div className="mila-welcome-copy">
          <span className="mila-eyebrow">HECHO CON IDEAS. HECHO EN EQUIPO.</span>
          <h1 id="welcome-title">Aquí empieza<br />algo <em>bonito.</em></h1>
          <p>Un espacio para organizar nuestros pedidos y dar vida a cada idea, juntos.</p>
        </div>
        <div className="mila-paper-scene" aria-hidden="true">
          <div className="mila-paper-back"><span>CREAR</span><i /></div>
          <div className="mila-paper-front"><span className="mila-paper-label">UN POQUITO DE INSPIRACIÓN</span><strong>De una idea<br />a tus manos.</strong><div className="mila-swatches"><i /><i /><i /><i /></div><span className="mila-paper-sign">hecho en Creativa Mila ↗</span></div>
          <span className="mila-sticker">Con cariño<br /><strong>y creatividad ✦</strong></span>
        </div>
        <p className="mila-welcome-footer"><span aria-hidden="true">✦</span> Cada detalle cuenta. Cada persona también.</p>
      </section>
      <section className="mila-entry" aria-labelledby="login-title">
        <div className="mila-entry-inner">
          <span className="mila-team-label"><span aria-hidden="true" /> NUESTRO EQUIPO</span>
          <h2 id="login-title">¡Qué bueno verte!</h2>
          <p className="mila-entry-description">Ingresa a tu espacio de trabajo.<br />Vamos a crear algo especial hoy.</p>
          <form className="mila-login-form" onSubmit={entrar} aria-busy={enviando}>
            <div className="mila-login-field"><label htmlFor="correo">Tu correo</label>
              <input id="correo" type="email" autoComplete="username" placeholder="nombre@correo.com" autoCapitalize="none" spellCheck={false} value={correo} onChange={(e) => setCorreo(e.target.value)} required disabled={enviando} />
            </div>
            <div className="mila-login-field"><label htmlFor="clave">Tu contraseña</label>
              <div className="mila-password">
                <input id="clave" type={mostrarClave ? "text" : "password"} autoComplete="current-password" placeholder="Escribe tu contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required disabled={enviando} />
                <button type="button" className="mila-password-toggle" aria-label={mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={mostrarClave} onClick={() => setMostrarClave((actual) => !actual)} disabled={enviando}>{mostrarClave ? "Ocultar" : "Mostrar"}</button>
              </div>
            </div>
            {error && <p role="alert" className="mila-login-error">{error}</p>}
            <button className="mila-enter-button" disabled={enviando}><span>{enviando ? "Entrando a tu espacio…" : "Entrar a mi espacio"}</span><span aria-hidden="true">{enviando ? "…" : "→"}</span></button>
          </form>
          <div className="mila-login-help"><span aria-hidden="true">♡</span><p>¿Necesitas ayuda para ingresar?<br /><strong>Comunícate con la administración de Creativa Mila.</strong></p></div>
        </div>
        <p className="mila-entry-footer">Pedidos, diseño y un gran equipo detrás.</p>
      </section>
    </div>
  </main>;
}
