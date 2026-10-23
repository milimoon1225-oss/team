-- Registrar abonos y consultar su historial, sin modificar la entrega.
begin;
create table if not exists creativa_privado.solicitudes_pago (
  id uuid primary key,
  usuario_id uuid not null references auth.users(id),
  trabajo_id uuid not null references public.trabajos(id),
  monto numeric(10,2) not null,
  metodo text not null,
  observacion text not null,
  pago_id uuid not null references public.pagos(id),
  created_at timestamptz not null default now()
);
revoke all on creativa_privado.solicitudes_pago from public, anon, authenticated;

create or replace function public.creativa_consultar_pagos(p_trabajo uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform creativa_privado.exigir_equipo();
  if not exists(select 1 from creativa_privado.equipo where usuario_id=auth.uid() and rol='administracion') then
    raise exception 'Solo administración puede consultar pagos.' using errcode='42501';
  end if;
  if not exists(select 1 from public.trabajos where id=p_trabajo) then raise exception 'El pedido no existe.'; end if;
  return jsonb_build_object('pedido',creativa_privado.pedido_json(p_trabajo),
    'pagos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'monto',monto,'metodo',metodo,
      'fecha',fecha,'observacion',observacion) order by fecha desc,id)
      from public.pagos where trabajo_id=p_trabajo),'[]'::jsonb));
end;
$$;

create or replace function public.creativa_registrar_abono(
  p_solicitud uuid, p_trabajo uuid, p_monto numeric, p_metodo text, p_observacion text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_anterior creativa_privado.solicitudes_pago%rowtype; v_total numeric; v_pagado numeric; v_pago uuid;
begin
  perform creativa_privado.exigir_equipo();
  if not exists(select 1 from creativa_privado.equipo where usuario_id=auth.uid() and rol='administracion') then
    raise exception 'Solo administración puede registrar pagos.' using errcode='42501';
  end if;
  if p_solicitud is null or p_trabajo is null then raise exception 'Selecciona un pedido válido.'; end if;
  if p_monto is null or p_monto <= 0 or p_monto > 99999999.99 or p_monto <> round(p_monto,2) then
    raise exception 'Ingresa un monto mayor a cero, con un máximo de dos decimales.';
  end if;
  if p_metodo is null or p_metodo not in ('Efectivo','Yape','Plin','Transferencia','Otro') then raise exception 'Selecciona el método de pago.'; end if;
  p_observacion := btrim(coalesce(p_observacion,''));
  if length(p_observacion)>500 then raise exception 'La observación admite hasta 500 caracteres.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_solicitud::text,2));
  select * into v_anterior from creativa_privado.solicitudes_pago where id=p_solicitud;
  if found then
    if v_anterior.usuario_id<>auth.uid() or v_anterior.trabajo_id<>p_trabajo or v_anterior.monto<>p_monto
      or v_anterior.metodo<>p_metodo or v_anterior.observacion<>p_observacion then
      raise exception 'Este intento corresponde a otro pago. Revisa el historial.';
    end if;
    return public.creativa_consultar_pagos(p_trabajo);
  end if;
  -- Bloquear el pedido antes de calcular el saldo para serializar cobros simultáneos.
  select coalesce(precio_total,0) into v_total from public.trabajos where id=p_trabajo for update;
  if not found then raise exception 'El pedido no existe.'; end if;
  select coalesce(sum(monto),0) into v_pagado from public.pagos where trabajo_id=p_trabajo;
  if p_monto > greatest(v_total-v_pagado,0) then raise exception 'El monto supera el saldo pendiente. Actualiza los pagos y revisa el importe.'; end if;
  insert into public.pagos(trabajo_id,monto,metodo,tipo_pago,fecha,observacion)
    values(p_trabajo,p_monto,p_metodo,case when p_monto=v_total-v_pagado then 'Cancelación' else 'Adelanto' end,
      timezone('America/Lima',now()),nullif(p_observacion,'')) returning id into v_pago;
  insert into creativa_privado.solicitudes_pago(id,usuario_id,trabajo_id,monto,metodo,observacion,pago_id)
    values(p_solicitud,auth.uid(),p_trabajo,p_monto,p_metodo,p_observacion,v_pago);
  return public.creativa_consultar_pagos(p_trabajo);
end;
$$;
revoke all on function public.creativa_consultar_pagos(uuid) from public,anon,authenticated;
revoke all on function public.creativa_registrar_abono(uuid,uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function public.creativa_consultar_pagos(uuid) to authenticated;
grant execute on function public.creativa_registrar_abono(uuid,uuid,numeric,text,text) to authenticated;
commit;
