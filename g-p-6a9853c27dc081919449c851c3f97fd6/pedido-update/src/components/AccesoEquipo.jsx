import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AccesoEquipo({ children }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
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
  return <main className="access-page">
    <form className="form-card access-card" onSubmit={entrar}>
      <h1>Creativa Mila</h1>
      <p>Ingresa con tu cuenta del equipo para registrar y consultar pedidos.</p>
      <div className="field"><label htmlFor="correo">Correo</label>
        <input id="correo" type="email" autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} required disabled={enviando} />
      </div>
      <div className="field"><label htmlFor="clave">Contraseña</label>
        <input id="clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required disabled={enviando} />
      </div>
      {error && <p role="alert" className="pedido-error">{error}</p>}
      <button className="save-button" disabled={enviando}>{enviando ? "Ingresando…" : "Ingresar"}</button>
    </form>
  </main>;
}
