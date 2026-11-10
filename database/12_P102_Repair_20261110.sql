-- Additive migration: run before deploying V1.4. No schema moves or data deletion.
BEGIN;
CREATE OR REPLACE FUNCTION public."P102_ReadSpaces"(
  p_keyword text DEFAULT '', p_space_no text DEFAULT NULL,
  p_offset integer DEFAULT 0, p_limit integer DEFAULT 80
) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
AS $function$
  SELECT jsonb_build_object(
    'SpaceID',s."SpaceID", 'SpaceCode',s."SpaceCode", 'PicNo',s."PicNo", 'MapFile',s."MapFile", 'MapX',s."MapX", 'MapY',s."MapY", 'sID',s."sID", 'SpaceNo',s."SpaceNo", 'SpaceName',s."SpaceName",
    'CampusNo',s."CampusNo", 'CampusName',s."CampusName",
    'BuildingNo',s."BuildingNo", 'BuildingName',s."BuildingName",
    'FloorNo',s."FloorNo", 'FloorName',s."FloorName",
    'FloorMapPic',s."FloorMapPic", 'CampusMapPic',s."CampusMapPic",
    'Description',s."Description", 'SortOrder',s."SortOrder", 'IsActive',s."IsActive")
  FROM public."TblP102Space" s
  WHERE s."IsActive" = true
    AND (p_space_no IS NULL OR s."SpaceNo" = p_space_no)
    AND (coalesce(btrim(p_keyword),'') = '' OR
      strpos(lower(concat_ws(' ',s."SpaceNo",s."SpaceName",s."Description",s."SpaceCode",s."BuildingName",s."CampusName",s."FloorName")),lower(btrim(p_keyword))) > 0 OR
      EXISTS (SELECT 1 FROM public."TblP102SpaceAlias" a WHERE a."SpaceNo"=s."SpaceNo" AND a."IsActive"=true AND strpos(lower(a."AliasName"),lower(btrim(p_keyword))) > 0))
  ORDER BY s."CampusNo",s."BuildingNo",s."FloorNo",s."SortOrder",s."SpaceNo",s."sID"
  LIMIT least(greatest(coalesce(p_limit,80),1),500)
  OFFSET greatest(coalesce(p_offset,0),0);
REVOKE ALL ON FUNCTION public."P102_ReadSpaces"(text,text,integer,integer) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public."P102_ReadSpaces"(text,text,integer,integer) TO anon;
-- INVOKER requires caller read grants. Existing active-row RLS remains authoritative.
ALTER TABLE public."TblP102Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TblP102SpaceAlias" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ("SpaceID","SpaceCode","PicNo","MapFile","MapX","MapY","sID","SpaceNo","SpaceName","CampusNo","CampusName","BuildingNo","BuildingName","FloorNo","FloorName","FloorMapPic","CampusMapPic","Description","SortOrder","IsActive") ON public."TblP102Space" TO anon;
GRANT SELECT ("SpaceNo","AliasName","IsActive") ON public."TblP102SpaceAlias" TO anon;

-- WARNING: public is currently exposed. These grants do NOT close table endpoints.
-- QA-04 remains blocked until a reviewed private-data-schema migration is validated.

-- 維持既有公開查詢，收斂已確認的政策。
DROP POLICY IF EXISTS "allow_public_read" ON public."TblP102Space";
DROP POLICY IF EXISTS "P102 public read active spaces" ON public."TblP102Space";
DROP POLICY IF EXISTS "P102 space public read active" ON public."TblP102Space";
CREATE POLICY "P102 space public read active" ON public."TblP102Space"
FOR SELECT TO anon, authenticated USING ("IsActive" IS TRUE);
DROP POLICY IF EXISTS "P102 alias public read active" ON public."TblP102SpaceAlias";
CREATE POLICY "P102 alias public read active" ON public."TblP102SpaceAlias"
FOR SELECT TO anon, authenticated USING ("IsActive" IS TRUE);

-- 非公開紀錄與備份：取消瀏覽器角色的直接讀取。
REVOKE SELECT ON TABLE
public."TblP102Feedback", public."TblP102ImportBatch",
public."TblP102SearchEvents", public."TblP102SearchFailures",
public."TblP102SpaceBackup_20261002", public."TblP102SpaceHistory",
public."TblP102SpaceViewEvents", public."TblP102Space_Backup_BeforeSpaceNoV2",
public."ViewP102PopularKeywords", public."ViewP102PopularSpaces",
public."ViewP102SearchFailures"
FROM PUBLIC, anon, authenticated;

-- 僅處理 CSV 已確認的 P102 函式與簽章。
-- 保留既有 anon/authenticated 呼叫權；不新增敏感函式授權。
DO $repair$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public."P102AddFeedback"(text,text,text,text)',
    'public."P102AddSearchEvent"(text,integer,text)',
    'public."P102AddSearchFailure"(text)',
    'public."P102AddSpaceViewEvent"(text,text,text,text,text)',
    'public."P102AddSpaceViewEvent"(text,text,text,text,text,text,text,text)'
  ] LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog', signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', signature);
  END LOOP;
END;
$repair$;
COMMIT;

-- 唯讀驗證：新 RPC 應存在，並能以 anon 執行。
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS sample_count FROM public."P102_ReadSpaces"(p_limit => 1);
ROLLBACK;
-- 尚未完成：私有資料 schema 隔離、中央分析登錄與端對端驗收。
