import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./Clientes.css";
import ContactoCliente from './ContactoCliente';

const normalizar = (texto) => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const centimos = (valor) => Math.round(Number(valor || 0) * 100);
const saldoPedido = (pedido) => Math.max(0, centimos(pedido.precio_total) - centimos(pedido.pagado));
const saldoCliente = (cliente) => cliente.pedidos.reduce((total, pedido) => total + saldoPedido(pedido), 0);
const moneda = (valor) => (valor / 100).toLocaleString("es-PE", { style: "currency", currency: "PEN" });

export default function Clientes({ revision = 0, registrarPago }) {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [soloSaldo, setSoloSaldo] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        const { data, error: fallo } = await supabase.rpc("creativa_cargar_clientes");
        if (fallo) throw fallo;
        if (!Array.isArray(data)) throw new Error();
        if (vigente) setClientes(data);
      } catch (fallo) {
        if (vigente) setError(fallo?.code === "PGRST202"
          ? "Falta activar la sección de clientes. Contacta a administración."
          : "No pudimos actualizar los clientes. Intenta nuevamente.");
      } finally { if (vigente) setCargando(false); }
    }
    cargar();
    return () => { vigente = false; };
  }, [version, revision]);
  function actualizar() { setCargando(true); setError(""); setVersion((valor) => valor + 1); }
  const consulta = normalizar(busqueda.trim());
  const digitos = busqueda.replace(/\D/g, "");
  const visibles = clientes.filter((cliente) =>
    (!soloSaldo || saldoCliente(cliente) > 0) &&
    (normalizar(cliente.nombre).includes(consulta) || normalizar(cliente.telefono).includes(consulta) ||
      (digitos && /^[+\d\s()-]+$/.test(busqueda) && String(cliente.telefono || "").replace(/\D/g, "").includes(digitos)))
  );
  return <section className="clients-page">
    <header className="header"><div><h1>Clientes</h1><p>Sus datos y sus pedidos, siempre a mano.</p></div><button className="view-all" type="button" onClick={actualizar} disabled={cargando}>Actualizar clientes</button></header>
    <div className="form-card clients-search">
      <div className="field"><label htmlFor="buscar-cliente">Buscar cliente</label><input id="buscar-cliente" type="search" placeholder="Nombre o teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
      <label className="clients-balance-filter"><input type="checkbox" checked={soloSaldo} onChange={(e) => setSoloSaldo(e.target.checked)} /> Con saldo pendiente</label>
      <span role="status">{cargando ? "Actualizando clientes…" : `${visibles.length} de ${clientes.length} clientes`}</span>
    </div>
    {error && <p role="alert" className="pedido-error">{error}</p>}
    {!cargando && !error && visibles.length === 0 && <div className="brand-empty"><h2>{clientes.length ? "No encontramos clientes" : "Tu agenda empieza con el primer pedido"}</h2><p>{clientes.length ? "Prueba otro nombre, teléfono o desmarca el filtro de saldo." : "Los clientes se registran cuando guardas sus pedidos."}</p></div>}
    <div className="clients-list">{visibles.map((cliente) => <article className="form-card client-card" key={cliente.id}>
      <div className="client-heading"><div><h2>{cliente.nombre}</h2><ContactoCliente telefono={cliente.telefono} nombre={cliente.nombre} /></div><span>{cliente.pedidos.length} pedidos</span></div>
      <p className="client-balance">Saldo pendiente <strong>{moneda(saldoCliente(cliente))}</strong></p>
      <button type="button" className="view-all" aria-expanded={seleccionado === cliente.id} aria-controls={`historial-${cliente.id}`} onClick={() => setSeleccionado(seleccionado === cliente.id ? null : cliente.id)}>{seleccionado === cliente.id ? "Ocultar pedidos" : "Ver pedidos"}</button>
      <div id={`historial-${cliente.id}`} hidden={seleccionado !== cliente.id} className="client-history">
        {cliente.pedidos.length === 0 && <p>Este cliente todavía no tiene pedidos.</p>}
        {cliente.pedidos.map((pedido) => <div className="client-order" key={pedido.id}>
          <strong>{pedido.codigo}</strong><span>{pedido.tipo || "Trabajo"} · {pedido.estado}</span>
          {pedido.estado === 'Listo' && <ContactoCliente telefono={cliente.telefono} nombre={cliente.nombre} pedido={pedido} />}
          <span>Entrega: {pedido.entrega ? new Date(pedido.entrega).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Sin fecha"}</span>
          <dl><div><dt>Total</dt><dd>{moneda(centimos(pedido.precio_total))}</dd></div><div><dt>Pagado</dt><dd>{moneda(centimos(pedido.pagado))}</dd></div><div><dt>Pendiente</dt><dd>{moneda(saldoPedido(pedido))}</dd></div></dl>
          <button type="button" className="view-all" onClick={() => registrarPago({ ...pedido, cliente: cliente.nombre })}>Ver / registrar pagos</button>
        </div>)}
      </div>
    </article>)}</div>
  </section>;
}
