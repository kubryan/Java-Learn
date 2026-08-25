---
title: Fabric 26.2 API Handbook：註冊、事件、命令與 Networking
slug: fabric-262-api-handbook
aliases: Fabric 26.2 API, Fabric API 26.2, Fabric API Handbook
category: Fabric
order: 81
level: Fabric 中階
tags: Fabric, Fabric API, Fabric Loader, Fabric Loom, Minecraft 26.2, Registry, ResourceKey, Item, Block, Event, Command, Brigadier, Networking, CustomPayload, StreamCodec, Datagen
summary: Fabric 26.2 核心 API 的搜尋友善手冊，涵蓋 ModInitializer、ResourceKey、物品與方塊註冊、事件、命令、CustomPayload、資料生成與 client/server 邊界。
---

# Fabric 26.2 API Handbook

這份文件整理 **Fabric for Minecraft 26.2** 最常用的開發 API。Fabric 專案通常由 Fabric Loader、Fabric API 與 Fabric Loom 組成；Loader 負責載入 mod，Fabric API 提供事件與跨 mod 的 hooks，Loom 則負責 Gradle 開發、mapping 與執行環境。[1] [2]

這是給 Java mod 專案使用的精選 handbook，不是完整 Javadoc。當你需要所有 overload、泛型或內部類別時，請把本文件當搜尋入口，再回到官方 26.2 文件與目前專案的 Gradle sources 確認完整簽名。

## 版本契約

| 欄位 | 本專案基準 | 查詢重點 |
|---|---|---|
| Minecraft | `26.2` | 遊戲版本，不等於 Fabric API 版本 |
| Java | `25` | 26.2 mod build 的 toolchain |
| Fabric Loader | 以 `gradle.properties` 為準 | 入口與 metadata |
| Fabric API | 以 `gradle.properties` 為準 | events、networking、item groups、datagen |
| Fabric Loom | 以 `build.gradle` 為準 | Gradle plugin、mappings、run config |
| Mod ID | `calibrationstone` | 所有 Java、JSON、namespace 必須一致 |

Fabric 官方移植文件建議先更新 `gradle/wrapper/gradle-wrapper.properties`、`gradle.properties` 與 `build.gradle`，再從官方 Develop 頁面確認 Minecraft、Loader、Loom 與 Fabric API 版本。[2] 不要把 1.21 或 26.1 的程式片段直接貼進 26.2 專案；同一個概念可能因 vanilla API 或 mapping 改名。

## 1. Mod 初始化與 metadata

最基本的 server-safe 入口實作 `ModInitializer`。Fabric Loader 會按照 `fabric.mod.json` 中的 `entrypoints.main` 建立入口：

```java
package dev.example.examplemod;

import net.fabricmc.api.ModInitializer;

public final class ExampleMod implements ModInitializer {
    public static final String MOD_ID = "examplemod";

    @Override
    public void onInitialize() {
        ModItems.initialize();
        ModBlocks.initialize();
        ModCommands.initialize();
    }
}
```

只有 client 才能載入的程式應放在 `ClientModInitializer` 與 `entrypoints.client`，例如 renderer、key mapping、client command 或 HUD。不要在 common initializer 直接引用 `net.minecraft.client.*`，否則 dedicated server 可能在載入類別時崩潰。

```json
{
  "schemaVersion": 1,
  "id": "examplemod",
  "version": "1.0.0",
  "name": "Example Mod",
  "environment": "*",
  "entrypoints": {
    "main": ["dev.example.examplemod.ExampleMod"],
    "client": ["dev.example.examplemod.ExampleModClient"]
  },
  "depends": {
    "fabricloader": ">=0.19.0",
    "minecraft": "26.2.x",
    "fabric-api": "*"
  }
}
```

## 2. Identifier、ResourceKey 與 Registry

Minecraft 的物品、方塊、entity 等都透過 registry 被遊戲辨識。26.2 官方 Fabric 文件使用 `ResourceKey` 表達 registry key，並以 `Identifier.fromNamespaceAndPath(namespace, path)` 產生 namespace 與名稱。[3]

```java
public final class ModItemIds {
    private ModItemIds() {}

    public static ResourceKey<Item> create(String name) {
        return ResourceKey.create(
            Registries.ITEM,
            Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, name)
        );
    }
}
```

直接註冊 vanilla registry 的基本形式如下。`Item.Properties.setId` 讓 item instance 與它的 key 一致：

```java
public final class ModItems {
    public static final ResourceKey<Item> CALIBRATION_STONE_KEY =
        ModItemIds.create("calibration_stone");

    public static final Item CALIBRATION_STONE = Registry.register(
        BuiltInRegistries.ITEM,
        CALIBRATION_STONE_KEY,
        new CalibrationStoneItem(new Item.Properties().setId(CALIBRATION_STONE_KEY))
    );

    public static void initialize() {
        // 呼叫此方法會觸發 static fields 初始化。
    }
}
```

註冊後查詢使用 vanilla registry，而不是註冊 helper：

```java
Item item = BuiltInRegistries.ITEM.getValue(
    Identifier.fromNamespaceAndPath("examplemod", "calibration_stone")
);

boolean exists = BuiltInRegistries.ITEM.containsKey(
    Identifier.fromNamespaceAndPath("examplemod", "calibration_stone")
);
```

`Identifier`、`ResourceKey`、`Registries`、`BuiltInRegistries`、`Registry.register`、`DeferredRegister` 是搜尋 registry 問題時最重要的關鍵字。不要在 registry 尚未完成時任意查詢所有 entries；需要穩定查詢時，應在適合的 lifecycle 或遊戲已完成載入後執行。

## 3. 物品註冊與創造模式分類

Fabric 26.2 的物品註冊可拆成三件事：建立 key、建立 `Item.Properties` 與 instance、呼叫 `Registry.register`。加入既有創造模式分類則使用 `CreativeModeTabEvents.modifyOutputEvent`。[3]

```java
public final class ModItems {
    public static final ResourceKey<Item> RUBY_KEY =
        ResourceKey.create(
            Registries.ITEM,
            Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "ruby")
        );

    public static final Item RUBY = Registry.register(
        BuiltInRegistries.ITEM,
        RUBY_KEY,
        new Item(new Item.Properties().setId(RUBY_KEY).stacksTo(64))
    );

    public static void initialize() {
        CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.INGREDIENTS)
            .register(entries -> entries.accept(RUBY));
    }
}
```

自訂物品行為可以繼承 `Item` 並覆寫 `use`。對只查詢資訊的功能，應明確區分 logical client 與 logical server，並避免在兩邊重複修改狀態：

```java
public final class CalibrationStoneItem extends Item {
    public CalibrationStoneItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        if (!level.isClientSide()) {
            Identifier dimension = level.dimension().identifier();
            player.sendSystemMessage(Component.literal(
                "Pos: " + player.blockPosition() + " | Dimension: " + dimension
            ));
        }
        return InteractionResult.SUCCESS;
    }
}
```

### 物品資源路徑

| 資源 | 路徑 |
|---|---|
| Texture | `src/main/resources/assets/<modid>/textures/item/<id>.png` |
| Baked model | `assets/<modid>/models/item/<id>.json` |
| Client item | `assets/<modid>/items/<id>.json` |
| English | `assets/<modid>/lang/en_us.json` |
| 繁體中文 | `assets/<modid>/lang/zh_tw.json` |
| Recipe | `data/<modid>/recipe/<id>.json` |
| Item tag | `data/<namespace>/tags/item/<tag>.json` |

26.2 的 client item JSON 將 client item 定義與 model JSON 分開：

```json
{
  "model": {
    "type": "minecraft:model",
    "model": "examplemod:item/ruby"
  }
}
```

對應的 model JSON 可以使用 `minecraft:item/generated`：

```json
{
  "parent": "minecraft:item/generated",
  "textures": {
    "layer0": "examplemod:item/ruby"
  }
}
```

## 4. 方塊與 BlockItem

方塊同樣要先建立 key，再註冊 `Block`；如果希望它能在物品欄取得，還要建立與註冊 `BlockItem`。官方 26.2 方塊指南使用 `BlockBehaviour.Properties`，並以 `Block.asItem()` 把方塊對應的 item 放入創造模式分類。[4]

```java
public final class ModBlocks {
    public static final ResourceKey<Block> CALIBRATION_BLOCK_KEY =
        ResourceKey.create(
            Registries.BLOCK,
            Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "calibration_block")
        );

    public static final Block CALIBRATION_BLOCK = Registry.register(
        BuiltInRegistries.BLOCK,
        CALIBRATION_BLOCK_KEY,
        new Block(BlockBehaviour.Properties.of().sound(SoundType.STONE))
    );

    public static final ResourceKey<Item> CALIBRATION_BLOCK_ITEM_KEY =
        ResourceKey.create(
            Registries.ITEM,
            Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "calibration_block")
        );

    public static final BlockItem CALIBRATION_BLOCK_ITEM = Registry.register(
        BuiltInRegistries.ITEM,
        CALIBRATION_BLOCK_ITEM_KEY,
        new BlockItem(
            CALIBRATION_BLOCK,
            new Item.Properties()
                .useBlockDescriptionPrefix()
                .setId(CALIBRATION_BLOCK_ITEM_KEY)
        )
    );

    public static void initialize() {
        CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.BUILDING_BLOCKS)
            .register(entries -> entries.accept(CALIBRATION_BLOCK.asItem()));
    }
}
```

方塊通常還需要 `blockstates/<id>.json`、`models/block/<id>.json`、`models/item/<id>.json`、`textures/block/<id>.png` 與 loot table。若要限制工具種類，可使用 vanilla block tags；若要大量產生 JSON，應改用 datagen。

## 5. Fabric Events 與 Callback

Fabric API 的 event 通常是一個 `Event` instance，並由 callback interface 定義 handler。使用 `.EVENT.register(...)` 把 lambda 或 method reference 註冊進去；事件常常能取代直接修改 vanilla 類別的 Mixin。[5]

```java
AttackBlockCallback.EVENT.register((player, level, hand, pos, direction) -> {
    BlockState state = level.getBlockState(pos);

    if (!player.isSpectator()
        && player.getMainHandItem().isEmpty()
        && state.requiresCorrectToolForDrops()
        && level instanceof ServerLevel serverLevel) {
        player.hurtServer(
            serverLevel,
            level.damageSources().generic(),
            1.0F
        );
    }

    return InteractionResult.PASS;
});
```

常見 event 搜尋字串如下：

| 類別 | API 關鍵字 | 用途 |
|---|---|---|
| Block interaction | `AttackBlockCallback`、`UseBlockCallback` | 玩家與方塊互動 |
| Entity interaction | `UseEntityCallback` | 玩家與 entity 互動 |
| Tick | `ClientTickEvents`、`ServerTickEvents` | client／server tick |
| Command | `CommandRegistrationCallback` | 註冊 server command |
| Loot | `LootTableEvents.MODIFY` | 不覆蓋原表地加入 loot |
| Creative tab | `CreativeModeTabEvents` | 修改創造模式分類輸出 |
| World lifecycle | `ServerLifecycleEvents` | 伺服器啟停 |

Callback 的回傳值通常是 `InteractionResult.PASS`、`SUCCESS` 或 `FAIL`。`PASS` 讓其他 handler 或 vanilla 繼續處理；`SUCCESS` 表示已處理；`FAIL` 表示中止該動作。實際語意仍要以該 callback 的 Javadoc 為準。

## 6. Server Command 與 Brigadier

Fabric server command 使用 Fabric API 的 `CommandRegistrationCallback.EVENT`，命令樹本身由 Mojang 的 Brigadier 建立。handler 會收到 `CommandDispatcher<CommandSourceStack>`、`CommandBuildContext` 與 `Commands.CommandSelection`。[6]

```java
public final class ModCommands {
    public static void initialize() {
        CommandRegistrationCallback.EVENT.register(
            (dispatcher, registryAccess, environment) -> {
                dispatcher.register(
                    Commands.literal("calibration")
                        .requires(source -> source.permissions()
                            .hasPermission(Permissions.COMMANDS_MODERATOR))
                        .executes(ModCommands::execute)
                );
            }
        );
    }

    private static int execute(CommandContext<CommandSourceStack> context) {
        context.getSource().sendSuccess(
            () -> Component.literal("Calibration command called."),
            false
        );
        return 1;
    }
}
```

`Commands.literal` 建立文字節點，`Commands.argument` 建立參數節點，`.then(...)` 建立子命令，`.requires(...)` 限制權限，`.executes(...)` 指定執行邏輯。需要位置、玩家、物品或 registry 參數時，使用 Brigadier argument type 與 `CommandBuildContext`，不要自行解析原始字串。

Fabric 也有 `ClientCommandRegistrationCallback` 與 `ClientCommands`，但 client command 必須放在 client-only 程式中，不能被 dedicated server 載入。

## 7. Networking 與 CustomPayload

Minecraft 即使是單人遊戲，也同時存在 logical server 與 logical client。當兩邊狀態需要同步時，使用 payload 傳送資料；不要把 client 的畫面狀態當成伺服器真實狀態。[7]

Fabric 26.2 的 payload 通常實作 `CustomPacketPayload`，提供 `CustomPacketPayload.Type` 與 `StreamCodec`：

```java
public record ExamplePayload(BlockPos pos)
    implements CustomPacketPayload {

    public static final Identifier ID =
        Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "example_payload");

    public static final CustomPacketPayload.Type<ExamplePayload> TYPE =
        new CustomPacketPayload.Type<>(ID);

    public static final StreamCodec<RegistryFriendlyByteBuf, ExamplePayload> CODEC =
        StreamCodec.composite(
            BlockPos.STREAM_CODEC,
            ExamplePayload::pos,
            ExamplePayload::new
        );

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

在 common initializer 註冊方向：

```java
PayloadTypeRegistry.clientboundPlay()
    .register(ExamplePayload.TYPE, ExamplePayload.CODEC);

PayloadTypeRegistry.serverboundPlay()
    .register(ExamplePayload.TYPE, ExamplePayload.CODEC);
```

server 發給 client 使用 `ServerPlayNetworking.send(serverPlayer, payload)`；client 發給 server 使用 `ClientPlayNetworking.send(payload)`。接收端分別使用 `ClientPlayNetworking.registerGlobalReceiver` 與 `ServerPlayNetworking.registerGlobalReceiver`。

```java
ServerPlayNetworking.registerGlobalReceiver(
    ExamplePayload.TYPE,
    (payload, context) -> {
        ServerPlayer player = context.player();
        BlockPos pos = payload.pos();
        // 在 server 端重新驗證 player、位置、權限與距離。
    }
);
```

**Serverbound payload 不能直接相信。** 客戶端可以竄改任何送出的欄位；伺服器必須重新檢查權限、距離、世界、entity id、數值範圍與目前遊戲狀態。`StreamCodec` 只負責序列化，不是權限驗證。

## 8. Data Generation

Fabric Data Generation API 可以用 Java 產生 recipe、advancement、tags、item model、語言檔、loot table 與其他 JSON 資源。官方設定方式是在 `build.gradle` 啟用 `fabricApi.configureDataGeneration`，再建立 `DataGeneratorEntrypoint` 並於 `fabric.mod.json` 宣告 `fabric-datagen` entrypoint。[8]

```gradle
fabricApi {
    configureDataGeneration {
        client = true
    }
}
```

```java
public final class ExampleDataGenerator
    implements DataGeneratorEntrypoint {

    @Override
    public void onInitializeDataGenerator(
        FabricDataGenerator fabricDataGenerator
    ) {
        FabricDataGenerator.Pack pack =
            fabricDataGenerator.createPack();

        // 在這裡加入 recipe、tag、model、translation provider。
    }
}
```

```json
{
  "entrypoints": {
    "fabric-datagen": [
      "dev.example.examplemod.ExampleDataGenerator"
    ]
  }
}
```

依官方文件，資料生成通常由 IDE run configuration 或 `./gradlew runDatagen` 執行，輸出放在 `src/main/generated`。生成檔案仍應檢查 namespace、語言 key、模型路徑與 JSON schema。

## 9. Client／server 安全邊界

| 程式內容 | 放置位置 | 重要限制 |
|---|---|---|
| registry、item、block、server command | common source | dedicated server 必須能載入 |
| client command、key mapping、renderer | client source | 不可從 common 入口直接引用 |
| serverbound payload handler | common／server-safe | 必須在 server 重新驗證資料 |
| clientbound payload handler | client source | 只更新 client 顯示或本地狀態 |
| datagen | client source 或 datagen entrypoint | 只在生成資源時執行 |
| Mixin | 最後手段 | 先查 Fabric API event 是否已提供 hook |

最小的檢查順序是：先確認 `level.isClientSide()`，再決定程式要在哪一邊執行；若要修改世界或永久狀態，應以 logical server 為權威。單人模式並不等於「沒有 server」。

## 10. 本專案 Calibration Stone 對照

| 規格 | Fabric 實作位置 |
|---|---|
| Mod ID 一致 | `fabric.mod.json`、Gradle namespace、資源 namespace 都是 `calibrationstone` |
| 物品註冊 | `CalibrationStoneMod` 的 registry registration |
| 物品行為 | `CalibrationStoneItem`，只回報位置與維度 |
| 創造模式 | `CreativeModeTabEvents.modifyOutputEvent` 加入 Ingredients |
| 資源 | `assets/calibrationstone/items`、`models/item`、`lang`、texture |
| 驗證 | `./gradlew build`，再用 `./gradlew runClient` 做遊戲內驗收 |

## 建置與查錯

```bash
# 從 minecraft/fabric-mod 執行
./gradlew build

# Windows PowerShell
.\gradlew.bat build

# 重新抓取 Gradle 依賴
./gradlew --refresh-dependencies

# 啟動開發 client，進行物品與資源驗收
./gradlew runClient
```

如果出現 `cannot find symbol`，先檢查 Minecraft、Fabric API、Loom、Java 與 mapping 版本，再以目前專案的 Gradle cache 或官方 26.2 example mod 搜尋類別。不要因為 IDE 自動補全顯示一個舊方法，就假設該方法仍存在於 26.2。

## References

[1]: https://docs.fabricmc.net/develop/ "Fabric Developer Guides 26.2"
[2]: https://docs.fabricmc.net/develop/porting/ "Fabric Porting to 26.2"
[3]: https://docs.fabricmc.net/develop/items/first-item "Fabric 26.2 Creating Your First Item"
[4]: https://docs.fabricmc.net/develop/blocks/first-block "Fabric 26.2 Creating Your First Block"
[5]: https://docs.fabricmc.net/develop/events "Fabric 26.2 Events"
[6]: https://docs.fabricmc.net/develop/commands/basics "Fabric 26.2 Creating Commands"
[7]: https://docs.fabricmc.net/develop/networking "Fabric 26.2 Networking"
[8]: https://docs.fabricmc.net/develop/data-generation/setup "Fabric 26.2 Data Generation Setup"
[9]: https://github.com/FabricMC/fabric-example-mod/tree/26.2 "Fabric 26.2 Example Mod"
