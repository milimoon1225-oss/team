import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "./PagosPedido.css";
import { comprobarCajaLocal, useCajaLocalPendiente } from '../hooks/useCajaLocalPendiente';
import AvisoCajaLocal from './AvisoCajaLocal';

const dinero = (numero) => Number(numero || 0).toLocaleString("es-PE", { style: "currency", currency: "PEN" });
const clave = (id) => `creativa-pago-pendiente-${id}`;
function recuperar(id) {
  try { const dato = JSON.parse(sessionStorage.getItem(clave(id))); return dato?.p_trabajo === id && dato?.p_solicitud ? dato : null; }
  catch { return null; }
}

export default function PagosPedido({ trabajo, cerrar, alGuardar }) {
  const local = useCajaLocalPendiente();
  const dialogo = useRef(null);
  const [inicial] = useState(() => recuperar(trabajo.id));
  const solicitud = useRef(inicial);
  const bloqueo = useRef(false);
  const [pendiente, setPendiente] = useState(Boolean(inicial));
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [monto, setMonto] = useState(inicial?.p_monto ?? "");
  const [metodo, setMetodo] = useState(inicial?.p_metodo || "Efectivo");
  const [nota, setNota] = useState(inicial?.p_observacion || "");
  const [version, setVersion] = useState(0);
  useEffect(() => { dialogo.current.showModal(); }, []);
  useEffect(() => {
    let vigente = true;
    supabase.rpc("creativa_consultar_pagos", { p_trabajo: trabajo.id }).then(({ data, error: fallo }) => {
      if (!vigente) return;
      if (fallo || !data?.pedido) setError(fallo?.code === "PGRST202" ? "Falta activar el registro de pagos. Contacta a administración." : "No se pudieron cargar los pagos. Intenta actualizar.");
      else setDatos(data);
      setCargando(false);
    }).catch(() => { if (vigente) { setError("No se pudieron cargar los pagos. Intenta actualizar."); setCargando(false); } });
    return () => { vigente = false; };
  }, [trabajo.id, version]);
  const saldo = datos ? Math.max(0, Math.round(Number(datos.pedido.precio_total) * 100) - Math.round(Number(datos.pedido.pagado) * 100)) / 100 : 0;
  function actualizar() { setCargando(true); setError(""); setVersion((v) => v + 1); }
  async function guardar(e) {
    e.preventDefault();
    if (bloqueo.current) return;
    setError(""); setAviso("");
    bloqueo.current = true;
    try { await comprobarCajaLocal(); } catch (fallo) { setError(fallo.message); bloqueo.current = false; return; }
    bloqueo.current = false;
    if (!solicitud.current) {
      if (!/^\d+(\.\d{1,2})?$/.test(String(monto)) || Number(monto) <= 0 || Number(monto) > saldo) { setError("Ingresa un monto mayor a cero que no supere el saldo, con hasta dos decimales."); return; }
      solicitud.current = { p_solicitud: crypto.randomUUID(), p_trabajo: trabajo.id, p_monto: Number(monto), p_metodo: metodo, p_observacion: nota.trim() };
      // Conservar el mismo intento también si se recarga esta pestaña.
      try { sessionStorage.setItem(clave(trabajo.id), JSON.stringify(solicitud.current)); } catch { /* El intento sigue disponible mientras el formulario permanece abierto. */ }
    }
    bloqueo.current = true; setGuardando(true); setPendiente(true);
    try {
      const { data, error: fallo } = await supabase.rpc("creativa_registrar_abono", solicitud.current);
      if (fallo) throw fallo;
      if (!data?.pedido?.id) throw new Error("Sin confirmación");
      setDatos(data); solicitud.current = null; setPendiente(false);
      try { sessionStorage.removeItem(clave(trabajo.id)); } catch { /* Sin almacenamiento disponible. */ }
      setMonto(""); setNota("");
      setAviso("Pago registrado. El estado de entrega se mantiene.");
      alGuardar(data.pedido);
    } catch (fallo) {
      const confirmado = /^(P0001|42501|22|23|PGRST202)/.test(fallo?.code || "");
      if (confirmado) {
        solicitud.current = null; setPendiente(false);
        try { sessionStorage.removeItem(clave(trabajo.id)); } catch { /* Sin almacenamiento disponible. */ }
        setError(fallo.code === "P0001" ? fallo.message : "No se registró el pago. Revisa el acceso y la activación de pagos.");
      } else setError("No se pudo confirmar el pago. Pulsa Confirmar pago pendiente para comprobarlo sin duplicarlo.");
    } finally { bloqueo.current = false; setGuardando(false); }
  }
  return <dialog ref={dialogo} className="payments-dialog" aria-labelledby="titulo-pago" onCancel={(e) => { e.preventDefault(); if (!guardando && !pendiente) cerrar(); }}>
    <header><div><h2 id="titulo-pago">Pagos del pedido</h2><p>{trabajo.codigo} · {trabajo.cliente}</p></div><button type="button" onClick={cerrar} disabled={guardando || pendiente} aria-label="Cerrar pagos">✕</button></header>
    {cargando && <p role="status">Consultando pagos…</p>}
    <AvisoCajaLocal estado={local} />
    {error && <p className="pedido-error" role="alert">{error}</p>}
    {aviso && <p className="payment-success" role="status">{aviso}</p>}
    <button type="button" className="view-all" onClick={actualizar} disabled={guardando || cargando}>Actualizar pagos</button>
    {datos && <>
      <div className="payment-totals"><span>Total<strong>{dinero(datos.pedido.precio_total)}</strong></span><span>Pagado<strong>{dinero(datos.pedido.pagado)}</strong></span><span>Pendiente<strong>{dinero(saldo)}</strong></span></div>
      {saldo === 0 && !pendiente ? <p className="payment-success">Pagado por completo · {datos.pedido.estado}</p> : <form onSubmit={guardar}>
        <fieldset disabled={guardando || pendiente || cargando}>
          <div className="field"><label htmlFor="abono-monto">Monto recibido (S/)</label><input id="abono-monto" type="number" inputMode="decimal" min="0.01" step="0.01" max={saldo} value={monto} onChange={(e) => setMonto(e.target.value)} required /></div>
          <button type="button" className="view-all" onClick={() => setMonto(saldo.toFixed(2))}>Cobrar saldo completo</button>
          <div className="field"><label htmlFor="abono-metodo">Método de pago</label><select id="abono-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>{["Efectivo", "Yape", "Plin", "Transferencia", "Otro"].map((m) => <option key={m}>{m}</option>)}</select></div>
          <div className="field"><label htmlFor="abono-nota">Observación (opcional)</label><textarea id="abono-nota" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} /></div>
        </fieldset>
        <p>Registrar un pago no confirma la entrega del trabajo.</p>
        <button type="submit" className="save-button" disabled={guardando || cargando || local.bloqueado}>{guardando ? "Registrando…" : pendiente ? "Confirmar pago pendiente" : "Registrar pago"}</button>
      </form>}
      <h3>Historial de pagos</h3>
      {datos.pagos.length === 0 && <p>Todavía no hay pagos registrados.</p>}
      <ul className="payment-history">{datos.pagos.map((pago) => <li key={pago.id}><strong>{dinero(pago.monto)} · {pago.metodo}</strong><span>{pago.fecha ? new Date(pago.fecha).toLocaleString("es-PE") : "Sin fecha"}</span>{pago.observacion && <p>{pago.observacion}</p>}</li>)}</ul>
    </>}
  </dialog>;
}
