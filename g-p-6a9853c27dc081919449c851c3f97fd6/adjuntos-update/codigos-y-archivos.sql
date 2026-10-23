-- Ejecutar después de activar-pedidos.sql. Conserva pedidos, clientes y pagos.
-- Convierte los códigos anteriores por orden de creación y guarda el código viejo.
begin;
lock table public.trabajos in access exclusive mode;
alter table public.trabajos add column if not exists codigo_anterior varchar(20);
create sequence if not exists creativa_privado.numero_trabajo minvalue 1 maxvalue 99999999 no cycle;
revoke all on sequence creativa_privado.numero_trabajo from public, anon, authenticated;
do $$
declare v_max bigint; v_ultimo bigint; v_usado boolean; v_fila record;
begin
  select coalesce(max(substring(codigo from 4)::bigint), 0) into v_max
    from public.trabajos where codigo ~ '^TR-[0-9]{8}$';
  select last_value, is_called into v_ultimo, v_usado from creativa_privado.numero_trabajo;
  v_max := greatest(v_max, case when v_usado then v_ultimo else 0 end);
  perform setval('creativa_privado.numero_trabajo'::regclass, greatest(v_max, 1), v_max > 0);
  for v_fila in select id, codigo from public.trabajos
    where codigo is null or codigo !~ '^TR-[0-9]{8}$' order by created_at nulls last, id
  loop
    update public.trabajos set codigo_anterior = coalesce(codigo_anterior, v_fila.codigo),
      codigo = 'TR-' || lpad(nextval('creativa_privado.numero_trabajo'::regclass)::text, 8, '0')
      where id = v_fila.id;
  end loop;
end;
$$;
create or replace function creativa_privado.asignar_codigo_trabajo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.codigo := 'TR-' || lpad(nextval('creativa_privado.numero_trabajo'::regclass)::text, 8, '0');
  return new;
end;
$$;
revoke all on function creativa_privado.asignar_codigo_trabajo() from public, anon, authenticated;
drop trigger if exists creativa_codigo_trabajo on public.trabajos;
create trigger creativa_codigo_trabajo before insert on public.trabajos
  for each row execute function creativa_privado.asignar_codigo_trabajo();

alter table public.archivos_trabajo add column if not exists ruta_storage text;
alter table public.archivos_trabajo add column if not exists mime_type text;
alter table public.archivos_trabajo add column if not exists bytes bigint;
create unique index if not exists creativa_archivo_ruta_unica on public.archivos_trabajo(ruta_storage) where ruta_storage is not null;
alter table public.archivos_trabajo enable row level security;
revoke all on public.archivos_trabajo from public, anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('creativa-referencias', 'creativa-referencias', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.creativa_puede_subir_archivo(p_ruta text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and split_part(p_ruta, '/', 1) = auth.uid()::text
    and p_ruta ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f]{64}\.(jpg|png|webp|heic|heif|pdf)$'
    and exists(select 1 from creativa_privado.equipo where usuario_id = auth.uid() and activo and rol = 'administracion');
$$;
create or replace function public.creativa_puede_leer_archivo(p_ruta text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from creativa_privado.equipo e where e.usuario_id = auth.uid() and e.activo and (
    (e.rol = 'administracion' and split_part(p_ruta, '/', 1) = auth.uid()::text)
    or exists(select 1 from public.archivos_trabajo a join public.trabajos t on t.id = a.trabajo_id
      where a.ruta_storage = p_ruta and (e.rol = 'administracion' or t."diseñador_id" = auth.uid()))
  ));
$$;
create or replace function public.creativa_puede_limpiar_archivo(p_ruta text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.creativa_puede_subir_archivo(p_ruta)
    and not exists(select 1 from public.archivos_trabajo where ruta_storage = p_ruta);
$$;
revoke all on function public.creativa_puede_subir_archivo(text) from public, anon, authenticated;
revoke all on function public.creativa_puede_leer_archivo(text) from public, anon, authenticated;
revoke all on function public.creativa_puede_limpiar_archivo(text) from public, anon, authenticated;
grant execute on function public.creativa_puede_subir_archivo(text) to authenticated;
grant execute on function public.creativa_puede_leer_archivo(text) to authenticated;
grant execute on function public.creativa_puede_limpiar_archivo(text) to authenticated;

drop policy if exists creativa_referencias_insertar on storage.objects;
create policy creativa_referencias_insertar on storage.objects for insert to authenticated
  with check (bucket_id = 'creativa-referencias' and public.creativa_puede_subir_archivo(name));
drop policy if exists creativa_referencias_leer on storage.objects;
create policy creativa_referencias_leer on storage.objects for select to authenticated
  using (bucket_id = 'creativa-referencias' and public.creativa_puede_leer_archivo(name));
drop policy if exists creativa_referencias_limpiar on storage.objects;
create policy creativa_referencias_limpiar on storage.objects for delete to authenticated
  using (bucket_id = 'creativa-referencias' and public.creativa_puede_limpiar_archivo(name));

create or replace function creativa_privado.pedido_json(p_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'codigo', t.codigo, 'disenador_id', t."diseñador_id",
    'descripcion', t.descripcion, 'cantidad', t.cantidad, 'fecha_recibido', t.fecha_recibido,
    'cliente', c.nombre, 'tipo', tt.nombre, 'entrega', t.fecha_entrega, 'estado', t.estado,
    'precio_total', t.precio_total,
    'pagado', coalesce((select sum(p.monto) from public.pagos p where p.trabajo_id = t.id), 0),
    'urgente', t.fecha_entrega::date <= timezone('America/Lima', now())::date and t.estado <> 'Entregado',
    'archivos', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre_archivo,
      'ruta', a.ruta_storage, 'tipo', a.mime_type, 'bytes', a.bytes) order by a.created_at, a.id)
      from public.archivos_trabajo a where a.trabajo_id = t.id and a.ruta_storage is not null), '[]'::jsonb)
  ) from public.trabajos t left join public.clientes c on c.id = t.cliente_id
    left join public.tipos_trabajo tt on tt.id = t.tipo_trabajo_id where t.id = p_id;
$$;

create or replace function public.creativa_guardar_pedido_v2(p_solicitud uuid, p_pedido jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pedido jsonb; v_archivo jsonb; v_ruta text; v_bytes bigint; v_tipo text;
begin
  perform creativa_privado.exigir_equipo();
  if not exists(select 1 from creativa_privado.equipo where usuario_id = auth.uid() and rol = 'administracion') then
    raise exception 'Solo administración puede registrar pedidos.' using errcode = '42501';
  end if;
  if p_solicitud is null or p_pedido is null or jsonb_typeof(p_pedido) <> 'object' then raise exception 'El pedido no es válido.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_solicitud::text, 0));
  v_archivo := p_pedido->'archivo';
  if v_archivo is not null and v_archivo <> 'null'::jsonb then
    if jsonb_typeof(v_archivo) <> 'object' then raise exception 'El archivo no es válido.'; end if;
    v_ruta := v_archivo->>'ruta';
    v_bytes := (v_archivo->>'bytes')::bigint;
    v_tipo := v_archivo->>'tipo';
    if v_ruta is null or not public.creativa_puede_subir_archivo(v_ruta) or split_part(v_ruta, '/', 2) <> p_solicitud::text
      or v_bytes is null or v_bytes <= 0 or v_bytes > 10485760
      or v_tipo is null or v_tipo not in ('image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf')
      or coalesce(btrim(v_archivo->>'nombre'), '') = '' or length(v_archivo->>'nombre') > 255 then
      raise exception 'Revisa el archivo: foto o PDF de hasta 10 MB.';
    end if;
    if not exists(select 1 from storage.objects o where o.bucket_id = 'creativa-referencias'
      and o.name = v_ruta and o.owner_id = auth.uid()::text
      and (o.metadata->>'size')::bigint = v_bytes and o.metadata->>'mimetype' = v_tipo) then
      raise exception 'El archivo no terminó de subir. Vuelve a intentarlo.';
    end if;
  end if;
  -- La función anterior mantiene la validación y la protección contra duplicados.
  -- El registro del archivo participa en la misma transacción que pedido y pago.
  v_pedido := public.creativa_guardar_pedido(p_solicitud, p_pedido);
  if v_ruta is not null then
    if exists(select 1 from public.archivos_trabajo where ruta_storage = v_ruta and trabajo_id <> (v_pedido->>'id')::uuid) then
      raise exception 'El archivo pertenece a otro pedido.';
    end if;
    insert into public.archivos_trabajo(trabajo_id, nombre_archivo, ruta_storage, mime_type, bytes)
      values((v_pedido->>'id')::uuid, v_archivo->>'nombre', v_ruta, v_tipo, v_bytes)
      on conflict(ruta_storage) where ruta_storage is not null do nothing;
  end if;
  return creativa_privado.pedido_json((v_pedido->>'id')::uuid);
end;
$$;
revoke all on function public.creativa_guardar_pedido_v2(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.creativa_guardar_pedido_v2(uuid, jsonb) to authenticated;
commit;
