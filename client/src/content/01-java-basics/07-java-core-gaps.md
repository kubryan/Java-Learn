---
title: Java 基礎缺口：型別轉換、運算子、作用域、static 與 final
slug: java-core-gaps
category: Java 基礎
order: 17
level: 入門
tags: Java, 型別轉換, Type Casting, Operators, Scope, static, final, Minecraft Java, 基礎缺口
aliases: Type Casting, 運算子, 變數作用域, static 關鍵字, final 關鍵字
summary: 補齊 Java 變數之後最容易卡住的五個核心概念，並用 Minecraft 的狀態、座標與註冊情境理解它們。 ⭐ Minecraft 必學
---

# Java 基礎缺口：型別轉換、運算子、作用域、`static` 與 `final`

這篇補上「會宣告變數」之後，最容易讓程式出現隱性錯誤的五個概念。Java 語言基礎不只是記住語法；你要能判斷資料能否安全轉型、運算順序是否符合預期、名稱在哪個範圍有效，以及某個值究竟屬於物件還是整個類別。這些判斷會直接出現在 Minecraft 的座標、生命值、設定常數與註冊器程式中。[1] String 的 immutable、StringBuilder 的 mutable 與大量文字組合已整理到獨立篇 [`String 與 StringBuilder`](./08-strings.md)，本篇只保留 `+` 運算子的基礎提醒。

## 型別轉換｜Type Casting ⭐⭐

Java 會在部分情境中自動進行**拓寬轉換**，例如 `int` 放進 `long`，因為較大的整數型別可以表示原本的值；反過來從 `long` 轉成 `int` 就需要明確 cast，且可能遺失資料。

```java
int blockCount = 64;
long safeCount = blockCount;       // widening conversion

long serverCount = 70L;
int narrowed = (int) serverCount;  // narrowing conversion

int whole = (int) 3.9;              // 小數部分被捨去，不是四捨五入
System.out.println(whole);          // 3
```

參考型別的 cast 只代表「把同一個物件用另一個相容的型別觀看」，不會複製物件。向下轉型前應先用 `instanceof` 檢查，尤其在事件、payload 或多型集合中。

```java
Object value = "fabric";
if (value instanceof String text) {
    System.out.println(text.toUpperCase());
}
```

`String` 不是數字，不能把任意文字直接 cast 成 `int`；請使用 `Integer.parseInt`，並準備處理輸入不合法的例外。Minecraft 的座標通常使用 `int` 或 `double`，不要為了省一個 cast 而忽略溢位與精度。

## 運算子｜Operators ⭐⭐

| 類型 | 常見運算子 | 主要用途 |
|---|---|---|
| 算術 | `+ - * / %` | 數量、傷害、座標與計數 |
| 比較 | `== != < <= > >=` | 判斷數字或 enum 是否符合條件 |
| 邏輯 | `&& || !` | 組合多個 boolean 條件 |
| 指定 | `= += -= *= /=` | 更新狀態 |
| 條件 | `condition ? a : b` | 簡短的二選一值 |
| 位元 | `& \| ^ ~ << >> >>>` | 旗標、bit mask 與低階資料 |

`&&` 和 `||` 具有 short-circuit 行為：如果左側已經足以決定結果，右側不會執行。這可用來避免對 `null` 物件呼叫方法，但不要把太多副作用塞進條件式。

```java
boolean canBreak = player.isCreative() || (tool.isCorrectForDrops(state) && tool.getDurability() > 0);

int page = 7;
int pageSize = 20;
int firstIndex = (page - 1) * pageSize;
```

`+` 遇到 `String` 會變成字串串接；`/` 作用於兩個整數時會做整數除法。`a + b * c` 會先乘除後加減；需要不同順序時請使用括號。比較文字內容要用 `.equals`，不要用 `==` 比較兩個 `String` 的內容。

## 作用域｜Scope ⭐⭐

作用域決定名稱可以被使用的區域。區域變數只在宣告它的 method 或 block 內有效；instance field 屬於某個物件；`static` field 則屬於類別本身。

```java
public final class SpawnCounter {
    private static final int MAX_SPAWNS = 12; // class scope
    private int spawned;                      // object scope

    public void trySpawn() {
        int remaining = MAX_SPAWNS - spawned; // method scope
        if (remaining > 0) {
            int batch = Math.min(remaining, 3); // block scope
            spawned += batch;
        }
    }
}
```

內層 scope 可以遮蔽外層名稱，但這會降低可讀性。不要在不同層級重複使用 `value`、`value2`、`value3` 這類模糊名稱來造成遮蔽；改用 `maxSpawns`、`spawnedCount` 等能表達用途的名稱。

## `static`｜Static ⭐⭐⭐

`static` member 不需要先建立物件就能使用，因為它屬於 class，而不是某個 instance。工具方法、不可變常數與註冊器入口常使用 `static`；需要玩家、世界或物件狀態的方法則不應任意改成 static。

```java
public final class DamageMath {
    private DamageMath() {}

    public static int clamp(int damage, int minimum, int maximum) {
        return Math.max(minimum, Math.min(damage, maximum));
    }
}

int safeDamage = DamageMath.clamp(rawDamage, 0, 20);
```

static method 沒有 `this`，因此不能直接讀取 instance field。Minecraft 模組也不要把 mutable world state 隨意放在 static field；多世界、重新載入與測試環境會讓這種全域狀態變得難以管理。需要生命週期的資料，應交給對應的 server、level、component 或 registry 邊界。

## `final`｜Final ⭐⭐⭐

`final` 的意義取決於它套用的位置：final local variable 只能指定一次；final field 必須在宣告處、instance initializer 或 constructor 完成初始化；final method 不能被 override；final class 不能被繼承。

```java
public final class CalibrationConfig {
    public static final int DEFAULT_RANGE = 16;
    private final String dimension;

    public CalibrationConfig(String dimension) {
        this.dimension = dimension;
    }

    public String dimension() {
        return dimension;
    }
}
```

final reference 不能改指向另一個物件，但物件本身不一定不可變。`final List<String> names` 仍可能 `add`；若需要完整理解 final reference、immutable object、unmodifiable view、defensive copy、record shallow immutability 與 mutable key，請閱讀獨立篇 [`Immutability 與 Mutable Object`](./10-immutability.md)。若需要不可變集合，請選擇適合的 immutable API 或建立 defensive copy。Minecraft 的 registry key、mod id 與設定常數通常應該是 `static final`，避免執行期間被意外改寫。

## `assert`｜Assertions 斷言（低優先級）

Java 的 `assert` 可以把「程式設計者相信應該成立的條件」寫成可啟用的檢查：

```java
assert range >= 0 : "range must not be negative";
```

當 assertions 啟用且條件為 `false` 時，JVM 會丟出 `AssertionError`；也可以省略 message：

```java
assert currentThread == serverThread;
```

但請記住：**`assert` 不等於 `if`。** Assertion 是開發／測試期間的內部 invariant 檢查，不應承擔玩家輸入、權限、網路 payload、設定檔或其他 production contract 的必要驗證。更重要的是，assertions 可能預設沒有啟用；啟動 JVM 時需要使用 `-ea` 或 `-enableassertions`：

```text
java -ea com.example.Main
```

沒有啟用時，assert statement 的條件 expression 甚至可能不會被 evaluation。因此不要把副作用放進 assertion：

```java
assert queue.removeFirst() != null; // ❌ disabled 時 removeFirst() 可能根本不執行
```

對 Minecraft mod／plugin 而言，玩家 command、client payload、權限與範圍檢查應使用明確的 `if`、回傳結果或 exception；assert 比較適合測試內部 registry invariant、只在開發環境驗證的 owner-thread assumption，並且要知道正式啟動參數是否真的開啟它。這個主題屬於低優先級，先理解存在與邊界即可。

## 綜合範例：安全計算方塊傷害

```java
public final class BlockDamage {
    private static final int MAX_DAMAGE = 20;

    private BlockDamage() {}

    public static int calculate(long rawDamage, boolean creative, int resistance) {
        if (creative) return 0;
        int damage = (int) Math.min(rawDamage, Integer.MAX_VALUE);
        return Math.max(0, damage - resistance) % (MAX_DAMAGE + 1);
    }
}
```

這個例子同時使用 `static final`、long 到 int 的受控轉換、boolean 運算、括號與 method scope。真正的遊戲邏輯還要依 API 定義驗證資料來源，不能只依賴 cast 或數學公式。

## 練習

請建立 `JavaCoreGapsPractice.java`，完成三個方法：`parseRange(String)` 將文字轉成非負整數、`clampDamage(long)` 將數字安全限制在 `0..20`、`isValidScope(boolean, int)` 用短路運算判斷狀態。接著把 `MAX_DAMAGE` 改成 `private static final`，嘗試在不同 block 中宣告同名區域變數，觀察 IDE 如何提示遮蔽問題。

## 常見錯誤

1. 把 `==` 當成 String 內容比較；應使用 `.equals` 或明確的 null-safe 比較。
2. 把 `(int) 3.9` 當成四捨五入；cast 只會截去小數。
3. 在 static method 直接使用 instance field；static method 沒有 `this`。
4. 以為 `final` reference 代表物件深度不可變；它只限制 reference 重新指向。
5. 以為任何向下轉型都安全；先用 `instanceof`，並確認實際物件型別。

## 複習速查

- 拓寬轉換通常可自動完成，縮窄轉換要明確 cast 並檢查資料遺失。
- 運算順序不確定時加括號；整數除法與字串串接尤其容易出錯。
- Scope 決定名稱可見範圍；`static` 屬於 class，instance field 屬於物件。
- `final` 適合表達不應重新指定的契約，Minecraft mod id、registry key 與設定常數通常值得使用。

## References

[1]: https://dev.java/learn/language-basics/ "Java Language Basics — Dev.java"
[2]: https://docs.oracle.com/javase/specs/jls/se25/html/jls-5.html "Conversions and Contexts — Java Language Specification"
[3]: https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html "Expressions — Java Language Specification"
