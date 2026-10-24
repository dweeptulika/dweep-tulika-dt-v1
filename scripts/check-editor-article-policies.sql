-- Read-only policy regression check for the article-role migration.
-- Run this against a safe test database AFTER applying the migration.
-- It inspects policy definitions only; it does not read or change article records.
-- Every row includes all_passed; the expected result is TRUE on all five rows.

with required_policies(policyname, command_name) as (
  values
    ('editors can delete articles', 'DELETE'),
    ('editors can insert articles', 'INSERT'),
    ('editors can read all articles', 'SELECT'),
    ('editors can update articles', 'UPDATE'),
    ('public can read published articles', 'SELECT')
),
policy_audit as (
  select
    required.policyname,
    required.command_name,
    policies.cmd,
    coalesce(policies.roles::text, '') as policy_roles,
    coalesce(policies.qual, '') as using_expression,
    coalesce(policies.with_check, '') as check_expression,
    case
      when policies.policyname is null then false
      when required.policyname = 'public can read published articles' then
        policies.roles::text ilike '%anon%'
        and policies.roles::text ilike '%authenticated%'
        and policies.qual ilike '%status%'
        and policies.qual ilike '%published%'
        and policies.qual ilike '%published_at%'
        and policies.qual ilike '%now()%'
      when policies.roles::text not ilike '%authenticated%' then false
      when required.command_name = 'INSERT' then
        policies.with_check ilike '%role%'
        and policies.with_check ilike '%editor%'
        and policies.with_check ilike '%admin%'
      when required.command_name in ('DELETE', 'SELECT') then
        policies.qual ilike '%role%'
        and policies.qual ilike '%editor%'
        and policies.qual ilike '%admin%'
      when required.command_name = 'UPDATE' then
        policies.qual ilike '%role%'
        and policies.qual ilike '%editor%'
        and policies.qual ilike '%admin%'
        and policies.with_check ilike '%role%'
        and policies.with_check ilike '%editor%'
        and policies.with_check ilike '%admin%'
      else false
    end as passed
  from required_policies required
  left join pg_policies policies
    on policies.schemaname = 'public'
   and policies.tablename = 'articles'
   and policies.policyname = required.policyname
   and policies.cmd = required.command_name
)
select
  policyname,
  command_name,
  passed,
  bool_and(passed) over () as all_passed,
  policy_roles,
  using_expression,
  check_expression
from policy_audit
order by policyname;
