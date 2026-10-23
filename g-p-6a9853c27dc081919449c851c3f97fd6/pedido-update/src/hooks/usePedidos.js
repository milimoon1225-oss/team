import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { crearPedidoService, mensajePedido } from "../services/pedidoService";

const servicio = crearPedidoService(supabase);
export function usePedidos() {
  const [datos, setDatos] = useState({ perfil: null, disenadores: [], categorias: [], tipos: [], trabajos: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    servicio.cargarDatos().then((resultado) => {
      if (vigente) { setDatos(resultado); setCargando(false); }
    }).catch((err) => {
      if (vigente) { setError(mensajePedido(err)); setCargando(false); }
    });
    return () => { vigente = false; };
  }, [intento]);
  function recargar() {
    setCargando(true);
    setError("");
    setIntento((valor) => valor + 1);
  }
  function incorporar(pedido) {
    setDatos((actual) => ({ ...actual, trabajos: [pedido, ...actual.trabajos.filter((t) => t.id !== pedido.id)].sort((a, b) => (a.entrega || "9999").localeCompare(b.entrega || "9999")) }));
  }
  return { ...datos, cargando, error, recargar, incorporar, guardarPedido: servicio.guardarPedido };
}
