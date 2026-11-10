# P102 V1.4 — SDS v3.7 更新驗收中

基準：94c975eed65e4938a36882a04998a0321290341e。日期：2026-11-10。
正式網址已回應 HTTP 200：https://bagilu.github.io/P102V3/ 。Origin：https://bagilu.github.io。

|項目|狀態|證據與待辦|
|---|---|---|
|QA-02/03|PASS|公開 JS 無直接 Table/View CRUD；搜尋、地圖與分頁瀏覽改 P102_ReadSpaces|
|QA-01/05–10/13|REVIEW|提供唯讀盤點；實際資料庫與遊戲 RPC 不在目前可存取環境；既有匿名寫入 DEFINER 缺安全 search_path，需檢視現行定義再修復|
|QA-04|FAIL|既有 public 表仍暴露；INVOKER 必須讀表，不等於封閉 endpoint。須先備份、staging 驗證私有資料 schema 遷移與相依 RPC，再核准執行|
|QA-11|N/A|本站公開查詢無密碼欄位|
|QA-12|FAIL|既有 config.js 已進 Git 歷史；本更新不覆蓋它，新增忽略規則及 config-sample.js；移除追蹤須配合部署設定注入|
|QA-14/22|N/A|本次 GitHub 原始碼更新，未交付海報或 ZIP；既有 JPG 保留|
|QA-15|PASS|V1.4 與本地 CSS/JS cache busting 同步|
|QA-16|REVIEW|頁尾依序標示機構、Web Version、SDS 更新驗收中；尚不宣稱完全符合|
|QA-17–23|N/A|無海報變更|
|QA-24/25|PASS|首頁及遊戲識別連結 P101；首頁唯一 P102 分析腳本|
|QA-26/28|REVIEW|中央登錄與唯讀驗證 SQL 已附；待執行及後台事件、背景時間、故障測試|
|QA-27|N/A|由 P101 管理者驗證限流、保存與退出機制|

此版不可視為合格正式上線交付。先執行 11_P102_Permissions_Review.sql，確認 schema 與權限後處理 QA-04/12；10_P102_ReadSpaces.sql 只能先於對應前端部署，不能重跑舊 00/01 migration。原 developer 頁已停止公開載入搜尋字與統計，待專案管理角色設計後恢復。搜尋仍在伺服器執行，保留別名查詢；回傳僅公開空間顯示欄位。尚未進行實際資料庫、瀏覽器 UI 或端對端測試。
