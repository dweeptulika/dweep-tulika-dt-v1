-- Read-only policy regression check for the article-role migration.
-- Run this against a safe test database AFTER applying the migration.
-- It inspects policy definitions only; it does not read or change article records.

with required_policies(policyname, command_name) as (
  values
    ('editors can delete articles', 'DELETE'),
    ('editors can insert articles', 'INSERT'),
    ('editors can read all articles', 'SELECT'),
    ('editors can update articles', 'UPDATE')
),
policy_audit as (
  select
    required.policyname,
    required.command_name,
    policies.cmd,
    coalesce(policies.qual, '') as using_expression,
    coalesce(policies.with_check, '') as check_expression,
    (
      policies.policyname is not null
      and policies.roles::text like '%authenticated%'
      and (
        required.command_name = 'INSERT'
        and policies.with_check ilike '%role%'
        and policies.with_check ilike '%editor%'
        and policies.with_check ilike '%admin%'
        or required.command_name in ('DELETE', 'SELECT')
        and policies.qual ilike '%role%'
        and policies.qual ilike '%editor%'
        and policies.qual ilike '%admin%'
        or required.command_name = 'UPDATE'
        and policies.qual ilike '%role%'
        and policies.qual ilike '%editor%'
        and policies.qual ilike '%admin%'
        and policies.with_check ilike '%role%'
        and policies.with_check ilike '%editor%'
        and policies.with_check ilike '%admin%'
      )
    ) as passed
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
  using_expression,
  check_expression
from policy_audit
order by command_name;
