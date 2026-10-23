import { useState } from "react";
import { supabase } from "../lib/supabase";
import { mensajePedido } from "../services/pedidoService";

export default function PanelDisenador({ perfil, trabajos, recargar, cargando, errorCarga, salir }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  async function cambiarEstado(id, estado) {
    if (ocupado) return;
    setOcupado(true); setError("");
    try {
      const { error: fallo } = await supabase.rpc("creativa_cambiar_estado", { p_trabajo: id, p_estado: estado });
      if (fallo) throw fallo;
      recargar();
    } catch (fallo) { setError(mensajePedido(fallo)); }
    finally { setOcupado(false); }
  }
  return <main className="designer-page">
    <header className="header"><div><h1>Hola, {perfil.nombre}</h1><p>Tus pedidos asignados, ordenados por entrega.</p></div>
      <button type="button" onClick={salir} disabled={ocupado}>Cerrar sesión</button>
    </header>
    <button type="button" onClick={recargar} disabled={cargando || ocupado}>Actualizar pedidos</button>
    {cargando && <p role="status">Actualizando…</p>}
    {(error || errorCarga) && <p role="alert" className="pedido-error">{error || errorCarga}</p>}
    {!cargando && !errorCarga && trabajos.length === 0 && <p>Aún no tienes pedidos asignados. L. Virginia puede asignártelos desde administración.</p>}
    <div className="designer-jobs">{trabajos.map((trabajo) => <article key={trabajo.id} className="form-card">
      <h2>{trabajo.codigo} · {trabajo.tipo}</h2>
      <p><strong>Cliente:</strong> {trabajo.cliente}</p>
      <p><strong>Cantidad:</strong> {trabajo.cantidad ?? "Sin especificar"}</p>
      <p><strong>Entrega:</strong> {trabajo.entrega ? new Date(trabajo.entrega).toLocaleString("es-PE") : "Sin fecha"}</p>
      <p className="pedido-description">{trabajo.descripcion || "Sin indicaciones adicionales."}</p>
      <p><strong>Estado:</strong> {trabajo.estado}</p>
      <div className="designer-actions">
        {trabajo.estado === "Pendiente" && <button type="button" className="save-button" disabled={ocupado || cargando} onClick={() => cambiarEstado(trabajo.id, "En diseño")}>Iniciar diseño</button>}
        {trabajo.estado === "En diseño" && <button type="button" className="save-button" disabled={ocupado || cargando} onClick={() => cambiarEstado(trabajo.id, "Listo")}>Marcar listo</button>}
      </div>
    </article>)}</div>
  </main>;
}
