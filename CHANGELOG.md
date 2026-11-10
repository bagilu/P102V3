# P102 CHANGELOG

## V1.4 SDS v3.7 更新驗收中

- 公開查詢改 RPC、獨立 Auth 設定與 cache busting。
- 加入 P101 匿名分析、中央登錄 SQL 與隱私說明。
- 修正頁尾 HTML、機構連結與版本；停止公開統計查詢。
- 資料庫隔離與現行權限待驗收，詳見 docs/P102_SDS37_QA.md。

## V1.2 Campus and Building Labels

- Updated campus selector labels to `校區1(中央)`, `校區2(介仁)`, and `校區3(建國)`.
- Updated building selector labels to show each building code with its building name.
- Added a centralized front-end location label configuration without changing the database schema or records.
- Preserved the V1.1 search-state and campus browsing behavior.

## V1.1 Navigation Experience

- Added query result state preservation with `sessionStorage`.
- Added campus browsing flow: Campus → Building → Floor → Space list.
- Removed default initial map/result loading; the home page now waits for search or browsing.
- Updated map page return button to restore previous search results.
- Kept `jpg/` image path convention and Database v2.0 schema support.

## V1.0 Stable

- Stable base release for P102 Campus Spatial Knowledge Platform.
