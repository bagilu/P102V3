-- P102 Database v2.0: SpaceNo 全校唯一碼遷移
-- 執行前請先確認備份。

CREATE TABLE IF NOT EXISTS public."TblP102Space_Backup_BeforeSpaceNoV2" AS
SELECT * FROM public."TblP102Space";

-- SpaceNo = CampusNo + 原 SpaceNo；已經以 CampusNo 開頭者不重複加。
UPDATE public."TblP102Space"
SET "SpaceNo" = CONCAT("CampusNo"::text, "SpaceNo")
WHERE "CampusNo" IS NOT NULL
  AND "SpaceNo" IS NOT NULL
  AND "SpaceNo" <> ''
  AND "SpaceNo" NOT LIKE "CampusNo"::text || '%';

-- 先檢查是否重複；若有結果，請先處理，不要建立 unique index。
SELECT "SpaceNo", COUNT(*) AS count
FROM public."TblP102Space"
GROUP BY "SpaceNo"
HAVING COUNT(*) > 1;

-- 若上一段無重複，再執行下列 index。
CREATE UNIQUE INDEX IF NOT EXISTS "uq_TblP102Space_SpaceNo"
ON public."TblP102Space" ("SpaceNo");

COMMENT ON COLUMN public."TblP102Space"."SpaceNo"
IS '全校唯一空間識別碼，格式為 CampusNo + 原空間編號，例如 1B101、2C239、3E102。';
