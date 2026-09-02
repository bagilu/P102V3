# P102 Campus Spatial Knowledge Platform V1.2 Campus & Building Labels

中文名稱：慈濟大學校園空間知識平台  
英文名稱：Campus Spatial Knowledge Platform  
Motto：**Every Search Leaves Knowledge Behind.**

## 定位

P102 不只是校園地圖查詢系統，而是一個可持續演化的校園空間知識平台。

每一次查詢、每一次點閱、每一次查詢失敗與每一次回饋，都可以成為改善校園空間資料品質的依據。

## V1.2 Campus & Building Labels 重點

- 圖檔全面改為 `jpg/` 與 `.jpg`
- 前端讀圖規則：
  - `jpg/{FloorMapPic}.jpg`
  - `jpg/{CampusMapPic}.jpg`
- `SpaceNo` 作為全校唯一識別碼
- 搜尋直接查 Supabase，不受前 1000 筆限制
- 支援 `TblP102SpaceAlias` 多語言別名查詢
- 支援查詢紀錄、查詢失敗、點閱紀錄、使用者回饋
- 提供 `developer.html` 查看熱門查詢、失敗查詢、熱門空間
- 校區瀏覽選單顯示校區與建築物的正式名稱
- 顯示名稱集中設定於 `js/p102-location-labels.js`，不變更資料庫

## 檔案結構

```text
P102_CampusSpatialKnowledge_V1_2_CampusBuildingLabels/
├── index.html
├── map.html
├── developer.html
├── config.sample.js
├── css/
├── js/
├── jpg/
├── database/
└── docs/
```

## 部署提醒

本 ZIP 不包含實際 JPG 地圖圖檔，避免覆蓋 GitHub 上既有圖檔。

請確認 GitHub repository 裡有：

```text
jpg/
  1ALL.jpg
  2ALL.jpg
  3ABCDEF1.jpg
  ...
```

## Config

請保留您既有的 `config.js`。若是新部署，請複製 `config.sample.js` 為 `config.js`，再填入 Supabase URL 與 anon key。


## V1.1 Navigation Experience 更新

- 首頁不再預設顯示某張地圖；預設為等待查詢與校區瀏覽。
- 新增「校區 → 各棟 → 樓層」三層瀏覽，支援不輸入關鍵字也能找空間。
- 搜尋結果使用 `sessionStorage` 保留；從地圖頁返回後會還原上次查詢結果。
- 地圖頁返回按鈕改為「返回查詢結果」。
- 圖檔路徑維持 `jpg/{FloorMapPic}.jpg` 與 `jpg/{CampusMapPic}.jpg`。

## V1.2 Campus & Building Labels 更新

- 校區選單顯示為 `校區1(中央)`、`校區2(介仁)`、`校區3(建國)`。
- 各棟選單顯示棟別代碼與建築名稱，例如 `A(和敬樓)`、`2C(立心樓)`。
- 選單仍只列出資料庫中目前具有有效空間資料的校區與棟別。
- 本版不需要執行新的 SQL。
