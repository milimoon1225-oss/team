import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Base aislada en memoria: no lee .env ni se conecta al proyecto Supabase.
const db = new PGlite();
const admin = crypto.randomUUID();
const otroAdmin = crypto.randomUUID();
const disenador = crypto.randomUUID();
const inactivo = crypto.randomUUID();
const ajeno = crypto.randomUUID();
const dispositivo = crypto.randomUUID();
const otroDispositivo = crypto.randomUUID();
let actor = { id: null, rol: null };
async function como(id, rol = 'authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.exec(`set role ${rol}`);
  actor = { id, rol };
}
async function propietario(sql, params = []) {
  const anterior = { ...actor };
  await db.exec('reset role');
  try { return await db.query(sql, params); }
  finally { if (anterior.rol) await como(anterior.id, anterior.rol); }
}
const rpc = async (nombre, parametros = [], firma = '') =>
  (await db.query(`select ${nombre}(${firma}) as resultado`, parametros)).rows[0].resultado;
const sync = operacion => rpc('creativa_sincronizar_caja', [operacion], '$1::jsonb');
const estado = () => rpc('creativa_caja_offline_estado');
const diaLima = instante => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date(instante));
const horaLima = instante => new Date(new Date(instante).getTime() - 5 * 3600000).toISOString().slice(0, -1);
const conteos = async () => (await propietario(`select
  (select count(*)::int from creativa_privado.caja_movimientos) as movimientos,
  (select count(*)::int from public.pagos) as pagos,
  (select count(*)::int from creativa_privado.solicitudes_pago) as solicitudes,
  (select count(*)::int from creativa_privado.caja_operaciones_offline) as offline`)).rows[0];
async function rechazaSinEscribir(operacion, patron, codigo = 'P0001') {
  const antes = await conteos();
  await assert.rejects(() => sync(operacion), error => {
    assert.equal(error.code, codigo);
    if (patron) assert.match(error.message, patron);
    return true;
  });
  assert.deepEqual(await conteos(), antes);
}
async function nuevoPedido(total = 100) {
  return (await propietario('insert into public.trabajos(precio_total) values($1) returning id', [total])).rows[0].id;
}

try {
  await db.exec(`
    set timezone = 'UTC';
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated;
    create table clientes(id uuid primary key default gen_random_uuid(), nombre varchar(150) not null,
      telefono varchar(20), created_at timestamp default now());
    create table categorias_trabajo(id uuid primary key default gen_random_uuid(), nombre varchar(100) not null,
      activo boolean default true, created_at timestamp default now());
    create table tipos_trabajo(id uuid primary key default gen_random_uuid(), categoria_id uuid references categorias_trabajo(id),
      nombre varchar(150) not null, activo boolean default true, created_at timestamp default now());
    create table trabajos(id uuid primary key default gen_random_uuid(), codigo varchar(20) unique,
      cliente_id uuid references clientes(id), tipo_trabajo_id uuid references tipos_trabajo(id), descripcion text,
      cantidad integer, fecha_recibido date, fecha_entrega timestamp, precio_total numeric(10,2) default 0,
      estado varchar(50) default 'Pendiente', "diseñador_id" uuid, created_at timestamp default now());
    create table pagos(id uuid primary key default gen_random_uuid(), trabajo_id uuid not null references trabajos(id) on delete cascade,
      monto numeric(10,2) not null, metodo varchar(50) not null, tipo_pago varchar(50) default 'Pago',
      fecha timestamp default now(), observacion text, created_at timestamp default now());
  `);
  for (const archivo of ['../pedido-update/supabase/activar-pedidos.sql', '../pagos-update/activar-abonos.sql',
    '../caja-config-app/activar-caja-config.sql', '../caja-config-app/activar-reportes.sql']) {
    await db.exec(await readFile(new URL(archivo, import.meta.url), 'utf8'));
  }
  const funcionesPrevias = (await db.query(`select proname, pg_get_functiondef(oid) as definicion
    from pg_proc where proname in ('creativa_movimiento','creativa_registrar_abono','creativa_cerrar_caja','creativa_caja')
    order by proname`)).rows;
  const migracion = await readFile(new URL('../caja-config-app/activar-caja-offline.sql', import.meta.url), 'utf8');
  await db.exec(migracion);
  await db.exec(migracion);
  assert.deepEqual((await db.query(`select proname, pg_get_functiondef(oid) as definicion
    from pg_proc where proname in ('creativa_movimiento','creativa_registrar_abono','creativa_cerrar_caja','creativa_caja')
    order by proname`)).rows, funcionesPrevias, 'No se reemplazan las RPC antiguas');
  for (const id of [admin, otroAdmin, disenador, inactivo, ajeno]) await db.query('insert into auth.users(id) values($1)', [id]);
  await db.query(`insert into creativa_privado.equipo values
    ($1,'L. Virginia','administracion',true),($2,'Administración 2','administracion',true),
    ($3,'Diseño','disenador',true),($4,'Inactivo','administracion',false)`, [admin, otroAdmin, disenador, inactivo]);
  const reloj = (await db.query('select now() as ahora')).rows[0].ahora;
  const ahora = new Date(reloj);
  const pasado = new Date(ahora);
  pasado.setUTCDate(pasado.getUTCDate() - 2);
  pasado.setUTCHours(3, 4, 5, 123); // Día anterior en Lima: prueba el cruce de medianoche UTC.
  const instante = pasado.toISOString();
  const fecha = diaLima(instante);
  const operacion = cambios => ({ id: crypto.randomUUID(), dispositivo, tipo: 'egreso', ocurrido_en: instante,
    concepto: 'Almuerzos', monto: 15, metodo: 'Efectivo', trabajo_id: null, ...cambios });

  for (const [id, rol] of [[null, 'anon'], [ajeno, 'authenticated'], [inactivo, 'authenticated'], [disenador, 'authenticated']]) {
    await como(id, rol);
    await assert.rejects(estado, error => error.code === '42501');
    await rechazaSinEscribir(operacion({}), undefined, '42501');
    await assert.rejects(() => db.query('select * from creativa_privado.caja_operaciones_offline'), error => error.code === '42501');
  }
  await como(admin);
  assert.deepEqual(await estado(), { version: 1 });
  const gasto = operacion({});
  const primera = await sync(gasto);
  assert.equal(primera.id, gasto.id);
  assert.equal(primera.estado, 'sincronizado');
  assert.equal(primera.fecha, fecha);
  assert.equal('pedido' in primera, false);
  assert.equal(primera.caja.movimientos.length, 1);
  assert.equal(primera.caja.movimientos[0].hora, horaLima(instante));
  assert.deepEqual(await sync(gasto), primera);
  assert.deepEqual(await sync(Object.fromEntries(Object.entries(gasto).reverse())), primera);
  assert.deepEqual(await conteos(), { movimientos: 1, pagos: 0, solicitudes: 0, offline: 1 });
  const auditoria = (await propietario(`select dispositivo::text, ocurrido_en = $2::timestamptz as hora_original,
    sincronizado_en > ocurrido_en as sincronizacion_posterior, contenido = $3::jsonb as contenido_original
    from creativa_privado.caja_operaciones_offline where id=$1`, [gasto.id, instante, gasto])).rows[0];
  assert.deepEqual(auditoria, { dispositivo, hora_original: true, sincronizacion_posterior: true, contenido_original: true });
  await rechazaSinEscribir({ ...gasto, monto: 16 }, /otra operación o cuenta/);
  await rechazaSinEscribir({ ...gasto, dispositivo: otroDispositivo }, /otra operación o cuenta/);
  await rechazaSinEscribir({ ...gasto, concepto: ' Almuerzos ' }, /otra operación o cuenta/);
  await rechazaSinEscribir({ ...gasto, tipo: 'ingreso' }, /otra operación o cuenta/);
  await como(otroAdmin);
  await rechazaSinEscribir(gasto, /otra operación o cuenta/);
  await como(admin);
  await propietario('update creativa_privado.equipo set activo=false where usuario_id=$1', [admin]);
  await rechazaSinEscribir(gasto, undefined, '42501');
  await propietario('update creativa_privado.equipo set activo=true where usuario_id=$1', [admin]);

  const sinTrabajo = operacion({}); delete sinTrabajo.trabajo_id;
  for (const invalida of [null, [], {}, sinTrabajo, operacion({ extra: true }), operacion({ id: 'no-uuid' }),
    operacion({ dispositivo: 'no-uuid' }), operacion({ monto: '10' }), operacion({ monto: null }),
    operacion({ monto: 0 }), operacion({ monto: -1 }), operacion({ monto: 1.001 }), operacion({ monto: 100000000 }),
    operacion({ concepto: 'a' }), operacion({ concepto: null }), operacion({ concepto: 'a'.repeat(301) }),
    operacion({ tipo: 'cierre' }), operacion({ metodo: 'Cheque' }), operacion({ metodo: null }),
    operacion({ ocurrido_en: instante.slice(0, -1) }), operacion({ ocurrido_en: '2026-02-30T00:00:00Z' }),
    operacion({ ocurrido_en: 'infinity' }), operacion({ trabajo_id: crypto.randomUUID() }),
    operacion({ tipo: 'abono', trabajo_id: null }), operacion({ tipo: 'abono', trabajo_id: 'no-uuid' }),
    operacion({ tipo: 'abono', trabajo_id: crypto.randomUUID(), concepto: 'a'.repeat(501) }),
    operacion({ ocurrido_en: new Date(+ahora + 6 * 60000).toISOString() }),
    operacion({ ocurrido_en: new Date(+ahora - 32 * 86400000).toISOString() })]) {
    await rechazaSinEscribir(invalida);
  }
  await rechazaSinEscribir(operacion({ tipo: 'abono', trabajo_id: crypto.randomUUID() }), /pedido no existe/);

  const ingreso = operacion({ tipo: 'ingreso', concepto: 'Fondo de apertura', monto: 200, dispositivo: otroDispositivo });
  await sync(ingreso);
  const trabajo = await nuevoPedido(100);
  const pago = operacion({ tipo: 'abono', trabajo_id: trabajo, monto: 35, concepto: 'Cobro sin conexión', metodo: 'Yape' });
  const cobro = await sync(pago);
  assert.equal(cobro.pedido.id, trabajo);
  assert.equal(cobro.pedido.pagado, 35);
  assert.equal(cobro.fecha, fecha);
  assert.equal(cobro.caja.movimientos.find(m => m.origen === 'Pedido').hora, horaLima(instante));
  await sync(pago);
  const reporte = await rpc('creativa_reporte', [fecha, fecha], '$1::date,$2::date');
  assert.equal(reporte.dias[0].cobros, 35);
  assert.equal(reporte.dias[0].salidas, 15);
  assert.equal(reporte.dias[0].otros, 200);

  // Compatibilidad con los caminos online, incluidos UUID repetidos entre clases.
  const idOnlineManual = crypto.randomUUID();
  await rpc('creativa_movimiento', [idOnlineManual, 'ingreso', 'Ingreso online', 7, 'Efectivo'], '$1,$2,$3,$4,$5');
  await rechazaSinEscribir(operacion({ id: idOnlineManual }), /otra vía/);
  const idOnlinePago = crypto.randomUUID();
  await rpc('creativa_registrar_abono', [idOnlinePago, trabajo, 50, 'Efectivo', 'Cobro online'], '$1,$2,$3,$4,$5');
  await rechazaSinEscribir(operacion({ id: idOnlinePago, tipo: 'abono', trabajo_id: trabajo }), /otra vía/);
  const antesColision = await conteos();
  await assert.rejects(() => rpc('creativa_movimiento', [pago.id, 'ingreso', 'UUID del abono', 1, 'Efectivo'], '$1,$2,$3,$4,$5'), /otra operación de Caja/);
  await assert.rejects(() => rpc('creativa_registrar_abono', [gasto.id, trabajo, 1, 'Efectivo', 'UUID del gasto'], '$1,$2,$3,$4,$5'), /otra operación de Caja/);
  assert.deepEqual(await conteos(), antesColision, 'La colisión no deja un pago huérfano');
  const legacyReplay = await rpc('creativa_registrar_abono', [pago.id, trabajo, 35, 'Yape', 'Cobro sin conexión'], '$1,$2,$3,$4,$5');
  assert.equal(legacyReplay.pedido.pagado, 85);
  await rpc('creativa_movimiento', [gasto.id, 'egreso', 'Almuerzos', 15, 'Efectivo'], '$1,$2,$3,$4,$5');
  assert.deepEqual(await conteos(), antesColision);
  await rechazaSinEscribir(operacion({ tipo: 'abono', trabajo_id: trabajo, monto: 20 }), /saldo cambió/);
  const cancelacion = operacion({ tipo: 'abono', trabajo_id: trabajo, monto: 15, concepto: '' });
  assert.equal((await sync(cancelacion)).pedido.pagado, 100);
  await rechazaSinEscribir(operacion({ tipo: 'abono', trabajo_id: trabajo, monto: 1 }), /saldo cambió/);
  await assert.rejects(() => rpc('creativa_registrar_abono', [crypto.randomUUID(), trabajo, 1, 'Efectivo', ''], '$1,$2,$3,$4,$5'), /supera el saldo/);

  // PGlite serializa solicitudes: prueba dos escrituras pendientes, no dos conexiones PostgreSQL reales.
  const trabajoConcurrente = await nuevoPedido(50);
  const paralelo = await Promise.allSettled([
    sync(operacion({ tipo: 'abono', trabajo_id: trabajoConcurrente, monto: 40 })),
    sync(operacion({ tipo: 'abono', trabajo_id: trabajoConcurrente, monto: 40, dispositivo: otroDispositivo })),
  ]);
  assert.equal(paralelo.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(paralelo.filter(r => r.status === 'rejected').length, 1);
  assert.match(paralelo.find(r => r.status === 'rejected').reason.message, /saldo cambió/);

  await propietario(`insert into creativa_privado.caja_cierres(fecha,usuario_id,contado,esperado,resumen)
    values($1,$2,185,185,'[]')`, [fecha, admin]);
  await rechazaSinEscribir(operacion({}), /ya está cerrada/);
  await rechazaSinEscribir(operacion({ tipo: 'abono', trabajo_id: trabajoConcurrente, monto: 1 }), /ya está cerrada/);
  assert.equal((await sync(gasto)).caja.cierre.esperado, 185);
  assert.equal((await sync(pago)).pedido.pagado, 100);
  const hoy = ahora.toISOString();
  const manualHoy = operacion({ ocurrido_en: hoy, monto: 10 });
  await sync(manualHoy);
  await rpc('creativa_cerrar_caja', [0], '$1');
  await rechazaSinEscribir(operacion({ ocurrido_en: hoy }), /ya está cerrada/);
  assert.equal((await sync(manualHoy)).estado, 'sincronizado');

  // Simula un registro que se confirmó hace 32 días y cuya respuesta se vuelve a pedir.
  const antigua = operacion({ ocurrido_en: new Date(+ahora - 32 * 86400000).toISOString() });
  await propietario(`insert into creativa_privado.caja_movimientos(id,usuario_id,fecha,tipo,concepto,monto,metodo,creado)
    values($1,$2,$3,'egreso','Almuerzos',15,'Efectivo',$4)`, [antigua.id, admin, diaLima(antigua.ocurrido_en), antigua.ocurrido_en]);
  await propietario(`insert into creativa_privado.caja_operaciones_offline
    (id,usuario_id,dispositivo,tipo,ocurrido_en,contenido,movimiento_id)
    values($1,$2,$3,'egreso',$4,$5,$1)`, [antigua.id, admin, dispositivo, antigua.ocurrido_en, antigua]);
  assert.equal((await sync(antigua)).estado, 'sincronizado');

  // Un fallo al escribir la auditoría revierte también el movimiento/pago y su solicitud.
  await propietario(`create function creativa_privado.fallo_prueba_offline() returns trigger language plpgsql as $$
    begin if new.contenido->>'concepto'='Fallo atómico' then raise exception 'Fallo de auditoría simulado'; end if; return new; end $$`);
  await propietario(`create trigger fallo_prueba_offline before insert on creativa_privado.caja_operaciones_offline
    for each row execute function creativa_privado.fallo_prueba_offline()`);
  const otroDia = new Date(+ahora - 10 * 86400000).toISOString();
  const trabajoRollback = await nuevoPedido(100);
  await rechazaSinEscribir(operacion({ ocurrido_en: otroDia, concepto: 'Fallo atómico' }), /auditoría simulado/);
  await rechazaSinEscribir(operacion({ ocurrido_en: otroDia, concepto: 'Fallo atómico', tipo: 'abono', trabajo_id: trabajoRollback }), /auditoría simulado/);
  const privilegios = (await propietario(`select
    has_table_privilege('authenticated','creativa_privado.caja_operaciones_offline','select') as lectura,
    has_table_privilege('authenticated','creativa_privado.caja_operaciones_offline','insert') as escritura,
    has_function_privilege('anon','public.creativa_sincronizar_caja(jsonb)','execute') as anonimo`)).rows[0];
  assert.deepEqual(privilegios, { lectura: false, escritura: false, anonimo: false });
  await como(disenador);
  await assert.rejects(() => sync(gasto), error => error.code === '42501' && !error.message.includes('Almuerzos'));
  console.log('PASS: migración repetible sin reemplazar RPC previas; permisos, tipos, fechas Lima, idempotencia por cuenta/contenido/dispositivo, colisiones online/offline, sobrecobros, cierres y rollback atómico.');
} finally {
  await db.close();
}
