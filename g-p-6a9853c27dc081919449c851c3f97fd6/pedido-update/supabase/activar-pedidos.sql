-- Ejecutar UNA VEZ en SQL Editor del proyecto creativa-mila.
-- Usa las tablas existentes. No elimina pedidos ni desactiva RLS.
-- Cliente + pedido + adelanto se confirman en una única transacción.
begin;

create schema if not exists creativa_privado;
revoke all on schema creativa_privado from public, anon, authenticated;

create table if not exists creativa_privado.equipo (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('administracion', 'disenador')),
  activo boolean not null default true
);
create table if not exists creativa_privado.solicitudes_pedido (
  id uuid primary key,
  usuario_id uuid not null references auth.users(id),
  contenido jsonb not null,
  trabajo_id uuid not null references public.trabajos(id),
  created_at timestamptz not null default now()
);
revoke all on all tables in schema creativa_privado from public, anon, authenticated;

alter table public.clientes enable row level security;
alter table public.trabajos enable row level security;
alter table public.pagos enable row level security;
-- Todo el acceso del navegador a estas tablas pasa por las funciones con control de rol.
revoke all on public.clientes, public.trabajos, public.pagos from public, anon, authenticated;
-- Las funciones de abajo comprueban el equipo antes de acceder a datos.
-- No se añaden políticas públicas de lectura o escritura para clientes/pedidos.

create or replace function creativa_privado.exigir_equipo()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from creativa_privado.equipo e
    where e.usuario_id = auth.uid() and e.activo
  ) then
    raise exception 'Tu cuenta no tiene acceso al equipo de Creativa Mila.' using errcode = '42501';
  end if;
end;
$$;

create or replace function creativa_privado.pedido_json(p_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'codigo', t.codigo, 'disenador_id', t."diseñador_id",
    'descripcion', t.descripcion, 'cantidad', t.cantidad, 'fecha_recibido', t.fecha_recibido,
    'cliente', c.nombre, 'tipo', tt.nombre,
    'entrega', t.fecha_entrega, 'estado', t.estado,
    'precio_total', t.precio_total,
    'pagado', coalesce((select sum(p.monto) from public.pagos p where p.trabajo_id = t.id), 0),
    'urgente', t.fecha_entrega::date <= timezone('America/Lima', now())::date and t.estado <> 'Entregado'
  ) from public.trabajos t
    left join public.clientes c on c.id = t.cliente_id
    left join public.tipos_trabajo tt on tt.id = t.tipo_trabajo_id
  where t.id = p_id;
$$;

create or replace function public.creativa_cargar_pedidos()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rol text; v_nombre text;
begin
  perform creativa_privado.exigir_equipo();
  select rol, nombre into v_rol, v_nombre from creativa_privado.equipo where usuario_id = auth.uid();
  return jsonb_build_object(
    'perfil', jsonb_build_object('nombre', v_nombre, 'rol', v_rol),
    'disenadores', case when v_rol = 'administracion' then coalesce((
      select jsonb_agg(jsonb_build_object('id', usuario_id, 'nombre', nombre) order by nombre)
      from creativa_privado.equipo where activo and rol = 'disenador'
    ), '[]'::jsonb) else '[]'::jsonb end,
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre) order by c.nombre)
      from public.categorias_trabajo c where c.activo), '[]'::jsonb),
    'tipos', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'nombre', t.nombre, 'categoria_id', t.categoria_id) order by t.nombre)
      from public.tipos_trabajo t join public.categorias_trabajo c on c.id = t.categoria_id
      where t.activo and c.activo), '[]'::jsonb),
    'trabajos', coalesce((select jsonb_agg(
      case when v_rol = 'administracion' then creativa_privado.pedido_json(t.id)
        else creativa_privado.pedido_json(t.id) - 'precio_total' - 'pagado' end
      order by t.fecha_entrega asc nulls last, t.created_at desc)
      from public.trabajos t where v_rol = 'administracion' or t."diseñador_id" = auth.uid()), '[]'::jsonb)
  );
end;
$$;

create or replace function public.creativa_guardar_pedido(p_solicitud uuid, p_pedido jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cliente uuid;
  v_trabajo uuid;
  v_tipo uuid;
  v_nombre text;
  v_telefono text;
  v_precio numeric;
  v_adelanto numeric;
  v_cantidad integer;
  v_recibido date;
  v_entrega timestamp;
  v_metodo text;
  v_anterior creativa_privado.solicitudes_pedido%rowtype;
begin
  perform creativa_privado.exigir_equipo();
  if not exists (select 1 from creativa_privado.equipo where usuario_id = auth.uid() and rol = 'administracion') then
    raise exception 'Solo administración puede registrar pedidos.' using errcode = '42501';
  end if;
  if p_solicitud is null or p_pedido is null or jsonb_typeof(p_pedido) <> 'object' then
    raise exception 'El pedido no es válido.';
  end if;
  -- Serializar reintentos: incluso si se pierde la respuesta, no duplica el pedido.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_solicitud::text, 0));
  select * into v_anterior from creativa_privado.solicitudes_pedido where id = p_solicitud;
  if found then
    if v_anterior.usuario_id <> auth.uid() or v_anterior.contenido <> p_pedido then
      raise exception 'Este intento ya guardó otro contenido. Actualiza la lista antes de registrar otro pedido.';
    end if;
    return creativa_privado.pedido_json(v_anterior.trabajo_id);
  end if;

  v_nombre := btrim(coalesce(p_pedido->>'cliente', ''));
  v_telefono := btrim(coalesce(p_pedido->>'telefono', ''));
  v_tipo := (p_pedido->>'tipo_trabajo_id')::uuid;
  v_precio := (p_pedido->>'precio_total')::numeric;
  v_adelanto := coalesce((p_pedido->>'adelanto')::numeric, 0);
  v_cantidad := (p_pedido->>'cantidad')::integer;
  v_recibido := (p_pedido->>'fecha_recibido')::date;
  v_entrega := (p_pedido->>'fecha_entrega')::timestamp;
  v_metodo := p_pedido->>'metodo_pago';
  if v_nombre = '' or length(v_nombre) > 150 or length(v_telefono) > 20 then
    raise exception 'Revisa el nombre y teléfono del cliente.';
  end if;
  if v_precio is null or v_precio < 0 or v_precio > 99999999.99 or
     v_precio::text in ('NaN', 'Infinity', '-Infinity') or v_precio <> round(v_precio, 2) or
     v_adelanto < 0 or v_adelanto > v_precio or v_adelanto <> round(v_adelanto, 2) or
     v_adelanto::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Revisa el precio y el adelanto. El adelanto no puede superar el total.';
  end if;
  if v_cantidad is not null and v_cantidad < 1 then raise exception 'La cantidad debe ser positiva.'; end if;
  if v_recibido is null or v_entrega is null or not isfinite(v_recibido) or not isfinite(v_entrega) or v_entrega::date < v_recibido then
    raise exception 'La fecha de entrega no puede ser anterior a la recepción.';
  end if;
  if v_metodo is null or v_metodo not in ('Efectivo', 'Yape', 'Plin', 'Transferencia', 'Otro') then
    raise exception 'Método de pago no válido.';
  end if;
  if not exists (select 1 from public.tipos_trabajo t join public.categorias_trabajo c on c.id = t.categoria_id
      where t.id = v_tipo and t.activo and c.activo) then
    raise exception 'El tipo de trabajo ya no está activo. Actualiza el catálogo.';
  end if;

  -- Solo reutilizar clientes con el mismo nombre Y teléfono no vacío.
  -- El bloqueo evita duplicados en registros simultáneos de ese cliente.
  if v_telefono <> '' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(v_nombre) || ':' || v_telefono, 1));
    select id into v_cliente from public.clientes
      where lower(btrim(nombre)) = lower(v_nombre) and btrim(telefono) = v_telefono
      order by created_at, id limit 1;
  end if;
  if v_cliente is null then
    insert into public.clientes(nombre, telefono) values(v_nombre, nullif(v_telefono, '')) returning id into v_cliente;
  end if;
  v_trabajo := gen_random_uuid();
  insert into public.trabajos(id, codigo, cliente_id, tipo_trabajo_id, descripcion, cantidad,
    fecha_recibido, fecha_entrega, precio_total, estado)
  values(v_trabajo, 'TR-' || upper(substr(replace(v_trabajo::text, '-', ''), 1, 17)), v_cliente, v_tipo,
    nullif(btrim(p_pedido->>'descripcion'), ''), v_cantidad, v_recibido, v_entrega, v_precio, 'Pendiente');
  if v_adelanto > 0 then
    insert into public.pagos(trabajo_id, monto, metodo)
      values(v_trabajo, v_adelanto, v_metodo);
  end if;
  insert into creativa_privado.solicitudes_pedido(id, usuario_id, contenido, trabajo_id)
    values(p_solicitud, auth.uid(), p_pedido, v_trabajo);
  return creativa_privado.pedido_json(v_trabajo);
end;
$$;

create or replace function public.creativa_asignar_pedido(p_trabajo uuid, p_disenador uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform creativa_privado.exigir_equipo();
  if not exists (select 1 from creativa_privado.equipo where usuario_id = auth.uid() and rol = 'administracion') then
    raise exception 'Solo administración puede asignar pedidos.' using errcode = '42501';
  end if;
  if p_disenador is not null and not exists (
    select 1 from creativa_privado.equipo where usuario_id = p_disenador and activo and rol = 'disenador'
  ) then raise exception 'Selecciona un diseñador activo.'; end if;
  update public.trabajos set "diseñador_id" = p_disenador where id = p_trabajo and estado <> 'Entregado';
  if not found then raise exception 'El pedido no existe o ya fue entregado.'; end if;
end;
$$;

create or replace function public.creativa_cambiar_estado(p_trabajo uuid, p_estado text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_rol text; v_trabajo public.trabajos%rowtype;
begin
  perform creativa_privado.exigir_equipo();
  select rol into v_rol from creativa_privado.equipo where usuario_id = auth.uid();
  select * into v_trabajo from public.trabajos where id = p_trabajo for update;
  if not found or (v_rol <> 'administracion' and v_trabajo."diseñador_id" is distinct from auth.uid()) then
    raise exception 'No tienes acceso a este pedido.' using errcode = '42501';
  end if;
  if p_estado is null or p_estado not in ('Pendiente', 'En diseño', 'Listo', 'Entregado') then raise exception 'Estado no válido.'; end if;
  if v_rol = 'disenador' and not (
    (v_trabajo.estado in ('Pendiente', 'En diseño') and p_estado = 'En diseño') or
    (v_trabajo.estado in ('En diseño', 'Listo') and p_estado = 'Listo')
  ) then raise exception 'Solo puedes iniciar el diseño o marcarlo listo.'; end if;
  update public.trabajos set estado = p_estado where id = p_trabajo;
end;
$$;

revoke all on all functions in schema creativa_privado from public, anon, authenticated;
revoke all on function public.creativa_cargar_pedidos() from public, anon, authenticated;
revoke all on function public.creativa_guardar_pedido(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.creativa_cargar_pedidos() to authenticated;
grant execute on function public.creativa_guardar_pedido(uuid, jsonb) to authenticated;
revoke all on function public.creativa_asignar_pedido(uuid, uuid) from public, anon, authenticated;
revoke all on function public.creativa_cambiar_estado(uuid, text) from public, anon, authenticated;
grant execute on function public.creativa_asignar_pedido(uuid, uuid) to authenticated;
grant execute on function public.creativa_cambiar_estado(uuid, text) to authenticated;
commit;
