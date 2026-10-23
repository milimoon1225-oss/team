import fs from 'node:fs';
const path = new URL('./src/App.jsx', import.meta.url);
let app = fs.readFileSync(path, 'utf8');
function replace(before, after) {
  if (!app.includes(before)) throw new Error(`No se encontró: ${before}`);
  app = app.replace(before, after);
}
app = app.replaceAll('\r\n', '\n');
replace('import { useState } from "react";', 'import { useRef, useState } from "react";');
replace('import { useCategoriasTrabajo } from "./hooks/useCategoriasTrabajo";', `import { usePedidos } from "./hooks/usePedidos";
import { mensajePedido, prepararPedido } from "./services/pedidoService";
import { supabase } from "./lib/supabase";
import AccesoEquipo from "./components/AccesoEquipo";`);
let start = app.indexOf('const trabajosIniciales = [');
let end = app.indexOf('  const [formulario, setFormulario]');
app = app.slice(0,start) + `const FORMULARIO_INICIAL = {
  cliente: "", telefono: "", categoria: "", tipo: "", cantidad: "", descripcion: "",
  fechaRecibida: "", fechaEntrega: "", precio: "", adelanto: "", metodoPago: "Efectivo", archivo: null,
};

function PanelPedidos() {
  const { categorias: categoriasTrabajo, tipos, trabajos, cargando: cargandoCategorias,
    error: errorCategorias, recargar: reintentarCategorias, incorporar, guardarPedido } = usePedidos();
  const [pagina, setPagina] = useState("inicio");
  const [mostrarExito, setMostrarExito] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");
  const [pendienteConfirmacion, setPendienteConfirmacion] = useState(false);
  const [codigoGuardado, setCodigoGuardado] = useState("");
  const solicitud = useRef(null);
  const bloqueo = useRef(false);
` + app.slice(end);
start = app.indexOf('  const [formulario, setFormulario]');
end = app.indexOf('  const saldo =', start);
app = app.slice(0,start) + `  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const tiposDisponibles = tipos.filter((tipo) => tipo.categoria_id === formulario.categoria);
  const totalPorCobrar = trabajos.reduce((suma, trabajo) => suma + Math.max(0, Number(trabajo.precio_total) - Number(trabajo.pagado)), 0);
  const hoy = new Date().toLocaleDateString("sv-SE");
  const entregasHoy = trabajos.filter((trabajo) => trabajo.entrega?.slice(0, 10) === hoy && trabajo.estado !== "Entregado").length;

` + app.slice(end);
start = app.indexOf('  function cambiarFormulario(e)');
end = app.indexOf('  return (\n    <div className="app">', start);
app = app.slice(0,start) + `  function cambiarFormulario(e) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value, ...(name === "categoria" ? { tipo: "" } : {}) }));
    setErrorGuardado("");
  }

  async function guardarTrabajo(e) {
    e.preventDefault();
    if (bloqueo.current) return;
    setErrorGuardado("");
    try {
      prepararPedido(formulario);
      if (!tiposDisponibles.some((tipo) => tipo.id === formulario.tipo)) throw new Error("Selecciona un tipo de trabajo de la categoría elegida.");
    } catch (error) { setErrorGuardado(mensajePedido(error)); return; }
    bloqueo.current = true;
    setGuardando(true);
    // Mantener el mismo identificador y contenido ante respuestas perdidas.
    if (!solicitud.current) solicitud.current = { id: crypto.randomUUID(), formulario: { ...formulario } };
    try {
      const nuevoTrabajo = await guardarPedido(solicitud.current.id, solicitud.current.formulario);
      incorporar(nuevoTrabajo);
      setCodigoGuardado(nuevoTrabajo.codigo);
      setFormulario(FORMULARIO_INICIAL);
      solicitud.current = null;
      setPendienteConfirmacion(false);
      setPagina("inicio");
      setMostrarExito(true);
    } catch (error) {
      setErrorGuardado(mensajePedido(error));
      // Un error PostgreSQL confirma el rollback. Una falla de red no lo confirma.
      const rechazoConfirmado = /^(P0001|42501|22|23|PGRST202)/.test(error?.code || "");
      setPendienteConfirmacion(!rechazoConfirmado);
      if (rechazoConfirmado) solicitud.current = null;
    } finally { bloqueo.current = false; setGuardando(false); }
  }

  async function salir() {
    if (guardando || pendienteConfirmacion) return;
    const { error } = await supabase.auth.signOut();
    if (error) setErrorGuardado("No se pudo cerrar la sesión. Intenta nuevamente.");
  }

` + app.slice(end);
replace('<span>Recepción</span>', '<span>Equipo Creativa Mila</span>');
replace('<strong>L. Virginia</strong>', '<strong>Mi cuenta</strong>');
replace('        <div className="user-box">', '        <button type="button" className="menu-button" disabled={guardando || pendienteConfirmacion} onClick={salir}>Cerrar sesión</button>\n        <div className="user-box">');
replace('      <main className="content">', `      <main className="content">
        <div className="pedido-status" role="status">
          {cargandoCategorias && <p>Cargando pedidos y catálogo…</p>}
          {errorCategorias && <><p className="pedido-error">{errorCategorias}</p><button type="button" onClick={reintentarCategorias}>Reintentar carga</button></>}
        </div>
        {pagina === "inicio" && errorGuardado && <p role="alert" className="pedido-error">{errorGuardado}</p>}`);
replace('Lunes, 21 de septiembre', '{new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}');
replace('Buenos días, L. Virginia 👋', 'Pedidos de Creativa Mila');
replace('2 trabajos deben entregarse hoy', '{entregasHoy} pedidos por entregar hoy');
replace('<strong>12</strong>', '<strong>{trabajos.filter((t) => t.estado === "Pendiente").length}</strong>');
replace('<strong>4</strong>', '<strong>{trabajos.filter((t) => t.estado === "En diseño").length}</strong>');
replace('<strong>6</strong>', '<strong>{trabajos.filter((t) => t.estado === "Listo").length}</strong>');
replace('<strong>S/ 640</strong>', '<strong>S/ {totalPorCobrar.toFixed(2)}</strong>');
replace('<div className="jobs-list">', `<div className="jobs-list">
                {!cargandoCategorias && !errorCategorias && trabajos.length === 0 && <p>Aún no hay pedidos registrados.</p>}`);
replace('<strong>{trabajo.id}</strong>', '<strong>{trabajo.codigo || trabajo.id}</strong>');
replace('{trabajo.entrega}', '{trabajo.entrega ? new Date(trabajo.entrega).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Sin fecha"}');
replace('              onSubmit={guardarTrabajo}\n            >', '              onSubmit={guardarTrabajo}\n              aria-busy={guardando}\n            >\n              <fieldset className="pedido-fields" disabled={guardando || pendienteConfirmacion}>');
start = app.indexOf('                    <label htmlFor="tipo-trabajo">');
end = app.indexOf('                  <div className="field">\n                    <label>Cantidad', start);
app = app.slice(0,start) + `                    <label htmlFor="categoria-trabajo">Categoría *</label>
                    <select id="categoria-trabajo" name="categoria" value={formulario.categoria} onChange={cambiarFormulario}
                      disabled={cargandoCategorias || !!errorCategorias} required>
                      <option value="">{cargandoCategorias ? "Cargando…" : "Seleccionar categoría"}</option>
                      {categoriasTrabajo.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                    </select>
                    {!cargandoCategorias && !errorCategorias && categoriasTrabajo.length === 0 && <p>No hay categorías activas.</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="tipo-trabajo">Tipo de trabajo *</label>
                    <select id="tipo-trabajo" name="tipo" value={formulario.tipo} onChange={cambiarFormulario}
                      disabled={!formulario.categoria || cargandoCategorias || !!errorCategorias || tiposDisponibles.length === 0} required>
                      <option value="">Seleccionar tipo</option>
                      {tiposDisponibles.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                    </select>
                    {formulario.categoria && tiposDisponibles.length === 0 && <p>No hay tipos activos en esta categoría. Agrega los tipos en Supabase y actualiza el catálogo.</p>}
                    <button type="button" onClick={reintentarCategorias} disabled={cargandoCategorias}>Actualizar catálogo</button>
                  </div>

` + app.slice(end);
replace('                      Desde cámara, galería o archivos', '                      La subida de archivos estará disponible en una siguiente etapa.');
replace('                      type="file"', '                      type="file"\n                      disabled');
replace('              <div className="form-actions">', `              </fieldset>
              {errorGuardado && <p role="alert" className="pedido-error">{errorGuardado}</p>}
              {pendienteConfirmacion && <p role="status">Hay un envío pendiente de confirmar. Reintenta el mismo pedido antes de modificarlo.</p>}
              <div className="form-actions">`);
replace('                  className="cancel-button"', '                  className="cancel-button"\n                  disabled={guardando || pendienteConfirmacion}');
replace('                  disabled={cargandoCategorias || !!errorCategorias || categoriasTrabajo.length === 0}', '                  disabled={guardando || cargandoCategorias || !!errorCategorias || tiposDisponibles.length === 0}');
replace('                  Guardar trabajo', '                  {guardando ? "Guardando…" : pendienteConfirmacion ? "Confirmar pedido pendiente" : "Guardar trabajo"}');
replace('        El pedido fue registrado correctamente y ya está\n        disponible en la lista de trabajos.', '        El pedido {codigoGuardado} fue registrado en Supabase y ya está disponible en la lista de trabajos.');
replace('export default App;', `export default function App() {
  return <AccesoEquipo><PanelPedidos /></AccesoEquipo>;
}`);
fs.writeFileSync(path, app);
