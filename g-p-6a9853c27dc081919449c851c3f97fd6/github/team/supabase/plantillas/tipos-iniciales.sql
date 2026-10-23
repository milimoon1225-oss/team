-- Opcional: tipos de ejemplo acordados en el diseño inicial.
-- Ejecutar si el selector de tipos aparece vacío. No borra los tipos existentes.
insert into public.tipos_trabajo(categoria_id, nombre, activo)
select c.id, v.tipo, true
from (values
  ('Tarjetas', 'Tarjeta tapa dura'),
  ('Tarjetas', 'Tarjetas personales'),
  ('Tarjetas', 'Tarjeta corte abajo'),
  ('Sublimación', 'Taza sublimada'),
  ('Sublimación', 'Polo sublimado'),
  ('Estampado', 'Estampado'),
  ('Corte láser', 'Corte MDF'),
  ('Diseño gráfico', 'Diseño gráfico'),
  ('Otros', 'Otros')
) v(categoria, tipo)
join public.categorias_trabajo c on c.nombre = v.categoria
where not exists (select 1 from public.tipos_trabajo t where t.categoria_id = c.id and t.nombre = v.tipo);
