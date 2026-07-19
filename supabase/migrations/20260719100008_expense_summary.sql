-- 月次集計RPC(F-05-3、§6.2)
-- SECURITY INVOKER で実行し、RLS(自分+共有分のみ)をそのまま適用する

create or replace function public.expense_monthly_summary(target_month date)
returns table (
  category text,
  kind text,
  total bigint,
  entry_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(i.payload ->> 'category', 'その他') as category,
    coalesce(i.payload ->> 'kind', 'expense') as kind,
    coalesce(sum((i.payload ->> 'amount')::bigint), 0) as total,
    count(*) as entry_count
  from public.items i
  where i.type = 'expense'
    and i.owner_id = (select auth.uid())
    and i.occurred_on >= date_trunc('month', target_month)::date
    and i.occurred_on < (date_trunc('month', target_month) + interval '1 month')::date
  group by 1, 2
  order by 2, 3 desc;
$$;

revoke execute on function public.expense_monthly_summary(date) from public, anon;
grant execute on function public.expense_monthly_summary(date) to authenticated;
