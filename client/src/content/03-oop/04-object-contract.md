---
title: Object Contract｜equals、hashCode 與 toString
titleEn: Object Contract / Object Methods
topic: Object Contract
terms: Object Contract, Object Methods, equals, hashCode, toString, Equality, Equivalence Relation, Hash Collision, HashSet, HashMap, Mutable Key, Record, UUID, BlockPos, Identifier, ResourceLocation, RegistryKey, ResourceKey
slug: java-object-contract
category: OOP
order: 34
level: 中階
tags: Java, Object, equals, hashCode, toString, Object Contract, HashSet, HashMap, Record, UUID, BlockPos, Identifier, ResourceLocation, Registry Key, Minecraft Java
aliases: Object Contract, Object Methods, equals hashCode toString, 物件契約, 物件方法, 相等契約
summary: 從 Object Contract 出發理解 equals、hashCode 與 toString，掌握 HashSet／HashMap 的 key 行為、可變 key 風險、繼承與 record 的 equality 設計，並對照 Minecraft 的 UUID、BlockPos、Identifier、ResourceLocation 與 Registry Key。
---

# Object Contract｜equals、hashCode 與 toString

> **最重要的規則：如果 `a.equals(b)` 為 `true`，那麼 `a.hashCode()` 與 `b.hashCode()` 必須相等。** 反過來不成立：hash code 相等不代表兩個 object 一定相等。

Java 中每個 class 都直接或間接繼承 `Object`。`equals()`、`hashCode()` 與 `toString()` 不是只為了考試，它們是 Java collections、logging、測試 assertion、cache、registry key 與 Minecraft 座標／識別符號的共同基礎。[1]

如果你已經在使用 `HashSet` 與 `HashMap`，卻沒有理解這三個方法，程式可能出現「明明看起來一樣卻找不到」、「Set 竟然有重複資料」、「Map key 放進去後消失」或「log 看不出真正內容」等錯誤。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| Object methods | 說明 `equals()`、`hashCode()`、`toString()` 各自的責任 |
| Equality | 分辨 `==`、reference identity 與 value equality |
| Contract | 說出 equals 的 reflexive、symmetric、transitive、consistent、non-null 條件 |
| Hashing | 理解 equals 相等必須導出相同 hash code，但 hash collision 可以存在 |
| Collections | 解釋 `HashSet`／`HashMap` 為何依賴兩個方法查找 key |
| 設計 | 為 value object 正確實作三個方法，或知道何時使用 record |
| 風險 | 找出 mutable key、繼承 symmetry、null 與 identity 誤用 |
| Minecraft | 正確處理 `UUID`、`BlockPos`、`Identifier`、`ResourceLocation` 與 registry key |

## 1. 三個 Object Methods 的責任

| Method | 它回答的問題 | 主要消費者 |
|---|---|---|
| `equals(Object)` | 「這兩個 object 在 domain 意義上是否相等？」 | `Set`、`Map`、測試、業務規則 |
| `hashCode()` | 「這個 object 的 equality state 對應哪個 hash 值？」 | `HashMap`、`HashSet`、cache、hash index |
| `toString()` | 「如何提供這個 object 的可讀文字表示？」 | log、debugger、錯誤訊息、測試失敗輸出 |

`equals` 定義的是 domain equality；`hashCode` 必須與該 equality 一致；`toString` 是 diagnostics representation。**`toString()` 不負責定義相等，也不應被拿來當 parser、database key、network protocol 或 serialization 格式。**

```java
PlayerKey left = new PlayerKey("Alex");
PlayerKey right = new PlayerKey("Alex");

left.equals(right);      // 可能是 true：value equality
left == right;           // false：通常是兩個不同 reference
left.hashCode();         // 若 equals 相等，必須與 right 相同
left.toString();         // 給人看的診斷文字，不是 equality contract
```

## 2. `==` 與 `equals()`

### `==` 對 reference 比較 identity

對 primitive，`==` 比較數值；對 object reference，`==` 比較是否指向同一個 object。它不會呼叫你的 `equals()`。

```java
String first = new String("stone");
String second = new String("stone");

System.out.println(first == second);      // false：不同 object
System.out.println(first.equals(second)); // true：String 的 value equality
```

```java
UUID expected = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
UUID actual = loadPlayerId();

if (expected.equals(actual)) {
    // ✅ 比較 UUID value
}

if (expected == actual) {
    // ❌ 只在你真的要比較同一個 object instance 時才合理
}
```

`==` 適合判斷 reference identity，例如 `value == null`；一般 value object、String、UUID、座標與 key 要使用 domain equality。`null` 左側也常使用 `Objects.equals(a, b)` 以安全處理兩邊可能為 null 的情況。[4]

```java
Objects.equals(left, right)
// both null → true
// one null  → false
// both non-null → left.equals(right)
```

## 3. `equals()` 的相等契約

Oracle 的 `Object.equals` 文件將 equals 描述為非 null references 上的 equivalence relation。[1] 一個正確的 `equals()` 應遵守以下條件：

| 條件 | 意義 | 形式 |
|---|---|---|
| Reflexive | 自己等於自己 | `x.equals(x)` 為 `true` |
| Symmetric | 比較具有雙向一致性 | `x.equals(y)` ⇔ `y.equals(x)` |
| Transitive | 相等關係可傳遞 | `x == y` 且 `y == z` ⇒ `x == z` |
| Consistent | equality state 未改變時結果穩定 | 多次呼叫結果一致 |
| Non-null | 任何 object 不等於 null | `x.equals(null)` 為 `false` |

### Reflexive

```java
Token token = new Token("abc");
assert token.equals(token);
```

如果 `equals` 依賴奇怪的時間、隨機值或 mutable external state，可能連自己都不等於自己，這會讓 Set／Map 與測試行為非常難預測。

### Symmetric

```java
left.equals(right) == right.equals(left)
```

最常見的 symmetry bug 出現在父類別與子類別使用不同的 `instanceof` 規則：父類別說子類別相等，但子類別因多一個 field 又說父類別不相等。設計 inheritance equality 時，先決定 equality 是否允許跨 subclass；如果不能嚴格保證對稱，value class 常使用 `final` 或 `getClass()`。

### Transitive

如果 `a` 等於 `b`、`b` 等於 `c`，就必須 `a` 等於 `c`。不要讓每個 subclass 用不同方式擴充 equality fields，否則很容易破壞傳遞性。

### Consistent 與 immutable state

只要 equals 比較的資訊沒有改變，重複呼叫結果應一致。這也是為什麼放進 `HashSet` 的 key 或 element 不應在加入後改變 equality／hash fields。

### Non-null

```java
name.equals(null);       // 必須是 false
Objects.equals(name, null); // 安全得到 false
```

不要在 `equals` 一開始直接存取 `other.field`；先處理 `null` 與 type check。IDE 產生的實作通常已處理，但你仍然要看懂它。

## 4. `hashCode()` 的契約

`hashCode()` 的一般契約有三個重點：[1]

1. 如果兩個 object 依 `equals()` 相等，它們的 hash code 必須相等。
2. 如果 equals 使用的資訊在同一執行期間沒有改變，同一 object 重複呼叫的 hash code 應一致。
3. 不相等 object 可以有相同 hash code；這叫 **hash collision**，只是會降低 hash table 的效率，不代表契約被破壞。

```text
a.equals(b) == true
        ↓ 必須
 a.hashCode() == b.hashCode()

 a.hashCode() == b.hashCode()
        ↓ 不代表
 a.equals(b) == true
```

因此 hash code 是快速分流線索，不是唯一身份。不要寫：

```java
if (a.hashCode() == b.hashCode()) {
    return true; // ❌ hash collision 會造成錯誤相等
}
```

正確順序是先確認可能的 hash bucket，再用 `equals` 判斷真正 equality。具體實作可以有最佳化，但 API contract 不允許你把 hash code 當成唯一 key。

## 5. `HashSet` 與 `HashMap` 為什麼需要兩個方法

### HashSet 的概念模型

`HashSet` 的唯一性依賴 element 的 equality 與 hash behavior；它不保證 encounter order。[3]

```java
record BlockId(String namespace, String path) {}

Set<BlockId> ids = new HashSet<>();
ids.add(new BlockId("minecraft", "stone"));
ids.add(new BlockId("minecraft", "stone"));

System.out.println(ids.size()); // 1：record value equality
```

概念上可以把查找想成：

```text
candidate element
      ↓ hashCode()
候選 bucket／區域
      ↓ equals()
真正相等？
      ↓
加入、拒絕重複、contains 或 remove
```

如果所有 object 都回傳同一個 hash code，equals 仍可維持正確性，但 hash table 可能退化成大量比較；如果 equals 相等卻 hash code 不同，Set 可能將邏輯上相同的 element 放到不同位置，導致 `contains` 或 duplicate detection 失效。

### HashMap 的 key lookup

`Map` 的 key equality 以 equals 語意定義；實作可以先比較 hash code 來最佳化，但不能只用 hash code 決定相等。[2]

```java
Map<BlockId, Integer> counts = new HashMap<>();
counts.put(new BlockId("minecraft", "stone"), 12);

int count = counts.getOrDefault(
        new BlockId("minecraft", "stone"),
        0
);

System.out.println(count); // 12
```

上例能找到 value，是因為兩個 `BlockId` 的 components 相等，record 自動提供一致的 equals／hashCode。若 `BlockId` 只是普通 class、沒有 override，兩個分開 new 的 object 預設會依 identity 比較，lookup 可能得到 0。

### hash collision 不是 equals bug

```java
final class PoorHashKey {
    private final String value;

    @Override
    public int hashCode() {
        return 1; // 允許但會造成嚴重 collision
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof PoorHashKey key
                && Objects.equals(value, key.value);
    }
}
```

如果 equals 正確，即使 hash code 一樣，集合仍可透過 equals 分辨 object；只是效能與分布會變差。實務上應使用參與 equality 的 fields 產生有合理分布的 hash code，而不是刻意寫常數。

## 6. 正確實作 value object

### 可讀的普通 class 實作

```java
import java.util.Objects;

public final class PlayerKey {
    private final UUID id;
    private final String dimension;

    public PlayerKey(UUID id, String dimension) {
        this.id = Objects.requireNonNull(id, "id");
        this.dimension = Objects.requireNonNull(dimension, "dimension");
    }

    public UUID id() {
        return id;
    }

    public String dimension() {
        return dimension;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof PlayerKey that)) {
            return false;
        }
        return id.equals(that.id)
                && dimension.equals(that.dimension);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, dimension);
    }

    @Override
    public String toString() {
        return "PlayerKey[id=" + id + ", dimension=" + dimension + "]";
    }
}
```

這個 class 將 equality fields 固定為 `id` 與 `dimension`。如果未來新增 `displayName`，要先決定它是否是 identity 的一部分：若不是，不要把它加到 equals／hashCode；若是，就要考慮 persisted key、Set／Map 行為與 migration。

### IDE 產生的方法不是免責卡

IDE 可以生成 `equals`、`hashCode`、`toString`，但你仍要檢查：

| 檢查 | 問題 |
|---|---|
| fields | 是否只包含真正的 identity／value fields？ |
| null | 是否正確處理 nullable component？ |
| superclass | 是否需要包含父類別 state？是否破壞 symmetry？ |
| mutable field | 放入 HashMap 後 field 會不會改？ |
| secret | `toString` 是否會輸出 token、password、session 或玩家資料？ |
| array | 是否用 `Arrays.equals`／`Arrays.hashCode` 而不是 reference equality？ |
| floating point | `Double`／`Float` equality 的 edge cases 是否適合 domain？ |

### Array field 的陷阱

```java
final class PacketKey {
    private final byte[] bytes;

    @Override
    public boolean equals(Object other) {
        return other instanceof PacketKey that
                && Arrays.equals(bytes, that.bytes);
    }

    @Override
    public int hashCode() {
        return Arrays.hashCode(bytes);
    }
}
```

陣列本身沒有把內容 equality 當成一般 object `equals`；需要依元素比較時使用 `Arrays.equals`／`Arrays.hashCode`，多維陣列則評估 `Arrays.deepEquals`／`Arrays.deepHashCode`。更重要的是，若 caller 仍持有並修改 `bytes`，這個 key 仍然是 mutable；應考慮 defensive copy。

## 7. `getClass()` 與 `instanceof`

兩種常見寫法都有情境，不是永遠一個對、一個錯：

```java
// exact runtime class equality
if (other == null || getClass() != other.getClass()) {
    return false;
}
```

```java
// allow compatible subclass instances
if (!(other instanceof PlayerKey that)) {
    return false;
}
```

| 方式 | 允許 subclass 嗎？ | 適合情境 | 風險 |
|---|---:|---|---|
| `getClass()` | 否 | final value class、不同 subclass 不應相等 | proxy／subclass 可能無法相等 |
| `instanceof` | 是 | sealed hierarchy 或明確設計的 value abstraction | subclass 加 field 後破壞 symmetry／transitivity |
| `canEqual` pattern | 依設計 | 可延伸 hierarchy、需要雙向能力檢查 | 複雜、容易漏寫 |

如果 value object 應該是 final，通常把 class 宣告成 `final`，讓 equality boundary 清楚。若 class 允許 subclass，請先寫出跨 subtype equality 的規則，再讓每個 subtype 遵守同一套 contract。不要只複製一段 IDE template 就結束。

## 8. Mutable Key Trap｜可變 key 陷阱

### key 放入後不要改 equality fields

```java
final class PositionKey {
    int x;
    int z;

    PositionKey(int x, int z) {
        this.x = x;
        this.z = z;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof PositionKey key
                && x == key.x
                && z == key.z;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, z);
    }
}

Map<PositionKey, String> map = new HashMap<>();
PositionKey key = new PositionKey(0, 0);
map.put(key, "spawn");

key.x = 100; // ❌ 改變 hash／equals state
map.get(key); // 可能找不到剛剛放入的 value
```

Oracle `Map` API 明確提醒：如果 map key 在 map 內被修改，而且改動影響 equals，map behavior 不再有規範保證。[2]

### 安全設計

```java
record ChunkKey(int x, int z) {}

Map<ChunkKey, String> chunks = new HashMap<>();
chunks.put(new ChunkKey(0, 0), "overworld");
```

優先使用 immutable key、record、`UUID` 或明確不可變的 identifier。若 API 提供 mutable cursor／mutable position，使用它做查詢暫存可以，但不要把會被重複修改的同一 instance 當作長期 map key。

## 9. `toString()`：給人讀的 diagnostics

### 有用的 `toString`

```java
record CalibrationRequest(UUID playerId, String dimension, int range) {}

CalibrationRequest request = new CalibrationRequest(
        playerId,
        "minecraft:overworld",
        8
);

System.out.println(request);
// CalibrationRequest[playerId=..., dimension=minecraft:overworld, range=8]
```

有用的 `toString()` 讓 log、debugger、test failure 與 exception message 提供上下文。它應該短、穩定到足以幫助人閱讀，但不要把目前格式當成官方 serialization schema；record 的 implicit format 也可能在未來改變。[5]

### 不要在 `toString()` 放秘密

```java
@Override
public String toString() {
    return "ApiConfig[url=" + url + ", token=" + token + "]";
    // ❌ token 可能進入 log、exception、crash report 或 issue
}
```

```java
@Override
public String toString() {
    return "ApiConfig[url=" + url + ", token=<redacted>]";
}
```

玩家 UUID、absolute path、IP、payload、session id 與 private config 也要根據分享環境評估是否需要遮罩。`toString()` 是 diagnostics surface，不是免費的資料外洩通道。

### `toString()` 不應有副作用

不要在 `toString()` 裡做 I/O、查 world、呼叫 network、修改 cache、消耗 iterator 或執行昂貴的 stream。debugger、logger 或 exception handler 可能在你沒預期的時間呼叫它；它應該盡量是快速、純粹的 representation。

## 10. Record 與 Object Contract

Record 適合表達固定 component 的 value-oriented data carrier。Java 會為 record 提供由 components 衍生的 implicit `equals`、`hashCode` 與 `toString`。[5]

```java
public record RegistryId(String namespace, String path) {}

RegistryId first = new RegistryId("minecraft", "stone");
RegistryId second = new RegistryId("minecraft", "stone");

first.equals(second); // true
first.hashCode() == second.hashCode(); // true
first.toString(); // 人類可讀 representation
```

Record 的「shallowly immutable」不代表所有 component object 都深層不可變：

```java
record Tags(List<String> values) {}

List<String> mutable = new ArrayList<>();
Tags tags = new Tags(mutable);
mutable.add("changed"); // record component 指向的 list 仍可能被外部修改
```

如果 list、map、array 參與 equality／hashCode，應在 canonical constructor 做 defensive copy 或使用 immutable representation：

```java
record Tags(List<String> values) {
    Tags {
        values = List.copyOf(values);
    }
}
```

Record 自動 hash algorithm 的精確形式未指定，不要把 hash 數字當成跨 process、跨版本的 persisted ID。record 的 `toString()` 也不應被 application 拿來反向 parse。[5]

## 11. Minecraft Key 對照

### `UUID`

`UUID` 是玩家、entity 或 request correlation 常見的 value key。把 UUID 作為 map key 時，使用 `equals`／`hashCode`；不要比較 `toString()`，也不要用 `==` 判斷兩個解析出來的 UUID 是否相等。

```java
Map<UUID, PlayerState> states = new HashMap<>();

UUID playerId = player.getUuid();
states.put(playerId, new PlayerState());

PlayerState state = states.get(UUID.fromString(playerId.toString()));
```

### `BlockPos`

`BlockPos` 常用於以方塊座標索引資料：

```java
Map<BlockPos, CalibrationState> byPosition = new HashMap<>();
byPosition.put(pos, state);
```

使用不可變 `BlockPos` 作為長期 key；如果平台 API 有 `MutableBlockPos` 或可重用 cursor，不要在 map 中保存一個會被持續改座標的 instance。需要跨 tick／callback 保存時，建立 immutable snapshot，並遵守 Fabric、NeoForge 或 Paper 目前版本 API 的正式型別與 thread contract。

### `Identifier` 與 `ResourceLocation`

Fabric／Yarn 常見 `Identifier`，NeoForge／Mojang mappings 常見 `ResourceLocation`。它們都可表達類似 `minecraft:stone` 的 namespaced id，但它們是不同 Java types、不同 loader／mapping ecosystem：

```text
Fabric／Yarn
  Identifier

NeoForge／Mojang mappings
  ResourceLocation
```

不要只因為兩者 `toString()` 看起來相同，就把它們當成可互換的 key 或 API parameter。各平台要使用自己的 identifier factory、validation、registry 與 mapping。跨平台 common code 可以設計自己的 immutable `NamespacedId` value object，再在 platform boundary 轉成對應型別。

```java
record NamespacedId(String namespace, String path) {}
```

### Registry Key

Fabric、NeoForge、Paper 的 registry／key type、lifecycle 與 ownership 不同。常見概念可能是 `RegistryKey<T>`、`ResourceKey<T>` 或平台提供的 registry entry handle，但不應混用 class 名稱或只靠文字比較：

```text
domain identity
    ↓
platform registry key／identifier
    ↓
platform registry lookup
```

對 registry key 的安全習慣是：

| 習慣 | 原因 |
|---|---|
| 使用官方 key／identifier type | 保留 loader 的 namespace、registry type 與 validation |
| 不用 `toString()` 當唯一 API contract | 文字格式可能只適合 log |
| 不跨 Fabric／NeoForge 直接傳 object | class、mapping 與 lifecycle 不同 |
| registry key 盡量不可變 | 避免進入 HashMap 後 equality 改變 |
| lookup 失敗要明確處理 | 不要把 null、optional、missing entry 混成一種狀態 |
| 由正確 thread／lifecycle 存取 registry | equality 正確不代表 registry access thread-safe |

### Minecraft 物件的比較流程

```text
先問：這是 identity、value 還是 live game object？
    ↓
identity／value key → 使用官方 equals／hashCode contract
    ↓
live object → 先確認 owner、lifecycle、thread 與 reference validity
    ↓
需要 log → 使用安全 toString／明確欄位
    ↓
跨 loader → 在 platform boundary 做型別轉換，不混 API
```

`equals` 與 `hashCode` 只回答 object equality；它們不會替你保證 Minecraft object 仍然存在、仍在同一個 world、仍可從目前 thread 存取，或仍處於允許 mutation 的 lifecycle。

## 12. 實戰：一個安全的 calibration key

```java
public record CalibrationKey(UUID playerId, String dimension, BlockPos pos) {
    public CalibrationKey {
        Objects.requireNonNull(playerId, "playerId");
        Objects.requireNonNull(dimension, "dimension");
        Objects.requireNonNull(pos, "pos");

        // 若 API 的 BlockPos 可能是 mutable subtype，先複製成 immutable snapshot。
        pos = new BlockPos(pos.getX(), pos.getY(), pos.getZ());
    }
}

Map<CalibrationKey, Integer> attempts = new HashMap<>();

CalibrationKey key = new CalibrationKey(playerId, "minecraft:overworld", pos);
attempts.merge(key, 1, Integer::sum);
```

這個 key 將玩家、dimension 與座標明確組成 value identity。它不把 `Player` live object、world reference 或 mutable cursor 放進 long-lived HashMap key。實際 `BlockPos` constructor、namespace identifier、server thread 與 platform class 仍要依目前 Fabric、NeoForge 或 Paper 專案版本調整；範例的重點是 **immutable value key + 一致的 equality／hashCode**。

## 13. 測試 Object Contract

### 基本 contract test

```java
PlayerKey first = new PlayerKey(playerId, "overworld");
PlayerKey second = new PlayerKey(playerId, "overworld");
PlayerKey copy = new PlayerKey(playerId, "overworld");

assert first.equals(first); // reflexive
assert first.equals(second) && second.equals(first); // symmetric
assert first.equals(second) && second.equals(copy) && first.equals(copy); // transitive
assert first.equals(null) == false; // non-null
assert first.hashCode() == second.hashCode(); // equal → same hash
```

### Collection behaviour test

```java
Set<PlayerKey> keys = new HashSet<>();
keys.add(first);

assert keys.contains(second);
assert !keys.add(copy);

Map<PlayerKey, String> labels = new HashMap<>();
labels.put(first, "online");
assert labels.get(second).equals("online");
```

測試不應只斷言 `hashCode()` 等於某個硬編碼整數，因為合法的 hash algorithm 可以改變。應測試契約：相等 object hash 相等、不同 instance 可正確 lookup、mutable fields 不會破壞 key lifecycle，以及 `toString()` 有必要 context 且不含秘密。

## 14. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 用 `==` 比較 String／UUID／value object | 比較 reference identity，不是 value | 使用 `equals` 或 `Objects.equals` |
| 只 override `equals` | equal object 可能落在不同 hash bucket | 一起 override `hashCode` |
| 把 hash code 相等當成 object 相等 | hash collision 合法存在 | hash 只作候選分流，最後用 equals |
| `equals` 比較一組 fields，`hashCode` 比較另一組 | 違反 equal → same hash contract | 兩者使用完全相同的 equality fields |
| key 放入 HashMap 後修改 equality field | object 可能落在錯誤 bucket，查找失效 | immutable key、record 或 remove→modify→put |
| 用 `toString()` 當 key／protocol | log representation 不是穩定資料格式 | 建立明確 value object／serializer |
| `toString()` 輸出 token 或密碼 | 可能進入 log、crash report、issue | redact sensitive fields |
| 父類別用 `instanceof`、子類別新增 equality field | 可能破壞 symmetric／transitive | final、getClass 或完整 equality hierarchy design |
| 陣列直接呼叫 `equals` | 比較 array reference，不是內容 | `Arrays.equals`／`Arrays.hashCode` |
| 用 mutable `BlockPos` cursor 作 key | 座標變動會改 equality／hash | 建立 immutable `BlockPos` snapshot |
| 把 Identifier、ResourceLocation 當同一 class | Fabric／NeoForge ecosystem 不同 | 在 platform boundary 明確轉型 |
| 把 live Player／World object 當長期 key | identity、lifecycle、thread 與 retention 風險 | 使用 UUID、immutable key 或明確 owner |
| 期待 `HashMap` 有固定順序 | HashMap 不保證 encounter order | 依需求使用 LinkedHashMap／TreeMap |
| 看到兩個 object 的 toString 一樣就判斷相等 | 不代表 equals contract 相同 | 呼叫 equals 或比較明確 fields |
| 硬編碼 hash code 值做 persisted ID | hash algorithm 不保證跨執行／跨版本穩定 | 使用 UUID、明確序列化 key 或 database ID |

## 15. 練習

### 練習一：修復 BrokenKey

建立一個 `BrokenKey`：先只 override `equals`，觀察 `HashMap` lookup；再補上 `hashCode`。使用兩個分開建立但 fields 相同的 instance，寫出 test 證明問題與修復。

### 練習二：mutable key 實驗

建立 `MutablePosition`，放入 `HashSet` 後修改 x 座標。測試 `contains`、`remove` 與 iteration 結果，並比較 immutable `record ChunkPos(int x, int z)` 的行為。

### 練習三：Object contract property checks

建立三個相等的 `PlayerKey` instance，驗證 reflexive、symmetric、transitive、consistent、non-null 與 equal→same hash。再建立 hash collision 但不相等的 key，確認 collision 不代表 equals 為 true。

### 練習四：安全 toString

為含有 API token、玩家 UUID、resource path 與 request id 的 DTO 寫 `toString()`。列出哪些欄位要保留、哪些要 redact，並確認 logger 與 exception message 不會洩漏秘密。

### 練習五：Minecraft registry key review

選擇 Fabric、NeoForge 或 Paper 其中一個平台，找出一個正式的 identifier／registry key type。確認它的 equality、hashing、lifecycle 與 thread contract，再設計一個 immutable wrapper，禁止把另一個平台的 key class 傳進來。

## 16. 複習速查

```text
value equality
    ↓ equals()
hash collection lookup
    ↓ hashCode() → candidate bucket
    ↓ equals()   → actual match
logging／diagnostics
    ↓ toString() with safe context
```

| 我想回答什麼 | 正確方向 |
|---|---|
| 兩個值是否相等 | `equals()` |
| 是否是同一個 object instance | `==` |
| object 可否作 HashMap／HashSet key | equality fields immutable，且 equals／hashCode 一致 |
| equal object 的 hash 是否必須相同 | 必須 |
| 相同 hash 是否代表相等 | 不代表，collision 合法 |
| 避免 null 比較例外 | `Objects.equals(a, b)` |
| 產生有用 log | 安全、快速、無副作用的 `toString()` |
| record 是否自帶三個方法 | 是，由 components 衍生；精確格式不應被當成 protocol |
| Minecraft 玩家 key | `UUID`，不要用 `==` 或 toString 比較 |
| Minecraft 座標 key | immutable `BlockPos`／明確 snapshot |
| Fabric／NeoForge identifier | 使用各自的 `Identifier`／`ResourceLocation` 與 registry contract |
| live world／entity 是否可作任意 key | 先檢查 lifecycle、thread、ownership 與 retention，不要只看 equals |

最後記住：**`equals` 定義「相等」、`hashCode` 讓 hash collection 能有效找到相等候選、`toString` 讓人看懂目前狀態。三者共同形成 Object Contract，但責任完全不同。**

## References

[1]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html "Object — Java SE 21 API"
[2]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html "Map — Java SE 21 API"
[3]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html "Set — Java SE 21 API"
[4]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Objects.html "Objects — Java SE 21 API"
[5]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Record.html "Record — Java SE 21 API"
[6]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html "HashMap — Java SE 21 API"
