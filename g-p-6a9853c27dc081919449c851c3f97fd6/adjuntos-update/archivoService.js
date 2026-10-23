export const BUCKET_REFERENCIAS = "creativa-referencias";
export const MAX_ARCHIVO = 10 * 1024 * 1024;
const FORMATOS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };

export function validarArchivo(archivo) {
  if (!archivo) return null;
  const extension = archivo.name.split(".").pop().toLowerCase();
  const inferido = extension === "jpeg" || extension === "jpg" ? "image/jpeg" : Object.keys(FORMATOS).find((mime) => FORMATOS[mime] === extension);
  const tipo = archivo.type || inferido;
  if (!FORMATOS[tipo]) throw new Error("Elige una foto JPG, PNG, WebP, HEIC o un PDF.");
  if (archivo.size <= 0 || archivo.size > MAX_ARCHIVO) throw new Error("El archivo debe tener contenido y pesar como máximo 10 MB.");
  if (archivo.name.length > 255) throw new Error("Acorta el nombre del archivo a menos de 256 caracteres.");
  return { tipo, extension: FORMATOS[tipo] };
}

export async function subirReferencia(supabase, solicitudId, archivo) {
  const formato = validarArchivo(archivo);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Vuelve a iniciar sesión para subir el archivo.");
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await archivo.arrayBuffer()))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const ruta = `${data.user.id}/${solicitudId}/${hash}.${formato.extension}`;
  const { error: fallo } = await supabase.storage.from(BUCKET_REFERENCIAS).upload(ruta, archivo, { contentType: formato.tipo, upsert: false });
  if (fallo && String(fallo.statusCode) !== "409" && !/already exists|duplicate/i.test(fallo.message || "")) {
    const errorSubida = new Error("No se pudo subir el archivo. Revisa tu conexión y vuelve a intentarlo. Si continúa, contacta a administración.");
    // Todavía no se llamó al registro del pedido: se puede corregir el formulario.
    errorSubida.code = "ARCHIVO_SUBIDA";
    throw errorSubida;
  }
  return { ruta, nombre: archivo.name, tipo: formato.tipo, bytes: archivo.size };
}
