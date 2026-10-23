export default function SelectorTema({ tema, cambiarTema }) {
  return <div className="appearance-bar">
    <span className="appearance-label">Apariencia</span>
    <div className="appearance-switch" role="group" aria-label="Apariencia del panel">
      <button type="button" aria-pressed={tema === "claro"} onClick={() => cambiarTema("claro")}><span aria-hidden="true">☀</span> Claro</button>
      <button type="button" aria-pressed={tema === "oscuro"} onClick={() => cambiarTema("oscuro")}><span aria-hidden="true">☾</span> Oscuro</button>
    </div>
  </div>;
}
