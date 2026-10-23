import { useState } from "react";
import { supabase } from "../lib/supabase";
import { BUCKET_REFERENCIAS } from "../services/archivoService";
import "./ArchivosPedido.css";

export default function ArchivosPedido({ archivos = [] }) {
  const [vista, setVista] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  if (!archivos.length) return null;
  async function ver(archivo) {
    setCargando(true); setError(""); setVista(null);
    try {
      const { data, error: fallo } = await supabase.storage.from(BUCKET_REFERENCIAS).createSignedUrl(archivo.ruta, 300);
      if (fallo || !data?.signedUrl) throw fallo || new Error();
      setVista({ ...archivo, url: data.signedUrl });
    } catch { setError("No se pudo abrir el archivo. Intenta nuevamente."); }
    finally { setCargando(false); }
  }
  return <div className="pedido-attachments">
    <span className="attachment-label">Archivos de referencia</span>
    {archivos.map((archivo) => <button key={archivo.id} type="button" onClick={() => ver(archivo)} disabled={cargando}>Ver: {archivo.nombre}</button>)}
    {cargando && <p role="status">Abriendo archivo…</p>}
    {error && <p role="alert">{error}</p>}
    {vista && <div className="attachment-preview">
      <div><strong>{vista.nombre}</strong><button type="button" onClick={() => setVista(null)}>Cerrar vista</button></div>
      {["image/jpeg", "image/png", "image/webp"].includes(vista.tipo) && <img src={vista.url} alt={`Referencia: ${vista.nombre}`} onError={() => setError("La vista previa no está disponible. Puedes abrir el archivo con el enlace.")} />}
      <a href={vista.url} target="_blank" rel="noopener noreferrer">Abrir {vista.tipo === "application/pdf" ? "PDF" : "archivo"} en otra pestaña ↗</a>
    </div>}
  </div>;
}
