---
title: Minecraft 模組共通概念：先學功能，再學 loader 差異
slug: minecraft-common
category: Minecraft 共通
order: 71
level: Java 基礎完成後
tags: Minecraft, registry, assets, client-server, datagen
summary: 不論使用 Fabric 或 NeoForge，先理解模組 ID、註冊、資源與 client/server 的共同問題。
---

## 先把共通問題分開

Fabric 和 NeoForge 的 API 寫法不同，但一個正常的 Minecraft 模組通常都要處理相同問題：模組識別、初始化、內容註冊、資源檔、語言檔、配方、資料生成與 client/server 分工。先認識這些名詞，之後比較兩個平台時才不會只是在背不同函式名稱。

| 共通概念 | 你要回答的問題 |
|---|---|
| 模組 ID | 這個內容在遊戲中的唯一 namespace 是什麼？ |
| 註冊 | 遊戲何時、用哪個 registry 認識你的物品或方塊？ |
| 資源 | 模型、材質、翻譯、配方要放在哪個正確路徑？ |
| side | 這段程式該在 client、logical server 還是兩端執行？ |
| 資料生成 | 哪些 JSON 能用程式產生並保持一致？ |

## 第一個雙平台功能規格

規格保持很小：新增一個物品、在創造模式分類中出現、提供英文與繁體中文名稱，並加入一個安全的查詢指令。先把功能規格寫成 Markdown，再分別在 Fabric 和 NeoForge 實作；不要把一個平台的 Java 類別直接複製到另一個平台期待它能編譯。

## 版本紀錄是必做的筆記

Minecraft、Java、loader、API、建置工具都會變動。每次開始模組專案時，在 README 記錄這些版本與最後查證日期；遇到問題時，先確認範例是否屬於相同版本與同一個 loader。

> 單人世界仍有 logical server。只在 client 修改資料，常會造成多人或伺服器環境不同步。[1]

## References

[1]: https://docs.fabricmc.net/develop/networking "Networking — Fabric Documentation"
