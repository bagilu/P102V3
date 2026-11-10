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
$function$;
REVOKE ALL ON FUNCTION public."P102_ReadSpaces"(text,text,integer,integer) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public."P102_ReadSpaces"(text,text,integer,integer) TO anon;
-- INVOKER requires caller read grants. Existing active-row RLS remains authoritative.
ALTER TABLE public."TblP102Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TblP102SpaceAlias" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ("SpaceID","SpaceCode","PicNo","MapFile","MapX","MapY","sID","SpaceNo","SpaceName","CampusNo","CampusName","BuildingNo","BuildingName","FloorNo","FloorName","FloorMapPic","CampusMapPic","Description","SortOrder","IsActive") ON public."TblP102Space" TO anon;
GRANT SELECT ("SpaceNo","AliasName","IsActive") ON public."TblP102SpaceAlias" TO anon;
COMMIT;
-- WARNING: public is currently exposed. These grants do NOT close table endpoints.
-- QA-04 remains blocked until a reviewed private-data-schema migration is validated.
