---
title: S 級 Stream API：串流、Pipeline 與資料處理
titleEn: Stream API
topic: Stream API
terms: Stream API, stream(), filter(), map(), flatMap(), sorted(), distinct(), limit(), collect(), toList(), reduce(), anyMatch(), allMatch(), findFirst(), intermediate operation, terminal operation, lazy evaluation, pipeline, Collector
slug: java-stream-api
category: Java 現代語法
order: 74
level: 中階到進階
tags: S 級, Stream API, Lambda, Functional Interface, Collections, List, Map, Fabric, NeoForge, Minecraft Java
aliases: Stream API, Java Stream, 串流 API, stream(), filter(), map(), flatMap(), reduce()
summary: 獨立拆解 Java Stream API 的 pipeline、intermediate operations 與 terminal operations，涵蓋 filter、map、flatMap、sorted、distinct、limit、collect、toList、reduce、anyMatch、allMatch、findFirst，並以 Minecraft Java 資料處理為練習場景。 ⭐⭐
---

# S 級 Stream API：串流、Pipeline 與資料處理

> **核心目標：** 看懂 `players.stream().filter(...).map(...).toList()` 不是魔法，而是一條由資料來源、惰性中介操作與終端操作組成的 **stream pipeline**。

Stream API 是 Java 用來描述記憶體中資料處理流程的 API。官方教學以 **map／filter／reduce** 作為主軸，並將 intermediate operations、terminal operations、collector 與 parallel streams 分開說明。[1] Stream 不是另一種會自動儲存資料的 Collection；它更像是對資料來源提出的一次查詢，描述資料應如何被篩選、轉換、合併與產出結果。[2]

本篇將 Stream API 從「能看懂」推進到「能安全寫出來」。你會學到每一個常遇到的操作，以及它們在 Minecraft 的玩家、方塊、registry、事件資料與 payload 前處理中如何使用。Stream 是 Java 共通 API；但 Fabric、NeoForge、Paper 的資料型別與生命週期不同，本文只使用 loader-neutral 的 Java 範例，實際呼叫仍要以對應平台文件為準。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| 看懂 pipeline | 分辨 source、intermediate operation 與 terminal operation |
| 讀懂 Lambda | 看懂 `filter(Player::isOnline)` 與 `map(Player::getName)` 的輸入輸出型別 |
| 選擇操作 | 知道何時使用 `filter`、`map`、`flatMap`、`reduce` 或 `collect` |
| 處理結果 | 理解 `toList()`、`collect(...)`、`Optional`、`boolean` 與單一值的回傳形式 |
| 避免陷阱 | 避免重複使用 Stream、在 pipeline 中修改來源、誤用 `parallelStream()` 或堆疊昂貴排序 |
| 套用 Minecraft | 能把玩家、物品、位置或 registry 資料轉成查詢結果，同時尊重 server thread 邊界 |

## 1. Stream 是什麼？

### Collection 與 Stream 的差別

`List`、`Set` 與 `Map` 主要負責保存及管理資料；Stream 不負責保存資料，而是把元素從 source 經過一連串計算操作，最後產生結果或副作用。官方 API 將 Stream 定義為支援 sequential 與 parallel aggregate operations 的元素序列；一條 pipeline 由 source、零個以上的 intermediate operations，以及一個 terminal operation 組成。[2]

| 概念 | Collection | Stream |
|---|---|---|
| 主要責任 | 保存、存取與管理元素 | 描述對元素執行的計算流程 |
| 是否儲存資料 | 是 | 否，元素來自 source |
| 是否能直接重複走訪 | 通常可以 | 同一個 Stream 通常只能消費一次 |
| 常見操作 | `add`、`get`、`remove` | `filter`、`map`、`collect`、`reduce` |
| 典型思考方式 | 「我要把哪些元素放在哪裡？」 | 「我要如何把這批元素轉成結果？」 |

### 最常見的 pipeline

以下範例是本篇的核心模型。`players` 是一個 `Collection<Player>`，先建立 Stream，再留下線上玩家，接著取出名稱，最後收集成一個 `List<String>`。

```java
List<String> names = players.stream()
        .filter(Player::isOnline)
        .map(Player::getName)
        .toList();
```

逐段讀法如下：

1. `players.stream()`：從 `players` 建立一個通常為 sequential 的 Stream。
2. `filter(Player::isOnline)`：只保留 `isOnline()` 回傳 `true` 的玩家。
3. `map(Player::getName)`：把每個 `Player` 轉成一個 `String` 名稱。
4. `toList()`：啟動 pipeline，將結果收集成 `List<String>`。

這裡的 `Player::isOnline` 與 `Player::getName` 是 **Method Reference**。它們也可以寫成 Lambda：

```java
List<String> names = players.stream()
        .filter(player -> player.isOnline())
        .map(player -> player.getName())
        .toList();
```

兩種寫法的型別契約相同。若你正在學習或除錯，先改寫成 Lambda 觀察輸入與輸出；熟悉後再使用 Method Reference 讓程式更簡潔。

## 2. Pipeline 的三個階段

### Source：資料來源

Stream 可以由 Collection、陣列、`Stream.of(...)`、`Files.lines(...)` 或其他 API 建立。最常見的是 Collection 的 `stream()`：

```java
List<String> ids = List.of("minecraft:stone", "minecraft:dirt");

Stream<String> fromList = ids.stream();
Stream<String> fromValues = Stream.of("stone", "dirt");
Stream<String> fromArray = Arrays.stream(new String[]{"stone", "dirt"});
```

`stream()` 通常建立 sequential stream；`parallelStream()` 建立 parallel stream，但這不代表它一定更快，也不代表它適合 Minecraft world 或 entity 資料。是否使用平行處理必須另外評估，本文後面會說明。

### Intermediate Operation：中介操作

中介操作會回傳另一個 Stream，因此可以繼續串接。`filter`、`map`、`flatMap`、`sorted`、`distinct` 與 `limit` 都屬於常見中介操作。它們通常是 **lazy**：呼叫 `filter(...)` 當下不會立刻走訪所有資料，真正的計算通常等到 terminal operation 開始才發生。[2]

### Terminal Operation：終端操作

終端操作會結束 pipeline，產生值、集合、`Optional`、`boolean` 或副作用。`toList()`、`collect(...)`、`reduce(...)`、`anyMatch(...)`、`allMatch(...)` 與 `findFirst()` 都是終端操作。終端操作完成後，該 Stream 已被消費，不能再拿來建立第二個結果。

```java
Stream<String> ids = List.of("stone", "dirt").stream();
long count = ids.count();

// 錯誤：同一個 Stream 已在 count() 後被消費
// List<String> copy = ids.toList();
```

若需要兩次結果，回到原始 Collection 再建立兩個 Stream，或一次 pipeline 產出所需的資料：

```java
List<String> ids = List.of("stone", "dirt");
long count = ids.stream().count();
List<String> copy = ids.stream().toList();
```

### 操作速查表

| 操作 | 類型 | 作用 | 常見回傳 |
|---|---|---|---|
| `stream()` | 建立 source | 從 Collection 建立 Stream | `Stream<T>` |
| `filter()` | intermediate | 保留符合條件的元素 | `Stream<T>` |
| `map()` | intermediate | 一對一轉換型別或值 | `Stream<R>` |
| `flatMap()` | intermediate | 一對多後攤平成單層 Stream | `Stream<R>` |
| `sorted()` | intermediate | 依自然順序或 Comparator 排序 | `Stream<T>` |
| `distinct()` | intermediate | 依 `equals()` 去除重複 | `Stream<T>` |
| `limit()` | intermediate、short-circuiting | 只保留前 N 個元素 | `Stream<T>` |
| `collect()` | terminal | 以 `Collector` 做 mutable reduction | `R` |
| `toList()` | terminal | 收集成 List | `List<T>` |
| `reduce()` | terminal | 將多個元素合併成一個結果 | `T` 或 `Optional<T>` |
| `anyMatch()` | terminal、short-circuiting | 是否至少一個符合 | `boolean` |
| `allMatch()` | terminal、short-circuiting | 是否全部符合 | `boolean` |
| `findFirst()` | terminal、short-circuiting | 取得 encounter order 的第一個元素 | `Optional<T>` |

## 3. `filter()`：留下符合條件的元素

`filter(Predicate)` 不會改動來源 Collection，而是建立一條只包含符合條件元素的 Stream。Predicate 的結果是 `boolean`，所以最適合表達「留下誰」的規則。

```java
List<Integer> ranges = List.of(2, 4, 7, 12, 16);

List<Integer> longRanges = ranges.stream()
        .filter(range -> range >= 8)
        .toList();

// [12, 16]
```

Minecraft 中常見的判斷可能是「只取已載入」、「只取線上」、「只取距離在範圍內」或「只取具有某個 tag 的物品」。判斷本身應保持純粹，不要在 `filter` 裡順便修改 world、發送訊息或移除來源清單。

```java
List<Player> nearbyOnline = players.stream()
        .filter(Player::isOnline)
        .filter(player -> player.distanceTo(origin) <= 32.0)
        .toList();
```

多個 `filter` 可以串接。是否合併成一個大型條件，取決於可讀性；通常將有名字的規則拆開，較容易測試與除錯。

## 4. `map()`：一對一轉換

`map(Function)` 對每一個元素執行一次轉換，輸入有 N 個元素時，通常仍產生 N 個元素，但元素型別可以改變。它適合「玩家轉名稱」、「物品轉 id」、「座標轉區塊 key」這種一對一關係。

```java
List<String> names = players.stream()
        .map(Player::getName)
        .toList();
```

`map` 的 Lambda 必須回傳新的值；若只想留下或排除元素，使用 `filter`，不要把 `map` 寫成回傳 `null` 來模擬過濾。

```java
List<String> normalizedIds = rawIds.stream()
        .map(String::trim)
        .map(String::toLowerCase)
        .toList();
```

若轉換後可能是 `null`，要先決定資料契約。可以在 map 前後處理 null，也可以用 `Stream.ofNullable(...)` 搭配 `flatMap`；不要讓下游操作在不知情的情況下呼叫 nullable value 的 method。

### Primitive stream 的補充

若目標是數值統計，可以考慮 `mapToInt`、`mapToLong` 或 `mapToDouble`，避免把每個 primitive 自動 boxing 成 wrapper：

```java
int totalHealth = players.stream()
        .mapToInt(Player::getHealth)
        .sum();
```

這不是所有情況都必須做的最佳化；先讓 pipeline 正確、可讀，再根據 profiler 或實際資料量調整。

## 5. `flatMap()`：把巢狀資料攤平

`map` 是一對一；如果每個元素本身又包含一組元素，直接使用 `map` 會得到巢狀 Stream 或巢狀 Collection。`flatMap` 會先把每個元素轉成一個 Stream，再把所有內層 Stream 合併成一條單層 Stream。[2]

```java
record PlayerProfile(String name, List<String> permissions) {}

List<PlayerProfile> profiles = List.of(
        new PlayerProfile("Alex", List.of("build", "trade")),
        new PlayerProfile("Sam", List.of("trade", "teleport"))
);

List<String> permissions = profiles.stream()
        .flatMap(profile -> profile.permissions().stream())
        .distinct()
        .sorted()
        .toList();

// [build, teleport, trade]
```

用表格看差別會更清楚：

| 寫法 | 結果形狀 |
|---|---|
| `profiles.map(PlayerProfile::permissions)` | `Stream<List<String>>`，仍然是巢狀資料 |
| `profiles.flatMap(profile -> profile.permissions().stream())` | `Stream<String>`，已攤平成單層資料 |

Minecraft 中的巢狀資料可能是「多名玩家的權限」、「多個 container 的物品」、「多個區塊的 block positions」或「多個 registry entry 的 aliases」。當需求是把每一層的子元素全部放進同一條查詢流程，通常就要考慮 `flatMap`。

```java
List<String> allItemIds = containers.stream()
        .flatMap(container -> container.itemIds().stream())
        .filter(id -> !id.isBlank())
        .distinct()
        .toList();
```

不要把 `flatMap` 當成「自動處理所有 null」的保證。若 `permissions()` 可能為 null，應先建立清楚的資料契約，例如使用空 List 表示沒有權限，或明確使用 `Stream.ofNullable(...)`。

## 6. `sorted()`：排序資料

無參數的 `sorted()` 使用元素的 natural order，因此元素必須實作適合的 `Comparable`。需要自訂排序時傳入 `Comparator` 或 method reference：

```java
List<String> sortedNames = players.stream()
        .map(Player::getName)
        .sorted()
        .toList();

List<Player> byHealth = players.stream()
        .sorted(Comparator.comparingInt(Player::getHealth).reversed())
        .toList();
```

`sorted()` 是 stateful intermediate operation。它通常需要先看過一批甚至全部輸入，才能決定第一個輸出；因此它比單純的 `filter` 或 `map` 更可能需要暫存資料與額外成本。[3]

若只需要最高分的一個玩家，不一定要先 `sorted().findFirst()`。可以使用 `max(Comparator)`，讓意圖更清楚，也避免完整排序：

```java
Optional<Player> strongest = players.stream()
        .max(Comparator.comparingInt(Player::getHealth));
```

排序前先 `filter` 通常更合理，因為不必替不可能入選的資料排序：

```java
List<String> topNames = players.stream()
        .filter(Player::isOnline)
        .sorted(Comparator.comparingInt(Player::getScore).reversed())
        .map(Player::getName)
        .limit(10)
        .toList();
```

## 7. `distinct()`：依 `equals()` 去除重複

`distinct()` 會依元素的 `equals()` 判斷重複；對一般物件而言，`hashCode()` 也應與 `equals()` 保持一致。若你使用自訂 class 卻沒有正確定義 value equality，`distinct()` 可能只把不同 instance 視為不同資料。

```java
List<String> uniqueIds = Stream.of(
        "minecraft:stone",
        "minecraft:dirt",
        "minecraft:stone"
).distinct().toList();

// [minecraft:stone, minecraft:dirt]
```

需要依某個欄位去重時，不能直接期待 `distinct()` 會知道你的業務 key。可以先把物件 `map` 成穩定 id，或在更複雜的情況使用明確的 `toMap`／收集策略：

```java
List<String> uniquePlayerNames = players.stream()
        .map(Player::getName)
        .distinct()
        .toList();
```

`distinct()` 也是 stateful 操作。大型資料、parallel stream 與 encounter order 交疊時，成本可能比表面上高；若資料來源本身已保證唯一，就不要無條件加上 `distinct()`。

## 8. `limit()`：限制前 N 個元素

`limit(long)` 是 short-circuiting intermediate operation，將 Stream 截短成最多 N 個元素。它很適合做排行榜預覽、候選清單上限、搜尋結果分頁的第一步。

```java
List<String> firstFive = players.stream()
        .map(Player::getName)
        .limit(5)
        .toList();
```

`limit()` 的「前」取決於 stream 的 encounter order。`List` 通常有穩定順序；`HashSet` 不應被當成有業務順序的資料來源。若需求是「分數最高的前五名」，必須先排序再 limit：

```java
List<Player> topFive = players.stream()
        .sorted(Comparator.comparingInt(Player::getScore).reversed())
        .limit(5)
        .toList();
```

若 pipeline 的 source 可能是無限 Stream，`limit()` 可以讓有限結果完成；但只有 `limit()` 並不代表所有 pipeline 都安全，仍要確認前面的 generator 與操作沒有無限等待。

## 9. `collect()`：使用 Collector 收集或分組

`collect(Collector)` 是一種 mutable reduction。它通常將 Stream 元素累積到 List、Set、Map，或依條件分組、分割、計數。`Collectors` 提供許多常用 Collector。[4]

```java
List<String> names = players.stream()
        .filter(Player::isOnline)
        .map(Player::getName)
        .collect(Collectors.toList());
```

`collect` 不只可以建立 List，也可以建立分組結果：

```java
Map<Boolean, List<Player>> byOnlineState = players.stream()
        .collect(Collectors.partitioningBy(Player::isOnline));

Map<String, Long> playersByTeam = players.stream()
        .collect(Collectors.groupingBy(
                Player::getTeam,
                Collectors.counting()
        ));
```

`groupingBy` 與 `toMap` 都要先想清楚 key 是否唯一。若 key 可能重複，`toMap` 必須提供 merge function，否則遇到重複 key 會丟出例外：

```java
Map<String, Player> byName = players.stream()
        .collect(Collectors.toMap(
                Player::getName,
                Function.identity(),
                (first, second) -> first
        ));
```

`collect` 適合「累積成容器」；若你要的是數學上把元素合併成單一值，優先考慮 `reduce` 或 primitive stream 的 `sum`、`max`、`average`。

## 10. `toList()`：直接取得 List

`toList()` 是閱讀性很高的終端操作，適合「我要把這條 pipeline 的結果變成 List」的情況：

```java
List<String> onlineNames = players.stream()
        .filter(Player::isOnline)
        .map(Player::getName)
        .toList();
```

在現代 Java 中，`Stream.toList()` 回傳的 List 不應被當成可修改的 `ArrayList`；若你需要後續 `add` 或 `remove`，請明確建立可修改 List：

```java
List<String> mutableNames = players.stream()
        .map(Player::getName)
        .collect(Collectors.toCollection(ArrayList::new));
mutableNames.add("Console");
```

對需要支援較舊 Java release 的專案，常會看到 `collect(Collectors.toList())`。它與 `Stream.toList()` 不應被視為完全相同的 API：前者使用 Collector，後者是 Stream 的直接終端操作；實際可用版本要看專案的 JDK 與 build toolchain。

## 11. `reduce()`：把多個元素合併成一個

`reduce()` 將多個元素反覆套用 accumulator，得到一個 summary result。最容易理解的例子是加總：

```java
int totalScore = players.stream()
        .map(Player::getScore)
        .reduce(0, Integer::sum);
```

也可以直接使用 primitive stream：

```java
int totalScore = players.stream()
        .mapToInt(Player::getScore)
        .sum();
```

`reduce(identity, accumulator)` 的 identity 必須是正確的起始值。加法的 identity 是 `0`，乘法是 `1`；不能隨意放一個會改變結果的值。

沒有 identity 的 overload 會回傳 `Optional<T>`，因為空 Stream 沒有可回傳的元素：

```java
Optional<Integer> greatest = List.of(4, 9, 2).stream()
        .reduce(Integer::max);
```

### `reduce` 的 accumulator 必須適合合併

若要支援 parallel execution，accumulator／combiner 應該具備 associative 特性，而且不能依賴會變動的外部狀態。字串串接雖然看似簡單，但大型資料可考慮 `Collectors.joining()`；把 mutable `ArrayList` 當成 reduce 的 accumulator 通常是錯誤方向。

```java
String joined = names.stream()
        .collect(Collectors.joining(", "));
```

`reduce` 與 `collect` 的差異如下：

| 問題 | `reduce()` | `collect()` |
|---|---|---|
| 主要意圖 | 合併成單一 summary value | 累積到 mutable result container |
| 常見結果 | 總和、最大值、最小值、Optional | List、Set、Map、分組、字串 joining |
| 典型函式 | `Integer::sum`、`Integer::max` | `Collectors.toList()`、`groupingBy()` |
| 常見錯誤 | identity 不正確、accumulator 有副作用 | key 重複、Collector 選錯或修改共享容器 |

## 12. `anyMatch()`、`allMatch()` 與 `findFirst()`

這三個操作都能提早結束 pipeline，因此屬於常用的 short-circuiting terminal operations。[2]

### `anyMatch()`：至少一個符合

`anyMatch` 只要找到一個符合 Predicate 的元素，就能回傳 `true`：

```java
boolean hasOperator = players.stream()
        .anyMatch(Player::isOperator);
```

適合回答「有沒有任何一名玩家在線上？」、「是否存在一個符合條件的 registry entry？」這種 yes／no 問題。不要為了得到 boolean 先 `filter(...).toList().isEmpty()`，那會建立不必要的集合。

### `allMatch()`：全部符合

`allMatch` 要求所有元素都符合條件：

```java
boolean allHealthy = players.stream()
        .allMatch(player -> player.getHealth() > 0);
```

空 Stream 的 `allMatch` 會回傳 `true`，這是邏輯上的 vacuous truth；如果「沒有玩家」不應被視為通過，請先檢查來源是否為空，或使用同時表達業務規則的流程。

### `findFirst()`：取得第一個符合者

`findFirst()` 回傳 `Optional<T>`，在有 encounter order 的 source 上代表第一個元素：

```java
Optional<Player> firstOnline = players.stream()
        .filter(Player::isOnline)
        .findFirst();

firstOnline.ifPresent(player -> announce(player.getName()));
```

不要直接呼叫 `get()` 假設一定有結果；使用 `ifPresent`、`orElse`、`orElseThrow` 或其他明確策略。若只需要任意一個元素而不在意順序，`findAny()` 可能更符合意圖，但本文聚焦於 `findFirst()`。

## 13. 把操作組合成可讀的 pipeline

### 先篩選，再轉換，再排序，最後限制與收集

一條 pipeline 的順序會影響可讀性與成本。通常可以先排除不可能入選的元素，再做型別轉換，最後排序、限制與產出結果：

```java
List<String> visibleNames = players.stream()
        .filter(Player::isOnline)
        .filter(player -> player.distanceTo(origin) <= 64.0)
        .map(Player::getName)
        .map(String::trim)
        .filter(name -> !name.isBlank())
        .distinct()
        .sorted()
        .limit(20)
        .toList();
```

這不是絕對規則。若 `map` 的結果才能讓 filter 判斷，就必須先 map；若要依玩家分數排序，就應在仍持有 `Player` 時排序，再 map 成名稱。重點是讓每一步都表達單一意圖，而不是把整段邏輯塞入一個巨大 Lambda。

### 將 pipeline 拆成命名規則

當條件開始變長，可以把規則命名成 Predicate、Function 或 method：

```java
Predicate<Player> nearby = player -> player.distanceTo(origin) <= 32.0;
Function<Player, String> displayName = Player::getName;

List<String> result = players.stream()
        .filter(Player::isOnline)
        .filter(nearby)
        .map(displayName)
        .toList();
```

命名規則讓 unit test 更容易寫，也能降低 Minecraft event handler 中的巢狀判斷。若 pipeline 仍然難以理解，改用一般 `for` loop 並不算失敗；可讀性與正確的 thread／生命週期處理優先於追求鏈式語法。

## 14. Minecraft Java 實戰對照

### Loader-neutral 玩家查詢

以下 `Player` 是教學用介面，目的是展示 Java Stream 的資料流，不是 Fabric、NeoForge 或 Paper 的共同 API。實際專案要把 `Player`、`getName()`、`isOnline()`、`distanceTo()` 等部分替換成目前 loader 的正式型別。

```java
List<String> onlineNames = players.stream()
        .filter(Player::isOnline)
        .map(Player::getName)
        .sorted()
        .toList();
```

這段程式可以對照成：

| Stream 步驟 | Minecraft 開發中的思考 |
|---|---|
| `stream()` | 從目前已取得的玩家或 entry snapshot 開始查詢 |
| `filter(...)` | 篩選線上、在範圍內、具權限或符合狀態者 |
| `map(...)` | 取名稱、id、位置、registry key 或 payload 欄位 |
| `sorted(...)` | 建立顯示順序或排行榜順序 |
| `distinct()` | 去除重複 id 或重複權限 |
| `limit(...)` | 限制訊息、排行榜或候選結果數量 |
| `toList()`／`collect(...)` | 產生後續 UI、訊息、資料生成或測試需要的結果 |

### 事件 callback 的安全邊界

Stream 本身不會替你處理 server／client thread。若 callback 在 server thread 中執行，就應在該 thread 內安全讀取需要的遊戲狀態；不要因為使用 Stream 就把 world、entity 或 registry 查詢任意丟到背景 thread。

```java
// 示意：在正確的 server callback 中先取得穩定 snapshot
List<Player> snapshot = new ArrayList<>(serverPlayers);

List<String> names = snapshot.stream()
        .filter(Player::isOnline)
        .map(Player::getName)
        .toList();
```

`new ArrayList<>(serverPlayers)` 只示意「先固定本次查詢要看的資料」。它不是所有 loader 或所有 callback 都必須採用的做法；真正要依 API 的 thread contract、可變性與生命週期判斷。不要在 pipeline 中一邊走訪 live collection，一邊從同一來源加入或刪除元素。

### Fabric、NeoForge、Paper 不要混用

Stream API 是 Java standard library，因此 `filter`、`map`、`flatMap` 與 `toList` 的語法可以共通；但下列內容不共通：

| 層級 | 共通或不同 | 實作注意事項 |
|---|---|---|
| `java.util.stream` | 共通 | 依專案 JDK 版本使用 `toList()` 或 `collect(...)` |
| 玩家／世界／方塊型別 | 不同 | 使用 Fabric、NeoForge 或 Paper 對應 API 的正式型別 |
| event registration | 不同 | 不要把某 loader 的 event bus、callback 或 listener 當成另一個 loader 的 API |
| thread contract | 依 API 不同 | 先確認 server／client／async 邊界，再決定是否能執行查詢 |
| mapping 與生命週期 | 不同 | Stream 只處理你已取得的資料，不會解決 mapping 或 loader 初始化順序 |

## 15. 效能、惰性與副作用

### Lazy 不等於免費

Intermediate operations 通常是 lazy，且某些 pipeline 可以在一趟走訪中融合處理；但 `sorted()`、`distinct()` 等 stateful 操作可能需要額外狀態。`collect()` 也可能配置新的容器。Stream 讓資料處理更能表達意圖，並不保證比手寫 `for` loop 更快。[3]

### Behavioral parameter 應該 non-interfering、盡量 stateless

傳給 `filter`、`map`、`sorted` 的 Lambda 或 Method Reference 應避免修改 Stream source，也不應依賴會在 pipeline 期間變動的外部狀態。官方文件將這類限制稱為 non-interference 與 statelessness。[2]

```java
// 不建議：在 pipeline 中修改共享結果容器
List<String> result = new ArrayList<>();
players.stream()
        .filter(Player::isOnline)
        .forEach(player -> result.add(player.getName()));

// 建議：讓 terminal operation 負責收集
List<String> result = players.stream()
        .filter(Player::isOnline)
        .map(Player::getName)
        .toList();
```

`forEach` 並不是不能用，但它比較適合真正需要副作用的終點，例如把訊息送到明確的 output。若需求只是建立 List、Map 或統計結果，使用 `toList`、`collect`、`reduce` 或 primitive stream 通常更能表達意圖。

### `parallelStream()` 不是 Minecraft tick 加速按鈕

Java Stream 可以 sequential 或 parallel 執行，但 parallel stream 會帶來 thread safety、ordering、分割成本與共享狀態問題。Minecraft 的 world、entity、registry 與多數遊戲狀態通常受主 thread 或 loader 生命週期約束；不要在不了解 API contract 時使用 `parallelStream()`。

對大多數 mod 來說，先做以下事情比盲目平行化更重要：限制資料範圍、先 filter、避免重複計算、不要在 tick 中做不必要的全世界掃描、把 I/O 與遊戲狀態讀寫分開，並使用 profiler 找出實際瓶頸。

### Stream 需要關閉嗎？

由 Collection、陣列或 generator 建立的普通 Stream 通常不需要手動 close。若來源是 I/O channel，例如 `Files.lines(path)`，就要使用 try-with-resources 管理它；Stream API 的 resource lifecycle 與資料來源的生命週期有關。[2]

```java
try (Stream<String> lines = Files.lines(path, StandardCharsets.UTF_8)) {
    long matches = lines.filter(line -> line.contains("minecraft:")).count();
}
```

## 16. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 以為 Stream 是 List | Stream 不負責保存資料，且會被消費 | 需要保存時使用 `toList()` 或 `collect(...)` |
| 重複使用同一個 Stream | terminal operation 後 pipeline 已消費 | 從 source 重新呼叫 `stream()` |
| 忘記 terminal operation | 只有 intermediate operations 不會真正啟動計算 | 加上 `toList()`、`collect()`、`reduce()` 或 match operation |
| 用 `map` 代替 `filter` | `map` 是轉換，不是移除元素 | 留下符合者使用 `filter` |
| `map` 產生巢狀集合 | 得到 `Stream<List<T>>`，下游不易處理 | 使用 `flatMap` 攤平 |
| 不理解 `distinct()` | 它依 `equals()` 判斷，不是依你想像的 id | 先 map 成穩定 key，或提供明確 Collector |
| 先 sorted 再 filter | 替最後會被排除的資料付排序成本 | 通常先 filter，再 sorted |
| 用 sorted().findFirst() 找最大值 | 可能完整排序全部資料 | 使用 `max(Comparator)` |
| 把 `toList()` 當成 mutable ArrayList | `Stream.toList()` 的結果不可視為可修改 List | 需要修改時明確 collect 到 `ArrayList` |
| 在 pipeline 修改來源 Collection | 可能造成例外或不可預期結果 | 使用 non-interfering 行為或先建立 snapshot |
| 在 `reduce` 裡累積共享 ArrayList | identity、combiner 與平行合併容易錯 | 用 `collect(...)` 或 immutable reduction |
| 每個 tick 都建立巨大 pipeline | Stream 不會消除掃描與配置成本 | 限制資料範圍、快取穩定結果並 profiler 驗證 |
| 直接使用 `parallelStream()` | 可能違反遊戲 thread contract | 先確認 loader API 與 thread ownership |

## 17. 練習

### 練習一：線上玩家名稱

建立一個 loader-neutral 的 `Player` 教學模型，使用一條 pipeline 取得線上玩家名稱，去除空白名稱、去除重複、依字母排序，最後只保留前 10 名。要求至少使用 `filter`、`map`、`distinct`、`sorted`、`limit` 與 `toList`。

### 練習二：攤平多個 container 的物品

建立 `Container` 與 `itemIds()`，使用 `flatMap` 取得所有 item id，再用 `filter` 排除空字串，使用 `distinct` 得到唯一 id。請比較使用 `map` 與 `flatMap` 時結果型別有什麼不同。

### 練習三：查詢與驗證

使用 `anyMatch` 檢查是否有 operator，使用 `allMatch` 檢查所有玩家的 health 是否大於零，使用 `findFirst` 取得第一個符合條件的玩家。每一個 `Optional` 都必須明確處理空結果，不得直接假設 `get()` 一定成功。

### 練習四：統計與收集

使用 `mapToInt(...).sum()` 或 `reduce` 計算所有玩家 score；再使用 `collect(groupingBy(...))` 依 team 分組。若使用 `toMap`，刻意加入重複 key，觀察為什麼需要 merge function。

### 練習五：Minecraft thread review

以 Fabric 或 NeoForge 的一個實際 event callback 為背景，先查官方 API 的 thread contract，再判斷哪些資料可以在 callback 中用 Stream 讀取、哪些資料不能在背景 thread 存取。請將「Java 共通 Stream 語法」與「loader-specific API」分成兩段說明，禁止把 Fabric、NeoForge、Paper 的類別混在同一個可編譯範例中。

## 18. 複習速查

```text
source
  ↓
stream()
  ↓
filter()       留下元素
  ↓
map()          一對一轉換
  ↓
flatMap()      巢狀資料攤平
  ↓
sorted()       排序
  ↓
distinct()     依 equals() 去重
  ↓
limit()        限制數量
  ↓
terminal operation
  ├─ toList() / collect()  → List、Set、Map 或分組結果
  ├─ reduce()              → 單一 summary value
  ├─ anyMatch()            → 至少一個符合
  ├─ allMatch()            → 全部符合
  └─ findFirst()           → Optional<T>
```

| 我想回答的問題 | 優先考慮 |
|---|---|
| 哪些元素符合條件？ | `filter()` |
| 每個元素要轉成什麼？ | `map()` |
| 每個元素有一組子元素，要合併嗎？ | `flatMap()` |
| 要排序嗎？ | `sorted()` 或 `Comparator` |
| 有重複值嗎？ | `distinct()`，先確認 `equals()` |
| 只要前 N 個嗎？ | `limit()` |
| 要變成 List 嗎？ | `toList()` |
| 要分組、建 Map 或 joining 嗎？ | `collect()` |
| 要合併成總和或單一值嗎？ | `reduce()` 或 primitive stream |
| 至少一個符合嗎？ | `anyMatch()` |
| 全部都符合嗎？ | `allMatch()` |
| 要第一個符合者嗎？ | `findFirst()` + `Optional` |

## References

[1]: https://dev.java/learn/api/streams/ "The Stream API — Dev.java"
[2]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/stream/Stream.html "Interface Stream<T> — Java SE 22 API"
[3]: https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html "Package java.util.stream — Java SE 8 API"
[4]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/stream/Collectors.html "Collectors — Java SE 22 API"
