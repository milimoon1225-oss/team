begin;
create table if not exists creativa_privado.enlaces_equipo (
 id boolean primary key default true check(id), grupo_listos text not null default ''
);
insert into creativa_privado.enlaces_equipo(id) values(true) on conflict do nothing;
revoke all on creativa_privado.enlaces_equipo from public,anon,authenticated;
create or replace function public.creativa_enlace_listos() returns text language plpgsql security definer set search_path='' as $$
begin perform creativa_privado.exigir_equipo(); return (select grupo_listos from creativa_privado.enlaces_equipo where id); end $$;
create or replace function public.creativa_guardar_enlace_listos(p_url text) returns text language plpgsql security definer set search_path='' as $$
begin
 perform creativa_privado.exigir_equipo();
 if not exists(select 1 from creativa_privado.equipo where usuario_id=auth.uid() and rol='administracion') then raise exception 'Solo administración puede configurar el grupo.' using errcode='42501'; end if;
 p_url:=btrim(coalesce(p_url,''));
 if p_url<>'' and (length(p_url)>500 or p_url !~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]+([?][A-Za-z0-9=&_-]+)?$') then raise exception 'Usa el enlace de invitación https://chat.whatsapp.com/ del grupo.'; end if;
 update creativa_privado.enlaces_equipo set grupo_listos=p_url where id;
 return p_url;
end $$;
create or replace function public.creativa_tomar_trabajo(p_trabajo uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_t public.trabajos%rowtype;
begin
 perform creativa_privado.exigir_equipo();
 if not exists(select 1 from creativa_privado.equipo where usuario_id=auth.uid() and rol='disenador') then raise exception 'Esta acción corresponde al diseñador.' using errcode='42501'; end if;
 select * into v_t from public.trabajos where id=p_trabajo for update;
 if not found then raise exception 'El pedido ya no está disponible.'; end if;
 if v_t."diseñador_id"=auth.uid() then return; end if;
 if v_t."diseñador_id" is not null or v_t.estado<>'Pendiente' then raise exception 'Otro diseñador ya tomó este pedido o recepción cambió su estado. Actualiza la lista.'; end if;
 update public.trabajos set "diseñador_id"=auth.uid(),estado='En diseño' where id=p_trabajo;
end $$;
create or replace function public.creativa_cargar_pedidos()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_rol text; v_nombre text;
begin
 perform creativa_privado.exigir_equipo();
 select rol,nombre into v_rol,v_nombre from creativa_privado.equipo where usuario_id=auth.uid();
 return jsonb_build_object(
 'perfil',jsonb_build_object('nombre',v_nombre,'rol',v_rol),
 'disenadores',case when v_rol='administracion' then coalesce((select jsonb_agg(jsonb_build_object('id',usuario_id,'nombre',nombre) order by nombre) from creativa_privado.equipo where activo and rol='disenador'),'[]'::jsonb) else '[]'::jsonb end,
 'categorias',coalesce((select jsonb_agg(jsonb_build_object('id',id,'nombre',nombre) order by nombre) from public.categorias_trabajo where activo),'[]'::jsonb),
 'tipos',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'nombre',t.nombre,'categoria_id',t.categoria_id) order by t.nombre) from public.tipos_trabajo t join public.categorias_trabajo c on c.id=t.categoria_id where t.activo and c.activo),'[]'::jsonb),
 'trabajos',coalesce((select jsonb_agg(
 (case when v_rol='administracion' then creativa_privado.pedido_json(t.id) else creativa_privado.pedido_json(t.id)-'precio_total'-'pagado' end)
 ||jsonb_build_object('telefono',case when v_rol='administracion' or t."diseñador_id"=auth.uid() then c.telefono else null end,'disponible',t."diseñador_id" is null and t.estado='Pendiente')
 order by t.fecha_entrega asc nulls last,t.created_at desc)
 from public.trabajos t left join public.clientes c on c.id=t.cliente_id
 where v_rol='administracion' or t."diseñador_id"=auth.uid() or (t."diseñador_id" is null and t.estado='Pendiente')),'[]'::jsonb));
end $$;
revoke all on function public.creativa_enlace_listos(),public.creativa_guardar_enlace_listos(text),public.creativa_tomar_trabajo(uuid),public.creativa_cargar_pedidos() from public,anon,authenticated;
grant execute on function public.creativa_enlace_listos(),public.creativa_guardar_enlace_listos(text),public.creativa_tomar_trabajo(uuid),public.creativa_cargar_pedidos() to authenticated;
commit;
