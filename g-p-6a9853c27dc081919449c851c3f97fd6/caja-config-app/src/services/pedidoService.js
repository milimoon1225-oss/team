import { BUCKET_REFERENCIAS, subirReferencia, validarArchivo } from "./archivoService.js";

export function crearPedidoService(supabase) {
  async function cargarDatos() {
    const { data, error } = await supabase.rpc("creativa_cargar_pedidos");
    if (error) throw error;
    return data;
  }

  async function guardarPedido(solicitudId, formulario) {
    const pedido = prepararPedido(formulario);
    if (formulario.archivo) {
      try { pedido.archivo = await subirReferencia(supabase, solicitudId, formulario.archivo); }
      catch (error) { error.code = "ARCHIVO_SUBIDA"; throw error; }
    }
    const { data, error } = await supabase.rpc("creativa_guardar_pedido_v2", {
      p_solicitud: solicitudId,
      p_pedido: pedido,
    });
    if (error) {
      // Limpiar solo un rechazo confirmado: ante una respuesta perdida se conserva
      // el archivo para reintentar exactamente el mismo pedido.
      if (pedido.archivo && /^(P0001|42501|22|23|PGRST202)/.test(error.code || "")) {
        try { await supabase.storage.from(BUCKET_REFERENCIAS).remove([pedido.archivo.ruta]); } catch { /* Puede reintentarse después. */ }
      }
      throw error;
    }
    if (!data?.id) throw new Error("No se recibió la confirmación. Reintenta el mismo pedido.");
    return data;
  }
  return { cargarDatos, guardarPedido };
}

export function prepararPedido(formulario) {
  validarArchivo(formulario.archivo);
  const precio = Number(formulario.precio);
  const adelanto = Number(formulario.adelanto || 0);
  const cantidad = formulario.cantidad === "" ? null : Number(formulario.cantidad);
  if (!formulario.cliente.trim() || formulario.cliente.trim().length > 150) throw new Error("Escribe el nombre del cliente (máximo 150 caracteres).");
  if (formulario.telefono.trim().length > 20) throw new Error("El teléfono admite hasta 20 caracteres.");
  if (!formulario.tipo) throw new Error("Selecciona un tipo de trabajo.");
  if (formulario.precio === "" || !Number.isFinite(precio) || precio < 0 || precio > 99999999.99) throw new Error("Indica un precio válido.");
  if (!Number.isFinite(adelanto) || adelanto < 0 || adelanto > precio) throw new Error("El adelanto debe estar entre cero y el precio total.");
  if (cantidad !== null && (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2147483647)) throw new Error("La cantidad debe ser un número entero positivo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formulario.fechaRecibida) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(formulario.fechaEntrega) ||
      !Number.isFinite(Date.parse(formulario.fechaRecibida)) ||
      !Number.isFinite(Date.parse(formulario.fechaEntrega)) ||
      formulario.fechaEntrega.slice(0, 10) < formulario.fechaRecibida) throw new Error("Revisa las fechas: la entrega no puede ser anterior a la recepción.");
  if (!["Efectivo", "Yape", "Plin", "Transferencia", "Otro"].includes(formulario.metodoPago)) throw new Error("Selecciona un método de pago válido.");
  return {
    cliente: formulario.cliente.trim(), telefono: formulario.telefono.trim(),
    tipo_trabajo_id: formulario.tipo, cantidad,
    descripcion: formulario.descripcion.trim(),
    fecha_recibido: formulario.fechaRecibida,
    // La columna es timestamp SIN zona: conservar la hora local del formulario.
    fecha_entrega: formulario.fechaEntrega,
    precio_total: Math.round(precio * 100) / 100,
    adelanto: Math.round(adelanto * 100) / 100,
    metodo_pago: formulario.metodoPago,
  };
}

export function mensajePedido(error) {
  if (error?.code === "PGRST202") return "Falta activar una actualización del sistema. Contacta a administración.";
  if (error?.code === "42501") return "Tu cuenta todavía no tiene acceso al equipo de Creativa Mila.";
  if (error?.code === "P0001") return error.message;
  if (error?.code === "23505") return "No se pudo asignar el código del pedido. Intenta nuevamente.";
  if (error?.code === "PGRST301" || error?.code === "PGRST303") return "Tu sesión venció. Vuelve a iniciar sesión.";
  if (error instanceof Error && !/fetch|network/i.test(error.message)) return error.message;
  return "No se pudo confirmar el guardado. Conservamos tus datos: reintenta para comprobarlo sin duplicar el pedido.";
}
