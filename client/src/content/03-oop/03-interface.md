---
title: S 級 Interface：介面、Default Method 與 Functional Interface
slug: java-interface
category: OOP
order: 33
level: 中階到進階
tags: S 級, Interface, 介面, Default Method, Static Method, Functional Interface, Multiple Interface, Abstract Class, Callback, Event Listener, Minecraft Java, Fabric, Paper
aliases: Interface, 介面, Java Interface, Default Method, Static Method, Functional Interface, Multiple Interface, Interface vs Abstract Class
summary: Minecraft、Fabric 與 Paper 開發大量使用的 Interface 完整章節，涵蓋介面契約、default/static method、函式式介面、多重介面與抽象類別比較。 ⭐⭐⭐ S 級
---

# S 級 Interface：介面、Default Method 與 Functional Interface

> **Interface 是 Minecraft Java 開發的 S 級基礎。** Fabric 的 callback、Paper 的 listener、Java Collections 的 `Comparator`，以及許多 registry、event 與 service contract，都會要求你先讀懂「一個型別承諾提供哪些能力」，再讀懂實際由哪個 class 實作。[1] [5]

Interface 不是「沒有程式碼的 class」，也不是只能拿來取代 inheritance 的語法。它是一種 contract：宣告一個 class 對外提供的能力；class 可以實作多個 interface，而不需要被迫繼承多個 class。現代 Java interface 還可以包含 default method、static method、private helper method 與 constants。[2]

## 本章目標

完成這篇後，你應該能夠：

1. 寫出 interface contract，並用 `implements` 讓 class 實作它。
2. 分辨 abstract method、default method、static method 與 private interface method。
3. 理解 Functional Interface 為什麼能接收 Lambda 與 method reference。
4. 處理 class 同時實作多個 interface 時的 default method conflict。
5. 判斷應該使用 Interface、Abstract Class，還是 Composition。
6. 讀懂 Fabric callback、Paper listener、Minecraft registry contract 中的 interface 角色。

## 1. Interface 是能力契約

Interface 宣告「可以做什麼」，class 則負責「如何做到」。呼叫端只依賴 interface type，就可以替換不同 implementation，而不需要知道內部細節。

```java
public interface Calibratable {
    CalibrationResult calibrate(CalibrationContext context);
}

public final class CalibrationStone implements Calibratable {
    @Override
    public CalibrationResult calibrate(CalibrationContext context) {
        return CalibrationResult.success(context.range());
    }
}
```

呼叫端可以使用 interface reference：

```java
Calibratable device = new CalibrationStone();
CalibrationResult result = device.calibrate(context);
```

`device` 的 static type 是 `Calibratable`，runtime object 是 `CalibrationStone`。compiler 只允許你呼叫 interface contract 裡定義的成員；真正執行哪一個 implementation，則由 dynamic dispatch 決定。這就是 interface 與 polymorphism 的連接點。

## 2. Interface 的基本結構

Interface body 可以包含 abstract methods、default methods、static methods 與 constants。[2]

```java
public interface BlockHandler {
    int DEFAULT_RANGE = 4; // 隱含 public static final

    void onBlockChanged(BlockContext context); // abstract method

    default boolean accepts(BlockContext context) {
        return context.range() <= DEFAULT_RANGE;
    }

    static BlockHandler logging(Consumer<BlockContext> sink) {
        return context -> {
            sink.accept(context);
            return;
        };
    }
}
```

對傳統 public interface 來說，abstract、default 與 static method 預設具有 public 可見性；interface field 預設是 `public static final`。即使語法可以省略 modifier，教學或 public API 仍可依團隊規範明確寫出，避免讀者誤解。

### Abstract method

Abstract method 只有 signature，沒有 body；concrete class 必須實作它，除非 class 自己仍然是 abstract。

```java
public interface Tickable {
    void tick(ServerContext context);
}
```

### Interface 不可直接 new

```java
// Tickable tickable = new Tickable(); // 編譯錯誤
Tickable tickable = context -> System.out.println("tick");
```

如果 interface 是 Functional Interface，可以用 Lambda 建立 implementation；否則要使用具名 class 或 anonymous class。

## 3. `implements` 與 Multiple Interface ⭐⭐⭐

一個 class 可以實作多個 interface；如果 class 同時 extends 一個 superclass，`extends` 必須放在 `implements` 前面。[1]

```java
public final class CalibrationBlock
        extends BaseBlock
        implements Calibratable, Tickable, SerializableLike {

    @Override
    public CalibrationResult calibrate(CalibrationContext context) {
        return CalibrationResult.success(context.range());
    }

    @Override
    public void tick(ServerContext context) {
        // tick logic
    }
}
```

這不是 multiple class inheritance。Java class 仍然只能直接 extends 一個 class，但可以實作多個彼此獨立的能力契約。這種設計特別適合把「可互動」「可 tick」「可序列化」「可渲染」等能力拆開，而不是建立一個巨大 base class。

Interface 也可以 extends 多個 parent interfaces：

```java
public interface ServerCalibratable extends Calibratable, PermissionAware {
    CalibrationResult calibrateAsServer(ServerContext context);
}
```

## 4. Default Method｜預設方法 ⭐⭐⭐

`default` method 有 body，提供一個 interface-level 的預設行為。它讓 library 可以在不立即破壞既有 implementation 的情況下，為 interface 增加新能力。[1] [3]

```java
public interface Describable {
    String id();

    default String displayName() {
        return id().replace('_', ' ');
    }
}

final class StoneEntry implements Describable {
    @Override
    public String id() {
        return "calibration_stone";
    }
    // 自動繼承 displayName()
}
```

### Override default method

implementation 可以接受預設行為，也可以覆寫它：

```java
final class SpecialEntry implements Describable {
    @Override
    public String id() {
        return "special_entry";
    }

    @Override
    public String displayName() {
        return "Special Calibration Entry";
    }
}
```

### 明確呼叫 parent interface default

如果要使用 parent interface 的預設實作，可以寫 `InterfaceName.super.method()`：

```java
public interface SafeHandler extends Describable {
    @Override
    default String displayName() {
        return Describable.super.displayName().toUpperCase();
    }
}
```

`InterfaceName.super` 只能用在實作／繼承該 interface 的 class 或 subinterface 的合法情境，不能當成任意 static call。

### Default method 的設計界線

Default method 適合提供不會破壞既有實作的合理預設行為；它不應偷偷依賴 implementation 才有的 mutable state，也不應把複雜 domain lifecycle 藏在 interface 裡。當新方法沒有安全通用的預設值時，建立新 interface 或保持 abstract method 會更誠實。

## 5. Static Method｜介面的靜態方法 ⭐⭐

Interface 的 static method 屬於 interface 本身，不屬於 implementation instance，也不會被 implementation class 繼承或 override。應該使用 interface 名稱呼叫：

```java
public interface CalibrationIds {
    static String normalize(String raw) {
        return raw.trim().toLowerCase().replace(' ', '_');
    }
}

String id = CalibrationIds.normalize("Calibration Stone");
```

Static method 適合放「只與這個 contract 相關」的 factory、validator 或 helper。它不是 instance 的 polymorphic behavior；下面的寫法不正確：

```java
// CalibrationIds ids = ...;
// ids.normalize("..."); // 不要透過 instance 呼叫 interface static method
```

Java SE 9 起，interface 也可以使用 private method，抽出多個 default method 共用的 implementation detail；private method 不會成為 implementation class 的 public contract。[1]

## 6. Functional Interface｜函式式介面 ⭐⭐⭐

Functional Interface 概念上只有一個 abstract method，因此可以由 Lambda、method reference 或 constructor reference 建立 instance。[4] `default` 與 `static` method 不會增加 abstract method count；若 interface 另外宣告覆寫 `Object` public method 的 abstract signature，也不會因此失去 functional interface 資格。

```java
@FunctionalInterface
public interface BlockPredicate {
    boolean test(BlockContext context);
}

BlockPredicate isWithinRange = context -> context.range() <= 16;
BlockPredicate isLoaded = BlockContext::isLoaded;
```

`@FunctionalInterface` 是給 compiler 與讀者的設計保證。即使不寫 annotation，只要 interface 符合規則仍可被 Lambda 使用；寫上 annotation 後，如果未來有人新增第二個 abstract method，compiler 會立即報錯。[4]

### 常見 JDK Functional Interface

| Interface | 方法形狀 | 常見用途 |
|---|---|---|
| `Predicate<T>` | `boolean test(T)` | 條件判斷、filter |
| `Function<T, R>` | `R apply(T)` | 型別轉換、map |
| `Consumer<T>` | `void accept(T)` | event handler、log |
| `Supplier<T>` | `T get()` | 延遲建立、factory |
| `Comparator<T>` | `int compare(T, T)` | 排序 |

Minecraft callback interface 常常也是 functional interface；但不要只看到 Lambda 就假設它一定能取消事件。要閱讀 callback 的 return type、`PASS`／`SUCCESS`／`FAIL` 語意與呼叫時機。

## 7. Multiple Interface 的 default conflict ⭐⭐⭐

如果兩個 interface 提供相同 signature 的 default method，而 class 同時實作兩者，compiler 不會猜哪一份是正確的；class 必須 override 並明確決定行為。

```java
interface Left {
    default String side() { return "left"; }
}

interface Right {
    default String side() { return "right"; }
}

final class Both implements Left, Right {
    @Override
    public String side() {
        return Left.super.side() + "+" + Right.super.side();
    }
}
```

若一個 interface 的 abstract method 與另一個 interface 的 default method signature 相同，abstract contract 可能要求 class 提供自己的實作。class method 優先於 interface default；更具體的 subinterface default 也可能優先於 parent default。遇到 conflict 時，最好的做法是明確 override，而不是依賴複雜的 inheritance 規則。

## 8. Interface vs Abstract Class ⭐⭐⭐

Interface 與 abstract class 都可以建立抽象 contract，但它們的設計重點不同。

| 問題 | Interface | Abstract Class |
|---|---|---|
| 主要表達 | 能力／角色／契約 | 共享的基礎類別與部分實作 |
| 一個 class 可使用幾個 | 多個 interface | 一個 superclass |
| instance state | 不適合保存 instance state；可有 constants | 可以有 fields 與 mutable state |
| constructor | 沒有 instance constructor | 可以有 constructor |
| method | abstract、default、static、private | abstract 與 concrete instance/static methods |
| 何時使用 | 不同 class 共享一種能力 | 一組 class 真正共享 is-a 基礎與 lifecycle |
| Minecraft 例子 | callback、listener、capability、contract | 共享 block/entity/item base behavior |

```java
interface Renderable {
    void render(RenderContext context);
}

abstract class MachineBlock {
    protected final int energyCapacity;

    protected MachineBlock(int energyCapacity) {
        this.energyCapacity = energyCapacity;
    }

    protected abstract void process(ServerContext context);
}

final class CalibrationMachine extends MachineBlock implements Renderable {
    CalibrationMachine() {
        super(1000);
    }

    @Override
    protected void process(ServerContext context) {
        // shared state + specialized behavior
    }

    @Override
    public void render(RenderContext context) {
        // client-facing capability
    }
}
```

不要因為「有一個共用 method」就建立 abstract class；如果型別只是共享能力，interface 通常更彈性。反過來，如果多個 class 需要共享 constructor、protected state、invariant 與 lifecycle，abstract class 會比大量 default method 更合適。

## 9. Composition 與 Interface

Interface 描述可以做什麼，Composition 把不同協作者組合起來。兩者經常一起使用，避免建立深而脆弱的 inheritance tree。

```java
final class CalibrationService {
    private final RangePolicy rangePolicy;
    private final ResultReporter reporter;

    CalibrationService(RangePolicy rangePolicy, ResultReporter reporter) {
        this.rangePolicy = rangePolicy;
        this.reporter = reporter;
    }

    void calibrate(CalibrationContext context) {
        if (rangePolicy.allows(context.range())) {
            reporter.report("calibrated");
        }
    }
}
```

`RangePolicy` 與 `ResultReporter` 可以是 interface，測試時注入 fake implementation；正式環境則注入 Minecraft server、log 或 event implementation。這比讓 `CalibrationService` extends 一個巨大基礎類別更容易測試與替換。

## 10. Fabric：Callback Interface 與 Event ⭐⭐⭐

Fabric API 的 events 由 `Event` instance 管理 callbacks；通常每個 event 有對應的 callback interface，透過 `EVENT.register()` 註冊 callback。[5]

```java
AttackBlockCallback.EVENT.register((player, level, hand, pos, direction) -> {
    // callback interface 的 abstract method 由 lambda 實作
    return InteractionResult.PASS;
});
```

這段程式的重點不是 Lambda 本身，而是：`AttackBlockCallback` 定義 listener contract；`EVENT` 保存註冊入口；callback 的 return value 可能決定後續 listener 是否繼續執行。Fabric 文件中的 custom event 也會用 callback interface 描述 listener 能接收什麼參數、回傳什麼結果。[5]

不要把 Fabric callback interface 當成 NeoForge event bus 或 Paper listener。三者都使用 interface 概念，但註冊方法、事件生命週期、取消語意與 package 都不同。

## 11. Paper：Listener Interface 與 Event Handler ⭐⭐⭐

Paper plugin 要接收事件時，listener class 會實作 `org.bukkit.event.Listener`，事件方法使用 `@EventHandler`，再由 plugin manager 註冊 listener。[6]

```java
public final class CalibrationListener implements Listener {
    @EventHandler
    public void onPlayerMove(PlayerMoveEvent event) {
        // 對 Paper event 做反應
    }
}

@Override
public void onEnable() {
    getServer().getPluginManager()
        .registerEvents(new CalibrationListener(), this);
}
```

Paper 的 `Listener` 是 plugin event system 的 contract；`@EventHandler` 則告訴 framework 哪個 method 是 handler。某些 Paper event 會實作 `Cancellable`，這是另一個 interface contract；看到 `event.setCancelled(true)` 前，必須先確認該 event 是否真的實作可取消介面。[6]

Fabric 與 Paper 的相似點是都依賴 interface contract 與 callback／listener；不同點是它們的 API、生命週期、註冊器與事件回傳語意不能互換。不要把 `@EventHandler` 寫進 Fabric callback，也不要把 Fabric `EVENT.register()` 當成 Paper plugin manager。

## 12. Registry 與介面型 API 的閱讀方法

閱讀 Minecraft API 時，先把 interface 當成「型別能力」而不是「檔案名稱」：

```java
interface RegistryLike<T> {
    void register(ResourceKey<T> key, T value);
}
```

看到 `RegistryLike<T>`，先回答：

1. `RegistryLike` 是 contract，還是具體 implementation？
2. `T` 代表 registry value、event、payload 還是另一個 wrapper？
3. 呼叫端拿到的是 interface reference，還是可直接建立的 class？
4. method 是 abstract contract、default behavior，還是 static factory？
5. 這個 interface 是 Fabric、NeoForge、Paper，還是 vanilla／JDK API？

實際 Fabric／NeoForge 26.2 registry signature 會依 mapping 與 loader 不同；請使用對應 handbook 的 package、Gradle source 與官方文件。interface 的共通 Java 語法可以跨平台學習，但 API 類別與註冊生命週期不能跨 loader 直接複製。

## 13. Interface 與 Generics 的交會 ⭐⭐⭐

Minecraft API 常同時出現 interface 與泛型：

```java
interface Codec<T> {
    T decode(String input);
}

Codec<Block> blockCodec = input -> decodeBlock(input);
Codec<Item> itemCodec = input -> decodeItem(input);
```

這裡 `Codec<T>` 先定義「可以 decode 某種 T」的 contract，接著用 type argument 指定 `Block` 或 `Item`。如果再出現 `Codec<? extends Block>` 或 `<T extends RegistryValue>`，請先讀獨立的 [Generics S 級章節](../05-modern-java/00-generics.md)，再回頭分析 interface contract。

## 常見錯誤

1. 把 interface 當成可以 `new` 的具體 class；應使用 implementation、anonymous class 或 Lambda。
2. 認為 interface 只能有 abstract method；現代 Java 也有 default、static 與 private method。
3. 以為 interface static method 會被 implementation 繼承；它只能透過 interface 名稱呼叫。
4. 新增 default method 時沒有檢查與其他 interface 的 signature conflict。
5. 把 Functional Interface 誤認成「只能有一個 method」；它只能有一個 abstract method，default/static method 不計入。
6. 把 `Listener`、Fabric callback、NeoForge event bus 與 Paper event handler 當成相同 API。
7. 為了共用一個 method 就建立 abstract class，結果失去 class 的多重能力組合彈性。
8. 以為 interface 會自動保存 instance state；需要 fields、constructor 與 lifecycle 時應評估 abstract class 或 composition。
9. 看到 `@Override` 就假設是 interface method；它也可能是 superclass method。

## S 級練習

請完成 `InterfacePractice.java`：

1. 建立 `Calibratable`、`PermissionAware` 與 `Tickable` 三個 interface。
2. 讓一個 `CalibrationStone` class implements 三個 interface，使用不同的 method contract。
3. 在 interface 加入一個安全的 default method 與一個 static factory。
4. 建立兩個 Functional Interface，分別用 Lambda 與 method reference 實作。
5. 建立兩個都提供同名 default method 的 interface，在 class 中明確用 `Left.super`／`Right.super` 解決 conflict。
6. 寫一個只依賴 interface 的 `CalibrationService`，用 fake implementation 完成單元測試。
7. 最後將 `Calibratable<T>` 改成 generic interface，練習 `RegistryEntry<Block>` 與 `RegistryEntry<Item>` 的型別安全。

```java
@FunctionalInterface
interface CalibrationRule {
    boolean accepts(CalibrationContext context);
}

static CalibrationRule maxRange(int max) {
    return context -> context.range() <= max;
}
```

如果你能解釋每一個 `implements`、`default`、`static`、`@FunctionalInterface`、`Left.super` 與 Lambda target type 的角色，就已經具備閱讀大部分 Minecraft event／callback interface 的基礎能力。

## 複習速查

- Interface 是能力契約；class 是 implementation；呼叫端可以依賴 interface type。
- 一個 class 可以 implements 多個 interface，但只能 extends 一個 class。
- abstract method 沒有 body；default method 提供可繼承的預設行為；static method 屬於 interface 本身。
- Functional Interface 只有一個 abstract method，因此可以接收 Lambda、method reference 或 constructor reference。
- Multiple interface 發生 default conflict 時，class 應明確 override 並選擇行為。
- Interface 適合能力與契約；abstract class 適合共享 state、constructor、invariant 與 lifecycle；Composition 適合組合協作者。
- Fabric callback、NeoForge event、Paper Listener 都使用 interface 思想，但 API 與生命週期完全不同。
- 看到 `List<Pokemon>`、`RegistryEntry<T>` 或 `Codec<Block>` 時，要同時讀 interface contract 與泛型型別參數。

## References

[1]: https://dev.java/learn/implementing-an-interface/ "Implementing an Interface — Dev.java"
[2]: https://docs.oracle.com/javase/tutorial/java/IandI/interfaceDef.html "Defining an Interface — Oracle Java Tutorials"
[3]: https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html "Default Methods — Oracle Java Tutorials"
[4]: https://docs.oracle.com/javase/8/docs/api/java/lang/FunctionalInterface.html "FunctionalInterface API — Java SE"
[5]: https://docs.fabricmc.net/develop/events "Events 26.2 — Fabric Developer Documentation"
[6]: https://docs.papermc.io/paper/dev/event-listeners/ "Listeners — PaperMC Documentation"
