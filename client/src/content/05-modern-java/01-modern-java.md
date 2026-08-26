---
title: 現代 Java：泛型、Lambda、Stream、Enum、Annotation 與併發
slug: modern-java
category: Java 現代語法
order: 51
level: 中階到進階
tags: Java, Generics, Lambda, Functional Interface, Stream API, Optional, Record, Enum, Pattern Matching, Annotation, Reflection, Serialization, Dependency Injection, Concurrency, Minecraft Java
aliases: 泛型, Lambda 表達式, Stream API, Optional, Record, 列舉, 註解, 反射, 併發
summary: 補齊現代 Java 開發常用語法與 API，並標出哪些概念會直接出現在 Minecraft loader 的 callback、registry、事件、payload 與資料模型中。 ⭐⭐⭐ Minecraft 必學
---

# 現代 Java：泛型、Lambda、Stream、Enum、Annotation 與併發

> **S 級先修：** Generics 請先閱讀獨立章節 `05-modern-java/00-generics.md`。那篇完整拆解 Type Parameter、Generic Class、Generic Method、Bounded Type Parameter、Wildcard、`? extends`、`? super` 與 Type Erasure；本篇只保留現代 Java 的整體對照與後續主題。

現代 Java 的重點不是把每個新語法都用上，而是讓型別、資料流、契約與生命週期更清楚。Dev.java 將 Generics、Lambda、Annotations、Pattern Matching、Stream API、Reflection 與 Virtual Threads 分成獨立的學習主題；本篇將它們整理成 Minecraft Java 開發可以循序使用的工具箱。[1]

## 泛型｜Generics ⭐⭐⭐

Generics 把型別參數化，讓 compiler 在 compile time 幫你檢查集合與方法的輸入輸出，減少 runtime cast。`List<String>` 代表這個 list 的元素型別是 String；`List<?>` 則表示某種未知型別的 list。

```java
static <T> T firstOrNull(List<T> values) {
    return values.isEmpty() ? null : values.get(0);
}

List<String> ids = new ArrayList<>();
ids.add("minecraft:stone");
String first = firstOrNull(ids);
```

泛型 class 可以重用同一份邏輯而保持型別安全；Minecraft API 中的 registry、event bus、payload、codec 與 collection 都大量使用型別參數。

```java
record Entry<K, V>(K key, V value) {}
Entry<String, Integer> count = new Entry<>("stone", 12);
```

`? extends T` 適合讀取 producer，`? super T` 適合寫入 consumer，常用口訣是 PECS：Producer Extends、Consumer Super。不要在不理解 wildcard 的情況下大量 cast；先讓 method signature 表達真正的型別契約。

## Lambda Expression｜Lambda 表達式 ⭐⭐

Lambda 是一段可以傳遞的行為，語法通常是 `(parameters) -> expression` 或 `(parameters) -> { statements }`。它不是獨立的 class，而是要放進 functional interface 的 target type。閱讀 Lambda 時，先把箭頭左側當成輸入、右側當成回傳或要執行的行為；例如 `x -> x * 2` 就是「接收一個 x，回傳 x 的兩倍」。

```java
Function<Integer, Integer> doubleValue = x -> x * 2;
int result = doubleValue.apply(21); // 42
```

這裡的 `x` 不需要明寫 `Integer`，因為變數宣告的 target type `Function<Integer, Integer>` 已經告訴 compiler：Lambda 接收 `Integer` 並回傳 `Integer`。因此 Lambda 不能脫離 target type 單獨存在；它必須被賦值給 functional interface，或傳入需要該介面的 method。

```java
List<String> ids = new ArrayList<>(List.of("stone", "diamond", "dirt"));
ids.removeIf(id -> id.startsWith("d"));
ids.forEach(id -> System.out.println("id=" + id));
```

當 Lambda 只是把參數轉交給既有 method 時，可以改寫成 **Method Reference｜方法參照**。`id -> id.toLowerCase()` 可寫成 `String::toLowerCase`，`id -> System.out.println(id)` 可寫成 `System.out::println`；兩者都仍然需要 functional interface 的 target type。

```java
Function<String, String> normalize = String::toLowerCase;
Consumer<String> print = System.out::println;
```

Lambda 應該保持短小、沒有令人意外的副作用。若邏輯超過幾行或需要命名，請改成 method 或 class；這對 event handler 與 Minecraft tick callback 尤其重要。

## Functional Interface｜函式式介面 ⭐⭐

Functional interface 只有一個 abstract method，可以用 Lambda 實作。`Predicate<T>` 回傳 boolean，`Function<T,R>` 將 T 轉成 R，`Consumer<T>` 接受 T 但不回傳值，`Supplier<T>` 不接受參數但產生 T。

```java
Predicate<String> isBlockId = id -> id.contains(":");
Function<String, String> normalize = String::toLowerCase;
Consumer<String> log = System.out::println;

if (isBlockId.test("minecraft:stone")) log.accept(normalize.apply("MINECRAFT:STONE"));
```

設計自己的 callback 時，可以加上 `@FunctionalInterface`，讓 compiler 檢查它確實只有一個 abstract method。

```java
@FunctionalInterface
interface OnCalibration {
    void accept(String playerId, int distance);
}
```

## Stream API｜Stream API ⭐⭐

Stream API 已拆成獨立 handbook：`05-modern-java/04-stream-api.md`。請在該篇完整學習 source、intermediate operation、terminal operation、lazy evaluation，以及 `filter`、`map`、`flatMap`、`sorted`、`distinct`、`limit`、`collect`、`toList`、`reduce`、`anyMatch`、`allMatch` 與 `findFirst`。本節只保留閱讀現代 Java 程式碼時需要的總覽。

Stream 用 pipeline 處理資料：`filter` 選擇、`map` 轉換、`sorted` 排序、`limit` 截取、`collect` 或 `toList` 終止。Stream 不等於 collection，也不會自動把資料保存回原集合。

```java
List<String> rareBlocks = List.of("stone", "diamond", "ancient_debris");
List<String> displayNames = rareBlocks.stream()
    .filter(id -> !id.equals("stone"))
    .map(String::toUpperCase)
    .sorted()
    .toList();
```

Stream pipeline 盡量保持無副作用，不要在 `map` 裡修改外部的 `ArrayList`。Minecraft server tick 上的 stream 也不能取代對效能與配置的思考；對大型世界資料，先確認 API 的生命週期與成本。

## Optional｜Optional

`Optional<T>` 表達「可能有值，也可能沒有值」，適合作為回傳型別，避免呼叫端忘記處理空值；不建議把 Optional 當成每個 field 或 method parameter。

```java
Optional<String> selected = Optional.ofNullable(findSelectedId());
String id = selected.filter(value -> !value.isBlank()).orElse("minecraft:stone");
```

不要直接呼叫 `get()` 期待一定有值；使用 `orElse`、`orElseGet`、`orElseThrow` 或 `ifPresent`。Minecraft API 若本身回傳 nullable 或使用特定 result type，請遵循該 API 契約，不要為了套 Optional 而包裝所有資料。

## Enum｜列舉 ⭐⭐⭐

Enum 是一組受限制的命名常數，每個 enum value 都是該 enum type 的 instance。它比 `String` 或 magic number 更能表達合法狀態；可有 field、constructor、method，也能實作 interface。

```java
enum CalibrationMode {
    SAFE(4), FAST(16);

    private final int range;

    CalibrationMode(int range) {
        this.range = range;
    }

    public int range() {
        return range;
    }
}
```

比較 enum 使用 `==` 是安全且慣用的；需要從外部文字解析時，使用明確的 parser 並處理非法輸入。不要依賴 `ordinal()` 當永久儲存格式，因為重新排序 enum constants 會改變數字。

Minecraft 的 block properties、方向、互動模式、render layer 與設定狀態常能用 enum 表達，但要依實際 loader API 的 enum 或 registry contract，不要自行複製一套可能失真的常數。

## Record｜Record

Record 適合表達主要目的是保存不可變資料的 value object。compiler 會提供 canonical constructor、accessor、`equals`、`hashCode` 與 `toString`。

```java
public record BlockCount(String id, int count) {
    public BlockCount {
        if (count < 0) throw new IllegalArgumentException("count cannot be negative");
    }
}

BlockCount count = new BlockCount("minecraft:stone", 12);
System.out.println(count.id());
```

Record 的 component reference 是 final，但如果 component 指向 mutable list，record 不會自動做 deep copy。需要真正不可變時，請在 compact constructor 建立 defensive copy。Record 很適合 payload DTO、設定快照與測試資料，但不一定適合需要複雜生命週期或 mutable entity state 的 class。

## Pattern Matching｜模式匹配

Pattern matching 讓型別檢查與變數綁定靠近，減少重複 cast。現代 Java 也提供對 `switch` 的 pattern matching，但要依專案的 JDK 與 compiler release 確認可用版本。

```java
Object value = getValue();
if (value instanceof String text && !text.isBlank()) {
    System.out.println(text.trim());
}
```

模式條件要保持可讀；不要把複雜的遊戲狀態判斷堆在一個 switch expression。使用 preview feature 前，先確認 Gradle toolchain、CI 與目標玩家的 Java runtime。

## Annotation｜註解 ⭐⭐⭐

Annotation 是附加在 class、field、method 或 parameter 上的 metadata。它本身不一定會執行行為，真正如何處理取決於 compiler、annotation processor、reflection 或 framework。

```java
@FunctionalInterface
interface BlockPredicate {
    boolean matches(String blockId);
}

@Override
public String toString() {
    return "calibration";
}
```

常見標準註解包含 `@Override`、`@Deprecated`、`@SuppressWarnings` 與 `@FunctionalInterface`。Minecraft loader 也會使用 annotation 掃描 event subscriber、mod metadata 或 runtime contract；看到 `@Mod`、`@SubscribeEvent`、`@Environment`、`@EventBusSubscriber` 時，先查該 loader 的文件，不要把不同平台 annotation 混用。

## Reflection｜反射 ⭐⭐⭐

Reflection 讓程式在 runtime 取得 class、field、method 與 constructor 的資訊，或呼叫它們。它適合 tooling、框架、診斷與動態整合，但通常比直接呼叫更難被 compiler 檢查，也可能遇到 module access、mapping、效能與安全問題。

```java
Class<?> type = BlockCount.class;
System.out.println(type.getSimpleName());
Arrays.stream(type.getDeclaredMethods())
    .map(Method::getName)
    .forEach(System.out::println);
```

Minecraft mod 的 mapping、obfuscation 與 loader 生命週期使 reflection 更需要謹慎。若官方 API 有 typed method、event 或 registry，優先使用官方 contract；不要用 reflection 繞過 access restriction 或硬編碼未承諾的內部名稱。

## Serialization｜序列化 ⭐⭐

Serialization 是把物件狀態轉換成可保存或傳送的格式，再還原成資料。對 Minecraft 來說，常見形式包括 NBT／Codec、payload buffer、JSON、設定檔與資料生成輸出；不要把 Java 原生 `ObjectOutputStream` 當成跨版本遊戲資料格式。

```java
record PlayerSetting(String mode, int range) {}

String jsonLike = "{mode=SAFE, range=4}"; // 示意：實務請使用專案指定 codec/serializer
PlayerSetting setting = new PlayerSetting("SAFE", 4);
```

序列化格式要有版本策略、輸入驗證與錯誤處理。網路 payload 絕不能信任 client 傳入的數值、座標或權限欄位；在 server 端重新驗證。Fabric 與 NeoForge 的 payload／codec API 不同，請使用對應 handbook 的實作。

## Dependency Injection｜依賴注入 ⭐⭐

Dependency Injection（DI）把協作者從 class 外部傳入，而不是在 class 內到處 `new`。最簡單的是 constructor injection：依賴在建立時明確、可測試、不可遺漏。

```java
final class CalibrationService {
    private final RangePolicy rangePolicy;
    private final CalibrationLogger logger;

    CalibrationService(RangePolicy rangePolicy, CalibrationLogger logger) {
        this.rangePolicy = rangePolicy;
        this.logger = logger;
    }
}
```

Minecraft mod 通常不需要為了 DI 硬塞完整 enterprise container；但 registry、event handler、service、data provider 之間仍可用 constructor injection 與 composition 降低耦合。不要把 `static` global singleton 當成 DI 的替代品。

## Concurrency｜並行／併發 ⭐⭐⭐

Concurrency 是多個工作在時間上交錯進行；parallelism 則是同時使用多核心。`Thread`、`ExecutorService`、`CompletableFuture`、locks、atomic types 與 concurrent collections 都是工具，但必須先定義資料的 owner 與 thread boundary。

```java
ExecutorService worker = Executors.newFixedThreadPool(2);
CompletableFuture<String> task = CompletableFuture.supplyAsync(() -> loadFromDisk(), worker);

task.thenAccept(result -> System.out.println("loaded=" + result))
    .whenComplete((ignored, error) -> worker.shutdown());
```

Minecraft 的主 world、entity、registry 與大部分遊戲狀態不能任意從背景 thread 修改。可以在背景 thread 做 I/O 或純計算，再把結果安全排回 server／client thread；不要把 `HashMap` 當成跨 thread 安全容器。需要共享資料時，選擇 immutable snapshot、message passing、`ConcurrentHashMap` 或明確 lock，並測試 race condition。

## Minecraft 閱讀順序

```text
Generics
  ↓
Functional Interface + Lambda
  ↓
Enum + Record
  ↓
Annotation
  ↓
Registry / Event / Payload callback
  ↓
Serialization 與 server validation
  ↓
Concurrency 與 client/server thread boundary
  ↓
Reflection（只在真的需要時）
```

## 常見錯誤

1. 把 `List<Object>` 當成 `List<String>`；泛型具有不變性，應使用 wildcard 或重新建立集合。
2. 在 Stream `map` 裡修改外部 mutable state，造成難測試的副作用。
3. 用 enum `ordinal()` 當永久資料格式；請使用穩定的明確 id。
4. 看到 annotation 就以為一定會執行；要確認由誰讀取它。
5. 用 reflection 存取 Minecraft 內部實作，卻沒有考慮 mapping、loader 與版本更新。
6. 從背景 thread 直接修改 Minecraft world 或 entity；先確認主 thread 邊界。
7. 把 Java serialization 當作網路協定；payload 應使用 loader／遊戲指定 codec 與驗證。

## 練習

建立 `ModernJavaPractice.java`：用 generic `RegistryEntry<T>` 保存 id 與 value，用 enum 表達 `CalibrationMode`，用 record 保存結果，使用 `Predicate` 與 `Comparator` 過濾排序，最後將純計算放入 `CompletableFuture`。把結果交回一個模擬的 `serverExecutor`，練習區分背景工作與遊戲狀態修改。

## 複習速查

- Generics 將錯誤提前到 compile time；Lambda 是 functional interface 的一種實作方式。
- Stream 是資料處理 pipeline；Optional 表達可能沒有值；Record 適合 value object。
- Enum 表達有限狀態；Annotation 提供 metadata；Reflection 只應在 typed API 不足時使用。
- Serialization 要有版本、驗證與 loader 邊界；Concurrency 要先定義 thread owner。
- Minecraft 最常直接用到的現代 Java 主題是 Generics、Enum、Annotation、Lambda、Serialization 與 Concurrency。

## References

[1]: https://dev.java/learn/ "Learn Java — Dev.java"
[2]: https://dev.java/learn/generics/ "Generics — Dev.java"
[3]: https://dev.java/learn/lambda-expressions/ "Lambda Expressions — Dev.java"
[4]: https://dev.java/learn/annotations/ "Annotations — Dev.java"
[5]: https://dev.java/learn/reflection/ "Reflection — Dev.java"
