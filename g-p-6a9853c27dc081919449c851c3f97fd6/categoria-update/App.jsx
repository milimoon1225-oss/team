import { useState } from "react";
import "./App.css";
import { useCategoriasTrabajo } from "./hooks/useCategoriasTrabajo";


const trabajosIniciales = [
  {
    id: "TR-001",
    tipo: "Tarjeta tapa dura",
    cliente: "María Condori",
    entrega: "Hoy - 5:00 PM",
    estado: "En diseño",
    urgente: true,
  },
  {
    id: "TR-002",
    tipo: "Tarjetas personales",
    cliente: "Carlos Mamani",
    entrega: "Hoy - 7:00 PM",
    estado: "Pendiente",
    urgente: true,
  },
  {
    id: "TR-003",
    tipo: "Sublimado",
    cliente: "Rosa Quispe",
    entrega: "Mañana",
    estado: "En diseño",
    urgente: false,
  },
];

function App() {
  const {
    categorias: categoriasTrabajo,
    cargando: cargandoCategorias,
    error: errorCategorias,
    reintentar: reintentarCategorias,
  } = useCategoriasTrabajo();
  const [pagina, setPagina] = useState("inicio");
  const [mostrarExito, setMostrarExito] = useState(false);
  const [trabajos, setTrabajos] = useState(trabajosIniciales);

  const [formulario, setFormulario] = useState({
    cliente: "",
    telefono: "",
    tipo: "",
    cantidad: "",
    descripcion: "",
    fechaRecibida: "",
    fechaEntrega: "",
    precio: "",
    adelanto: "",
    metodoPago: "Efectivo",
    archivo: null,
  });

  const saldo =
    Number(formulario.precio || 0) -
    Number(formulario.adelanto || 0);

  function cambiarFormulario(e) {
    const { name, value } = e.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  }

  function guardarTrabajo(e) {
    e.preventDefault();

    if (cargandoCategorias || errorCategorias ||
        !categoriasTrabajo.some((categoria) => categoria.nombre === formulario.tipo)) {
      return;
    }

    const nuevoTrabajo = {
      id: `TR-${String(trabajos.length + 1).padStart(3, "0")}`,
      tipo: formulario.tipo,
      cliente: formulario.cliente,
      entrega: formulario.fechaEntrega,
      estado: "Pendiente",
      urgente: false,
    };

    setTrabajos([nuevoTrabajo, ...trabajos]);

    setFormulario({
      cliente: "",
      telefono: "",
      tipo: "",
      cantidad: "",
      descripcion: "",
      fechaRecibida: "",
      fechaEntrega: "",
      precio: "",
      adelanto: "",
      metodoPago: "Efectivo",
      archivo: null,
    });

   setPagina("inicio");
setMostrarExito(true);
  }

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-circle">C</div>

          <div>
            <h2>Creativa</h2>
            <span>IMPRESOS</span>
          </div>
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

        <div className="user-box">
          <div className="avatar">LV</div>

          <div>
            <strong>L. Virginia</strong>
            <span>Recepción</span>
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="content">
        {pagina === "inicio" && (
          <>
            <header className="header">
              <div>
                <span className="date">
                  Lunes, 21 de septiembre
                </span>

                <h1>Buenos días, L. Virginia 👋</h1>

                <p>
                  Aquí tienes el resumen de los trabajos de la imprenta.
                </p>
              </div>

              <button className="notification">🔔</button>
            </header>

            <section className="alert">
              <div className="alert-icon">!</div>

              <div className="alert-text">
                <strong>
                  2 trabajos deben entregarse hoy
                </strong>

                <span>
                  Revisa primero los trabajos con mayor prioridad.
                </span>
              </div>

              <button>Ver trabajos</button>
            </section>

            <section className="stats">
              <article className="stat">
                <div className="stat-icon blue">▣</div>

                <div>
                  <span>Pendientes</span>
                  <strong>12</strong>
                  <small>Trabajos por realizar</small>
                </div>
              </article>

              <article className="stat">
                <div className="stat-icon cyan">✎</div>

                <div>
                  <span>En diseño</span>
                  <strong>4</strong>
                  <small>Actualmente trabajando</small>
                </div>
              </article>

              <article className="stat">
                <div className="stat-icon green">✓</div>

                <div>
                  <span>Terminados</span>
                  <strong>6</strong>
                  <small>Listos para entregar</small>
                </div>
              </article>

              <article className="stat">
                <div className="stat-icon orange">S/</div>

                <div>
                  <span>Por cobrar</span>
                  <strong>S/ 640</strong>
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

                <button className="view-all">
                  Ver todos
                </button>
              </div>

              <div className="jobs-list">
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
                        <strong>{trabajo.id}</strong>
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
                        {trabajo.entrega}
                      </strong>
                    </div>

                    <div className="job-data">
                      <small>Estado</small>

                      <span
                        className={
                          trabajo.estado ===
                          "Pendiente"
                            ? "badge pending"
                            : "badge designing"
                        }
                      >
                        {trabajo.estado}
                      </span>
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
            >
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
                    <label htmlFor="tipo-trabajo">Tipo de trabajo *</label>
                    <select
                      id="tipo-trabajo"
                      name="tipo"
                      value={formulario.tipo}
                      onChange={cambiarFormulario}
                      disabled={cargandoCategorias || !!errorCategorias || categoriasTrabajo.length === 0}
                      aria-describedby="estado-categorias"
                      required
                    >
                      <option value="">
                        {cargandoCategorias ? "Cargando categorías…" : "Seleccionar"}
                      </option>
                      {categoriasTrabajo.map((categoria) => (
                        <option key={categoria.id} value={categoria.nombre}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                    <div id="estado-categorias" role="status">
                      {cargandoCategorias && <small>Cargando tipos de trabajo…</small>}
                      {errorCategorias && <p>{errorCategorias}</p>}
                      {!cargandoCategorias && !errorCategorias && categoriasTrabajo.length === 0 && (
                        <p>No hay categorías activas disponibles.</p>
                      )}
                    </div>
                    {!cargandoCategorias && (errorCategorias || categoriasTrabajo.length === 0) && (
                      <button type="button" onClick={reintentarCategorias}>
                        Reintentar
                      </button>
                    )}
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
                      Desde cámara, galería o archivos
                    </small>

                    <input
                      type="file"
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

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setPagina("inicio")
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={cargandoCategorias || !!errorCategorias || categoriasTrabajo.length === 0}
                >
                  Guardar trabajo
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
        El pedido fue registrado correctamente y ya está
        disponible en la lista de trabajos.
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

export default App;