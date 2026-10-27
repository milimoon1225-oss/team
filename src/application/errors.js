export function message(error) {
  return error?.message || 'No se pudo completar la operación.';
}
