begin;
create table if not exists creativa_privado.caja_movimientos (
 id uuid primary key, usuario_id uuid not null references auth.users(id),
 fecha date not null, tipo text not null check(tipo in ('ingreso','egreso')),
 concepto text not null, monto numeric(12,2) not null check(monto>0), metodo text not null,
 creado timestamptz not null default now()
);
create table if not exists creativa_privado.caja_cierres (
 fecha date primary key, usuario_id uuid not null references auth.users(id),
 contado numeric(12,2) not null, esperado numeric(12,2) not null,
 resumen jsonb not null, creado timestamptz not null default now()
);
create table if not exists creativa_privado.negocio (
 id boolean primary key default true check(id), nombre text not null,
 telefono text not null default '', direccion text not null default ''
);
insert into creativa_privado.negocio(id,nombre) values(true,'Creativa Impresos') on conflict do nothing;
revoke all on creativa_privado.caja_movimientos,creativa_privado.caja_cierres,creativa_privado.negocio from public,anon,authenticated;
create or replace function creativa_privado.exigir_admin() returns void language plpgsql set search_path='' as $$
begin
 perform creativa_privado.exigir_equipo();
 if not exists(select 1 from creativa_privado.equipo where usuario_id=auth.uid() and rol='administracion') then
 raise exception 'Solo administración puede acceder a Caja y Configuración.' using errcode='42501'; end if;
end $$;
create or replace function public.creativa_caja(p_fecha date) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_mov jsonb; v_cierre jsonb;
begin
 perform creativa_privado.exigir_admin();
 if p_fecha is null then raise exception 'Selecciona una fecha.'; end if;
 select coalesce(jsonb_agg(m order by m->>'hora' desc),'[]'::jsonb) into v_mov from (
 select jsonb_build_object('id',p.id,'tipo','ingreso','concepto','Cobro de pedido '||coalesce(t.codigo,''),
 'monto',p.monto,'metodo',p.metodo,'hora',p.fecha,'origen','Pedido','responsable','Cobro registrado') m
 from public.pagos p join public.trabajos t on t.id=p.trabajo_id where p.fecha::date=p_fecha
 union all
 select jsonb_build_object('id',m.id,'tipo',m.tipo,'concepto',m.concepto,'monto',m.monto,'metodo',m.metodo,
 'hora',timezone('America/Lima',m.creado),'origen','Caja','responsable',e.nombre)
 from creativa_privado.caja_movimientos m join creativa_privado.equipo e on e.usuario_id=m.usuario_id where m.fecha=p_fecha
 ) q;
 select jsonb_build_object('contado',contado,'esperado',esperado,'resumen',resumen,'fecha',creado) into v_cierre
 from creativa_privado.caja_cierres where fecha=p_fecha;
 return jsonb_build_object('movimientos',v_mov,'cierre',v_cierre);
end $$;
create or replace function public.creativa_movimiento(p_id uuid,p_tipo text,p_concepto text,p_monto numeric,p_metodo text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_fecha date:=timezone('America/Lima',now())::date; v_old creativa_privado.caja_movimientos%rowtype;
begin
 perform creativa_privado.exigir_admin();
 if p_id is null or p_tipo is null or p_tipo not in ('ingreso','egreso') or p_metodo is null or p_metodo not in ('Efectivo','Yape','Plin','Transferencia','Otro') then raise exception 'Revisa tipo y método.'; end if;
 if p_monto is null or p_monto::text in ('NaN','Infinity','-Infinity') or p_monto<=0 or p_monto>99999999.99 or p_monto<>round(p_monto,2) then raise exception 'Ingresa un monto válido con hasta dos decimales.'; end if;
 p_concepto:=btrim(coalesce(p_concepto,''));
 if length(p_concepto)<3 or length(p_concepto)>300 then raise exception 'El concepto debe tener entre 3 y 300 caracteres.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,5));
 select * into v_old from creativa_privado.caja_movimientos where id=p_id;
 if found then
 if v_old.usuario_id<>auth.uid() or v_old.tipo<>p_tipo or v_old.concepto<>p_concepto or v_old.monto<>p_monto or v_old.metodo<>p_metodo then raise exception 'Este intento corresponde a otro movimiento.'; end if;
 return public.creativa_caja(v_old.fecha); end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_fecha::text,6));
 if exists(select 1 from creativa_privado.caja_cierres where fecha=v_fecha) then raise exception 'La caja de hoy ya está cerrada.'; end if;
 insert into creativa_privado.caja_movimientos(id,usuario_id,fecha,tipo,concepto,monto,metodo) values(p_id,auth.uid(),v_fecha,p_tipo,p_concepto,p_monto,p_metodo);
 return public.creativa_caja(v_fecha);
end $$;
create or replace function public.creativa_cerrar_caja(p_contado numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_fecha date:=timezone('America/Lima',now())::date; v_datos jsonb; v_esperado numeric;
begin
 perform creativa_privado.exigir_admin();
 if p_contado is null or p_contado::text in ('NaN','Infinity','-Infinity') or p_contado<0 or p_contado>99999999.99 or p_contado<>round(p_contado,2) then raise exception 'Ingresa el efectivo contado con hasta dos decimales.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_fecha::text,6));
 if exists(select 1 from creativa_privado.caja_cierres where fecha=v_fecha) then return public.creativa_caja(v_fecha); end if;
 v_datos:=public.creativa_caja(v_fecha);
 select coalesce(sum((m->>'monto')::numeric*case when m->>'tipo'='egreso' then -1 else 1 end),0) into v_esperado
 from jsonb_array_elements(v_datos->'movimientos') m where m->>'metodo'='Efectivo';
 insert into creativa_privado.caja_cierres(fecha,usuario_id,contado,esperado,resumen) values(v_fecha,auth.uid(),p_contado,v_esperado,v_datos->'movimientos');
 return public.creativa_caja(v_fecha);
end $$;
create or replace function public.creativa_configuracion() returns jsonb language plpgsql security definer set search_path='' as $$
begin perform creativa_privado.exigir_admin(); return (select jsonb_build_object('nombre',nombre,'telefono',telefono,'direccion',direccion) from creativa_privado.negocio where id); end $$;
create or replace function public.creativa_guardar_configuracion(p_nombre text,p_telefono text,p_direccion text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform creativa_privado.exigir_admin();
 p_nombre:=btrim(coalesce(p_nombre,'')); p_telefono:=btrim(coalesce(p_telefono,'')); p_direccion:=btrim(coalesce(p_direccion,''));
 if length(p_nombre)<2 or length(p_nombre)>100 or length(p_telefono)>30 or length(p_direccion)>250 then raise exception 'Revisa el nombre, teléfono y dirección.'; end if;
 update creativa_privado.negocio set nombre=p_nombre,telefono=p_telefono,direccion=p_direccion where id;
 return public.creativa_configuracion();
end $$;
revoke all on function public.creativa_caja(date), public.creativa_movimiento(uuid,text,text,numeric,text),public.creativa_cerrar_caja(numeric),public.creativa_configuracion(),public.creativa_guardar_configuracion(text,text,text) from public,anon,authenticated;
grant execute on function public.creativa_caja(date), public.creativa_movimiento(uuid,text,text,numeric,text),public.creativa_cerrar_caja(numeric),public.creativa_configuracion(),public.creativa_guardar_configuracion(text,text,text) to authenticated;
commit;
