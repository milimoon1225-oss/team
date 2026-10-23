import { supabase } from "../lib/supabase";

export async function obtenerCategorias() {
  const { data, error } = await supabase
    .from("categorias_trabajo")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  // Distinguir un error de una consulta válida sin categorías.
  if (error) throw error;
  return data ?? [];
}