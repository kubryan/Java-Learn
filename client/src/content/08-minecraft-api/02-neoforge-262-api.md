---
title: NeoForge 26.2 API Handbook：註冊、事件、命令與 Networking
slug: neoforge-262-api-handbook
aliases: NeoForge 26.2 API, NeoForge API 26.2, NeoForge API Handbook
category: NeoForge
order: 82
level: NeoForge 中階
tags: NeoForge, NeoForge API, ModDevGradle, Minecraft 26.2, Mod, IEventBus, DeferredRegister, DeferredItem, Registry, EventBus, SubscribeEvent, Command, Brigadier, Networking, CustomPacketPayload, StreamCodec, Datagen, Client Items
summary: NeoForge 26.2 核心 API 的搜尋友善手冊，涵蓋 @Mod、IEventBus、DeferredRegister、物品與方塊註冊、事件、命令、CustomPacketPayload、資料生成與 client/server 邊界。
---

# NeoForge 26.2 API Handbook

這份文件整理 **NeoForge for Minecraft 26.2** 最常用的 modding API。NeoForge 專案的核心概念是 mod constructor、mod event bus、game event bus、registry helper、資源資料與 vanilla API。它和 Fabric 不是同一套 API：`DeferredRegister`、`IEventBus`、`@SubscribeEvent` 與 `NeoForge.EVENT_BUS` 不能直接貼進 Fabric 專案。

這是適合網站全文搜尋的精選 handbook，不是完整 Javadoc。NeoForge 官方文件的部分概念頁面可能仍顯示 26.1 版本標籤；本專案的 26.2 可編譯邊界應以 `minecraft/neoforge-mod` 的 MDK、`gradle.properties`、`build.gradle` 與實際 build 結果為準。[1] [2] [3]

## 版本契約

| 欄位 | 本專案基準 | 查詢重點 |
|---|---|---|
| Minecraft | `26.2` | vanilla 遊戲版本 |
| Java | `25` | NeoForge 26.2 mod build 的 toolchain |
| NeoForge | 以 `gradle.properties` 為準 | loader、模組 metadata 與 API |
| ModDevGradle | 以 `build.gradle` 為準 | Gradle plugin、run config、dependencies |
| Mod ID | `calibrationstone` | `@Mod`、TOML、JSON、namespace 必須一致 |
| Mapping | Mojang official names | 類別與方法名稱以目前 sources 為準 |

NeoForge 26.2 官方 MDK 使用 ModDevGradle，並包含 Gradle wrapper、`src/main`、`build.gradle`、`gradle.properties` 與 `settings.gradle`。[2] 更新版本時先檢查 MDK 與 migration primer，再改 Java 程式；尤其 26.2 的 rendering、client item 與 vanilla API 有重要變化，不應把舊版 renderer 範例當成固定答案。[3]

## 1. @Mod 與 mod event bus

NeoForge 的主入口使用 `@Mod("modid")`。constructor 會收到這個 mod 的 `IEventBus`，可以在其中註冊 DeferredRegister 與 mod lifecycle listeners：

```java
package dev.example.examplemod;

import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;

@Mod(ExampleMod.MOD_ID)
public final class ExampleMod {
    public static final String MOD_ID = "examplemod";

    public ExampleMod(IEventBus modEventBus) {
        ModItems.ITEMS.register(modEventBus);
        ModBlocks.BLOCKS.register(modEventBus);
        modEventBus.addListener(ExampleMod::commonSetup);
    }

    private static void commonSetup(final FMLCommonSetupEvent event) {
        // 一般 common setup；需要主執行緒時依事件 API 執行。
    }
}
```

不要把 `NeoForge.EVENT_BUS` 與 mod event bus 混為一談：

| Event bus | 取得方式 | 常見用途 |
|---|---|---|
| Mod event bus | `IEventBus` constructor parameter | registry、lifecycle、datagen、client setup |
| Game event bus | `NeoForge.EVENT_BUS` | 玩家、entity、world、命令等遊戲事件 |

許多 mod bus 事件在啟動期間可能平行執行；如果要回到遊戲主執行緒，依事件的 API 使用 `enqueueWork` 或指定的安全方法。需要 client-only 類別時，使用 client side 的 event 或分開的 client entry point，避免 dedicated server 載入 client code。

## 2. DeferredRegister 與 registry

NeoForge 建議使用 `DeferredRegister`，因為它把 registry event 的註冊時機與物件 holder 管理集中起來，降低過早 class loading 或 registry 順序錯誤。[4]

### 物品註冊

26.x 的 specialized helper 可以使用 `DeferredRegister.Items` 與 `DeferredItem`：

```java
public final class ModItems {
    private ModItems() {}

    public static final DeferredRegister.Items ITEMS =
        DeferredRegister.createItems(ExampleMod.MOD_ID);

    public static final DeferredItem<Item> RUBY = ITEMS.registerItem(
        "ruby",
        Item::new,
        properties -> properties.stacksTo(64)
    );
}
```

在 mod constructor 接上 event bus：

```java
public ExampleMod(IEventBus modEventBus) {
    ModItems.ITEMS.register(modEventBus);
}
```

需要實際 item instance 時呼叫 `DeferredItem.get()`；在創造模式事件中，holder 通常可以直接交給 `event.accept`：

```java
public static final DeferredItem<CalibrationStoneItem> CALIBRATION_STONE =
    ITEMS.registerItem(
        "calibration_stone",
        CalibrationStoneItem::new,
        properties -> properties.stacksTo(1)
    );
```

### 創造模式分類

NeoForge 使用 mod event bus 的 `BuildCreativeModeTabContentsEvent` 修改既有分類：

```java
private static void addCreative(BuildCreativeModeTabContentsEvent event) {
    if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
        event.accept(ModItems.CALIBRATION_STONE);
    }
}

public ExampleMod(IEventBus modEventBus) {
    ModItems.ITEMS.register(modEventBus);
    modEventBus.addListener(ExampleMod::addCreative);
}
```

`DeferredRegister.Items`、`DeferredItem`、`registerItem`、`BuildCreativeModeTabContentsEvent` 與 `CreativeModeTabs` 是搜尋 NeoForge 物品註冊問題時的核心關鍵字。

### 方塊與 BlockItem

方塊可使用 `DeferredRegister.Blocks`，再用一個 item register 建立對應的 `BlockItem`：

```java
public final class ModBlocks {
    public static final DeferredRegister.Blocks BLOCKS =
        DeferredRegister.createBlocks(ExampleMod.MOD_ID);

    public static final DeferredBlock<Block> CALIBRATION_BLOCK =
        BLOCKS.registerSimpleBlock(
            "calibration_block",
            BlockBehaviour.Properties.of().sound(SoundType.STONE)
        );

    public static final DeferredRegister.Items ITEMS =
        DeferredRegister.createItems(ExampleMod.MOD_ID);

    public static final DeferredItem<BlockItem> CALIBRATION_BLOCK_ITEM =
        ITEMS.registerSimpleBlockItem(
            "calibration_block",
            CALIBRATION_BLOCK
        );
}
```

不同 MDK minor 版本可能提供不同的 specialized helper overload；若 `registerSimpleBlock` 或 `registerSimpleBlockItem` 在目前 sources 不存在，回到 `DeferredRegister.register` 的 supplier 形式，並以目前 26.2 API 進行確認。

## 3. 事件系統

NeoForge 事件被發布到各自的 event bus。最重要的 game bus 是 `NeoForge.EVENT_BUS`；mod bus 則由 `@Mod` constructor 傳入。官方事件指南提供三種常見註冊方式：`IEventBus.addListener`、`@SubscribeEvent` 與 `@EventBusSubscriber`。[5]

### 直接加入 method listener

```java
@Mod(ExampleMod.MOD_ID)
public final class ExampleMod {
    public ExampleMod(IEventBus modEventBus) {
        NeoForge.EVENT_BUS.addListener(ExampleMod::onLivingJump);
    }

    private static void onLivingJump(LivingEvent.LivingJumpEvent event) {
        LivingEntity entity = event.getEntity();
        if (!entity.level().isClientSide()) {
            entity.heal(1.0F);
        }
    }
}
```

### `@SubscribeEvent`

```java
public final class GameEvents {
    private GameEvents() {}

    @SubscribeEvent
    public static void onLivingJump(LivingEvent.LivingJumpEvent event) {
        LivingEntity entity = event.getEntity();
        if (!entity.level().isClientSide()) {
            entity.heal(1.0F);
        }
    }
}
```

註冊靜態 event handler class：

```java
public ExampleMod(IEventBus modEventBus) {
    NeoForge.EVENT_BUS.register(GameEvents.class);
}
```

也可以使用自動發現：

```java
@EventBusSubscriber(modid = ExampleMod.MOD_ID)
public final class GameEvents {
    @SubscribeEvent
    public static void onLivingJump(LivingEvent.LivingJumpEvent event) {
        // handler 必須是 static。
    }
}
```

### Event 關鍵字

| 概念 | 常用搜尋字串 | 注意事項 |
|---|---|---|
| 玩家事件 | `PlayerEvent`、`PlayerInteractEvent` | 確認是 game bus 還是 mod bus |
| entity 事件 | `EntityEvent`、`LivingEvent` | 優先監聽具體子事件，不要直接監聽 abstract event |
| 方塊事件 | `BlockEvent` | 需要位置、方塊狀態或破壞結果時使用 |
| lifecycle | `FMLCommonSetupEvent`、`FMLClientSetupEvent` | mod bus；注意執行緒與 side |
| registry | `RegisterEvent`、`NewRegistryEvent` | mod bus；通常優先使用 DeferredRegister |
| creative tab | `BuildCreativeModeTabContentsEvent` | mod bus |
| datagen | `GatherDataEvent` | mod bus；只在資料生成執行 |
| networking | `RegisterPayloadHandlersEvent` | mod bus |

可取消事件會實作 `ICancellableEvent`；使用 `setCanceled(true)` 或事件提供的結果方法前，先確認該事件的 Javadoc。若事件具有 `TriState` 或 `Result`，不要用猜測的 boolean 取代它。

## 4. Command 與 Brigadier

NeoForge 的 server command 通常在 `RegisterCommandsEvent` 中註冊，命令樹由 Brigadier 的 `Commands.literal` 與 `Commands.argument` 組成：

```java
@SubscribeEvent
public static void registerCommands(RegisterCommandsEvent event) {
    event.getDispatcher().register(
        Commands.literal("calibration")
            .requires(source -> source.permissions()
                .hasPermission(Permissions.COMMANDS_MODERATOR))
            .executes(context -> {
                context.getSource().sendSuccess(
                    () -> Component.literal("Calibration command called."),
                    false
                );
                return 1;
            })
    );
}
```

`CommandSourceStack` 能提供執行者、server、level 與權限上下文。使用 `requires` 做 server-side 權限限制；不要只在畫面上隱藏按鈕而不檢查實際命令權限。需要參數時使用 Brigadier argument type，並且對 entity、位置、數值範圍與目標距離重新驗證。

## 5. CustomPayload 與 Networking

NeoForge 的 payload 透過 `RegisterPayloadHandlersEvent` 與 `PayloadRegistrar` 註冊。payload 可使用 `CustomPacketPayload` record 搭配 `StreamCodec`，把需要在 client／server 間傳送的欄位明確編碼。[6]

```java
public record MyData(String name, int age)
    implements CustomPacketPayload {

    public static final CustomPacketPayload.Type<MyData> TYPE =
        new CustomPacketPayload.Type<>(
            Identifier.fromNamespaceAndPath(
                ExampleMod.MOD_ID,
                "my_data"
            )
        );

    public static final StreamCodec<ByteBuf, MyData> STREAM_CODEC =
        StreamCodec.composite(
            ByteBufCodecs.STRING_UTF8,
            MyData::name,
            ByteBufCodecs.VAR_INT,
            MyData::age,
            MyData::new
        );

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

在 mod event bus 註冊 serverbound／clientbound：

```java
@SubscribeEvent
public static void registerPayloads(RegisterPayloadHandlersEvent event) {
    PayloadRegistrar registrar = event.registrar("1");

    registrar.playToServer(
        MyData.TYPE,
        MyData.STREAM_CODEC,
        ServerPayloadHandler::handleDataOnMain
    );
}
```

client-only handler 使用 `RegisterClientPayloadHandlersEvent`：

```java
@SubscribeEvent
public static void registerClientPayloads(
    RegisterClientPayloadHandlersEvent event
) {
    event.register(
        MyData.TYPE,
        ClientPayloadHandler::handleDataOnMain
    );
}
```

傳送 payload 的 helper：

```java
// Client -> logical server
ClientPacketDistributor.sendToServer(new MyData("ruby", 1));

// Server -> one player
PacketDistributor.sendToPlayer(serverPlayer, new MyData("ruby", 1));

// Server -> all connected players
PacketDistributor.sendToAllPlayers(new MyData("ruby", 1));
```

payload handler 預設應在安全的遊戲主執行緒執行；如果工作需要在 network thread 處理，使用 `PayloadRegistrar.executesOn(HandlerThread.NETWORK)`，並以 `IPayloadContext.enqueueWork` 回到主執行緒。**Serverbound payload 永遠是不可信輸入**，server 必須檢查權限、距離、entity id、數值範圍、目前 level 與遊戲狀態。

## 6. Resources 與 Client Items

26.x 使用 client item JSON 表達 `ItemStack` 應該送入哪個 model。檔案位於：

```text
src/main/resources/assets/<modid>/items/<id>.json
```

最小 client item：

```json
{
  "model": {
    "type": "minecraft:model",
    "model": "examplemod:item/ruby"
  }
}
```

對應 model：

```json
{
  "parent": "minecraft:item/generated",
  "textures": {
    "layer0": "examplemod:item/ruby"
  }
}
```

| 資源 | 路徑 |
|---|---|
| Item texture | `assets/<modid>/textures/item/<id>.png` |
| Item model | `assets/<modid>/models/item/<id>.json` |
| Client item | `assets/<modid>/items/<id>.json` |
| Blockstate | `assets/<modid>/blockstates/<id>.json` |
| Language | `assets/<modid>/lang/en_us.json`、`zh_tw.json` |
| Recipe | `data/<modid>/recipe/<id>.json` |
| Tags | `data/<namespace>/tags/<registry>/<tag>.json` |

NeoForge 26.x 的 client item 系統支援基本 model、composite、range dispatch、select、conditional、special 與 tint source。若只要顯示一般物品，先使用 `minecraft:model`；只有確實需要依 stack state 切換外觀時，才引入 property model 或 custom codec。

## 7. Data Generation

NeoForge data generation 主要透過 mod event bus 的 `GatherDataEvent` 與 provider 產生 JSON。常見輸出包含 recipe、loot、tags、advancements、語言與模型。Datapack registry 則使用 `RegistrySetBuilder` 與 `BootstrapContext` 建立資料。

概念上的 datagen listener：

```java
@SubscribeEvent
public static void gatherData(GatherDataEvent.Client event) {
    DataGenerator generator = event.getGenerator();
    PackOutput packOutput = generator.getPackOutput();

    // generator.addProvider(true, new ModRecipeProvider(packOutput, lookupProvider));
    // generator.addProvider(true, new ModLanguageProvider(packOutput, MOD_ID, "en_us"));
}
```

實際 provider 的 constructor 與 `GatherDataEvent` overload 可能隨 26.2 MDK 變化；先以目前專案的 Gradle sources 與官方文件確認，再加入 provider。產生後檢查 `assets`、`data`、namespace、resource key 與 JSON schema，不要只因 Gradle task 成功就視為遊戲內資源正確。

## 8. Client／server 與 event bus 安全邊界

| 程式內容 | 建議位置／bus | 重要限制 |
|---|---|---|
| DeferredRegister、物品、方塊 | mod constructor／mod bus | 先註冊 holder，再在遊戲中取 instance |
| lifecycle setup | mod event bus | 注意 parallel lifecycle 與 enqueueWork |
| 玩家與世界事件 | `NeoForge.EVENT_BUS` | 使用具體 event class |
| server command | game bus 的 `RegisterCommandsEvent` | 以 permission predicate 做 server-side 限制 |
| serverbound payload | common registration、server handler | 必須重新驗證所有 client 輸入 |
| clientbound payload | client handler | 僅更新 client 顯示或已驗證狀態 |
| renderer、client item 行為 | client-only | 不可讓 dedicated server 載入 client class |
| datagen | mod bus 的 gather data | 只在資料生成流程執行 |

NeoForge 官方事件文件特別提醒：不要監聽 abstract event；應監聽具體子事件，否則可能造成啟動錯誤或沒有預期的事件行為。[5]

## 9. 本專案 Calibration Stone 對照

| 規格 | NeoForge 實作位置 |
|---|---|
| Mod ID 一致 | `@Mod`、`gradle.properties`、`neoforge.mods.toml` 與資源 namespace 都是 `calibrationstone` |
| 物品註冊 | `CalibrationStoneMod.ITEMS` 的 `DeferredRegister.Items` |
| 物品行為 | `CalibrationStoneItem`，只回報位置與維度 |
| 創造模式 | `BuildCreativeModeTabContentsEvent` 加入 Ingredients |
| 資源 | `assets/calibrationstone/items`、`models/item`、`lang`、texture |
| 驗證 | `./gradlew build`，再用 `./gradlew runClient` 做遊戲內驗收 |

## 建置與查錯

```bash
# 從 minecraft/neoforge-mod 執行
./gradlew build

# Windows PowerShell
.\gradlew.bat build

# 清理後重新建置
./gradlew clean build --no-daemon

# 啟動開發 client，進行物品與資源驗收
./gradlew runClient
```

若遇到 `cannot find symbol`，先記錄 Minecraft、Java、NeoForge、ModDevGradle、mapping 與 Gradle 版本，再查目前 MDK 產生的 sources。若遇到 `NoSuchMethodError` 或 event bus 問題，確認事件註冊到的是 mod bus 還是 game bus；若遇到 dedicated server 崩潰，搜尋是否有 common class 直接 import `net.minecraft.client`。

## References

[1]: https://docs.neoforged.net/ "NeoForged Documentation"
[2]: https://github.com/NeoForgeMDKs/MDK-26.2-ModDevGradle "NeoForge 26.2 ModDevGradle MDK"
[3]: https://docs.neoforged.net/primer/docs/26.2/ "NeoForge Minecraft 26.1.x to 26.2 Migration Primer"
[4]: https://docs.neoforged.net/docs/concepts/registries "NeoForge Registries"
[5]: https://docs.neoforged.net/docs/concepts/events "NeoForge Events"
[6]: https://docs.neoforged.net/docs/networking/payload "NeoForge Registering Payloads"
[7]: https://docs.neoforged.net/docs/resources/client/models/items "NeoForge Client Items"
