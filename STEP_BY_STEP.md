# P102 V1.0 Stable 操作步驟

## 1. 解壓縮

解壓縮 `P102_CampusSpatialKnowledge_V1_0_Stable.zip`。

## 2. 上傳 GitHub

上傳以下檔案與資料夾：

```text
index.html
map.html
developer.html
css/
js/
database/
docs/
README.md
README_AI.md
STEP_BY_STEP.md
config.sample.js
```

不要上傳 ZIP 本身。  
不要覆蓋您既有的 `config.js`。  
不要刪除您已上傳的 `jpg/` 圖檔資料夾。

## 3. 確認 jpg 資料夾

GitHub repository 中應有：

```text
jpg/
```

所有地圖檔案副檔名應為 `.jpg`。

## 4. 執行資料庫 SQL

若尚未完成 SpaceNo 唯一碼遷移，先執行：

```text
database/00_P102_space_no_unique_migration.sql
```

接著執行：

```text
database/01_P102_schema_v1_stable.sql
```

最後可執行檢查：

```text
database/99_P102_health_check.sql
```

## 5. 測試

1. 開啟 `index.html`
2. 搜尋 `林`，確認可跨校區搜尋。
3. 搜尋 `2C239` 或 `3E102`。
4. 點擊結果進入地圖頁。
5. 確認地圖路徑為 `jpg/*.jpg`。
6. 測試回饋表單。
7. 開啟 `developer.html` 查看統計資料。
