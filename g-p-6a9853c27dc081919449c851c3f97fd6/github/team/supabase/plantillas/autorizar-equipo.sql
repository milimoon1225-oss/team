-- Primero crea la cuenta en Authentication > Users > Add user > Create new user.
-- Usa una contraseña propia en Supabase; no la pegues aquí ni en el chat.
-- Luego sustituye solamente el correo de abajo y ejecuta esta consulta.
do $$
declare
  v_correo text := 'REEMPLAZAR_POR_TU_CORREO';
  v_nombre text := 'L. Virginia';
  v_rol text := 'administracion';
  -- Para Milagros, Angel y Alvis: su correo, su nombre y rol 'disenador'.
  v_usuario uuid;
begin
  select id into v_usuario from auth.users where lower(email) = lower(v_correo);
  if v_usuario is null then
    raise exception 'Primero crea ese usuario en Authentication > Users y escribe aquí el mismo correo.';
  end if;
  insert into creativa_privado.equipo(usuario_id, nombre, rol, activo) values(v_usuario, v_nombre, v_rol, true)
    on conflict (usuario_id) do update set nombre = excluded.nombre, rol = excluded.rol, activo = true;
end;
$$;
