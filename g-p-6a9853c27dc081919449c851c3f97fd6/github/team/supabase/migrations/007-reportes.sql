begin;
create or replace function public.creativa_reporte(p_desde date,p_hasta date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_dias jsonb; v_pedidos jsonb;
begin
 perform creativa_privado.exigir_admin();
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then raise exception 'Selecciona un período de hasta un año.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('fecha',d.dia::date,'cobros',coalesce(p.total,0),'salidas',coalesce(m.salidas,0),'otros',coalesce(m.otros,0),'almuerzos',coalesce(m.almuerzos,0)) order by d.dia),'[]'::jsonb) into v_dias
 from pg_catalog.generate_series(p_desde::timestamp,p_hasta::timestamp,interval '1 day') d(dia)
 left join (select fecha::date dia,sum(monto) total from public.pagos where fecha::date between p_desde and p_hasta group by fecha::date) p on p.dia=d.dia::date
 left join (select fecha dia,sum(case when tipo='egreso' then monto else 0 end) salidas,sum(case when tipo='ingreso' then monto else 0 end) otros,sum(case when tipo='egreso' and lower(btrim(concepto))='almuerzos' then monto else 0 end) almuerzos from creativa_privado.caja_movimientos where fecha between p_desde and p_hasta group by fecha) m on m.dia=d.dia::date;
 select jsonb_build_object('cantidad',count(*),'valor',coalesce(sum(t.precio_total),0),'pendiente_actual',coalesce(sum(greatest(t.precio_total-coalesce(p.pagado,0),0)),0),'listos_actuales',count(*) filter(where t.estado='Listo'),'entregados_actuales',count(*) filter(where t.estado='Entregado')) into v_pedidos
 from public.trabajos t left join (select trabajo_id,sum(monto) pagado from public.pagos group by trabajo_id) p on p.trabajo_id=t.id
 where t.fecha_recibido between p_desde and p_hasta;
 return jsonb_build_object('dias',v_dias,'pedidos',v_pedidos);
end $$;
revoke all on function public.creativa_reporte(date,date) from public,anon,authenticated;
grant execute on function public.creativa_reporte(date,date) to authenticated;
commit;
