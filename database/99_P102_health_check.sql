-- P102 Health Check: 只讀檢查，不會修改資料。

SELECT 'tables' AS check_group, table_name, table_type
FROM information_schema.tables
WHERE table_schema='public' AND (table_name LIKE 'TblP102%' OR table_name LIKE 'ViewP102%')
ORDER BY table_name;

SELECT 'space_columns' AS check_group, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='TblP102Space'
ORDER BY ordinal_position;

SELECT 'required_columns' AS check_group, required_column,
CASE WHEN EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='TblP102Space' AND column_name=required_column
) THEN 'OK' ELSE 'MISSING' END AS status
FROM (VALUES ('SpaceNo'),('SpaceName'),('CampusNo'),('PicNo'),('FloorMapPic'),('CampusMapPic'),('Description'),('IsActive')) AS r(required_column);

SELECT 'rls_status' AS check_group, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname='public' AND tablename IN ('TblP102Space','TblP102SpaceAlias','TblP102SearchEvents','TblP102SearchFailures','TblP102SpaceViewEvents','TblP102Feedback')
ORDER BY tablename;

SELECT 'functions' AS check_group, routine_name, routine_type
FROM information_schema.routines
WHERE specific_schema='public' AND routine_name LIKE 'P102%'
ORDER BY routine_name;

SELECT 'row_counts' AS check_group, 'TblP102Space' AS table_name, COUNT(*) AS row_count FROM public."TblP102Space"
UNION ALL SELECT 'row_counts','TblP102SpaceAlias',COUNT(*) FROM public."TblP102SpaceAlias"
UNION ALL SELECT 'row_counts','TblP102SearchEvents',COUNT(*) FROM public."TblP102SearchEvents"
UNION ALL SELECT 'row_counts','TblP102SearchFailures',COUNT(*) FROM public."TblP102SearchFailures"
UNION ALL SELECT 'row_counts','TblP102SpaceViewEvents',COUNT(*) FROM public."TblP102SpaceViewEvents"
UNION ALL SELECT 'row_counts','TblP102Feedback',COUNT(*) FROM public."TblP102Feedback";

SELECT 'map_quality' AS check_group, "sID", "SpaceNo", "SpaceName", "PicNo", "FloorMapPic", "CampusMapPic"
FROM public."TblP102Space"
WHERE "FloorMapPic" IS NULL OR "CampusMapPic" IS NULL OR "CampusMapPic" LIKE '3ABCDEFBCDEF%'
ORDER BY "sID"
LIMIT 100;
