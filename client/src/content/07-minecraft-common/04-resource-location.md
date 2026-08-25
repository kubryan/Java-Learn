---
title: ResourceLocation：資源 ID、Identifier 與 ResourceKey
slug: resource-location-identifier-resource-key
aliases: ResourceLocation, Identifier, ResourceKey
category: Minecraft 共通
order: 74
level: Minecraft 共通後
tags: ResourceLocation, Identifier, ResourceKey, registry, Minecraft 26.2, Fabric 26.2
summary: ResourceLocation 常見於舊教學或不同 mappings；在 Fabric 26.2 中應先確認目前專案的 mapping，再選擇正確的資源 ID 或 registry key 類別。
---

## 名稱相近，不代表可直接替換

`ResourceLocation` 是模組開發中常見的搜尋詞，但它可能來自不同 mappings、不同 loader 或舊版教學。Fabric 26.2 官方物品文件的範例以 `ResourceKey<Item>` 表示已註冊物品的 key；因此看到 `ResourceLocation` 時，第一步不是直接貼入 import，而是確認目前專案使用的 mappings 和官方 sources。[1]

> **Search the concept, then verify the mapped class.**  
> 先搜尋概念，再驗證 mapping 後的實際類別。

## 資源 ID 檢查表

| 問題 | 要確認的內容 |
| --- | --- |
| 這是 ID 還是 registry key？ | 是否只是 `namespace:path`，或需要能代表 registry entry 的 key。 |
| 範例屬於哪個 loader？ | Fabric、NeoForge 與舊 Forge 不應混用 import。 |
| 範例屬於哪個 mappings？ | 專案 sources 實際提供的類別名稱與套件路徑。 |
| 資源檔在哪裡？ | `assets/<modid>/` 的 namespace 必須和 mod ID 對應。 |

## 實作建議

使用目前專案由 Fabric Template Mod Generator 或官方 Example Mod 產生的結構，先建立一個物品 ID，再以 IDE 的 sources 導覽確認類別。若搜尋到的教學只寫 `ResourceLocation` 卻沒有版本與 mappings，將它標記為待比對線索，而不是可直接編譯的答案。

## References

[1]: https://docs.fabricmc.net/develop/items/food "Food Items 26.2 — Fabric Documentation"
[2]: https://docs.fabricmc.net/develop/items/first-item "Creating Your First Item — Fabric Documentation"
[3]: https://github.com/FabricMC/fabric-example-mod/tree/26.2 "Fabric Example Mod 26.2"
