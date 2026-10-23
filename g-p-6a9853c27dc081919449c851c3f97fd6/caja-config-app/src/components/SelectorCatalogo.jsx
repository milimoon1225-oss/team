import { useEffect, useId, useRef, useState } from "react";
import "./SelectorCatalogo.css";

// Lista dentro del formulario: nunca abre una ventana nativa fuera del móvil.
export default function SelectorCatalogo({ id, opciones, valor, onChange, placeholder, disabled, required = false, agruparNombres = false }) {
  const listaId = useId();
  const contenedor = useRef(null);
  const boton = useRef(null);
  const lista = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const busqueda = useRef({ texto: "", tiempo: 0 });
  const unicas = new Map();
  for (const opcion of opciones) {
    const clave = agruparNombres ? opcion.nombre.trim().normalize("NFC").toLocaleLowerCase("es") : opcion.id;
    const anterior = unicas.get(clave);
    if (!anterior || opcion.id === valor || (anterior.id !== valor && String(opcion.id) < String(anterior.id))) unicas.set(clave, opcion);
  }
  const items = [...unicas.values()];
  const seleccionada = items.find((opcion) => opcion.id === valor);
  const visible = abierto && !disabled;
  const indice = Math.min(activo, Math.max(0, items.length - 1));

  useEffect(() => {
    function cerrarFuera(evento) {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    }
    document.addEventListener("pointerdown", cerrarFuera);
    return () => document.removeEventListener("pointerdown", cerrarFuera);
  }, []);
  useEffect(() => {
    const panel = lista.current;
    const opcion = panel?.children[indice];
    if (!visible || !opcion) return;
    if (opcion.offsetTop < panel.scrollTop) panel.scrollTop = opcion.offsetTop;
    else if (opcion.offsetTop + opcion.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = opcion.offsetTop + opcion.offsetHeight - panel.clientHeight;
    }
  }, [indice, visible]);

  function abrir() {
    setActivo(Math.max(0, items.findIndex((opcion) => opcion.id === valor)));
    setAbierto(true);
  }
  function elegir(opcion) {
    onChange(opcion.id);
    setAbierto(false);
    boton.current?.focus({ preventScroll: true });
  }
  function teclado(evento) {
    if (evento.key === "Escape" || evento.key === "Tab") { setAbierto(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(evento.key)) {
      evento.preventDefault();
      if (!visible) { abrir(); return; }
      setActivo(evento.key === "Home" ? 0 : evento.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, indice + (evento.key === "ArrowDown" ? 1 : -1))));
    } else if (visible && (evento.key === "Enter" || evento.key === " ")) {
      evento.preventDefault();
      if (items[indice]) elegir(items[indice]);
    } else if (evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey && evento.key !== " ") {
      const ahora = Date.now();
      busqueda.current = { texto: (ahora - busqueda.current.tiempo < 700 ? busqueda.current.texto : "") + evento.key.toLocaleLowerCase("es"), tiempo: ahora };
      const encontrado = items.findIndex((opcion) => opcion.nombre.toLocaleLowerCase("es").startsWith(busqueda.current.texto));
      if (encontrado >= 0) { setAbierto(true); setActivo(encontrado); }
    }
  }
  return <div className="catalog-picker" ref={contenedor} onBlur={(evento) => {
    if (evento.relatedTarget && !evento.currentTarget.contains(evento.relatedTarget)) setAbierto(false);
  }}>
    <button id={id} ref={boton} type="button" role="combobox" aria-expanded={visible}
      aria-haspopup="listbox" aria-controls={visible ? listaId : undefined} aria-required={required}
      aria-activedescendant={visible && items.length ? `${listaId}-${indice}` : undefined}
      disabled={disabled} onKeyDown={teclado} onClick={() => visible ? setAbierto(false) : abrir()}>
      <span>{seleccionada?.nombre || placeholder}</span><span aria-hidden="true">{visible ? "▴" : "▾"}</span>
    </button>
    {visible && <ul id={listaId} ref={lista} role="listbox" aria-label={placeholder}>
      {items.map((opcion, posicion) => <li key={opcion.id} id={`${listaId}-${posicion}`} role="option"
        aria-selected={opcion.id === valor} className={posicion === indice ? "catalog-active" : ""}
        onPointerDown={(evento) => { if (evento.pointerType === "mouse") evento.preventDefault(); }}
        onClick={() => elegir(opcion)}>
        <span>{opcion.nombre}</span>{opcion.id === valor && <span aria-hidden="true">✓</span>}
      </li>)}
      {items.length === 0 && <li role="option" aria-disabled="true" aria-selected="false">No hay opciones disponibles.</li>}
    </ul>}
  </div>;
}
