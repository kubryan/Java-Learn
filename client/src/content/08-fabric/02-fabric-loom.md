---
title: Fabric Loom：把版本與建置工具鏈放在同一張檢查表
slug: fabric-loom
aliases: Fabric Loom, Loom
category: Fabric
order: 82
level: 入門
tags: Minecraft, Fabric, Fabric Loom, Gradle, 26.2
summary: 將遊戲版本、Fabric、Gradle 與 mappings 的相容性集中記錄，避免只憑舊範例開始修改。
---

## Loom 是哪一個座標？

在 Fabric 專案中，**Fabric Loom** 是建置工具鏈的一部分。開始移植或建立功能前，先把目前專案的遊戲版本、Fabric API、Gradle 與 mappings 寫在同一處，再依專案實際設定進行驗證；不要只複製另一個版本的 `build.gradle` 片段。[1]

## 每次改版本前的最小檢查

| 要確認的項目 | 你要在專案中看什麼 |
| --- | --- |
| Minecraft 版本 | `gradle.properties`、官方發行資訊與目前專案的鎖定版本。 |
| mappings | 開發環境實際使用的 mappings 名稱與版本。 |
| Fabric 相依性 | Fabric Loader 與 Fabric API 的相容組合。 |
| 建置結果 | `./gradlew build` 是否仍能完成。 |

## 相關知識座標 · Related notes

- [[Minecraft 26.2]]：先確認你正在追蹤的版本與 API 問題是否相同。
- [[Fabric 26.2]]：回到第一個物品註冊的實作練習。
- [[Cobblemon]]：遇到整合需求時，把問題拆成 loader、版本與功能三層。

## References

[1]: https://docs.fabricmc.net/develop/getting-started/setting-up-a-development-environment "Fabric Documentation · Setting up a development environment"
