# P102 Database Architecture v1.0

P102 正式定位為 **Campus Spatial Knowledge Platform**，不是單純地圖查詢系統。

核心原則：

> Every Search Leaves Knowledge Behind.

## 核心資料表

### TblP102Space
主空間資料表。`SpaceNo` 為全校唯一識別碼，例如：

- `1B101`
- `2C239`
- `3E102`

重要欄位：

- `SpaceNo`：全校唯一空間識別碼
- `SpaceName`：正式空間名稱
- `CampusNo`：校區代碼
- `FloorMapPic`：樓層平面圖檔名，不含副檔名
- `CampusMapPic`：校區總覽圖檔名，不含副檔名
- `Description`：補充說明

前端讀圖規則：

- 樓層平面圖：`jpg/{FloorMapPic}.jpg`
- 校區總覽圖：`jpg/{CampusMapPic}.jpg`

### TblP102SpaceAlias
多語言與暱稱資料表。

用途包括：

- 暱稱
- 英文名稱
- 日文名稱
- 舊稱
- 俗稱
- 常見錯字

### TblP102SearchEvents
搜尋紀錄，記錄使用者輸入的查詢字與結果數。

### TblP102SearchFailures
查詢失敗紀錄，用於發現缺漏資料、常見錯字與使用者需求。

### TblP102SpaceViewEvents
空間點閱紀錄，用於統計熱門空間。

### TblP102Feedback
使用者回饋，蒐集地圖錯誤、名稱修正、別名建議等。

## RLS 原則

- `TblP102Space`：匿名只讀啟用資料。
- `TblP102SpaceAlias`：匿名只讀啟用別名。
- 紀錄與回饋資料表：不直接開放匿名 insert，透過 RPC 寫入。

## RPC

- `P102AddSearchEvent`
- `P102AddSearchFailure`
- `P102AddSpaceViewEvent`
- `P102AddFeedback`

## Analytics Views

- `ViewP102PopularKeywords`
- `ViewP102SearchFailures`
- `ViewP102PopularSpaces`
