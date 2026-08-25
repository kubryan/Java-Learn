---
title: Fabric 分流：從第一個物品理解註冊
slug: fabric-first-item
aliases: Fabric 26.2, Fabric 第一個物品
category: Fabric
order: 81
level: Minecraft 共通後
tags: Fabric, Fabric API, item, registry, 26.2
summary: 在確認目標版本後，使用 Fabric 官方範例的註冊思路建立第一個物品。
---

## 這篇的前提

先完成「Minecraft 模組共通概念」。Fabric 專案建議由官方 Template Mod Generator 建立，並以 Fabric Develop 頁面的當前建議版本設定 Minecraft、Loader、API 與建置工具。[1] 不要直接把舊版教學的版本號貼進新專案。

## 建立順序

1. 用官方模板建立 Java 專案，確認 package 與 mod ID 都是小寫且一致。
2. 檢查 `fabric.mod.json` 的 `id`、entrypoint 與相依套件。
3. 建立物品 ID 與物品實體，放在清楚的註冊類別中。
4. 加入初始化、語言檔與 item model；若只寫 Java 類別，遊戲不會有完整可用內容。
5. 執行 build，再啟動 client 驗證物品可載入。

## 先用事件，不急著用 Mixin

Fabric API 為常見掛鉤點提供事件 callback。當功能能用官方 event 完成時，優先選擇 event；只有沒有合適掛鉤時，才研究 Mixin，並記錄 client/server side、注入位置與相容性風險。[2]

## 版本提醒

本基地以 Minecraft Java Edition 26.2 作為初始學習假設，但實際建立專案當天仍要重新查核當前工具版本。官方文件指出 26.2 的註冊和資料生成有更新，舊範例不可直接視為相容。[3]

## References

[1]: https://fabricmc.net/develop/template/ "Fabric Template Mod Generator"
[2]: https://docs.fabricmc.net/develop/events "Events — Fabric Documentation"
[3]: https://docs.fabricmc.net/develop/porting/ "Porting to 26.2 — Fabric Documentation"
