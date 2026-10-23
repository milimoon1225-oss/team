-- Actualización incremental: requiere Pedidos, Abonos y Caja ya activados.
-- Ejecutar en el mismo proyecto Supabase. No modifica pedidos ni cierres existentes.
-- La cola local conserva los conflictos para revisión; esta RPC no los descarta.
begin;

create table if not exists creativa_privado.caja_operaciones_offline (
  id uuid primary key,
  usuario_id uuid not null references auth.users(id),
  dispositivo uuid not null,
  tipo text not null check (tipo in ('ingreso', 'egreso', 'abono')),
  ocurrido_en timestamptz not null,
  sincronizado_en timestamptz not null default now(),
  contenido jsonb not null,
  movimiento_id uuid unique references creativa_privado.caja_movimientos(id),
  pago_id uuid unique references public.pagos(id),
  check ((tipo = 'abono' and pago_id is not null and movimiento_id is null)
    or (tipo in ('ingreso', 'egreso') and movimiento_id is not null and pago_id is null))
);
alter table creativa_privado.caja_operaciones_offline enable row level security;
revoke all on creativa_privado.caja_operaciones_offline from public, anon, authenticated;

-- Evita reutilizar en las RPC antiguas un UUID offline de la otra clase.
-- Esas RPC ya toman su bloqueo de solicitud (sal 5 o 2); la RPC nueva toma ambos.
create or replace function creativa_privado.proteger_id_caja_offline()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from creativa_privado.caja_operaciones_offline o
    where o.id = new.id and (
      (tg_table_name = 'caja_movimientos' and o.tipo = 'abono')
      or (tg_table_name = 'solicitudes_pago' and o.tipo <> 'abono')
    )
  ) then
    raise exception 'El identificador ya corresponde a otra operación de Caja.';
  end if;
  return new;
end;
$$;
revoke all on function creativa_privado.proteger_id_caja_offline() from public, anon, authenticated;
drop trigger if exists creativa_id_offline_movimiento on creativa_privado.caja_movimientos;
create trigger creativa_id_offline_movimiento before insert on creativa_privado.caja_movimientos
  for each row execute function creativa_privado.proteger_id_caja_offline();
drop trigger if exists creativa_id_offline_pago on creativa_privado.solicitudes_pago;
create trigger creativa_id_offline_pago before insert on creativa_privado.solicitudes_pago
  for each row execute function creativa_privado.proteger_id_caja_offline();

create or replace function public.creativa_caja_offline_estado()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform creativa_privado.exigir_admin();
  return jsonb_build_object('version', 1);
end;
$$;

create or replace function public.creativa_sincronizar_caja(p_operacion jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_dispositivo uuid;
  v_tipo text;
  v_ocurrido timestamptz;
  v_fecha date;
  v_concepto text;
  v_monto numeric;
  v_metodo text;
  v_trabajo uuid;
  v_total numeric;
  v_pagado numeric;
  v_pago uuid;
  v_anterior creativa_privado.caja_operaciones_offline%rowtype;
  v_resultado jsonb;
begin
  perform creativa_privado.exigir_admin();
  if p_operacion is null or jsonb_typeof(p_operacion) <> 'object' then
    raise exception 'La operación pendiente no es válida.';
  end if;
  if not (p_operacion ?& array['id','dispositivo','tipo','ocurrido_en','concepto','monto','metodo','trabajo_id'])
    or exists (select 1 from jsonb_object_keys(p_operacion) k
      where k not in ('id','dispositivo','tipo','ocurrido_en','concepto','monto','metodo','trabajo_id'))
    or jsonb_typeof(p_operacion->'id') <> 'string'
    or jsonb_typeof(p_operacion->'dispositivo') <> 'string'
    or jsonb_typeof(p_operacion->'tipo') <> 'string'
    or jsonb_typeof(p_operacion->'ocurrido_en') <> 'string'
    or jsonb_typeof(p_operacion->'concepto') <> 'string'
    or jsonb_typeof(p_operacion->'monto') <> 'number'
    or jsonb_typeof(p_operacion->'metodo') <> 'string' then
    raise exception 'Revisa los datos de la operación pendiente.';
  end if;
  v_tipo := p_operacion->>'tipo';
  v_metodo := p_operacion->>'metodo';
  v_concepto := btrim(p_operacion->>'concepto');
  v_monto := (p_operacion->>'monto')::numeric;
  if v_tipo not in ('ingreso','egreso','abono')
    or v_metodo not in ('Efectivo','Yape','Plin','Transferencia','Otro') then
    raise exception 'Revisa el tipo y el método de la operación.';
  end if;
  if v_monto::text in ('NaN','Infinity','-Infinity') or v_monto <= 0
    or v_monto > 99999999.99 or v_monto <> round(v_monto, 2) then
    raise exception 'Ingresa un monto válido mayor a cero, con hasta dos decimales.';
  end if;
  if (v_tipo = 'abono' and length(v_concepto) > 500)
    or (v_tipo <> 'abono' and (length(v_concepto) < 3 or length(v_concepto) > 300)) then
    raise exception 'Revisa el concepto de la operación.';
  end if;
  if (v_tipo = 'abono' and jsonb_typeof(p_operacion->'trabajo_id') <> 'string')
    or (v_tipo <> 'abono' and p_operacion->'trabajo_id' <> 'null'::jsonb) then
    raise exception 'Solo los abonos deben indicar un pedido.';
  end if;
  if (p_operacion->>'ocurrido_en') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+]00:00)$' then
    raise exception 'La fecha de la operación debe indicar una hora UTC válida.';
  end if;
  begin
    v_id := (p_operacion->>'id')::uuid;
    v_dispositivo := (p_operacion->>'dispositivo')::uuid;
    v_ocurrido := (p_operacion->>'ocurrido_en')::timestamptz;
    v_trabajo := (p_operacion->>'trabajo_id')::uuid;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Revisa los identificadores y la fecha de la operación.';
  end;
  if not isfinite(v_ocurrido) then raise exception 'La fecha de la operación no es válida.'; end if;
  v_fecha := timezone('America/Lima', v_ocurrido)::date;

  -- Orden fijo para coordinar con movimientos y abonos antiguos y evitar colisiones.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_id::text, 2));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_id::text, 5));
  select * into v_anterior from creativa_privado.caja_operaciones_offline where id = v_id;
  if found then
    if v_anterior.usuario_id <> auth.uid() or v_anterior.contenido <> p_operacion then
      raise exception 'Este identificador ya corresponde a otra operación o cuenta. Revisa el pendiente sin volver a cobrar.';
    end if;
    -- Un reintento confirmado sigue siendo válido aunque el día se cerró o pasaron 31 días.
  else
    if v_ocurrido > now() + interval '5 minutes' or v_ocurrido < now() - interval '31 days' then
      raise exception 'La fecha está fuera del período permitido: hasta 31 días anteriores y 5 minutos futuros.';
    end if;
    if exists (select 1 from creativa_privado.caja_movimientos where id = v_id)
      or exists (select 1 from creativa_privado.solicitudes_pago where id = v_id) then
      raise exception 'Este identificador ya se registró por otra vía. Revisa el historial antes de resolver el pendiente.';
    end if;
    -- Mismo bloqueo de día que el cierre online: nunca insertar después del cierre.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_fecha::text, 6));
    if exists (select 1 from creativa_privado.caja_cierres where fecha = v_fecha) then
      raise exception 'La caja de esa fecha ya está cerrada. Conserva este pendiente para revisión; no vuelvas a cobrar.';
    end if;
    if v_tipo = 'abono' then
      -- Compartido con la RPC de abonos online: dos equipos no pueden superar el saldo.
      select coalesce(precio_total, 0) into v_total from public.trabajos where id = v_trabajo for update;
      if not found then raise exception 'El pedido no existe. Conserva el pendiente para revisión.'; end if;
      select coalesce(sum(monto), 0) into v_pagado from public.pagos where trabajo_id = v_trabajo;
      if v_monto > greatest(v_total - v_pagado, 0) then
        raise exception 'El saldo cambió y el abono supera lo pendiente. Conserva el cobro para revisión; no vuelvas a cobrar.';
      end if;
      insert into public.pagos(trabajo_id,monto,metodo,tipo_pago,fecha,observacion)
        values(v_trabajo,v_monto,v_metodo,case when v_monto = v_total - v_pagado then 'Cancelación' else 'Adelanto' end,
          timezone('America/Lima',v_ocurrido),nullif(v_concepto,'')) returning id into v_pago;
      insert into creativa_privado.solicitudes_pago(id,usuario_id,trabajo_id,monto,metodo,observacion,pago_id)
        values(v_id,auth.uid(),v_trabajo,v_monto,v_metodo,v_concepto,v_pago);
    else
      -- creado refleja cuándo se registró localmente; sincronizado_en conserva la recepción real.
      insert into creativa_privado.caja_movimientos(id,usuario_id,fecha,tipo,concepto,monto,metodo,creado)
        values(v_id,auth.uid(),v_fecha,v_tipo,v_concepto,v_monto,v_metodo,v_ocurrido);
    end if;
    insert into creativa_privado.caja_operaciones_offline
      (id,usuario_id,dispositivo,tipo,ocurrido_en,contenido,movimiento_id,pago_id)
      values(v_id,auth.uid(),v_dispositivo,v_tipo,v_ocurrido,p_operacion,
        case when v_tipo <> 'abono' then v_id end,v_pago);
  end if;
  v_resultado := jsonb_build_object('id',v_id,'estado','sincronizado','fecha',v_fecha,'caja',public.creativa_caja(v_fecha));
  if v_tipo = 'abono' then
    v_resultado := v_resultado || jsonb_build_object('pedido',creativa_privado.pedido_json(v_trabajo));
  end if;
  return v_resultado;
end;
$$;

revoke all on function public.creativa_caja_offline_estado(), public.creativa_sincronizar_caja(jsonb) from public, anon, authenticated;
grant execute on function public.creativa_caja_offline_estado(), public.creativa_sincronizar_caja(jsonb) to authenticated;
commit;
