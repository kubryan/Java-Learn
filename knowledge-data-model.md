# JavaBase 知識資料模型

本專案採用**實體 Markdown 作為唯一資料來源**、**Knowledge Index 作為解析與搜尋模型**、**IndexedDB 作為瀏覽器工作快取**的三層模式。你可以直接編輯 `client/src/content/` 中的 Markdown；網站啟動時會解析 front matter 與正文，建立 Knowledge Index，再將搜尋需要的索引快取到 IndexedDB。搜尋、知識樹、閱讀進度與 UI 狀態不會取代 Markdown 原稿。

| 實體 | 主要欄位 | 用途 |
|---|---|---|
| Markdown Workspace | `client/src/content/**/*.md`、front matter、正文 | 所有課程筆記與 custom 知識的唯一原始來源，可直接編輯、備份與 Git 版控。 |
| Knowledge Index `note` | `title`、`category`、`tags`、`content`、`path` | 由 Markdown 解析出的可閱讀與可搜尋文章記錄。 |
| Knowledge Index `custom` | `title`、`titleEn`、`topic`、`tags`、`terms`、`content`、`path` | `category: 自訂` 的 Markdown 文章；它和一般筆記一樣由檔案建立，不是另一個正文資料庫。 |
| 術語 `term` | `title`、`titleEn`、`category`、`terms` | 由雙語 glossary 建立的中英文對照，例如「迴圈 — loop」。 |
| IndexedDB records | 索引欄位與搜尋權重 | 保存可快速查詢的索引快取；可由 Markdown 重新建立，不是 canonical source。 |
| IndexedDB meta | `source-signature` | 比較 Markdown／glossary 簽章，決定是否需要更新索引。 |
| IndexedDB／localStorage 狀態 | 閱讀進度、收藏、最近使用、UI 偏好、revision ledger | 保存瀏覽器工作狀態與歷史快照，不取代目前磁碟上的 Markdown。 |

## 資料流

```text
client/src/content/**/*.md
          ↓ parse front matter + body
          ↓
    Knowledge Index
          ↓
  IndexedDB search cache
          ↓
  full-text search / tree / graph / reading UI
```

在本機 `http://localhost:3000` 工作時，「新增本地 Markdown」會透過 Vite 的 local workspace middleware 寫入 `client/src/content/knowledge/`，接著重新載入檔案，讓 `import.meta.glob` 與 Knowledge Index 讀取新檔案。IndexedDB 只留下重新建立後的搜尋記錄。

網站首次載入時，若發現舊版仍存在 IndexedDB 的 `origin: local` custom record，會先嘗試將它寫成 `client/src/content/knowledge/` 下的 Markdown；成功寫入的舊記錄會刪除，寫入失敗的記錄會保留並顯示警告，避免資料遺失。公開部署版沒有本機檔案寫入能力，因此不會執行這項遷移。

搜尋評分會優先比對標題、檔名、英文術語、標籤與雙語術語，再比對全文內容。這讓「variable」、「迴圈」、「event bus」等中英文查詢都能先回傳最相關的 Markdown 知識。

本地頁面也接受 `?q=關鍵字` 作為初始查詢，例如 `?q=loop`；這可用於書籤或分享特定術語的搜尋入口，使用者在頁面輸入框內仍可隨時修改查詢。

## 備份邊界

Markdown 原稿、圖片與 Git 歷史應使用檔案備份與 Git／GitHub 保護。瀏覽器 JSON 備份只保存 IndexedDB 內仍存在的舊 custom 遷移資料、閱讀歷史、收藏、進度、草稿與 UI 設定；它不會複製整個 `client/src/content/`。因此清除瀏覽器資料前，最重要的是先保留專案目錄或 Git repository。

新增 Markdown 後，知識樹、標籤、全文搜尋、知識圖與 revision ledger 都會以實體檔案重新建立或更新。若要跨裝置使用，請同步專案目錄或使用 Git，而不是只同步 IndexedDB。
