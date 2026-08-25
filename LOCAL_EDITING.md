# 在本機維護 JavaBase 學習基地

此專案已同步到 Windows 的 `C:\think\JavaBase`。**`client\src\content\` 內的 Markdown 是知識庫的唯一原始來源**；網站、全文搜尋、知識樹與瀏覽器 IndexedDB 都由這些實體檔案建立索引。

## 先安裝一次開發環境

目前這台電腦尚未安裝 Node.js 與 pnpm。請先安裝 [Node.js LTS](https://nodejs.org/)，再以 PowerShell 在專案資料夾執行：

```powershell
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install
```

之後可以雙擊 `start-local.bat`，或在 PowerShell 執行：

```powershell
pnpm dev
```

瀏覽器開啟終端機顯示的本機網址，通常是 `http://localhost:3000`。

## 你主要會改的地方

| 目的 | 本機位置 |
|---|---|
| 新增或修改知識文章 | `client\src\content\` 內的 `.md` 檔案 |
| 修改網站介面 | `client\src\pages\Home.tsx` 與 `client\src\components\` |
| 新增 Java／Python 練習 | `exercises\` |
| 新增 Minecraft 專案說明 | `minecraft\` |

## 新增 Markdown 筆記

建立一個 `.md` 檔案，並在最前面加入 front matter。`tags` 可使用逗號單行，也可以使用 YAML 陣列：

```markdown
---
title: Fabric 物品註冊
slug: fabric-item-registration
category: Fabric
order: 82
level: 入門
tags:
  - Minecraft
  - Fabric
  - 26.2
summary: 將物品註冊為可被遊戲辨識的資源。
---

## 概念

用自己的話補上定義、範例與常見錯誤。
```

儲存檔案後，本地開發伺服器會自動重載；知識樹、標籤、全文搜尋和本機資料庫會用新的 Markdown 重建索引。若新增資料夾，請直接在 `client\src\content\` 下建立相對應的資料夾。

## 在本地網頁直接編輯實體 Markdown

請先用 `pnpm dev` 開啟 `http://localhost:3000`，再從文章右上方選擇「**編輯實體 Markdown**」。左側會讀取目前 `.md` 的完整內容（含 front matter）；按 `Ctrl+S` 或「寫入檔案」會先比對讀取時的版本雜湊，只有檔案尚未被其他操作修改時才會寫回磁碟。

每次由網頁建立、重新命名、移動、刪除或寫入筆記前，原始 Markdown 都會複製到專案根目錄的 `local-backups\`。保存成功後，網頁會重新載入，讓 `import.meta.glob`、全文搜尋、知識樹與 IndexedDB 版本時間線讀取新的實體內容。若出現「檔案已由其他操作修改」，請先重新載入文章並確認兩個版本後再保存，避免覆寫較新的內容。

> 這些寫入功能只存在於 Windows 的本機開發網址 `http://localhost:3000`。已部署的網站與 GitHub Pages 不能、也不應該直接存取你的 Windows 硬碟。

## 建立 Wiki 知識連結

在文章正文使用 `[[筆記名稱]]`，即可把文字變成可點擊的內部連結。例如：

```markdown
相關：

- [[Minecraft 26.2]]
- [[Fabric Loom]]
- [[Cobblemon]]
```

系統會依 **筆記標題、slug、來源路徑或 `aliases`** 尋找目標。需要顯示不同文字時，可寫成 `[[fabric-loom|查看 Fabric 建置工具鏈]]`。若目標目前不存在，文字會顯示為黃色虛線提示；先新增對應筆記或在其 front matter 加入 `aliases: 你使用的名稱` 後再點擊。

## 查看知識關聯圖

頁首的「知識圖」會讀取所有 Markdown 中可解析的 `[[...]]`，自動建立節點與連線，不需另外寫圖譜設定。圖中可拖曳節點、拖曳空白處平移、以滑鼠滾輪或 `＋／－` 縮放，並點選節點回到原始筆記。若某篇筆記尚未出現在圖上，請先讓它連到另一篇存在的筆記，或讓其他筆記以 `[[它的標題]]` 指向它。

> 「新增知識」知識總覽功能仍是瀏覽器 IndexedDB 的個人摘要；需要長期保存、全文搜尋或 Git 版控的內容，請用知識樹建立 `.md`，或在文章中使用「編輯實體 Markdown」。

## 用 Git 版控實體 Markdown

從本機網站頁首選擇「**Git**」，即可開啟 Git 工作台。它只會列出 `client\src\content\` 裡的 `.md` 變更，讓你逐檔檢查 diff、選取這次要提交的筆記，再輸入 commit 訊息。瀏覽器草稿、IndexedDB、`local-backups\`、網站介面和其他未選取檔案不會被 Git 工作台自動加入。

目前 `C:\think\JavaBase` 尚未初始化為 Git 儲存庫。請在 PowerShell 進入專案資料夾後，確認你要使用自己的 GitHub 帳號與遠端網址，再執行下列設定一次：

```powershell
cd C:\think\JavaBase
git init
git branch -M main
git remote add origin https://github.com/kubryan/Java-Learn.git
git config user.name "你的 GitHub 顯示名稱"
git config user.email "你的 GitHub 提交信箱"
```

完成設定、重新執行 `pnpm dev` 後按「重新檢查」，就能看到 Markdown 變更。`Commit` 只建立本機版本；`Push` 會在另一個確認視窗中才推送目前分支到 `origin`。若 GitHub 要求登入，請在 Windows 的 Git Credential Manager 或 GitHub CLI 完成登入後再 Push。若這個遠端已經有不同歷史，請先以命令列檢查並整合歷史，**不要**在工作台中強制推送。

## 匯出／還原瀏覽器本機資料

頁首的「**設定**」會開啟備份中心。選擇「下載 JSON 備份」可保存這台電腦、這個瀏覽器中的自訂知識、收藏、閱讀進度、最近使用、Markdown 草稿與修改歷史。請把下載的 `JavaBase-backup-*.json` 放在 OneDrive、外接硬碟或其他不會隨瀏覽器資料一同清除的位置。

還原時先選擇一份 JSON；系統會先檢查它是否為相容的 JavaBase 備份並列出筆數，只有按下「確認還原」才會替換瀏覽器資料。還原前會自動下載**目前資料的安全快照**，但它不會修改 `client\src\content\` 下的任何實體 Markdown。

若你希望「新增知識」的 IndexedDB 內容也變成可編輯、可搜尋、可 Git 版控的檔案，選擇「匯出為 Markdown」。只在本機 `http://localhost:3000` 有效，會將資料依判斷分類寫入 `client\src\content\knowledge\Java`、`Minecraft`、`AI`、`Python` 或「其他」。同名檔案會保留原檔、不覆寫，且原來的 IndexedDB 知識會保留作為安全副本；匯出後再透過 Git 工作台查看並提交新的 `.md` 檔案。

## 實體 Markdown 自動保存

在文章工具列選擇「**編輯實體 Markdown**」後，停止輸入約 **1.2 秒**，工作台就會自動把內容保存到對應的 `.md`。預覽欄會清楚顯示「正在編輯」、「正在自動保存」或「已保存」及時間；`Ctrl+S` 仍可用於立即保存。

每次保存都會先比對磁碟雜湊、建立 `local-backups\` 副本，再寫入檔案。若你同時從編輯器外修改了同一個 Markdown，工作台會顯示衝突並停止寫入；請選擇「重新載入磁碟版本」後再合併內容。關閉時若還有未保存文字，會要求你繼續編輯或明確放棄，避免不小心遺失內容。為了不中斷輸入，保存不會立刻重新整理頁面；關閉工作台後才會重載全域搜尋與知識索引。

## 查看、比較與還原修改歷史

文章工具列的「**修改歷史**」會列出目前瀏覽器中此筆記的版本台帳。每次實體 Markdown 自動保存會建立快照，可選擇版本後查看內容、比較它與前一版的行級差異，或先複製版本內容做人工合併。

選擇「還原 vN」時，系統會要求第二次確認，讀取目前磁碟版本並以雜湊比對是否被外部修改。只有版本吻合時才寫回選定的 `.md`，而且還原前會建立新的 `local-backups\` 備份、還原後另記一個版本快照。這能處理近期本機編輯；跨裝置、長期或多人協作歷史仍應透過 Git 工作台的 Commit／Push 管理。
