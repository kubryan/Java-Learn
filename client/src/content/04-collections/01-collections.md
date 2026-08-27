---
title: Java Collections：List、Set、Map 與排序
slug: java-collections
category: Collections
order: 41
level: 中階
tags: Collections, List, ArrayList, Set, HashSet, Map, HashMap, Queue, Deque, Iterator, Comparable, Comparator, Minecraft Java
aliases: Java 集合框架, Collections Framework, ArrayList, HashMap, Comparator
summary: 從 Collection、List、Set、Map 的語意開始，學會選擇 ArrayList、HashSet、HashMap、Queue 與 Deque，並用 Iterator 與 Comparator 管理 Minecraft Java 的資料。 ⭐⭐⭐ Minecraft 必學
---

# Java Collections：List、Set、Map 與排序

Collections Framework 是 Java 用來保存與操作一組物件的共同 API。`List` 強調順序與索引，`Set` 不允許重複元素，`Map` 將 key 對應到 value，`Queue` 與 `Deque` 則表達等待處理的資料結構。Oracle 的集合介面說明也特別提醒：`Map` 是獨立的 key-value 結構，不是 `Collection` 的子介面。[1] 如果要真正理解 `HashSet`／`HashMap` 為什麼能判斷重複與找到 key，請搭配閱讀 OOP 的獨立篇 [`Object Contract｜equals、hashCode 與 toString`](../03-oop/04-object-contract.md)。

## 先選介面，再選實作

```java
List<String> names = new ArrayList<>();
Set<String> dimensions = new HashSet<>();
Map<String, Integer> blockCounts = new HashMap<>();
Queue<String> pending = new ArrayDeque<>();
Deque<String> history = new ArrayDeque<>();
```

左側宣告介面、右側建立具體實作，是最常見也最有彈性的寫法。未來若從 `ArrayList` 換成其他 `List` implementation，使用這個變數的呼叫端不需要全部修改。

| 介面 | 語意 | 常見實作 | Minecraft 情境 |
|---|---|---|---|
| `List<E>` | 有順序、可重複、可用 index | `ArrayList` | drops、配方項目、玩家清單 |
| `Set<E>` | 不允許重複 | `HashSet` | 已處理的 UUID、已載入維度 |
| `Map<K,V>` | key 對應 value、key 不重複 | `HashMap` | `BlockPos` 對狀態、id 對 registry object |
| `Queue<E>` | 等待處理，常見 FIFO | `ArrayDeque` | 待處理工作、事件佇列 |
| `Deque<E>` | 兩端都可加入／移除 | `ArrayDeque` | undo stack、雙端工作佇列 |

## List 與 ArrayList ⭐⭐⭐

`List` 是有順序的 collection，可以容納重複元素，也可以用整數 index 取得元素。`ArrayList` 以可成長陣列實作，適合大量讀取與尾端加入；在中間頻繁插入或刪除時，應重新檢查資料結構選擇。

```java
List<String> materials = new ArrayList<>();
materials.add("iron_ingot");
materials.add("redstone");
materials.add("iron_ingot");

String first = materials.get(0);
materials.set(1, "gold_ingot");
materials.remove("iron_ingot");

for (String material : materials) {
    System.out.println(material);
}
```

使用 `List.of` 可建立不可變 list；不要把它當成可 `add` 的 `ArrayList`。需要修改時請建立新的 `ArrayList<>(List.of(...))`。

## Set 與 HashSet ⭐⭐

`Set` 以唯一性為核心。`HashSet` 依 `hashCode` 與 `equals` 判斷元素是否已存在，不承諾迭代順序。若想深入理解「equals 相等 ⇒ hashCode 必須相等」、hash collision 與 mutable key，請閱讀 [`Object Contract｜equals、hashCode 與 toString`](../03-oop/04-object-contract.md)。若邏輯需要穩定插入順序，請考慮 `LinkedHashSet`；若需要排序，請考慮 `TreeSet` 與明確的 comparator。

```java
Set<UUID> calibratedPlayers = new HashSet<>();

if (calibratedPlayers.add(playerId)) {
    System.out.println("第一次校準");
} else {
    System.out.println("這名玩家已校準");
}
```

放進 `HashSet` 的可變物件不應在加入後改變參與 `equals`／`hashCode` 的欄位，否則可能再也找不到它。Minecraft 常用 immutable id、`UUID` 或 `ResourceLocation` 作為安全 key。

## Map 與 HashMap ⭐⭐⭐

`Map<K,V>` 儲存 key-value mapping，同一個 key 最多對應一個 value。`HashMap` 不保證迭代順序；key 的 equality／hashing 契約與 mutable key 風險請先看 [`Object Contract｜equals、hashCode 與 toString`](../03-oop/04-object-contract.md)。需要 predictable insertion order 時使用 `LinkedHashMap`，需要排序 key 時使用 `TreeMap`。

```java
Map<String, Integer> blockCounts = new HashMap<>();
blockCounts.put("stone", 12);
blockCounts.merge("stone", 3, Integer::sum);
blockCounts.putIfAbsent("dirt", 1);

int stoneCount = blockCounts.getOrDefault("stone", 0);

for (Map.Entry<String, Integer> entry : blockCounts.entrySet()) {
    System.out.println(entry.getKey() + " = " + entry.getValue());
}
```

不要在迭代 `map.keySet()` 時用 `map.put` 改變結構；要用 `entrySet` 讀取 key 與 value。若需要刪除符合條件的項目，可使用 `removeIf` 或 iterator 的 `remove`。

## Queue 與 Deque ⭐⭐

`Queue` 把資料視為等待處理的項目。`offer` 嘗試加入、`poll` 取出並移除、`peek` 查看但不移除；空 queue 使用 `poll`／`peek` 會得到 `null`，比直接使用可能丟例外的 `remove`／`element` 更容易寫出安全流程。

```java
Queue<String> pending = new ArrayDeque<>();
pending.offer("load-config");
pending.offer("register-items");

String next = pending.poll();
if (next != null) {
    System.out.println("處理：" + next);
}
```

`Deque` 可以當 FIFO queue，也可以當 LIFO stack。`addLast`／`removeFirst` 是 queue 方向；`push`／`pop` 是 stack 方向。

```java
Deque<String> undo = new ArrayDeque<>();
undo.push("place_block");
undo.push("break_block");
String lastAction = undo.pop();
```

## Iterator：安全走訪與移除

enhanced `for` 適合只讀走訪；需要在走訪期間移除元素時，使用 `Iterator.remove()`，不要直接對 collection 呼叫 `remove`。

```java
Set<String> loaded = new HashSet<>(Set.of("overworld", "nether", "unused"));
Iterator<String> iterator = loaded.iterator();
while (iterator.hasNext()) {
    String dimension = iterator.next();
    if (dimension.equals("unused")) iterator.remove();
}
```

直接在 enhanced `for` 中修改 collection 可能得到 `ConcurrentModificationException`。如果需要保留原集合不變，也可以用 `stream().filter(...).toList()` 建立新的結果。

## Comparable 與 Comparator ⭐⭐⭐

`Comparable<T>` 定義 class 的 natural ordering，透過 `compareTo` 表示「this 小於、等於或大於另一個值」。`Comparator<T>` 則把排序規則放在 class 外，可為同一個型別建立多種排序。

```java
record BlockScore(String id, int score) implements Comparable<BlockScore> {
    @Override
    public int compareTo(BlockScore other) {
        return Integer.compare(score, other.score);
    }
}

List<BlockScore> scores = new ArrayList<>(List.of(
    new BlockScore("stone", 12),
    new BlockScore("diamond", 99)
));

scores.sort(Comparator.comparingInt(BlockScore::score).reversed());
```

不要直接用 `a.score - b.score` 寫 comparator，整數相減可能溢位；使用 `Integer.compare`、`Comparator.comparing` 或 `Comparator.comparingInt`。若 comparator 與 `equals` 的關係不一致，放入 `TreeSet` 或作為 `TreeMap` key 時要特別小心。

## Minecraft 實戰：registry id 對應狀態

```java
Map<String, Boolean> featureEnabled = new HashMap<>();
featureEnabled.put("calibration_stone", true);
featureEnabled.put("debug_overlay", false);

featureEnabled.forEach((id, enabled) -> {
    if (enabled) System.out.println("啟用：" + id);
});
```

在實際 Fabric 或 NeoForge 程式中，請優先使用 loader 與 Minecraft API 提供的 registry、`ResourceKey`、`Identifier` 或 immutable view。這篇的 JDK collection 範例是為了教資料結構，不代表可以繞過 loader 的註冊生命週期。

## 常見錯誤

1. 把 `HashSet` 當成有固定順序的集合；需要順序時要明確選擇 `LinkedHashSet` 或排序。
2. 用 `ArrayList` 的 index 當成穩定 id；刪除元素後後面的 index 會改變。
3. 以為 `HashMap` 可以有重複 key；後一次 `put` 會覆蓋前一次 value。
4. 在 enhanced `for` 中直接修改 collection；需要移除時使用 iterator 或建立新集合。
5. 把 `Map` 當成 `Collection`；兩者是不同的核心介面樹。
6. 用 subtraction 寫 comparator；請使用 `Integer.compare` 避免溢位。

## 練習

建立 `CalibrationIndex.java`：用 `Map<String, Integer>` 統計方塊 id，使用 `Set<String>` 去除重複維度，使用 `Queue<String>` 處理待註冊 id，最後用 `Comparator` 依數量由大到小輸出結果。再把 `HashMap` 換成 `LinkedHashMap`，觀察輸出順序的差異。

## 複習速查

- 宣告時先想語意：`List`、`Set`、`Map`、`Queue` 或 `Deque`。
- `ArrayList` 適合順序資料；`HashSet` 適合唯一性；`HashMap` 適合 key-value 查詢。
- `Iterator` 負責走訪期間的安全移除；`Comparable` 是自然排序，`Comparator` 是外部排序規則。
- Minecraft 的 registry、玩家狀態與事件待處理資料都會大量使用 collection 與泛型。

## References

[1]: https://docs.oracle.com/javase/tutorial/collections/interfaces/index.html "Collections Framework Interfaces — Oracle Java Tutorials"
[2]: https://dev.java/learn/api/collections-framework/ "The Collections Framework — Dev.java"
[3]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html "Map API — Java SE 25"
