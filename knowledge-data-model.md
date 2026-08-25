# 本地知識資料庫資料模型

本專案採用**Markdown 作為可維護原稿**、**IndexedDB 作為瀏覽器本地索引資料庫**的雙層模式。這代表你仍可直接編輯 `client/src/content/` 中的 Markdown；網站啟動時會依筆記內容建立或更新本機索引，搜尋不必把筆記送往第三方服務。

| 實體 | 主要欄位 | 用途 |
|---|---|---|
| 筆記 `note` | `title`、`category`、`tags`、`content`、`path` | 儲存每一篇 Markdown 的可搜尋知識。 |
| 術語 `term` | `title`、`titleEn`、`category`、`terms` | 儲存中英文對照，例如「迴圈 — loop」。 |
| 自訂知識 `custom` | `title`、`titleEn`、`tags`、`terms`、`content`、`createdAt` | 由本地網頁建立，僅儲存在目前瀏覽器的 IndexedDB。 |
| 索引中繼資料 `meta` | `source-signature` | 比較原稿簽章，決定何時重新建立本地索引。 |

搜尋評分會優先比對標題、英文術語、標籤與雙語術語，再比對全文內容。這讓「variable」、「迴圈」、「event bus」等中英文查詢都能先回傳最相關的知識。

本地頁面也接受 `?q=關鍵字` 作為初始查詢，例如 `?q=loop`；這可用於書籤或分享特定術語的搜尋入口，使用者在頁面輸入框內仍可隨時修改查詢。

自訂知識與 Markdown 索引使用同一個搜尋資料庫，但同步 Markdown 時只重建系統筆記與術語記錄；`custom` 記錄會被保留，因此重新整理或更新內建筆記不會清除使用者在此瀏覽器新增的內容。
