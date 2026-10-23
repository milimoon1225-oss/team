import { useEffect, useState } from "react";

const CLAVE = "creativa-apariencia";
function temaInicial() {
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch { /* La preferencia sigue funcionando si el almacenamiento está bloqueado. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial);
  useEffect(() => {
    function sincronizar(evento) {
      if (evento.key === CLAVE || evento.key === null) setTema(temaInicial());
    }
    window.addEventListener("storage", sincronizar);
    return () => window.removeEventListener("storage", sincronizar);
  }, []);
  function cambiarTema(nuevoTema) {
    if (nuevoTema !== "claro" && nuevoTema !== "oscuro") return;
    setTema(nuevoTema);
    try { window.localStorage.setItem(CLAVE, nuevoTema); } catch { /* Preferencia temporal. */ }
  }
  return [tema, cambiarTema];
}
