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
    <div className="designer-brand"><img src="/brand/creativa-logo.png" alt="Creativa Impresos" width="2172" height="724" /><span>ESPACIO DE DISEÑO</span></div>
    <header className="header"><div><span className="date">HECHO CON IDEAS. HECHO EN EQUIPO.</span><h1>Hola, {perfil.nombre} <span className="brand-spark" aria-hidden="true">✦</span></h1><p>Dale vida a tu próxima idea. Aquí están tus pedidos asignados.</p></div>
      <button type="button" onClick={salir} disabled={ocupado}>Cerrar sesión</button>
    </header>
    <button type="button" onClick={recargar} disabled={cargando || ocupado}>Actualizar pedidos</button>
    {cargando && <p role="status">Actualizando…</p>}
    {(error || errorCarga) && <p role="alert" className="pedido-error">{error || errorCarga}</p>}
    {!cargando && !errorCarga && trabajos.length === 0 && <div className="brand-empty"><span aria-hidden="true">✦</span><h2>Todo listo para crear</h2><p>Cuando L. Virginia te asigne un pedido, lo encontrarás aquí.</p></div>}
    <div className="designer-jobs">{trabajos.map((trabajo) => <article key={trabajo.id} className="form-card">
      <span className="designer-job-code">{trabajo.codigo}</span><h2>{trabajo.tipo}</h2>
      <p><strong>Cliente:</strong> {trabajo.cliente}</p>
      <p><strong>Cantidad:</strong> {trabajo.cantidad ?? "Sin especificar"}</p>
      <p><strong>Entrega:</strong> {trabajo.entrega ? new Date(trabajo.entrega).toLocaleString("es-PE") : "Sin fecha"}</p>
      <p className="pedido-description">{trabajo.descripcion || "Sin indicaciones adicionales."}</p>
      <p><span className={`badge ${{ "Pendiente": "pending", "En diseño": "designing", "Listo": "ready", "Entregado": "delivered" }[trabajo.estado] || "pending"}`}>{trabajo.estado}</span></p>
      <div className="designer-actions">
        {trabajo.estado === "Pendiente" && <button type="button" className="save-button" disabled={ocupado || cargando} onClick={() => cambiarEstado(trabajo.id, "En diseño")}>Iniciar diseño</button>}
        {trabajo.estado === "En diseño" && <button type="button" className="save-button" disabled={ocupado || cargando} onClick={() => cambiarEstado(trabajo.id, "Listo")}>Marcar listo</button>}
      </div>
    </article>)}</div>
  </main>;
}
