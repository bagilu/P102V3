-- 僅供 P101 授權管理者於中央 Supabase 執行。不得混入 P102 migration。
INSERT INTO p101_analytics."TblP101AnalyticsProjects" (project_code, canonical_origin, enabled)
VALUES ('P102', 'https://bagilu.github.io', true)
ON CONFLICT (project_code) DO UPDATE SET canonical_origin = EXCLUDED.canonical_origin, enabled = EXCLUDED.enabled;
