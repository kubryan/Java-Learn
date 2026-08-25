---
title: Cobblemon：把整合需求拆成可驗證的知識筆記
slug: cobblemon-knowledge-entry
aliases: Cobblemon
category: Minecraft 共通
order: 75
level: Minecraft 共通後
tags: Minecraft, Cobblemon, modpack, integration, Fabric, NeoForge
summary: 先把版本、loader、功能與驗證步驟分開記錄，再把每個問題連回可靠的專案與文件座標。
---

## 先建立問題的邊界

當你要研究或整合 Cobblemon 相關內容時，先用自己的專案條件定義問題：目前的 Minecraft 版本、實際 loader、要做的功能，以及可重現的錯誤或驗證方式。這樣搜尋到的程式碼或討論才有辦法判斷是否適用，而不是直接貼進專案。

## 建議的筆記欄位

| 欄位 | 例子 |
| --- | --- |
| 目標 | 想新增、調整或理解的單一功能。 |
| 環境 | Minecraft 版本、loader、mod 版本與 Java 版本。 |
| 證據 | 官方文件、原始碼、可重現步驟或編譯輸出。 |
| 驗證 | 建置、遊戲啟動、資料生成或最小測試結果。 |

## 相關知識座標 · Related notes

- [[Minecraft 26.2]]：先釐清遊戲版本、mappings 與 loader 是否對應。
- [[Fabric Loom]]：整理 Fabric 工具鏈與建置檢查。
- [[Fabric 26.2]]：回到最小物品註冊範例，確認基礎流程仍可運作。
- [[NeoForge 分流：用同一規格建立獨立版本]]：同一需求若要跨 loader，先對齊功能規格再分開實作。
