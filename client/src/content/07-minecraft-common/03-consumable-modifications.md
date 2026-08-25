---
title: Consumable 修改：FoodProperties 與 onConsume
slug: consumable-modifications
aliases: Consumable, Consumable 修改
category: Minecraft 共通
order: 73
level: Minecraft 共通後
tags: Consumable, FoodProperties, onConsume, Minecraft 26.2, Fabric 26.2, item
summary: 在 Fabric 26.2 的可食用物品中，分開理解 FoodProperties 與 Consumable 的職責，再把消耗效果掛到正確的元件。
---

## 兩個元件，兩種責任

Fabric 26.2 的官方食物物品文件將「可吃」與「吃下去後的效果」分開處理。`FoodProperties` 用來描述營養、飽和度與是否可在非飢餓時食用；要加入狀態效果等消耗行為時，則另外提供 `Consumable` 元件。[1]

| 概念 | English term | 用途 |
| --- | --- | --- |
| 食物屬性 | `FoodProperties` | `nutrition`、`saturationModifier`、`alwaysEdible` 等基本食物設定。 |
| 可消耗行為 | `Consumable` | 玩家消耗物品時發生的效果，例如套用狀態效果。 |
| 消耗回呼 | `onConsume` | 將 consume effect 加入 consumable builder 的位置。 |

## 官方範例的閱讀方式

官方文件以 `Consumables.defaultFood()` 建立 consumable builder，再以 `.onConsume(...)` 加入效果，最後把 `FoodProperties` 與 `Consumable` 一起交給物品 properties。[1] 搜尋 `Consumable 修改` 時，先確認你要改的是營養值，還是吃下去的副作用；兩者不是同一個 builder。

```java
// 概念示意；import 與完整參數須以目前 26.2 專案 sources 驗證。
Consumables.defaultFood()
    .onConsume(/* consume effect */)
    .build();
```

## 驗證

建立測試物品後，在 client 測試是否能消耗，再檢查飢餓值與狀態效果；最後以 `./gradlew build` 確認 mappings 與方法簽名。不要把舊影片中的食物 API 視為 26.2 的保證。

## References

[1]: https://docs.fabricmc.net/develop/items/food "Food Items 26.2 — Fabric Documentation"
