---
title: S 級 Generics：泛型、Wildcard 與 Type Erasure
slug: java-generics
category: Java 現代語法
order: 50
level: 中階到進階
tags: S 級, Generics, 泛型, Type Parameter, Generic Class, Generic Method, Bounded Type Parameter, Wildcard, extends, super, Type Erasure, Minecraft Java
aliases: Generics, 泛型, Java 泛型, Type Parameter, Generic Class, Generic Method, Bounded Type Parameter, Wildcard, ? extends, ? super, Type Erasure
summary: Minecraft Java 開發必學的 Generics 完整章節，從型別參數、泛型類別與方法，到 bounded type、wildcard、PECS、型別擦除與 RegistryEntry<T> 閱讀方式。 ⭐⭐⭐ S 級
---

# S 級 Generics：泛型、Wildcard 與 Type Erasure

> **Generics 是 Minecraft Java 開發的 S 級基礎。** 你看到 `List<Pokemon>`、`Map<Identifier, Block>` 或 `RegistryEntry<T>` 時，尖括號裡的內容不是裝飾，而是在告訴 compiler「這個容器、方法或 API 對哪一種型別負責」。沒有泛型，你會被 raw type、unchecked cast 與一長串 `Object` 追著跑。

Java Generics 讓 class、interface 與 method 可以把「型別」當成參數，重用同一份邏輯並保留 compile-time type checking。[1] 泛型不是只為了集合；Minecraft loader 的 registry、event callback、payload、codec、resource key 與各種 wrapper 都會使用型別參數。

## 本章目標

完成這篇後，你應該能夠：

1. 分辨 **Type Parameter** 與 **Type Argument**，看懂 `T`、`K`、`V`、`E` 的角色。
2. 寫出 **Generic Class** 與 **Generic Method**，讓 compiler 推導正確型別。
3. 使用 **Bounded Type Parameter** 表達「T 至少具備某種能力」。
4. 看懂 `List<?>`、`List<? extends T>`、`List<? super T>`，並使用 PECS 選擇方向。
5. 理解 **Type Erasure** 對 cast、`instanceof`、array、reflection 與 bridge method 的影響。
6. 讀懂 Minecraft API 中的 `List<Pokemon>`、`Map<Identifier, Block>`、`RegistryEntry<T>` 與 loader-specific registry type。

## 1. Type Parameter｜型別參數

**Type parameter** 是宣告時的型別變數；它通常用大寫單字母表示，例如 `T`（Type）、`E`（Element）、`K`（Key）、`V`（Value）。當你實際使用 generic type 時，放進去的具體型別叫 **type argument**。

```java
// T 是 type parameter
final class Box<T> {
    private final T value;

    Box(T value) {
        this.value = value;
    }

    T value() {
        return value;
    }
}

// String 是 type argument
Box<String> name = new Box<>("Steve");
Box<Integer> count = new Box<>(64);
```

| 名稱 | 出現位置 | 範例 | 意義 |
|---|---|---|---|
| Type parameter | generic class／method 的宣告 | `class Box<T>` | 尚未決定的型別變數 |
| Type argument | 使用 generic type 的地方 | `Box<String>` | 這一次實際代入的型別 |
| Parameterized type | 已經代入 type argument 的型別 | `List<Pokemon>` | 對特定型別具體化的 generic type |
| Raw type | 使用 generic type 卻省略參數 | `List` | 舊程式相容形式，會失去型別安全 |

不要把 `T` 想成 runtime 的 class name。它是 compiler 使用的型別變數；Java compiler 會在編譯時檢查它，後面還會受到 Type Erasure 的限制。

## 2. Generic Class｜泛型類別 ⭐⭐⭐

Generic class 把型別參數放在 class 名稱後面。這讓同一個資料結構可以保存不同型別，而不需要把所有東西退化成 `Object`。

```java
public final class RegistryEntry<T> {
    private final String id;
    private final T value;

    public RegistryEntry(String id, T value) {
        this.id = id;
        this.value = value;
    }

    public String id() {
        return id;
    }

    public T value() {
        return value;
    }
}

RegistryEntry<String> text = new RegistryEntry<>("message", "hello");
RegistryEntry<Integer> amount = new RegistryEntry<>("amount", 12);
String message = text.value();
```

在 Minecraft API 中，`RegistryEntry<T>` 可用來建立「某個 registry entry 包裝某種 value」的閱讀模型；實際 loader／Minecraft 版本可能使用不同 package、record、holder 或 registry type，請以專案的 mapped source 為準。重點是：看到 `<T>`，就先問「這個 API 對哪一種值提供型別安全？」

### `List<Pokemon>` 的意思

```java
record Pokemon(String name, int level) {}

List<Pokemon> party = new ArrayList<>();
party.add(new Pokemon("Pikachu", 25));

Pokemon first = party.get(0); // 不需要 Object cast
```

`List<Pokemon>` 只允許加入 `Pokemon` 或其子型別；從 list 取出時，compiler 知道結果是 `Pokemon`。如果你把它寫成 raw `List`，錯誤可能延後到 runtime 才以 `ClassCastException` 爆出。

## 3. Generic Method｜泛型方法 ⭐⭐⭐

Generic method 的 type parameter 寫在回傳型別之前，而不是寫在 method 名稱後面。它可以讓同一個 method 對不同型別工作。

```java
public static <T> T first(List<T> values) {
    if (values.isEmpty()) throw new IllegalArgumentException("empty list");
    return values.get(0);
}

String name = first(List.of("Alex", "Steve"));
Integer number = first(List.of(1, 2, 3));
```

這裡的 `<T>` 是 method 自己的 type parameter。它不一定和 class 的 `<T>` 是同一個變數；即使名字相同，也要看它的宣告範圍。

```java
public final class Converter<T> {
    private final T value;

    public Converter(T value) {
        this.value = value;
    }

    // 這個 R 是 method 自己的 type parameter
    public <R> R convert(Function<T, R> mapper) {
        return mapper.apply(value);
    }
}
```

### Type inference｜型別推導

Java compiler 常能從參數與目標型別推導 type argument，所以可以寫 diamond operator `<>` 或省略 method invocation 的顯式型別。

```java
Box<String> box = new Box<>("inferred");
String first = GenericsPractice.<String>first(List.of("a"));
String same = GenericsPractice.first(List.of("a"));
```

遇到複雜錯誤時，可以暫時寫出明確型別幫助自己閱讀；不要為了追求最短語法而讓 compiler error 變得不可理解。

## 4. Bounded Type Parameter｜有界型別參數 ⭐⭐⭐

沒有 bound 的 `T` 只能安全使用 `Object` 提供的方法。**Bounded type parameter** 用 `extends` 限制 T 必須是某個 class 或 interface 的 subtype，讓 generic method 可以呼叫該 bound 的能力。

```java
public static <T extends Comparable<T>> T max(T left, T right) {
    return left.compareTo(right) >= 0 ? left : right;
}

Integer larger = max(10, 20);
String later = max("alpha", "beta");
```

`T extends Comparable<T>` 的意思不是只能 extends class；在泛型 bound 語境中，`extends` 也可以表示 implements interface。Oracle 的 bounded type parameter 範例正是用 `T extends Comparable<T>` 讓 generic algorithm 安全呼叫 `compareTo`。[4]

### Multiple bounds｜多重界限

```java
static <T extends Number & Comparable<T>> T larger(T left, T right) {
    return left.compareTo(right) >= 0 ? left : right;
}
```

若第一個 bound 是 class，它必須放在最前面，後面才是 interface。多重 bound 不是多重 class inheritance；Java 仍然只允許一個 class superclass。

### Bounded Minecraft 型別

```java
interface Identifiable {
    String id();
}

static <T extends Identifiable> String idOf(T entry) {
    return entry.id();
}
```

當 API method 寫成 `<T extends SomeMinecraftType>`，它通常是在保證「所有 T 都具有 SomeMinecraftType 的能力」。不要看到 `<T extends ...>` 就把它當成 wildcard；bounded type parameter 是在**命名一個可重複使用的 T**，wildcard 是在**描述一個未知型別**。

## 5. Generic invariance｜泛型不具共變性 ⭐⭐⭐

即使 `Pokemon` 是 `Creature` 的子型別，`List<Pokemon>` 也不是 `List<Creature>` 的子型別。

```java
class Creature {}
class Pokemon extends Creature {}

List<Pokemon> pokemon = new ArrayList<>();
// List<Creature> creatures = pokemon; // 編譯錯誤
```

如果這個指定被允許，呼叫端就能把任意 `Creature` 放進只應保存 `Pokemon` 的 list，破壞型別安全。需要只讀取時使用 `List<? extends Creature>`；需要加入 Creature 時使用 `List<? super Pokemon>`。

```java
List<? extends Creature> readable = pokemon;
Creature creature = readable.get(0);

List<Creature> creatures = new ArrayList<>();
List<? super Pokemon> writable = creatures;
writable.add(new Pokemon());
```

## 6. Wildcard｜萬用字元

`?` 代表「某個未知型別」。它不是一個可以在 method body 中直接命名的 type parameter。Wildcard 常放在參數型別，讓 method 接受一整族 parameterized types。[2]

### Unbounded wildcard｜`?`

`List<?>` 表示「某種未知型別的 list」。你可以安全讀成 `Object`，也可以呼叫 `size`、`clear` 等不依賴元素型別的操作；但不能加入任意物件，因為 compiler 不知道它真正接受哪一種型別。

```java
static void printAnyList(List<?> values) {
    for (Object value : values) {
        System.out.println(value);
    }
    // values.add("text"); // 編譯錯誤：未知型別不能隨意加入
}
```

`List<?>` 和 `List<Object>` 不一樣：

| 型別 | 可以傳入 | 可以加入 |
|---|---|---|
| `List<Object>` | 只有真正的 `List<Object>` | `Object` 與任何 subtype |
| `List<?>` | `List<String>`、`List<Integer>` 等任何 parameterized list | 除了 `null` 之外不能安全加入 |

### `? extends T`｜上界 wildcard ⭐⭐⭐

`List<? extends T>` 表示「某種 T 或 T 子型別的 list」。它適合當作 **producer**：你可以讀出 T，但不能加入新的 T，因為實際 list 可能是更窄的子型別。

```java
static double sum(List<? extends Number> values) {
    double total = 0;
    for (Number value : values) {
        total += value.doubleValue();
    }
    return total;
}

List<Integer> integers = List.of(1, 2, 3);
List<Double> doubles = List.of(1.5, 2.5);
System.out.println(sum(integers));
System.out.println(sum(doubles));
```

`? extends Number` 可以接受 `List<Integer>`、`List<Double>` 或 `List<Number>`，但這個 list 不能安全加入 `Integer` 或 `Number`。它不是語法上真正 immutable 的保證，只是對這個 reference 而言，新增元素不被型別系統允許。

Minecraft 閱讀例子：

```java
static void renderBlocks(List<? extends Block> blocks) {
    for (Block block : blocks) {
        render(block);
    }
}
```

這種 API 表示 method 只需要讀取一組 `Block` subtype，不需要擁有或修改原始 collection。

### `? super T`｜下界 wildcard ⭐⭐⭐

`List<? super T>` 表示「某種 T 或 T supertype 的 list」。它適合當作 **consumer**：你可以安全加入 T，但從中讀出來只能保證是 `Object`。

```java
static void addDefaults(List<? super Integer> target) {
    target.add(0);
    target.add(1);
}

List<Integer> integers = new ArrayList<>();
List<Number> numbers = new ArrayList<>();
List<Object> objects = new ArrayList<>();
addDefaults(integers);
addDefaults(numbers);
addDefaults(objects);
```

不要從 `List<? super Integer>` 期待取出 `Integer`；實際上它可能是 `List<Object>`。如果你需要同時讀取精確型別與寫入精確型別，通常應該使用命名的 type parameter，而不是 wildcard。

### PECS：Producer Extends, Consumer Super

| 參數角色 | 優先選擇 | 你能做什麼 |
|---|---|---|
| Producer，只提供資料給你讀 | `? extends T` | 讀成 T；不能加入新的 T |
| Consumer，接受你寫入資料 | `? super T` | 可以加入 T；取出只能當 Object |
| 同時讀寫 | `T` | 以同一個命名型別連結輸入輸出 |
| 只需要 Object 能力 | `?` | 接受任意 parameterized type |

這是設計 public generic method 的起點，不是死背所有 wildcard 的終點。先問「資料流是進來給我讀，還是出去接受我寫？」再決定 bound。

## 7. `Map<Identifier, Block>`：Minecraft 型別閱讀

```java
Map<Identifier, Block> blocks = new HashMap<>();
blocks.put(id("example:calibration_stone"), new Block());

Block block = blocks.get(id("example:calibration_stone"));
```

這段語法表達三件事：`Map` 有兩個 type parameter，第一個 `K` 是 key、第二個 `V` 是 value；這次代入的是 `Identifier` 與 `Block`；從 map 取 value 時 compiler 能知道結果是 `Block`。實際 Minecraft 26.2 loader 可能使用 `Identifier`、`ResourceLocation`、`ResourceKey<Block>` 或其他 registry wrapper，請以 Fabric／NeoForge handbook 與 mapped source 的實際 signature 為準；這裡的重點是 generic reading pattern。

### `RegistryEntry<T>`：泛型 wrapper

看到：

```java
RegistryEntry<Block> blockEntry;
RegistryEntry<Item> itemEntry;
```

你應該讀成：「這是同一種 `RegistryEntry` wrapper，但分別保存／代表 `Block` 與 `Item` 的 entry。」如果 method 宣告：

```java
static <T> void register(RegistryEntry<T> entry) {
    T value = entry.value();
}
```

`T` 會從呼叫端的 entry 型別推導。這讓 registry helper 能重用，又不必把 value 降成 `Object`。

## 8. Generic helper：建立型別安全的 registry index

下面是與 loader 無關的教學 helper；它不是 Fabric 或 NeoForge 的官方 API，而是用來練習泛型如何替代 cast。

```java
public final class RegistryIndex<K, V> {
    private final Map<K, V> values = new HashMap<>();

    public void put(K key, V value) {
        values.put(key, value);
    }

    public Optional<V> find(K key) {
        return Optional.ofNullable(values.get(key));
    }

    public List<V> valuesMatching(Predicate<? super V> predicate) {
        return values.values().stream()
            .filter(predicate)
            .toList();
    }
}

RegistryIndex<Identifier, Block> blockIndex = new RegistryIndex<>();
RegistryIndex<Identifier, Item> itemIndex = new RegistryIndex<>();
```

這裡同時看到 class-level type parameters `<K, V>`、method parameter `Predicate<? super V>`、回傳 `Optional<V>` 與 `List<V>`。`Predicate<? super V>` 允許一個能接受 V 或 V supertype 的 predicate，符合 consumer 方向。

## 9. Type Erasure｜型別擦除 ⭐⭐⭐

Java Generics 主要由 compiler 在 compile time 執行型別檢查；編譯後，type parameters 會被擦除成它的 bound，沒有 bound 時通常擦成 `Object`。compiler 必要時會插入 cast，也可能產生 bridge method 來維持 generic inheritance 的多型。[3]

```java
class Box<T> {
    T get() { return null; }
}
```

概念上，無界 `T` 在 bytecode 中接近 `Object`；若寫成 `T extends Number`，擦除後的第一個 bound 接近 `Number`。因此：

```java
List<String> names = new ArrayList<>();
List<Integer> counts = new ArrayList<>();
// JVM runtime 通常無法直接區分 List<String> 與 List<Integer>
```

### Type Erasure 造成的限制

```java
// ❌ 不能直接 new T()
// T value = new T();

// ❌ 不能建立 parameterized type 的 array
// List<String>[] names = new List<String>[10];

// ❌ 不能用 instanceof 檢查完整 parameterized type
// if (value instanceof List<String>) {}

// ✅ 可以檢查 raw/reifiable 外層，再由設計保證內容
if (value instanceof List<?> list) {
    System.out.println(list.size());
}
```

因為 runtime 通常沒有保留 `String` 或 `Integer` 這類 type argument 的完整資訊，不能依賴 `instanceof List<String>`。若真的需要 runtime type information，通常要顯式傳入 `Class<T>`、使用 loader／library 提供的 `Codec<T>`、或設計專門的 type token。

### Bridge method

當 generic base class 經過 inheritance 後，擦除可能讓 override signature 看起來不同。compiler 可以產生 synthetic bridge method 維持多型；平常不需要手動寫 bridge method，但在 stack trace 或 reflection 中看到 synthetic method 時，不要誤以為它是你漏寫的 business method。[3]

### Heap pollution 與 raw type

```java
@SuppressWarnings({"rawtypes", "unchecked"})
static void unsafe(List raw) {
    raw.add(42);
}

List<String> names = new ArrayList<>();
unsafe(names);
String name = names.get(0); // 可能在這裡 ClassCastException
```

Raw type 會繞過 compiler 的型別檢查，造成 heap pollution。`@SuppressWarnings` 只能縮小在你已經證明安全的邊界，不能把警告整個關掉當成修正。Minecraft mod 尤其不應對 registry、payload 或 event collection 任意 unchecked cast。

## 10. Generic API 設計檢查表

| 問題 | 建議 |
|---|---|
| method 會讀取一族 subtype | `? extends T` |
| method 會接收並寫入 T | `? super T` |
| method 同時需要輸入與輸出相同型別 | `<T>` |
| 需要呼叫 T 的特定能力 | `<T extends SomeType>` |
| 需要兩個 key/value 型別 | `<K, V>` |
| 需要 runtime 判斷 T | 傳入 `Class<T>`、codec 或明確 type token |
| 編譯器出現 unchecked warning | 先修正泛型邊界，不要立即 suppress |
| 看到 loader API 的 `<T>` | 先確認 T 代表 registry value、event、payload 還是 wrapper value |

## Minecraft 實戰閱讀順序

```text
List<Pokemon>
    ↓ 讀懂「容器只接受 Pokemon」
Map<Identifier, Block>
    ↓ 讀懂 K/V 與 registry key/value
RegistryEntry<T>
    ↓ 讀懂 generic wrapper 與 type inference
<T extends SomeMinecraftType>
    ↓ 讀懂 bounded API 能呼叫哪些方法
? extends / ? super
    ↓ 讀懂 API 是 producer 還是 consumer
Type Erasure
    ↓ 理解 cast、reflection、array 與 runtime 限制
```

看到一個 Minecraft signature 時，請依序標記：哪些是 class type、哪些是 type parameter、哪裡有 wildcard、bound 是什麼、呼叫端取得的實際 type argument 是什麼。這套閱讀方法比背 `T` 一定代表什麼更重要。

## 常見錯誤

1. 把 `List<Pokemon>` 當成 `List<Object>`；泛型預設不具共變性。
2. 把 wildcard `?` 當成可以在 method body 使用的命名型別；需要重複使用時改用 `<T>`。
3. 看到 `? extends` 就嘗試加入元素；producer 方向通常只能安全讀取。
4. 看到 `? super` 就期待取出 T；consumer 方向取出通常只能保證是 Object。
5. 使用 raw `List`、raw `Map` 或 unchecked cast 來「先讓它編譯」。
6. 以為 Type Erasure 代表泛型沒有 compile-time 價值；它正是把大量錯誤提前到 compile time。
7. 以為可以 `new T()`、`new List<String>[]` 或 `instanceof List<String>`；這些都受到 runtime type information 限制。
8. 把 `RegistryEntry<T>` 的 T 直接猜成固定類別；先看完整 method signature 與實際 loader mapping。
9. 把 Fabric 與 NeoForge 的 registry generic signature 直接混用；先回到對應平台 handbook。

## S 級練習

請完成一個 `GenericPractice.java`：

1. 寫 `Box<T>`，保存一個 value 並提供 `map(Function<? super T, ? extends R>)`，回傳 `Box<R>`。
2. 寫 `<T extends Comparable<T>> T max(List<T>)`，不要使用 raw type。
3. 寫 `copy(List<? extends T> source, List<? super T> target)`，把 source 元素安全複製到 target。
4. 建立 `RegistryIndex<Identifier, Block>` 與 `RegistryIndex<Identifier, Item>`，確認錯誤型別會在 compile time 被拒絕。
5. 用 `javap -c` 查看 generic helper 編譯後的 bytecode，找出 compiler 插入 cast 的位置。

```java
static <T> void copy(List<? extends T> source, List<? super T> target) {
    for (T value : source) target.add(value);
}
```

如果這五題都能不靠 `@SuppressWarnings("unchecked")` 完成，你就已經具備閱讀大多數 Minecraft Java generic signature 的基本能力。

## 複習速查

- **Type parameter** 是宣告中的 `T`；**type argument** 是使用時代入的 `Pokemon`、`Block` 或 `Item`。
- Generic class 在 class 名稱後宣告 `<T>`；generic method 在回傳型別前宣告 `<T>`。
- Bounded type parameter 用 `<T extends SomeType>` 限制 T 的能力；wildcard 用 `?` 表示未知型別。
- `? extends T` 是 producer；`? super T` 是 consumer；PECS 是設計方向提示。
- `List<Pokemon>`、`Map<Identifier, Block>` 與 `RegistryEntry<T>` 都要先讀懂尖括號的型別契約。
- Type Erasure 讓泛型的主要檢查發生在 compile time，也造成 runtime 無法直接辨識完整 type argument 的限制。
- Minecraft API 的 exact generic signature 依 Fabric、NeoForge、Minecraft mapping 與版本而異，必須以對應 source 與 handbook 為準。

## References

[1]: https://dev.java/learn/generics/ "Generics — Dev.java"
[2]: https://dev.java/learn/generics/wildcards/ "Wildcards — Dev.java"
[3]: https://dev.java/learn/generics/type-erasure/ "Type Erasure — Dev.java"
[4]: https://docs.oracle.com/javase/tutorial/java/generics/boundedTypeParams.html "Generic Methods and Bounded Type Parameters — Oracle Java Tutorials"
[5]: https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html "Types, Values, and Variables — Java Language Specification"
