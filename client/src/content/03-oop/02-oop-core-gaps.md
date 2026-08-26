---
title: OOP 進階：多型、抽象類別、介面與組合
slug: oop-core-gaps
category: 物件導向
order: 32
level: 中階
tags: OOP, 多型, Polymorphism, 抽象類別, Abstract Class, 介面, Interface, 組合, Composition, Minecraft Java
aliases: polymorphism, abstract class, interface, composition, 物件導向進階
summary: 用多型替換分支、用介面表達契約、用抽象類別共享骨架，並比較繼承與組合在 Minecraft Java 開發中的選擇。 ⭐ Minecraft 必學
---

# OOP 進階：多型、抽象類別、介面與組合

Minecraft loader 與大型 Java 專案很少只靠一個 class 完成工作。你會遇到 API 定義的 interface、框架提供的 abstract class、不同實作共用的 base type，以及把多個小物件組在一起的 composition。理解這四個概念，才能讀懂「同一個 method 呼叫，實際執行不同實作」的程式碼。[1]

## 多型｜Polymorphism ⭐⭐⭐

多型表示你可以透過共同的父型別操作不同的實際物件。編譯器檢查的是 reference type 能呼叫哪些方法；執行時則由 object 的實際型別決定 override method。

```java
interface DamageSource {
    int amount();
}

final class FallDamage implements DamageSource {
    public int amount() { return 4; }
}

final class FireDamage implements DamageSource {
    public int amount() { return 6; }
}

static int totalDamage(List<DamageSource> sources) {
    return sources.stream().mapToInt(DamageSource::amount).sum();
}
```

`List<DamageSource>` 可以同時放入 `FallDamage` 與 `FireDamage`。呼叫 `amount()` 時，不需要 `if` 判斷每個 class；這正是多型在事件 handler、renderer、block behavior 或 payload handler 中的價值。

Java 只有 single inheritance：一個 class 只能直接 extends 一個 class，但可以 implements 多個 interface。override 時使用 `@Override`，讓 compiler 幫你檢查 method signature 是否真的覆寫。

## 抽象類別｜Abstract Class ⭐⭐⭐

abstract class 適合表達「有共同狀態與部分共用流程，但不能獨立建立」的 base type。它可以有 constructor、field、具體 method 與 abstract method。

```java
abstract class CalibratedBlock {
    private final int range;

    protected CalibratedBlock(int range) {
        this.range = range;
    }

    public final int range() {
        return range;
    }

    public final void calibrate() {
        validate();
        applyCalibration();
    }

    protected abstract void applyCalibration();

    protected void validate() {
        if (range < 0) throw new IllegalArgumentException("range cannot be negative");
    }
}
```

`calibrate()` 是 template method：流程固定，但 `applyCalibration()` 交給子類別實作。`final` method 可避免子類別繞過重要的不變量；`protected` 適合留給受控的子類別 extension point，不要把所有 field 設成 protected 來逃避封裝。

使用 abstract class 的代價是耦合到單一繼承樹。若兩個不相關的物件只是剛好擁有相同能力，interface 通常更彈性。

## 介面｜Interface ⭐⭐⭐

interface 是對外的能力契約。它可以宣告 abstract method，也可以有 `default` 與 `static` method；實作 class 用 `implements` 表示願意遵守這個契約。

```java
interface Tickable {
    void tick();

    default boolean isActive() {
        return true;
    }
}

final class CalibrationTicker implements Tickable {
    private int ticks;

    @Override
    public void tick() {
        ticks++;
    }
}
```

介面最大的價值不是「模擬多重繼承」，而是讓呼叫端依賴穩定能力，不依賴具體 class。Minecraft 的 callback、event listener、payload handler 與 registry consumer 都常用這種函式式或一般介面契約。

```java
void runOneTick(Tickable target) {
    if (target.isActive()) target.tick();
}
```

當你設計 interface 時，保持契約小而聚焦。`Renderable`、`Tickable`、`SerializablePayload` 各自表達一種能力，通常比建立一個包含二十個 method 的 `EverythingHandler` 更容易測試與替換。

## 組合｜Composition ⭐⭐

組合是「has-a」關係：一個物件持有另一個物件，把工作委派出去，而不是透過 extends 複製父類別的行為。它能降低繼承樹耦合，也讓不同策略可以在 constructor 注入。

```java
final class CalibrationStone {
    private final RangePolicy rangePolicy;
    private final Cooldown cooldown;

    CalibrationStone(RangePolicy rangePolicy, Cooldown cooldown) {
        this.rangePolicy = rangePolicy;
        this.cooldown = cooldown;
    }

    boolean canCalibrate(int distance, long gameTime) {
        return rangePolicy.allows(distance) && cooldown.ready(gameTime);
    }
}
```

這個物件不是 extends `RangePolicy` 或 `Cooldown`；它組合兩個協作者。Minecraft 中的 block entity、menu、capability、renderer、data provider 與 service object 常以 composition 組合狀態與行為。

| 關係 | 適合情況 | 風險 |
|---|---|---|
| `extends` | 真正的 is-a 關係，且子類別應遵守父類別契約 | 父類別變更會影響所有子類別 |
| `implements` | 物件需要提供某種能力或 callback | 介面契約過大會造成實作負擔 |
| composition | 物件由多個協作者組成，行為需要替換或測試 | 需要清楚設計協作者邊界 |

## 四個概念一起使用

```java
interface CalibrationAction {
    void execute(CalibrationContext context);
}

abstract class BaseCalibrationAction implements CalibrationAction {
    @Override
    public final void execute(CalibrationContext context) {
        if (!context.isServerSide()) return;
        validate(context);
        perform(context);
    }

    protected void validate(CalibrationContext context) {}
    protected abstract void perform(CalibrationContext context);
}

final class StoneCalibrationAction extends BaseCalibrationAction {
    private final RangePolicy rangePolicy;

    StoneCalibrationAction(RangePolicy rangePolicy) {
        this.rangePolicy = rangePolicy;
    }

    @Override
    protected void perform(CalibrationContext context) {
        if (rangePolicy.allows(context.distance())) context.markCalibrated();
    }
}
```

呼叫端只需要 `CalibrationAction`；共用流程放在 abstract class；具體行為由 subclass override；可替換的距離規則則透過 composition 注入。這種設計比把所有 Minecraft 邏輯塞進一個巨大的 `Mod` class 更容易維護。

## 常見錯誤

1. 為了重用幾行程式碼就 extends 不相干的 class；先判斷是否真的是 is-a。
2. 用 `instanceof` 和一長串 cast 取代多型；這通常代表共同介面還沒設計好。
3. 在 interface 放入所有可能的 method；應拆成小型能力介面。
4. 讓 subclass 覆寫會破壞不變量的 method；必要時使用 `final` 或 template method。
5. 在 common code 直接依賴 client-only class；介面與組合也要遵守 Minecraft 的 client/server 邊界。

## 練習

建立 `CalibrationAction` 介面、`AbstractCalibrationAction` 抽象類別與兩個具體實作：`RangeCalibration` 和 `CooldownCalibration`。再建立 `List<CalibrationAction>`，用多型逐一執行；最後將距離檢查改成 constructor 注入的 `RangePolicy`，觀察 composition 如何讓測試替換規則。

## 複習速查

- 多型讓共同型別的 collection 操作不同實作，減少條件分支。
- abstract class 適合共享狀態與固定流程；interface 適合能力契約。
- composition 是 has-a，通常比為了重用而 extends 更有彈性。
- Minecraft API 的 callback、event handler 與 payload handler 都值得用小型 interface 表達。

## References

[1]: https://dev.java/learn/oop/ "Objects, Classes, Interfaces, Packages, and Inheritance — Dev.java"
[2]: https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html "Classes — Java Language Specification"
[3]: https://docs.oracle.com/javase/specs/jls/se25/html/jls-9.html "Interfaces — Java Language Specification"
