-- Lectura privada de clientes para administración. No modifica registros.
begin;
create or replace function public.creativa_cargar_clientes()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform creativa_privado.exigir_equipo();
  if not exists(select 1 from creativa_privado.equipo where usuario_id = auth.uid() and rol = 'administracion') then
    raise exception 'Solo administración puede consultar clientes.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', c.id, 'nombre', c.nombre, 'telefono', c.telefono,
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'codigo', t.codigo, 'tipo', tt.nombre, 'estado', t.estado,
      'entrega', t.fecha_entrega, 'precio_total', coalesce(t.precio_total, 0),
      'pagado', coalesce((select sum(p.monto) from public.pagos p where p.trabajo_id = t.id), 0)
    ) order by t.created_at desc, t.id)
    from public.trabajos t left join public.tipos_trabajo tt on tt.id = t.tipo_trabajo_id
    where t.cliente_id = c.id), '[]'::jsonb)
  ) order by c.nombre, c.id) from public.clientes c), '[]'::jsonb);
end;
$$;
revoke all on function public.creativa_cargar_clientes() from public, anon, authenticated;
grant execute on function public.creativa_cargar_clientes() to authenticated;
commit;
