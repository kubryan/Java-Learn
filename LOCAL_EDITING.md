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
