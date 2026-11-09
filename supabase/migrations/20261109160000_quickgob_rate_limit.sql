-- Sugar Depth (QuickGOB) rate limiter for the Edge Functions.
-- Fixed-window counters keyed by text (e.g. 'label:<user id>', 'guest:create').
-- Only the service role (Edge Functions) can touch it: RLS on with no policies, and EXECUTE
-- revoked from anon/authenticated so it is not callable through the public Data API.

create table if not exists public.quickgob_rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (key, window_start)
);

alter table public.quickgob_rate_limits enable row level security;
revoke all on table public.quickgob_rate_limits from anon, authenticated;

create or replace function public.quickgob_rate_limit(p_key text, p_window_seconds integer, p_limit integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into public.quickgob_rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic cleanup of windows older than two days.
  if random() < 0.01 then
    delete from public.quickgob_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.quickgob_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.quickgob_rate_limit(text, integer, integer) to service_role;
