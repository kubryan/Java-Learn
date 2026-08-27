---
title: Immutability 與 Mutable Object｜不可變性與可變物件
titleEn: Immutability / Mutable Object
topic: Immutability and Mutable Objects
terms: Immutability, Immutable Object, Mutable Object, final Reference, Unmodifiable View, Defensive Copy, Shallow Immutability, Deep Immutability, List.copyOf, Map.copyOf, Set.copyOf, Collections.unmodifiableList, Record, Value Object, Thread Safety
slug: java-immutability
category: Java 開發
order: 5
level: 入門到中階
tags: Java, Immutability, Mutable Object, final, Immutable Collection, Defensive Copy, Record, Thread Safety, Minecraft Java, State Management
aliases: 不可變性, 可變物件, final reference, immutable object, mutable object, defensive copy
summary: 釐清 final reference 與物件本身可變性的差異，掌握 immutable object、unmodifiable view、List.copyOf、defensive copy、record shallow immutability、可變 key、thread safety 與 Minecraft state 設計。
---

# Immutability 與 Mutable Object｜不可變性與可變物件

> **最容易搞混的規則：`final` reference 不能重新指向另一個 object，但不會自動把它指向的 object 變成 immutable。**

Java 的 reference variable 和它指向的 object 是兩個不同層次。`final` 主要限制變數的 assignment；**immutability** 則是 object 的 state 在建立後是否能改變。Java Language Specification 也明確區分：final variable 如果保存 object reference，該 object 的 state 仍可能被操作改變。[1]

```java
final List<String> list = new ArrayList<>();

list.add("Java");        // ✅ 可以：修改 list object
// list = new ArrayList<>(); // ❌ 不可以：重新指定 final reference
```

這不是 Java 的例外，而是所有大型 Java 專案都會反覆遇到的基本模型。理解它之後，你才能正確判斷 Collections、HashMap key、record、Concurrency、Serialization 與 Minecraft world state 的 ownership。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| `final` | 說明 final local、final field、final reference 限制的是什麼 |
| Immutable object | 判斷一個 class 是否真的不能改變 observable state |
| Mutable object | 找出誰可以修改 object、修改發生在哪個生命週期 |
| Collections | 分辨 `List.copyOf`、`Collections.unmodifiableList` 與原本 mutable list |
| Defensive copy | 在 constructor、getter、record component 邊界隔離 mutable state |
| Record | 理解 record 是 shallowly immutable，不是遞迴 deep immutable |
| Collections key | 找出 mutable equality／hash field 導致 HashMap／HashSet 失效的風險 |
| Concurrency | 知道 immutable snapshot 有助於共享，但不等於 Minecraft world API thread-safe |
| 設計 | 選擇 immutable value、mutable owner、copy、lock 或 message passing |

## 1. Reference、Object 與 State

### 三個不同問題

看到一個變數時，先分開問：

| 問題 | 例子 | 由什麼決定 |
|---|---|---|
| reference 能否重新指定？ | `list = anotherList` | `final` 或一般 variable |
| object state 能否改變？ | `list.add("Java")` | object class 的 API 與所有 alias |
| 誰擁有修改權？ | 哪個 service 可以 `add`？ | ownership、封裝與 API contract |

```java
List<String> names = new ArrayList<>();
names.add("Alex");

names = new ArrayList<>(); // 一般 reference 可以重新指定
```

```java
final List<String> names = new ArrayList<>();
names.add("Alex");       // object 仍然 mutable
// names = new ArrayList<>(); // reference 不可重新指定
```

`final` 沒有把 `ArrayList` 的 `add` method 移除，也沒有對 object 施加 deep freeze。要限制內容修改，必須使用 immutable object、unmodifiable view、copy 或自己的封裝 API。

### `final` field 也一樣

```java
public final class PlayerState {
    private final List<String> effects;

    public PlayerState(List<String> effects) {
        this.effects = effects;
    }

    public void addEffect(String effect) {
        effects.add(effect); // field 是 final，但 list 仍可變
    }
}
```

這個 class 的 field reference 不能換成另一個 list，但 constructor 收到的 caller list 仍然可能從外部修改；class 內部也能呼叫 `add`。`final` 描述 reference assignment，不是 state immutability。

## 2. 你的範例：`final List<String>`

### 哪些操作可以、哪些不可以？

```java
final List<String> list = new ArrayList<>();

list.add("Java");
list.add("Minecraft");
list.remove("Java");
list.clear();

// list = new ArrayList<>(); // ❌ compile error
```

可以把它想成：

```text
final list reference ───────┐
                            ↓
                    ArrayList object
                    state 可以修改
```

如果希望「這個變數不能換，而且 list 內容也不能透過這個 API 修改」，可以在建立邊界轉成不可修改的 list：

```java
final List<String> list = List.of("Java", "Minecraft");

// list.add("Stream"); // ❌ UnsupportedOperationException
```

但還要看 element 本身是否可變；一個不能修改 list 結構的 container，不代表其中每個 object 都深層 immutable。

## 3. Immutable Object 的特徵

一個 practical immutable object 通常具備以下設計：

| 設計 | 目的 |
|---|---|
| 建立後 identity／value state 不再改變 | 避免讀者在不同時間看到不同結果 |
| fields 通常是 private final | 隔離 representation，避免外部直接寫入 |
| constructor 驗證 invariant | object 從出生開始就是合法狀態 |
| 不暴露 mutable internal reference | 避免 getter 或 constructor alias 破壞 state |
| 修改操作回傳新 object | 以 transformation 取代 in-place mutation |
| equality／hash fields 保持穩定 | 可以安全作 HashMap／HashSet key |
| `toString` 不造成副作用 | diagnostics 不會偷偷修改或存取外部 state |

### Immutable value object

```java
public final class DimensionId {
    private final String namespace;
    private final String path;

    public DimensionId(String namespace, String path) {
        this.namespace = Objects.requireNonNull(namespace);
        this.path = Objects.requireNonNull(path);
    }

    public String namespace() {
        return namespace;
    }

    public String path() {
        return path;
    }

    public DimensionId withPath(String newPath) {
        return new DimensionId(namespace, newPath);
    }
}
```

`String` 本身是 immutable，因此回傳 `namespace` 與 `path` 不會讓 caller 取得一個可以改變 String 內容的 reference。若 field 是 `List`、`Map`、array 或自訂 mutable class，就必須額外做 copy 或設計只讀 representation。

### Immutable 不等於沒有方法

Immutable object 仍然可以有 method；差別在於 method 不會改變原 object 的 observable state：

```java
String id = "minecraft:stone";
String upper = id.toUpperCase();

// id 仍是 minecraft:stone
// upper 是新的結果
```

「不能改變」不代表「不能計算新結果」。`withX(...)`、`normalized()`、`plus(...)` 這類 API 都可以在保留原 object 的前提下回傳新 value。

## 4. Mutable Object 的 ownership

Mutable object 不是絕對錯誤。`ArrayList`、`HashMap`、`StringBuilder`、Minecraft world、entity state 與許多 builder 都需要 mutation；問題是**誰可以改、何時可以改、改完誰看得到、是否需要同步**。

```java
public final class CalibrationBatch {
    private final List<CalibrationResult> results = new ArrayList<>();

    public void add(CalibrationResult result) {
        results.add(result); // owner class 管理 mutation
    }

    public List<CalibrationResult> snapshot() {
        return List.copyOf(results); // 對外給 snapshot
    }
}
```

這個設計將 mutable list 保留在 owner 內，對外回傳 immutable snapshot。caller 不會直接操作內部 list，也不會因為下一次 batch mutation 而意外改寫已取得的 snapshot。

### Mutable 不是「一定要 public」

```java
public final class Counter {
    private int value;

    public int value() {
        return value;
    }

    public void increment() {
        value++;
    }
}
```

這個 class 內部是 mutable，但外部只能透過 `increment()` 這個明確 API 改變它。封裝讓 mutation 有 owner、有 invariant、有可能加入 validation 或 synchronization；public field 則把所有控制權直接交給 caller。

## 5. `List.of`、`copyOf` 與 unmodifiable view

「不可修改的 collection」至少要分辨三種常見情況：

| API | 種類 | 來源後續修改會反映嗎？ | null element |
|---|---|---:|---:|
| `List.of(...)` | unmodifiable value-based list | 沒有外部 backing list | 不允許 |
| `List.copyOf(source)` | unmodifiable copy／snapshot of element references | 不會反映 source list 的結構修改 | 不允許 |
| `Collections.unmodifiableList(source)` | unmodifiable view | 會，因為 view 仍 backed by source | 依 source |

Oracle 的 `List` 文件說明 `List.of` 與 `List.copyOf` 產生的 list 不支援 add、remove、replace；若 contained elements 自身 mutable，list 顯示的內容仍可能因 element 改變而改變。[2]

### `List.copyOf`：隔離 container 結構

```java
List<String> source = new ArrayList<>();
source.add("Java");

List<String> snapshot = List.copyOf(source);
source.add("Minecraft");

System.out.println(source);   // [Java, Minecraft]
System.out.println(snapshot); // [Java]
// snapshot.add("Stream");   // ❌ UnsupportedOperationException
```

`List.copyOf` 會建立一個不能透過 list API 修改的結果；對一般 immutable element 如 String，這通常足以形成安全 snapshot。它不會遞迴 clone 每一個 element。

### `Collections.unmodifiableList`：只讀 view

```java
List<String> source = new ArrayList<>();
source.add("Java");

List<String> view = Collections.unmodifiableList(source);
source.add("Minecraft");

System.out.println(view); // [Java, Minecraft]
// view.add("Stream");   // ❌ UnsupportedOperationException
```

`view` 不能透過自己的 reference 修改，但 source owner 仍能修改 backing list；這些修改會出現在 view。它適合你需要即時只讀觀察的情況，不等於 snapshot，也不等於 source 從此 immutable。[3]

### Set 與 Map 也有 copyOf

```java
Set<String> tags = Set.copyOf(inputTags);
Map<String, Integer> counts = Map.copyOf(inputCounts);
```

它們限制 container mutation，但 contained values、keys 或 nested objects 的 mutability 仍要另外分析。`Map.copyOf` 的 value 若是 mutable list，copy 只固定 mapping structure，不會 deep copy value list。

## 6. Defensive Copy｜防禦性複製

### Constructor 邊界

不安全的 constructor 會保存 caller 傳入的 mutable reference：

```java
public final class Loadout {
    private final List<String> items;

    public Loadout(List<String> items) {
        this.items = items; // ❌ caller 仍持有同一個 mutable list
    }

    public List<String> items() {
        return items;       // ❌ caller 可直接修改內部 state
    }
}
```

```java
public final class SafeLoadout {
    private final List<String> items;

    public SafeLoadout(List<String> items) {
        this.items = List.copyOf(items); // ✅ input snapshot
    }

    public List<String> items() {
        return items; // ✅ String immutable + unmodifiable list
    }
}
```

這裡不需要再 copy `String` element，因為 String immutable；如果 element 是 mutable，就必須決定要 copy element、轉成 immutable DTO、只保留必要 fields，或明確在 API contract 中說明 shared ownership。

### Getter 邊界

```java
public final class MutableConfig {
    private final List<String> values = new ArrayList<>();

    public List<String> values() {
        return List.copyOf(values); // ✅ 回傳 snapshot
    }
}
```

另一個選擇是回傳 `Collections.unmodifiableList(values)`，但那是 live view。選 snapshot 或 live view 要由需求決定：snapshot 適合跨 thread、事件 payload、revision 與長期保存；live view 適合同一 owner 內需要觀察最新狀態的受控情況。

### Array defensive copy

```java
public final class PacketData {
    private final byte[] bytes;

    public PacketData(byte[] bytes) {
        this.bytes = Arrays.copyOf(bytes, bytes.length);
    }

    public byte[] bytes() {
        return Arrays.copyOf(bytes, bytes.length);
    }
}
```

如果直接保存或回傳 `byte[]`，caller 可以修改同一個 array，破壞 class 的 invariant。`final byte[]` 只表示 array reference 不能換，不表示 array elements 不能改。

## 7. Record 是 shallowly immutable

Record 適合做固定 components 的 value-oriented data carrier，但官方 API 將 record 描述為 **shallowly immutable**，不是 deep immutable。[4]

```java
public record PlayerSnapshot(UUID playerId, List<String> permissions) {}
```

record 的 `permissions` component reference 不能由 record 重新指向另一個 list，但如果 constructor 保存了外部 `ArrayList`，外部仍可能改變該 list：

```java
List<String> mutable = new ArrayList<>();
PlayerSnapshot snapshot = new PlayerSnapshot(playerId, mutable);

mutable.add("admin"); // snapshot.permissions() 可能看得到這個變化
```

### Record compact constructor 做 defensive copy

```java
public record SafePlayerSnapshot(
        UUID playerId,
        List<String> permissions
) {
    public SafePlayerSnapshot {
        playerId = Objects.requireNonNull(playerId);
        permissions = List.copyOf(permissions);
    }
}
```

Record compiler 會提供由 components 衍生的 accessor、equals、hashCode 與 toString；但 component 指向的 object 是否 immutable，仍由 component class 與 constructor boundary 決定。[4] 這也是為什麼 record 很適合 Markdown index row、JSON DTO、設定 snapshot 與測試資料，但不能只看到 `record` 就宣稱整棵 object graph 已經 immutable。

## 8. Immutability 與 Object Contract

前一篇 Object Contract 已經說明：HashMap／HashSet 依賴 equals 與 hashCode。若 key 放入 collection 後，其 equality fields 改變，查找可能失效。

```java
final class MutableKey {
    private String id;

    MutableKey(String id) {
        this.id = id;
    }

    void id(String id) {
        this.id = id;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof MutableKey key && id.equals(key.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

Map<MutableKey, String> map = new HashMap<>();
MutableKey key = new MutableKey("stone");
map.put(key, "block");
key.id("diamond"); // ❌ 改變 equality／hash state
map.get(key);       // 可能找不到原本的 value
```

安全選擇包括 immutable key、record、UUID、明確的 database id，或在修改前先 remove、修改後再 put。Minecraft 的 `BlockPos`、resource identifier 與 registry key 若作為長期 key，也要確認目前平台型別是否 immutable、是否存在 mutable variant，以及 lifecycle 是否允許保存。

## 9. Immutability 與 Concurrency

Immutable object 的優點是：多個 thread 可以共享同一份 value，而不必為 object 本身的 state mutation 加 lock。這可以降低 race condition、lock ordering 與 visibility 問題，但有三個限制：

1. immutable container 裡的 element 可能仍然 mutable。
2. immutable snapshot 不會讓被 snapshot 的 live object 變成 thread-safe。
3. immutable value 不會讓呼叫它的外部 API、自訂 logger、Minecraft world 或 registry lookup 自動可以跨 thread 使用。

```java
// ✅ 背景 thread 建立純資料 snapshot
record FileIndexRow(String slug, String title, List<String> tags) {
    FileIndexRow {
        tags = List.copyOf(tags);
    }
}
```

```text
background I/O／純計算
    ↓ 建立 immutable snapshot
server／client owner thread
    ↓ 套用到 live Minecraft state
```

對 Minecraft mod／plugin 而言，不要把「我用了 `ConcurrentHashMap`」當成「world state 已 thread-safe」。world、entity、registry 與 event lifecycle 仍要在平台允許的 owner thread 操作；immutable data 只是在跨 thread 傳遞時降低共享 mutation 的風險。

## 10. Immutability 與 Serialization

Serialization 會把 object state 轉成資料 representation；immutability 不會自動決定 JSON、NBT、Markdown 或 network payload 的 schema。反過來，反序列化也可能建立 mutable object，所以資料邊界要有 validation、copy 與 ownership policy：

```java
record Settings(String mode, List<String> enabledFeatures) {
    Settings {
        mode = Objects.requireNonNull(mode);
        enabledFeatures = List.copyOf(enabledFeatures);
    }
}
```

這個 DTO 將輸入 list 的 container state snapshot 化，但仍要確認 feature name 的 String value、schema version、allowed values 與 server authorization。不要因為資料模型使用 record 或 `final` 就跳過 deserialization validation。

## 11. Minecraft State 設計

### Value snapshot 與 live state 分開

```java
public record CalibrationSnapshot(
        UUID playerId,
        String dimension,
        int range,
        List<String> matchedBlocks
) {
    public CalibrationSnapshot {
        playerId = Objects.requireNonNull(playerId);
        dimension = Objects.requireNonNull(dimension);
        matchedBlocks = List.copyOf(matchedBlocks);
    }
}
```

這種 snapshot 適合從 server thread 取得必要欄位後傳給 background serializer、log formatter、UI preview 或 test。它不是 live player、world、block entity 或 registry object；因此不會因為後續遊戲 state 變動而偷偷讀到新值。

### 不要把 live object 隨便包進 immutable class

```java
public record BadSnapshot(UUID playerId, ServerWorld world) {}
```

即使 record component field 是 final，`ServerWorld` 仍可能是複雜的 live mutable object，且有 thread／lifecycle／retention 規則。真正的 snapshot 應保存 `world` 所需的不可變資料，例如 dimension id、時間、座標與已驗證的結果，而不是保存整個 live object reference。

### Minecraft 常見選擇

| 資料 | 優先考慮 | 原因 |
|---|---|---|
| player identity | `UUID` | value-oriented、適合 key 與 payload |
| resource identity | loader 正式 identifier 或 immutable wrapper | 不要保存可變 parser state |
| position snapshot | immutable `BlockPos` 或明確 x／y／z record | 不要把 mutable cursor 當長期 key |
| config | immutable DTO／validated record | reload 時用新 snapshot 替換舊 snapshot |
| background result | immutable record | 完成後排回 owner thread 套用 |
| world／entity | live reference 只在正確 owner/lifecycle 使用 | 不因 final 或 record 而變 thread-safe |
| collection state | `List.copyOf`／`Map.copyOf` 或明確 owner | 先決定 snapshot、view 或 shared mutation |

Fabric、NeoForge 與 Paper 的 class、thread、lifecycle 與 resource API 不完全相同；上表是 Java state design 原則，不應替代各 loader 的正式 API contract。

## 12. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 以為 `final List` 不能 `add` | final 限制 reference，不限制 list object | 使用 `List.of`、`List.copyOf` 或 owner API |
| 以為 final field 等於 immutable class | field reference 固定，nested object 仍可能變 | 分析整個 object graph 與所有 aliases |
| 把 `unmodifiableList` 當 immutable snapshot | 它是 backed view，source 修改會反映 | 需要 snapshot 時使用 `List.copyOf` |
| 以為 `List.copyOf` 會 deep copy | 它不遞迴複製每個 element | mutable element 另外 copy／轉 DTO |
| getter 直接回傳內部 ArrayList | caller 可破壞 invariant | 回傳 copy、unmodifiable view 或只讀 API |
| constructor 直接保存 caller list | 外部 alias 可以改內部 state | input defensive copy |
| record component 是 List 就宣稱 deep immutable | record 只有 shallow immutability | compact constructor 做 `List.copyOf` |
| 把 mutable key 放入 HashMap 後修改 | hash／equals 變化可能讓 lookup 失效 | immutable key，或 remove→modify→put |
| 用 `ConcurrentHashMap` 就直接共享 Minecraft world state | collection thread-safe 不等於 world thread-safe | 遵守 owner thread 與 lifecycle |
| 用 copy 代替所有同步設計 | snapshot 可能過期，且 live operation 仍需正確 thread | 明確區分 snapshot、lock、queue 與 owner thread |
| 把 `Collections.unmodifiableList` 當成禁止所有人修改 | backing owner 仍可修改 source | 明確標示 view 或 snapshot |
| `final byte[]` 當成 immutable bytes | array elements 仍可改 | constructor／getter 都做 `Arrays.copyOf` |
| immutable object 裡保存 live World／Entity | reference 固定但 object 仍 mutable、具 lifecycle | 保存必要的 immutable fields |
| 用 public mutable field 表達方便 | 任意 caller 都能破壞 invariant | private state + controlled mutation |
| 過度追求 immutable 造成複製所有資料 | 可能增加 allocation 與失去 owner 語意 | 依邊界、生命週期、大小與 thread 需求選擇 |

## 13. 練習

### 練習一：修正 final 誤解

寫出一個 `final List<String>`，分別測試重新指定、`add`、`remove`、`List.copyOf` 與 `Collections.unmodifiableList`。用註解記錄哪些操作是 compile error、哪些是 runtime `UnsupportedOperationException`，哪些會透過 backing list 反映。

### 練習二：Defensive copy

建立 `Loadout`，先保存 caller 傳入的 `ArrayList`，再從 constructor 和 getter 兩端補上 defensive copy。用 test 證明 caller 修改原 list 或 getter 回傳結果都不會破壞 Loadout state。

### 練習三：Record snapshot

建立 `CalibrationSnapshot` record，讓它保存 `UUID`、dimension、range 與 `List<String>`。在 compact constructor 使用 `List.copyOf`，再測試輸入 list 改變後 snapshot 不受影響。

### 練習四：Mutable HashMap key

建立 mutable key 放進 `HashMap`，修改參與 hashCode 的欄位，觀察 lookup。再改成 `record ChunkKey(int x, int z)`，比較兩種設計的長期風險。

### 練習五：Minecraft thread boundary

模擬背景 thread 讀取 Markdown，建立 immutable `CalibrationSnapshot`，再把 snapshot 排回 server executor。列出哪些欄位可以在 background thread 讀取，哪些 live world／entity operation 必須保留在 owner thread。

## 14. 複習速查

```text
final reference
  → 不能重新指定 reference
  → 不代表 referenced object immutable

immutable object
  → 建立後 observable state 不變
  → 可安全共享，但 nested object 也要檢查

unmodifiable view
  → 這個 view 不能修改
  → backing collection 仍可能從別的 reference 修改

copyOf
  → 取得不可修改的 container snapshot
  → 不自動 deep copy nested elements

defensive copy
  → constructor／getter 邊界切斷 mutable alias

Minecraft
  → immutable snapshot 可跨 thread 傳遞
  → 不代表 live World／Entity／Registry API 可任意跨 thread 操作
```

| 看到的程式 | 正確解讀 |
|---|---|
| `final List<String> list` | reference 固定；list 是否可變要看實際 object |
| `list.add("Java")` | 如果 list 是 ArrayList，合法；final 不會阻止它 |
| `list = new ArrayList<>()` | final reference 不能重新指定 |
| `List.copyOf(source)` | 不可修改的 container 結果，element 仍可能 mutable |
| `Collections.unmodifiableList(source)` | 不可修改的 live view，不是獨立 snapshot |
| `record Snapshot(List<T> values)` | shallowly immutable；需要時做 defensive copy |
| `Map<MutableKey, V>` | equality／hash fields 改變可能破壞 lookup |
| `ConcurrentHashMap` | 只描述 map 的 concurrency property，不代表其中 value 或 Minecraft world thread-safe |
| `final ServerWorld world` | reference 固定，不代表 world immutable 或可跨 thread 使用 |

**最後記住：** `final` 解決「reference 能不能重新指定」；immutability 解決「object 的 state 能不能改」；defensive copy 解決「外部 alias 能不能繞過你的封裝」；thread safety 解決「多個執行緒如何安全觀察與修改共享狀態」。這四個問題相關，但不是同一件事。

## References

[1]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html#jls-4.12.4 "final Variables — Java Language Specification"
[2]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html "List — Java SE 21 API"
[3]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collections.html "Collections — Java SE 21 API"
[4]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Record.html "Record — Java SE 21 API"
[5]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html "Map — Java SE 21 API"
