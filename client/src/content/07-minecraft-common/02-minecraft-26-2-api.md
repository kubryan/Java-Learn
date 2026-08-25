---
title: Minecraft 26.2 API：版本、mappings 與查詢順序
slug: minecraft-26-2-api
aliases: Minecraft 26.2
category: Minecraft 共通
order: 72
level: Minecraft 共通後
tags: Minecraft 26.2, API, mappings, Fabric 26.2, porting
summary: 先確認 Minecraft 26.2、mapping 與 loader，再判斷你查到的 API 是否真的適用於目前專案。
---

## 先分清楚版本與 API

**Minecraft Java Edition 26.2** 是正式版本字串；`Chaos Cubed` 是更新名稱，不是 API 版本。[1] 當你搜尋「Minecraft 26.2 API」時，先把問題拆成三層：vanilla 遊戲版本、目前使用的 mapping 命名，以及 Fabric 或 NeoForge 提供的 API。

> **Minecraft version is not an API version.**  
> Minecraft 版本不等於 API 版本。

## 建議的查詢順序

| 你要找什麼 | 先查哪裡 | 要確認的事 |
| --- | --- | --- |
| 遊戲版本與更新內容 | Minecraft 官方 26.2 公告 | 是否真的是 Java Edition 26.2。 |
| Fabric 26.2 工具鏈 | Fabric Develop 與 Porting to 26.2 | Loader、API、Loom、Gradle 與 mappings 是否相容。 |
| 類別或方法 | 目前專案使用的 mappings／sources | import、套件名與方法簽名是否存在。 |
| 可編譯實作 | 官方文件或 26.2 Example Mod | 範例是否同時符合 loader、side 與資源路徑。 |

## 不要只搜尋類別名稱

相同概念在不同 mappings 或 loader 下可能有不同類別名稱。搜尋結果若出現舊版、Forge／NeoForge 或不同 mappings 的名稱，先不要直接貼進 Fabric 26.2 專案；把它當作概念線索，再回到目前專案的 sources 驗證。

## 驗證

至少執行一次 `./gradlew build`。若問題涉及物品、註冊或資料生成，也應再執行對應的 `runClient` 或 `runDatagen`；本筆記只整理查詢方式，不取代實際編譯驗證。

## 相關知識座標 · Related notes

- [[Fabric Loom]]：回到工具鏈相容性與 Gradle 設定的檢查起點。
- [[Cobblemon]]：把整合需求拆成可驗證的筆記與任務。
- [[ResourceLocation]]：確認註冊、資源路徑與命名空間時的共同概念。
- [[Consumable 修改]]：追蹤物品消耗行為時的版本敏感實作。

## References

[1]: https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2 "Minecraft Java Edition 26.2"
[2]: https://fabricmc.net/develop/ "Fabric Develop"
[3]: https://docs.fabricmc.net/develop/porting/ "Porting to 26.2"
