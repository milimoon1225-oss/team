import { useRef, useState } from "react";
import "./App.css";
import "./CreativaTheme.css";
import "./Apariencia.css";
import { useTema } from "./hooks/useTema";
import SelectorTema from "./components/SelectorTema";
import SelectorCatalogo from "./components/SelectorCatalogo";
import { usePedidos } from "./hooks/usePedidos";
import { mensajePedido, prepararPedido } from "./services/pedidoService";
import { supabase } from "./lib/supabase";
import AccesoEquipo from "./components/AccesoEquipo";
import PanelDisenador from "./components/PanelDisenador";


const FORMULARIO_INICIAL = {
  cliente: "", telefono: "", categoria: "", tipo: "", cantidad: "", descripcion: "",
  fechaRecibida: "", fechaEntrega: "", precio: "", adelanto: "", metodoPago: "Efectivo", archivo: null,
};

function PanelPedidos({ tema, cambiarTema }) {
  const { perfil, disenadores, categorias: categoriasTrabajo, tipos, trabajos, cargando: cargandoCategorias,
    error: errorCategorias, recargar: reintentarCategorias, incorporar, guardarPedido } = usePedidos();
  const [pagina, setPagina] = useState("inicio");
  const [mostrarExito, setMostrarExito] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");
  const [pendienteConfirmacion, setPendienteConfirmacion] = useState(false);
  const [codigoGuardado, setCodigoGuardado] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const solicitud = useRef(null);
  const bloqueo = useRef(false);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const tiposDisponibles = tipos.filter((tipo) => tipo.categoria_id === formulario.categoria);
  const totalPorCobrar = trabajos.reduce((suma, trabajo) => suma + Math.max(0, Number(trabajo.precio_total) - Number(trabajo.pagado)), 0);
  const hoy = new Date().toLocaleDateString("sv-SE");
  const entregasHoy = trabajos.filter((trabajo) => trabajo.entrega?.slice(0, 10) === hoy && trabajo.estado !== "Entregado").length;

  const saldo =
    Number(formulario.precio || 0) -
    Number(formulario.adelanto || 0);

  function cambiarFormulario(e) {
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
      if (!pendienteConfirmacion && !tiposDisponibles.some((tipo) => tipo.id === formulario.tipo)) throw new Error("Selecciona un tipo de trabajo de la categoría elegida.");
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

  async function actualizarPedido(funcion, parametros) {
    if (actualizando) return;
    setActualizando(true); setErrorGuardado("");
    try {
      const { error } = await supabase.rpc(funcion, parametros);
      if (error) throw error;
      reintentarCategorias();
    } catch (error) { setErrorGuardado(mensajePedido(error)); }
    finally { setActualizando(false); }
  }

  if (!perfil) return <main className="access-page"><div className="form-card access-card">
    <h1>Creativa Mila</h1>
    {cargandoCategorias ? <p role="status">Cargando tu panel…</p> : <>
      <p role="alert" className="pedido-error">{errorCategorias || "No se pudo cargar tu perfil."}</p>
      <button type="button" onClick={reintentarCategorias}>Reintentar</button>
    </>}
    <button type="button" onClick={salir}>Cerrar sesión</button>
  </div></main>;
  if (perfil.rol === "disenador") return <PanelDisenador perfil={perfil} trabajos={trabajos}
    cargando={cargandoCategorias} errorCarga={errorCategorias} recargar={reintentarCategorias} salir={salir} tema={tema} cambiarTema={cambiarTema} />;

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <img className="sidebar-brand-logo" src="/brand/creativa-logo.png" alt="Corporación Gráfica Creativa Impresos" width="2172" height="724" />
        </div>

        <nav className="menu">
          <button
            className={`menu-button ${
              pagina === "inicio" ? "active" : ""
            }`}
            onClick={() => setPagina("inicio")}
          >
            <span>⌂</span>
            Inicio
          </button>

          <button
            className={`menu-button ${
              pagina === "nuevo" ? "active" : ""
            }`}
            onClick={() => setPagina("nuevo")}
          >
            <span>＋</span>
            Nuevo trabajo
          </button>

          <button className="menu-button">
            <span>▣</span>
            Trabajos
          </button>

          <button className="menu-button">
            <span>👤</span>
            Clientes
          </button>

          <button className="menu-button">
            <span>S/</span>
            Caja
          </button>

          <button className="menu-button">
            <span>⚙</span>
            Configuración
          </button>
        </nav>

        <button type="button" className="menu-button" disabled={guardando || pendienteConfirmacion} onClick={salir}>Cerrar sesión</button>
        <div className="user-box">
          <div className="avatar">LV</div>

          <div>
            <strong>{perfil.nombre}</strong>
            <span>Administración</span>
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="content">
        <SelectorTema tema={tema} cambiarTema={cambiarTema} />
        <div className="mobile-brand-bar">
          <img src="/brand/creativa-logo.png" alt="Creativa Impresos" width="2172" height="724" />
          <button type="button" onClick={salir} disabled={guardando || pendienteConfirmacion}>Cerrar sesión</button>
        </div>
        <div className="pedido-status" role="status">
          {cargandoCategorias && <p>Cargando pedidos y catálogo…</p>}
          {errorCategorias && <><p className="pedido-error">{errorCategorias}</p><button type="button" onClick={reintentarCategorias}>Reintentar carga</button></>}
        </div>
        {pagina === "inicio" && errorGuardado && <p role="alert" className="pedido-error">{errorGuardado}</p>}
        {pagina === "inicio" && (
          <>
            <header className="header">
              <div>
                <span className="date">
                  {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
                </span>

                <h1>Hola, {perfil.nombre} <span className="brand-spark" aria-hidden="true">✦</span></h1>

                <p>
                  Cada idea empieza contigo. Organicemos los pedidos de hoy.
                </p>
              </div>

              <div className="hero-note" aria-hidden="true"><span>HECHO EN EQUIPO</span><strong>Ideas que<br /><em>cobran vida.</em></strong><div className="brand-dots"><i /><i /><i /><i /></div></div>
            </header>

            <section className="alert">
              <div className="alert-icon">!</div>

              <div className="alert-text">
                <strong>
                  {entregasHoy} pedidos por entregar hoy
                </strong>

                <span>
                  Revisa primero los trabajos con mayor prioridad.
                </span>
              </div>

              <a className="see-jobs" href="#pedidos">Ver pedidos <span aria-hidden="true">↗</span></a>
            </section>

            <section className="stats">
              <article className="stat">
                <div className="stat-icon blue">▣</div>

                <div>
                  <span>Pendientes</span>
                  <strong>{trabajos.filter((t) => t.estado === "Pendiente").length}</strong>
                  <small>Trabajos por realizar</small>
                </div>
              </article>

              <article className="stat">
                <div className="stat-icon cyan">✎</div>

                <div>
                  <span>En diseño</span>
                  <strong>{trabajos.filter((t) => t.estado === "En diseño").length}</strong>
                  <small>Actualmente trabajando</small>
                </div>
              </article>

              <article className="stat">
                <div className="stat-icon green">✓</div>

                <div>
                  <span>Terminados</span>
                  <strong>{trabajos.filter((t) => t.estado === "Listo").length}</strong>
                  <small>Listos para entregar</small>
                </div>
              </article>

              <article className="stat">
                <div className="stat-icon orange">S/</div>

                <div>
                  <span>Por cobrar</span>
                  <strong>S/ {totalPorCobrar.toFixed(2)}</strong>
                  <small>Saldo pendiente</small>
                </div>
              </article>
            </section>

            <section className="section">
              <div className="section-title">
                <h2>¿Qué deseas hacer?</h2>
                <p>
                  Selecciona una opción para continuar.
                </p>
              </div>

              <div className="quick-actions">
                <button
                  className="quick-card new-job"
                  onClick={() => setPagina("nuevo")}
                >
                  <div className="quick-icon">＋</div>

                  <div>
                    <strong>Nuevo trabajo</strong>
                    <span>
                      Registrar pedido de un cliente
                    </span>
                  </div>

                  <b>›</b>
                </button>

                <button className="quick-card">
                  <div className="quick-icon jobs">▣</div>

                  <div>
                    <strong>Trabajos</strong>
                    <span>
                      Revisar pedidos registrados
                    </span>
                  </div>

                  <b>›</b>
                </button>

                <button className="quick-card">
                  <div className="quick-icon money">S/</div>

                  <div>
                    <strong>Caja</strong>
                    <span>
                      Ingresos y salidas de dinero
                    </span>
                  </div>

                  <b>›</b>
                </button>

                <button className="quick-card">
                  <div className="quick-icon clients">
                    👤
                  </div>

                  <div>
                    <strong>Clientes</strong>
                    <span>
                      Consultar clientes registrados
                    </span>
                  </div>

                  <b>›</b>
                </button>
              </div>
            </section>

            <section className="section">
              <div className="section-row">
                <div className="section-title">
                  <h2>Trabajos próximos</h2>
                  <p>
                    Ordenados por fecha de entrega.
                  </p>
                </div>

                <button className="view-all" onClick={reintentarCategorias} disabled={cargandoCategorias || actualizando}>
                  Actualizar pedidos
                </button>
              </div>

              <div className="jobs-list" id="pedidos">
                {!cargandoCategorias && !errorCategorias && trabajos.length === 0 && <div className="brand-empty"><span aria-hidden="true">✦</span><h3>Tu próxima idea empieza aquí</h3><p>Registra el primer pedido y organicemos juntos cada detalle.</p><button className="save-button" onClick={() => setPagina("nuevo")}>Crear mi primer pedido</button></div>}
                {trabajos.map((trabajo) => (
                  <article
                    className="job-card"
                    key={trabajo.id}
                  >
                    <div className="job-main">
                      <div
                        className={
                          trabajo.urgente
                            ? "priority urgent"
                            : "priority normal"
                        }
                      ></div>

                      <div>
                        <strong>{trabajo.codigo || trabajo.id}</strong>
                        <span>{trabajo.tipo}</span>
                      </div>
                    </div>

                    <div className="job-data">
                      <small>Cliente</small>
                      <strong>
                        {trabajo.cliente}
                      </strong>
                    </div>

                    <div className="job-data">
                      <small>Entrega</small>

                      <strong
                        className={
                          trabajo.urgente
                            ? "red"
                            : ""
                        }
                      >
                        {trabajo.entrega ? new Date(trabajo.entrega).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Sin fecha"}
                      </strong>
                    </div>

                    <div className="job-data">
                      <small>Estado</small>

                      <span
                        className={
                          `badge ${{ "Pendiente": "pending", "En diseño": "designing", "Listo": "ready", "Entregado": "delivered" }[trabajo.estado] || "pending"}`
                        }
                      >
                        {trabajo.estado}
                      </span>
                    </div>
                    <div className="job-data">
                      <label htmlFor={`asignar-${trabajo.id}`}>Diseñador</label>
                      <select id={`asignar-${trabajo.id}`} value={trabajo.disenador_id || ""}
                        disabled={actualizando || cargandoCategorias || trabajo.estado === "Entregado"}
                        onChange={(e) => actualizarPedido("creativa_asignar_pedido", { p_trabajo: trabajo.id, p_disenador: e.target.value || null })}>
                        <option value="">Sin asignar</option>
                        {disenadores.map((persona) => <option key={persona.id} value={persona.id}>{persona.nombre}</option>)}
                      </select>
                      {trabajo.estado === "Listo" && <button type="button" disabled={actualizando || cargandoCategorias}
                        onClick={() => actualizarPedido("creativa_cambiar_estado", { p_trabajo: trabajo.id, p_estado: "Entregado" })}>Confirmar entrega</button>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* NUEVO TRABAJO */}
        {pagina === "nuevo" && (
          <section className="new-work-page">
            <div className="form-header">
              <button
                className="back-button"
                onClick={() =>
                  setPagina("inicio")
                }
              >
                ←
              </button>

              <div>
                <h1>Nuevo trabajo</h1>
                <p>
                  Registra los datos principales del pedido.
                </p>
              </div>
            </div>

            <form
              className="work-form"
              onSubmit={guardarTrabajo}
              aria-busy={guardando}
            >
              <fieldset className="pedido-fields" disabled={guardando || pendienteConfirmacion}>
              <div className="form-card">
                <h2>Cliente</h2>

                <div className="form-grid two">
                  <div className="field">
                    <label>
                      Nombre del cliente *
                    </label>

                    <input
                      type="text"
                      name="cliente"
                      value={formulario.cliente}
                      onChange={cambiarFormulario}
                      placeholder="Ej. María Quispe"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>
                      Celular / WhatsApp
                    </label>

                    <input
                      type="tel"
                      name="telefono"
                      value={formulario.telefono}
                      onChange={cambiarFormulario}
                      placeholder="Ej. 987654321"
                    />
                  </div>
                </div>
              </div>

              <div className="form-card">
                <h2>Trabajo</h2>

                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="categoria-trabajo">Categoría *</label>
                    <SelectorCatalogo id="categoria-trabajo" opciones={categoriasTrabajo} valor={formulario.categoria}
                      onChange={(value) => cambiarFormulario({ target: { name: "categoria", value } })}
                      placeholder={cargandoCategorias ? "Cargando…" : "Seleccionar categoría"}
                      disabled={guardando || pendienteConfirmacion || cargandoCategorias || !!errorCategorias} required />
                    {!cargandoCategorias && !errorCategorias && categoriasTrabajo.length === 0 && <p>No hay categorías activas.</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="tipo-trabajo">Tipo de trabajo *</label>
                    <SelectorCatalogo key={formulario.categoria} id="tipo-trabajo" opciones={tiposDisponibles} valor={formulario.tipo}
                      onChange={(value) => cambiarFormulario({ target: { name: "tipo", value } })}
                      placeholder="Seleccionar tipo" agruparNombres
                      disabled={guardando || pendienteConfirmacion || !formulario.categoria || cargandoCategorias || !!errorCategorias || tiposDisponibles.length === 0} required />
                    {formulario.categoria && tiposDisponibles.length === 0 && <p>No hay tipos activos en esta categoría. Agrega los tipos en Supabase y actualiza el catálogo.</p>}
                    <button type="button" onClick={reintentarCategorias} disabled={cargandoCategorias}>Actualizar catálogo</button>
                  </div>

                  <div className="field">
                    <label>Cantidad</label>

                    <input
                      type="number"
                      min="1"
                      name="cantidad"
                      value={formulario.cantidad}
                      onChange={cambiarFormulario}
                      placeholder="Ej. 100"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>
                    Descripción / indicaciones
                  </label>

                  <textarea
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={cambiarFormulario}
                    rows="4"
                    placeholder="Colores, medidas, texto, observaciones..."
                  ></textarea>
                </div>

                <div className="field">
                  <label>
                    Foto o PDF de referencia
                  </label>

                  <label className="upload-box">
                    <span className="upload-icon">
                      📷
                    </span>

                    <strong>
                      Subir foto o PDF
                    </strong>

                    <small>
                      La subida de archivos estará disponible en una siguiente etapa.
                    </small>

                    <input
                      type="file"
                      disabled
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          archivo:
                            e.target.files[0],
                        })
                      }
                    />
                  </label>

                  {formulario.archivo && (
                    <div className="file-selected">
                      ✓{" "}
                      {formulario.archivo.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-card">
                <h2>Fechas</h2>

                <div className="form-grid two">
                  <div className="field">
                    <label>
                      Fecha recibida *
                    </label>

                    <input
                      type="date"
                      name="fechaRecibida"
                      value={
                        formulario.fechaRecibida
                      }
                      onChange={cambiarFormulario}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>
                      Fecha de entrega *
                    </label>

                    <input
                      type="datetime-local"
                      name="fechaEntrega"
                      value={
                        formulario.fechaEntrega
                      }
                      onChange={cambiarFormulario}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-card">
                <h2>Pago</h2>

                <div className="form-grid three">
                  <div className="field">
                    <label>
                      Precio total (S/) *
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="precio"
                      value={formulario.precio}
                      onChange={cambiarFormulario}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>
                      Adelanto recibido
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="adelanto"
                      value={formulario.adelanto}
                      onChange={cambiarFormulario}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Método de pago
                    </label>

                    <select
                      name="metodoPago"
                      value={
                        formulario.metodoPago
                      }
                      onChange={cambiarFormulario}
                    >
                      <option>Efectivo</option>
                      <option>Yape</option>
                      <option>Plin</option>
                      <option>
                        Transferencia
                      </option>
                      <option>Otro</option>
                    </select>
                  </div>
                </div>

                <div className="payment-summary">
                  <div>
                    <span>Total</span>
                    <strong>
                      S/{" "}
                      {Number(
                        formulario.precio || 0
                      ).toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>Recibido</span>
                    <strong className="green-text">
                      S/{" "}
                      {Number(
                        formulario.adelanto || 0
                      ).toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>Saldo</span>
                    <strong className="orange-text">
                      S/ {saldo.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              </fieldset>
              {errorGuardado && <p role="alert" className="pedido-error">{errorGuardado}</p>}
              {pendienteConfirmacion && <p role="status">Hay un envío pendiente de confirmar. Reintenta el mismo pedido antes de modificarlo.</p>}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={guardando || pendienteConfirmacion}
                  onClick={() =>
                    setPagina("inicio")
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={guardando || (!pendienteConfirmacion && (cargandoCategorias || !!errorCategorias || tiposDisponibles.length === 0))}
                >
                  {guardando ? "Guardando…" : pendienteConfirmacion ? "Confirmar pedido pendiente" : "Guardar trabajo"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

        {mostrarExito && (
  <div className="success-overlay">
    <div
      className="success-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
    >
      <div className="success-icon">
        ✓
      </div>

      <h2 id="success-title">
        Trabajo guardado
      </h2>

      <p>
        El pedido {codigoGuardado} fue registrado en Supabase y ya está disponible en la lista de trabajos.
      </p>

      <button
        className="success-button"
        onClick={() => setMostrarExito(false)}
      >
        Entendido
      </button>
    </div>
  </div>
)}
      {/* MENÚ MÓVIL */}
      <nav className="bottom-nav">
        <button
          className={`bottom-item ${
            pagina === "inicio"
              ? "active"
              : ""
          }`}
          onClick={() => setPagina("inicio")}
        >
          <span>⌂</span>
          Inicio
        </button>

        <button className="bottom-item">
          <span>▣</span>
          Trabajos
        </button>

        <button
          className="bottom-add"
          onClick={() => setPagina("nuevo")}
        >
          ＋
        </button>

        <button className="bottom-item">
          <span>S/</span>
          Caja
        </button>

        <button className="bottom-item">
          <span>👤</span>
          Clientes
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  const [tema, cambiarTema] = useTema();
  return <AccesoEquipo><div className="panel-shell" data-theme={tema}><PanelPedidos tema={tema} cambiarTema={cambiarTema} /></div></AccesoEquipo>;
}
