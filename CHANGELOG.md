# P102 CHANGELOG

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
