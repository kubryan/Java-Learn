# Code／學習基地

「Code／學習基地」是一個以 **Markdown 筆記 + React 本地網頁 + IndexedDB 知識索引** 組成的雙語程式學習工作台。它把 Java、Python、桌面工具、後端 API，以及 Minecraft Fabric／NeoForge 的學習內容放在同一個可回顧、可搜尋的架構中。

本專案的核心原則是：用中文理解概念、用英文認識技術術語、保留原始程式碼語法，並將自訂筆記保存於你自己的瀏覽器中。

## 功能

| 功能 | 說明 |
| --- | --- |
| Markdown 課程筆記 | Java、Python、物件導向、桌面工具、後端 API 與 Minecraft 雙平台的可維護筆記。 |
| 中英文伴讀 | 分類專屬術語、英文檢查問題與雙語搜尋。 |
| 本地知識索引 | 啟動後會將 Markdown 筆記與術語建立至瀏覽器 IndexedDB，可搜尋中文、英文、標籤、分類與正文。 |
| 自訂知識 | 從頁首「學習基地」開啟知識總覽，新增自己整理的標題、術語、標籤與內容。 |
| 練習程式 | 包含可直接編譯或執行的 Java、Swing 與 Python 入門練習。 |

> **本地資料說明：** 自訂知識與閱讀進度只保存在目前瀏覽器的 IndexedDB／localStorage。它們不會寫入 Git、也不會自動同步到其他裝置；清除瀏覽器網站資料後將無法還原。

## 快速開始

請先安裝 Node.js 與 pnpm，然後在專案根目錄執行：

```bash
pnpm install
pnpm dev
```

終端機會顯示本地網址。開啟後可以閱讀筆記、搜尋中英文術語、標記完成進度，或從頁首的「學習基地」新增自己的知識。

如需驗證型別與 production build：

```bash
pnpm check
pnpm build
```

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `client/src/content/` | 以 Markdown 保存的學習筆記。 |
| `client/src/lib/notes.ts` | Markdown front matter 解析、分類與筆記索引。 |
| `client/src/lib/bilingual.ts` | 中英文術語與英文複習提示。 |
| `client/src/lib/knowledge-db.ts` | 瀏覽器 IndexedDB 知識索引與自訂知識保存。 |
| `exercises/java-basics/` | 不依賴框架的 Java 基礎練習。 |
| `exercises/python-basics/` | Python 入門練習。 |
| `exercises/desktop-file-organizer/` | Swing 視窗與桌面工具起點。 |
| `minecraft/` | Fabric／NeoForge 共通功能規格與各平台起點。 |

## 新增或修改 Markdown 筆記

所有筆記位於 `client/src/content/`。新增 `.md` 檔案後，在檔首加入以下 front matter：

```md
---
title: 筆記標題
slug: unique-slug
category: Java 基礎
order: 13
level: 入門
tags: 陣列, 方法
summary: 用一句話說明這篇筆記能解決什麼問題。
---

## 本章目標
```

目前分類包括「開始使用、Java 基礎、Python 基礎、物件導向、桌面工具、後端 API、Minecraft 共通、Fabric、NeoForge」。Vite 會偵測多數檔案變更；若新筆記沒有出現，停止後重新執行 `pnpm dev`。

## 執行練習程式

安裝 JDK 後，可在 `exercises/java-basics/` 執行：

```bash
javac HelloJava.java ShoppingCart.java
java HelloJava
java ShoppingCart
```

Swing 練習位於 `exercises/desktop-file-organizer/`：

```bash
javac FirstWindow.java
java FirstWindow
```

Python 範例可在專案根目錄執行：

```bash
python3 exercises/python-basics/corrected_basics.py
python3 exercises/python-basics/input_and_loops.py
```

## Minecraft 版本原則

Fabric 與 NeoForge 應分別建立、建置與驗證，不直接交叉複製 API。實作前請記錄目標 Minecraft、Java、loader、API／MDK 與建置工具版本，並以該版本的官方文件確認相容性。
