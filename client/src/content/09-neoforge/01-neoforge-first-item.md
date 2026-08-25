---
title: NeoForge 分流：用同一規格建立獨立版本
slug: neoforge-first-item
category: NeoForge
order: 91
level: Minecraft 共通後
tags: NeoForge, registry, event bus, item, migration
summary: 用與 Fabric 相同的功能規格，理解 NeoForge 自己的專案、註冊與事件模型。
---

## 不要把 NeoForge 當成 Fabric 的替代語法

NeoForge 有自己的 MDK、registry 和 event bus 使用方式。最好的練習不是把 Fabric 專案硬改到能編譯，而是保留相同功能規格，再在 NeoForge 官方專案結構中重新完成一次。這能讓你看清楚「功能需求」和「平台 API」的差別。

## 第一個功能規格

請和 Fabric 版本保持相同目標：一個自訂物品、對應的語言檔與模型、加入適當的創造模式分類，以及一個查詢指令。為每一項內容建立檢查表；只要有一項漏掉，就先回到專案結構和資源路徑確認，不要隨機修改 Java 程式。

## 你要比較的不是函式名稱

| 比較點 | Fabric | NeoForge |
|---|---|---|
| 專案來源 | 官方 Template Mod Generator | 官方 MDK／文件流程 |
| 初始化 | 依 Fabric 的 entrypoint 組織 | 依 NeoForge 模組與 event bus 組織 |
| 驗證 | 各自 build、run client、檢查資源 | 各自 build、run client、檢查資源 |

實作當天必須根據目標 Minecraft 版本閱讀 NeoForge 官方文件與對應 MDK；這份筆記不固定任何版本號，以免讓舊設定看起來像最新設定。[1]

## 複習速查

- 共通功能規格可以相同，但 Java API 和建置設定必須分開。
- 把兩個 loader 專案放在不同資料夾，能降低誤用 import 的機率。
- 先修正第一個編譯錯誤，再看下一個，不要同時大量改動。

## References

[1]: https://docs.neoforged.net/ "NeoForge Documentation"
