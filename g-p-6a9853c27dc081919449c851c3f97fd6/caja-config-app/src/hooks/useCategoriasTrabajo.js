import { useEffect, useState } from "react";
import { obtenerCategorias } from "../services/trabajoService";

export function useCategoriasTrabajo() {
  const [estado, setEstado] = useState({ categorias: [], cargando: true, error: "" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        const categorias = await obtenerCategorias();
        if (vigente) setEstado({ categorias, cargando: false, error: "" });
      } catch {
        if (vigente) setEstado({
          categorias: [], cargando: false,
          error: "No se pudieron cargar las categorías. Intenta nuevamente.",
        });
      }
    }
    cargar();
    return () => { vigente = false; };
  }, [intento]);

  function reintentar() {
    setEstado({ categorias: [], cargando: true, error: "" });
    setIntento((actual) => actual + 1);
  }
  return { ...estado, reintentar };
}
