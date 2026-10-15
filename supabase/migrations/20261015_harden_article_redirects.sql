-- Restrict direct invocation of the SECURITY DEFINER redirect-maintenance function.
-- PostgreSQL triggers can invoke their trigger function without callers having EXECUTE.
revoke execute on function public.maintain_article_redirects() from PUBLIC, anon, authenticated;
