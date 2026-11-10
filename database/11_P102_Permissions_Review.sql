-- READ ONLY: run as database administrator; share results before production rollout.
SELECT n.nspname, c.relname, c.relrowsecurity,
 has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
 has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','v') AND c.relname ~ '^(Tbl|View|Vw)P102';
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
 p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.proname LIKE 'P102%';
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE tablename LIKE 'TblP102%';
-- Also review Dashboard Data API exposed schemas and test table endpoints with anon.
