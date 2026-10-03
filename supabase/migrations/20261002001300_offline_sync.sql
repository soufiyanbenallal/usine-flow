-- Offline sync (PWA): idempotent application of operations queued on a device.
-- Each operation carries a client-generated idempotency key; replays return the stored result instead of re-applying.

create or replace function public.apply_client_operation(p_org text, p_key text, p_type text, p_payload jsonb, p_device text default null, p_created timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.client_operations; res jsonb := '{}'::jsonb;
begin
  if not public.is_member(p_org) then raise exception 'Accès refusé.' using errcode = '42501'; end if;
  select * into existing from public.client_operations where organization_id = p_org and idempotency_key = p_key;
  if found then return jsonb_build_object('status', existing.status, 'duplicate', true, 'result', existing.result); end if;

  begin
    case p_type
      when 'count_line' then
        perform public.record_count_line(p_payload ->> 'line', (p_payload ->> 'counted')::numeric);
      when 'pick_confirm' then
        perform public.confirm_pick_line(p_payload ->> 'line', (p_payload ->> 'qty')::numeric);
      when 'task_complete' then
        perform public.complete_warehouse_task(p_payload ->> 'id', p_payload ->> 'to_location', nullif(p_payload ->> 'qty', '')::numeric);
      when 'production_report' then
        perform public.report_production(p_payload ->> 'op', (p_payload ->> 'produced')::numeric, coalesce((p_payload ->> 'scrap')::numeric, 0), p_payload ->> 'scrap_reason', p_payload ->> 'lot_number', p_payload ->> 'employee');
      when 'breakdown' then
        res := jsonb_build_object('work_order_id', public.report_breakdown(p_payload ->> 'asset', p_payload ->> 'title', p_payload ->> 'description', p_payload ->> 'reason'));
      else
        raise exception 'Opération inconnue : %.', p_type using errcode = '22023';
    end case;
  exception when others then
    insert into public.client_operations (organization_id, idempotency_key, device_id, op_type, payload, status, result, client_created_at)
      values (p_org, p_key, p_device, p_type, p_payload, 'rejected', jsonb_build_object('error', sqlerrm), p_created)
      on conflict (organization_id, idempotency_key) do nothing;
    return jsonb_build_object('status', 'rejected', 'error', sqlerrm);
  end;

  insert into public.client_operations (organization_id, idempotency_key, device_id, op_type, payload, status, result, client_created_at)
    values (p_org, p_key, p_device, p_type, p_payload, 'applied', res, p_created) on conflict (organization_id, idempotency_key) do nothing;
  return jsonb_build_object('status', 'applied', 'result', res);
end $$;

revoke execute on function public.apply_client_operation(text, text, text, jsonb, text, timestamptz) from public, anon;
grant execute on function public.apply_client_operation(text, text, text, jsonb, text, timestamptz) to authenticated;

-- nightly routines are callable by the edge function `daily-jobs` (service role only)
grant execute on function public.snapshot_inventory(text), public.cron_generate_preventive_work_orders(), public.flag_late_production_orders() to service_role;
