---
title: Minecraft 26.2 API 導覽與搜尋索引
slug: minecraft-262-api-index
aliases: Minecraft 26.2 API, Fabric API, NeoForge API
category: Minecraft 共通
order: 80
level: Minecraft 共通後
tags: Minecraft 26.2, API, Fabric, NeoForge, Registry, Event, Command, Networking, Datagen
summary: 以搜尋友善的方式整理 Minecraft 26.2、Fabric 26.2 與 NeoForge 26.2 的核心 API、版本邊界、常用類別與官方文件入口。
---

# Minecraft 26.2 API 導覽

這個索引把 **Minecraft Java Edition 26.2** 的 vanilla API、Fabric 26.2 與 NeoForge 26.2 的 loader API 分開整理。它不是把整個 Javadoc 複製進網站，而是提供一個適合學習與搜尋的 API handbook：先用關鍵字找到概念，再進入對應的平台文件與官方來源確認完整方法簽名。

> **Minecraft 版本不等於 API 版本。**
>
> 26.2 是遊戲版本；Fabric API、Fabric Loader、Fabric Loom、NeoForge 與 ModDevGradle 是不同層級的工具或 API。遇到編譯錯誤時，先確認版本欄位，再確認 mapping、loader 與 side。

## 文件地圖

| 文件 | 適合查什麼 | 網站分類 |
|---|---|---|
| [[Fabric 26.2 API Handbook]] | Fabric Loader、Fabric API、註冊、事件、命令、payload、資料生成 | Fabric |
| [[NeoForge 26.2 API Handbook]] | NeoForge mod bus、DeferredRegister、事件、命令、payload、資料生成 | NeoForge |
| [[Minecraft 26.2 API：版本、mappings 與查詢順序]] | 版本確認、mapping 與官方來源判讀 | Minecraft 共通 |
| [[Minecraft 雙平台共通功能規格]] | 校準石的跨 loader 驗收條件 | Minecraft 共通 |

## 搜尋對照表

網站的全文搜尋會搜尋標題、摘要、標籤、正文與雙語術語。你可以用中文、英文、類別或 Java 類別名稱搜尋同一個概念。

| 你想找的概念 | 可搜尋關鍵字 | 主要入口 |
|---|---|---|
| 物品註冊 | 物品、item、register、Registry、DeferredRegister、ResourceKey | Fabric／NeoForge handbook 的 Registry 章節 |
| 方塊註冊 | 方塊、block、BlockBehaviour、BlockItem、BlockState | Fabric／NeoForge handbook 的 Block 章節 |
| 事件 | 事件、event、callback、EventBus、SubscribeEvent、InteractionResult | Fabric Events／NeoForge Events |
| 命令 | 命令、command、Brigadier、CommandDispatcher、CommandSourceStack | Command API 章節 |
| 網路封包 | payload、CustomPacketPayload、StreamCodec、network、packet | Networking 章節 |
| 創造模式 | creative tab、CreativeModeTabs、ItemGroup、Ingredients | Item Registration 章節 |
| 資料生成 | datagen、DataGenerator、recipe、loot、tag、advancement | Data Generation 章節 |
| 資源 | assets、data、lang、model、texture、client item | Resources 章節 |
| client/server | logical client、logical server、physical side、serverbound、clientbound | Sides 與 Networking 章節 |
| 版本移植 | porting、migration、mapping、26.1、26.2 | Versioning 章節 |

## API 分層

| 層級 | 內容 | 例子 |
|---|---|---|
| Vanilla | Minecraft 自身的註冊表、物品、方塊、命令與網路型別 | `BuiltInRegistries.ITEM`、`Item.Properties`、`CustomPacketPayload` |
| Fabric Loader | 啟動入口與 metadata | `ModInitializer`、`ClientModInitializer`、`fabric.mod.json` |
| Fabric API | 跨 mod 的事件、註冊輔助、玩家查找、資料生成與網路 helper | `CommandRegistrationCallback`、`CreativeModeTabEvents`、`PlayerLookup` |
| NeoForge Loader／API | mod bus、game bus、註冊輔助、事件、payload 與資料生成 | `IEventBus`、`DeferredRegister`、`NeoForge.EVENT_BUS` |
| 資源與 Data Pack | 以 JSON、語言檔、模型、tags、recipes 與 loot tables 表達資料 | `assets/<modid>/...`、`data/<modid>/...` |

## 26.2 共同的開發順序

先在 `gradle.properties` 與 `build.gradle` 確認 Minecraft、Java、loader、API／MDK、mapping 與建置工具版本。接著建立穩定的 mod id 與資源命名空間，再註冊物品或方塊，最後才加入事件、命令、網路或資料生成。每次跨版本移植都應重新查詢該版本的官方文件與官方範例，不要只依賴舊版教學中的類別名稱。

一個最小功能通常需要四種驗證：Java 程式能編譯、資源 JSON 能被載入、client 能啟動，以及 server/client 邊界符合預期。對 serverbound payload、命令權限與世界修改尤其要做伺服器端驗證，不能只在 client 端相信輸入。

## 專案中的版本基準

| 平台 | 專案位置 | 版本基準 | 建置命令 |
|---|---|---|---|
| Fabric | `minecraft/fabric-mod` | Minecraft 26.2、Java 25、Fabric 26.2 toolchain | `./gradlew build` |
| NeoForge | `minecraft/neoforge-mod` | Minecraft 26.2、Java 25、NeoForge 26.2 MDK | `./gradlew build` |
| 共通功能 | `minecraft/COMMON_FEATURE_SPEC.md` | Calibration Stone／校準石 | build、client、取得並使用 |

## 版本與來源原則

Fabric 26.2 的官方文件目前把 26.1 到 26.2 的移植、物品、方塊、事件、命令、網路與資料生成分開說明。NeoForge 的文件頁面可能顯示 26.1 版標籤，但其 26.2 MDK、26.2 migration primer 與專案內的實際 Gradle 版本才是本專案判斷可編譯性的依據。因此，本索引會標示「文件頁面版本」與「本專案 build 版本」的差異，不把不同版本的範例混稱。

## References

[1]: https://docs.fabricmc.net/develop/ "Fabric Developer Guides 26.2"
[2]: https://docs.fabricmc.net/develop/porting/ "Fabric Porting to 26.2"
[3]: https://github.com/FabricMC/fabric-example-mod/tree/26.2 "Fabric 26.2 Example Mod"
[4]: https://docs.neoforged.net/ "NeoForged Documentation"
[5]: https://github.com/NeoForgeMDKs/MDK-26.2-ModDevGradle "NeoForge 26.2 ModDevGradle MDK"
[6]: https://docs.neoforged.net/primer/docs/26.2/ "NeoForge Minecraft 26.1.x to 26.2 Migration Primer"
