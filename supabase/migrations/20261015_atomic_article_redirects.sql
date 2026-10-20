-- Atomically maintain permanent redirect history when an article's public path changes.
-- This handles repeated slug changes and prevents redirects back to a path that is live again.

create or replace function public.maintain_article_redirects()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if old.public_path is distinct from new.public_path
     and old.public_path is not null
     and new.public_path is not null then

    -- If the destination was previously a redirect source, it becomes live again.
    delete from public.article_redirects
    where old_path = new.public_path;

    -- Collapse earlier history directly to the newest URL.
    update public.article_redirects
    set new_path = new.public_path,
        updated_at = now()
    where new_path = old.public_path
      and old_path <> new.public_path;

    -- Record the URL being replaced. The article update and this change are atomic.
    insert into public.article_redirects
      (old_path, article_id, new_path, status_code, updated_at)
    values
      (old.public_path, new.id, new.public_path, 301, now())
    on conflict (old_path) do update
      set article_id = excluded.article_id,
          new_path = excluded.new_path,
          status_code = 301,
          updated_at = now();
  end if;

  return new;
end;
$function$;

drop trigger if exists articles_record_public_path_redirect on public.articles;
create trigger articles_record_public_path_redirect
after update of public_path on public.articles
for each row
when (old.public_path is distinct from new.public_path)
execute function public.maintain_article_redirects();

-- Redirect writes are performed by the trigger only; clients need read access.
revoke insert, update, delete on public.article_redirects from anon, authenticated, public;
drop policy if exists "editors can manage article redirects" on public.article_redirects;
