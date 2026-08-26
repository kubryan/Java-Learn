---
title: S 級 Enum：列舉、EnumSet 與 EnumMap
slug: java-enum
category: Java 現代語法
order: 72
level: 中階到進階
tags: S 級, Enum, 列舉, Enum Fields, Enum Methods, Enum Constructor, EnumSet, EnumMap, Switch, Minecraft Java, Fabric, NeoForge, ToolType
aliases: Enum, 列舉, Java Enum, Enum Fields, Enum Methods, Enum Constructor, EnumSet, EnumMap
summary: Minecraft Java 開發常用的列舉完整章節，涵蓋 Enum fields、methods、constructor、EnumSet、EnumMap、switch 與穩定序列化。 ⭐⭐⭐ S 級
---

# S 級 Enum：列舉、EnumSet 與 EnumMap

> **Enum 是用型別安全表示有限選項的工具。** 當一個值只能是事先知道的幾種狀態，例如工具類型、方向、互動手、遊戲模式或結果狀態，Enum 比散落的 `int`、`String` 與 magic number 更能讓 compiler 幫你檢查錯誤。[1]

Java 的 enum declaration 不只是常數清單；它會定義一個特殊的 class，可以擁有 fields、methods、constructor 與 interface contract。每一個 enum constant 都是該 enum type 的 singleton instance，而且所有 enum 都隱含繼承 `java.lang.Enum`，因此不能再 extends 其他 class。[1] [2]

## 本章目標

完成這篇後，你應該能夠：

1. 用 `enum` 建立固定且型別安全的選項集合。
2. 讀懂 Enum Fields、Enum Methods 與 Enum Constructor。
3. 使用 `values()`、`valueOf()`、`name()`、`toString()`、`ordinal()` 與 `switch`。
4. 為每個 enum constant 加入資料與不同的行為。
5. 使用 `EnumSet` 表示多個 enum flags，使用 `EnumMap` 建立 enum key 的 lookup table。
6. 避免把 `ordinal()` 當成永久存檔或網路 protocol 的 id。
7. 讀懂 Minecraft、Fabric 與 NeoForge API 中常見的 enum type。

## 1. 最基本的 Enum：`ToolType`

你提供的例子是一個典型 enum：

```java
public enum ToolType {
    PICKAXE,
    AXE,
    SHOVEL
}
```

`ToolType` 變數只能是三個常數之一：

```java
ToolType tool = ToolType.PICKAXE;

if (tool == ToolType.PICKAXE) {
    System.out.println("mine stone");
}
```

Enum comparison 通常使用 `==`，因為同一個 enum constant 是唯一 instance；不要把 enum 與任意字串混在一起比較：

```java
// ❌ 不要讓 domain value 退化成 String
String rawTool = "PICKAXE";

// ✅ 在邊界解析一次，內部使用型別安全的 enum
ToolType parsed = ToolType.valueOf(rawTool);
```

`valueOf` 要求名稱完全相同，包含大小寫與空白。外部輸入應先做明確驗證或建立安全的 parse method，不要讓不可信的字串直接把 `IllegalArgumentException` 冒泡到遊戲主迴圈。

## 2. Enum Fields｜列舉欄位 ⭐⭐⭐

Enum constant 可以攜帶自己的資料。宣告 fields 時，enum constants 必須放在最前面；如果後面還有 fields 或 methods，最後一個 constant 後要加分號。[1]

```java
public enum ToolType {
    PICKAXE("pickaxe", 3.0F),
    AXE("axe", 2.0F),
    SHOVEL("shovel", 1.5F);

    private final String serializedName;
    private final float speedMultiplier;

    ToolType(String serializedName, float speedMultiplier) {
        this.serializedName = serializedName;
        this.speedMultiplier = speedMultiplier;
    }

    public String serializedName() {
        return serializedName;
    }

    public float speedMultiplier() {
        return speedMultiplier;
    }
}
```

這裡的 `serializedName` 與 `speedMultiplier` 是每個 enum constant 各自擁有的 instance fields；`PICKAXE`、`AXE`、`SHOVEL` 會各自保存不同值。把 field 宣告成 `private final` 可以讓 enum constant 建立後保持不可變，這通常比公開 mutable field 安全。

### Enum Field 與 static field

Enum 也可以有 static field，但要區分「每個 constant 的資料」與「整個 enum type 共用的資料」：

```java
public enum ToolType {
    PICKAXE,
    AXE,
    SHOVEL;

    public static final int MAX_TOOL_COUNT = 3;
}
```

`MAX_TOOL_COUNT` 屬於 `ToolType` 這個 enum class，不屬於某一個 tool constant。若它可以由 `values().length` 計算，避免另外維護容易過期的數字。

## 3. Enum Constructor｜列舉建構子 ⭐⭐⭐

Enum constructor 由 compiler 在建立 constants 時呼叫，不能由程式設計師使用 `new` 自己呼叫。constructor 通常寫成 package-private 或 private；enum constant 必須先於 fields 與 methods 宣告。[1]

```java
public enum ToolType {
    PICKAXE("pickaxe", true),
    AXE("axe", true),
    SHOVEL("shovel", false);

    private final String id;
    private final boolean affectsLogs;

    private ToolType(String id, boolean affectsLogs) {
        this.id = id;
        this.affectsLogs = affectsLogs;
    }

    public boolean affectsLogs() {
        return affectsLogs;
    }
}
```

下面的寫法不合法：

```java
// ❌ enum constructor 不能這樣呼叫
// ToolType custom = new ToolType("custom", true);
```

Enum 適合代表「編譯時已知的固定集合」。如果玩家可以在 runtime 新增任意工具類型，就不應該硬塞進 enum；應考慮 registry、資料驅動定義或一般 class。

## 4. Enum Methods｜列舉方法 ⭐⭐⭐

每個 enum 都會擁有幾個重要方法；其中 `values()` 與 `valueOf(String)` 是 compiler 為每個 enum type 提供的隱含 static methods。[1] [2]

| 方法 | 作用 | 注意事項 |
|---|---|---|
| `values()` | 取得全部 constants，順序是宣告順序 | 每次呼叫會取得 array；不要修改它期待影響 enum |
| `valueOf(String)` | 依精確名稱取得 constant | 大小寫、空白都必須完全符合 |
| `name()` | 取得精確宣告名稱 | 適合需要穩定 Java identifier 的情境 |
| `toString()` | 取得文字表示 | 可以覆寫成使用者友善文字 |
| `ordinal()` | 取得宣告位置，從 0 開始 | 不應作永久資料 id |
| `compareTo()` | 依宣告順序比較同一 enum type | 不要把宣告順序誤當商業排序規則 |
| `getDeclaringClass()` | 取得 enum 的宣告 class | 少數 reflection 或 framework 情境使用 |

```java
for (ToolType type : ToolType.values()) {
    System.out.println(type.name() + " -> " + type.serializedName());
}

ToolType selected = ToolType.valueOf("PICKAXE");
System.out.println(selected.toString());
```

### `name()` 與 `toString()` 的差異

`name()` 會回傳宣告時的精確名稱，主要給需要穩定、不可變的識別情境。`toString()` 是可覆寫的呈現文字，適合 log 或 UI；不要把可變更的 `toString()` 當成存檔格式。[2]

```java
public enum ToolType {
    PICKAXE("Pickaxe"),
    AXE("Axe"),
    SHOVEL("Shovel");

    private final String displayName;

    ToolType(String displayName) {
        this.displayName = displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
```

### `ordinal()` 的危險

`ordinal()` 只代表目前 source 中的宣告位置。如果未來在 `PICKAXE` 前面新增 `HOE`，所有後續 ordinal 都會改變。不要把 ordinal 寫進 world data、config、database、NBT、網路 payload 或 Git 版本相依的資料格式。

```java
// ❌ 不穩定：ToolType 宣告順序一改，資料意義就改變
int saved = tool.ordinal();

// ✅ 使用明確且可維護的 id
String saved = tool.serializedName();
```

## 5. Enum Methods 與行為

Enum 不只能保存資料，也可以保存與該 constant 相關的行為。最簡單的方式是共用一個 method，根據 fields 產生結果：

```java
public enum ToolType {
    PICKAXE(3.0F),
    AXE(2.0F),
    SHOVEL(1.5F);

    private final float speed;

    ToolType(float speed) {
        this.speed = speed;
    }

    public boolean canBreak(BlockKind block) {
        return switch (this) {
            case PICKAXE -> block.isStoneLike();
            case AXE -> block.isWoodLike();
            case SHOVEL -> block.isDirtLike();
        };
    }

    public float speed() {
        return speed;
    }
}
```

如果每個 constant 的行為差異很大，可以使用 constant-specific class body，讓個別 constant override method：

```java
public enum InteractionMode {
    USE {
        @Override
        public InteractionResult apply(GameContext context) {
            return context.useItem();
        }
    },
    ATTACK {
        @Override
        public InteractionResult apply(GameContext context) {
            return context.attackTarget();
        }
    };

    public abstract InteractionResult apply(GameContext context);
}
```

這種寫法很有表達力，但不要讓 enum 變成整個 domain service。當行為需要大量 dependency、外部狀態或頻繁擴充時，使用 interface、strategy class 或 registry 會更容易維護。

## 6. Enum 與 `switch` ⭐⭐⭐

Enum 很適合搭配 switch，因為 compiler 可以協助檢查 cases；現代 Java 的 switch expression 也能直接產生值：

```java
public int baseDamage(ToolType type) {
    return switch (type) {
        case PICKAXE -> 4;
        case AXE -> 5;
        case SHOVEL -> 2;
    };
}
```

當 enum 新增一個 constant，編譯器可能提醒你既有 switch expression 沒有處理新 case。這是 enum 比 `String` 或 `int` 更有價值的地方：新增狀態時，漏改的程式碼比較容易被發現。

如果 switch 來自不可信輸入或未來可能出現未知值，要在輸入解析層做好錯誤處理；不要把 `default` 當成掩蓋所有遺漏 case 的工具。

## 7. EnumSet｜列舉集合 ⭐⭐⭐

`EnumSet<E>` 是只給單一 enum type 使用的 Set。Java SE API 將它描述為針對 enum 的 specialized Set，內部以 bit vectors 表示，通常比用 `HashSet` 表達 enum flags 更緊湊；它不允許 null，iterator 依 enum constants 的 natural order 走訪。[3]

```java
EnumSet<ToolType> effectiveTools = EnumSet.of(
    ToolType.PICKAXE,
    ToolType.SHOVEL
);

effectiveTools.add(ToolType.AXE);
boolean hasPickaxe = effectiveTools.contains(ToolType.PICKAXE);
```

### 常用 EnumSet factory

```java
EnumSet<ToolType> none = EnumSet.noneOf(ToolType.class);
EnumSet<ToolType> all = EnumSet.allOf(ToolType.class);
EnumSet<ToolType> selected = EnumSet.of(ToolType.PICKAXE, ToolType.AXE);
EnumSet<ToolType> range = EnumSet.range(ToolType.PICKAXE, ToolType.SHOVEL);
EnumSet<ToolType> missing = EnumSet.complementOf(selected);
EnumSet<ToolType> copy = EnumSet.copyOf(selected);
```

`EnumSet.range(from, to)` 依 enum 宣告順序包含兩端；因此不要把 enum constant 的 source 排序當成隱藏商業規則。若你要表達「玩家目前具有哪些能力」或「某個 block 支援哪些工具」，EnumSet 通常比 `Set<String>` 更適合。

```java
public final class ToolProfile {
    private final EnumSet<ToolType> usableTools;

    public ToolProfile(EnumSet<ToolType> usableTools) {
        this.usableTools = usableTools.clone();
    }

    public boolean canUse(ToolType type) {
        return usableTools.contains(type);
    }
}
```

### EnumSet 的泛型邊界

你看到 `EnumSet<E extends Enum<E>>` 時，可以把它理解成：「E 必須是某一個 enum type」。這個 bounded type parameter 阻止你建立 `EnumSet<String>` 或混合 `ToolType`、`Direction` 的集合。[3]

## 8. EnumMap｜列舉鍵值表 ⭐⭐⭐

`EnumMap<K, V>` 是 enum key 專用的 Map；所有 key 必須來自同一個 enum type，內部以 array 表示，key iterator 依 enum constants 的宣告順序，且不允許 null key。[4]

```java
EnumMap<ToolType, Integer> durabilityCost = new EnumMap<>(ToolType.class);
durabilityCost.put(ToolType.PICKAXE, 2);
durabilityCost.put(ToolType.AXE, 3);
durabilityCost.put(ToolType.SHOVEL, 1);

int cost = durabilityCost.getOrDefault(ToolType.PICKAXE, 0);
```

EnumMap 適合「每一個 enum state 對應一份資料」的情境，例如每種工具的 cooldown、每種方向的 offset、每種遊戲狀態的 handler 或每種互動結果的統計。

```java
public enum GamePhase {
    LOADING,
    PLAYING,
    FINISHED
}

EnumMap<GamePhase, Runnable> phaseActions = new EnumMap<>(GamePhase.class);
phaseActions.put(GamePhase.LOADING, () -> loadWorld());
phaseActions.put(GamePhase.PLAYING, () -> tickGame());
phaseActions.put(GamePhase.FINISHED, () -> closeGame());
```

與 `HashMap` 相比，EnumMap 的優勢來自它知道 key 是固定 enum type；不過選擇資料結構時仍要看資料形狀。若 key 是玩家建立的 arbitrary `Identifier`，就不應硬改成 EnumMap。

## 9. Enum 與 Minecraft API ⭐⭐⭐

Minecraft Java API 中常見許多 enum 或 enum-like type，用來表示有限的遊戲概念。實際 package、mapping 與版本 signature 會依 vanilla、Fabric、NeoForge 或 Paper 平台不同；下面的重點是學習如何閱讀型別，而不是把不同 loader 的 import 直接複製。

常見概念包括：

| 概念 | 可能遇到的型別 | 如何閱讀 |
|---|---|---|
| 方位 | `Direction` | `NORTH`、`SOUTH` 等有限方向，常搭配 axis／向量資料 |
| 互動手 | `InteractionHand` | 判斷 main hand 或 off hand |
| 互動結果 | `InteractionResult` | 依 API 語意回傳 pass、success、fail 等結果 |
| 遊戲模式 | `GameType` 或對應 mapping 型別 | 表示 survival、creative 等有限模式 |
| 裝備位置 | `EquipmentSlot` | 表示 head、chest、main hand 等固定位置 |
| 工具動畫 | `UseAnim` 或對應 mapping 型別 | 表示使用物品時的有限動畫類型 |

讀到這種 method 時：

```java
InteractionResult interact(
    Player player,
    InteractionHand hand,
    Direction direction
);
```

不要只把它看成三個參數。`InteractionHand`、`Direction` 與 `InteractionResult` 都是在 contract 中限制值域的型別；它們讓 callback 的輸入與輸出比 `String hand`、`int direction`、`boolean success` 更清楚。

### Fabric callback 中的 Enum

Fabric event callback 常把 `InteractionHand`、`Direction` 與 `ActionResult` 類似的結果型別放進 callback contract。註冊方式與結果語意請以對應 Fabric 版本文件為準；不要因為看到 enum 名稱相似，就把 Fabric callback 的 return value 當成 Paper event cancellation 或 NeoForge event result。

```java
AttackBlockCallback.EVENT.register(
    (player, level, hand, pos, direction) -> {
        if (hand == InteractionHand.MAIN_HAND
                && direction == Direction.UP) {
            return InteractionResult.PASS;
        }
        return InteractionResult.PASS;
    }
);
```

### NeoForge 與 registry 狀態

NeoForge API 也會在許多 vanilla／framework contract 中使用有限狀態型別。讀 registry、payload 或 event API 時，先確認這個 enum 是 vanilla type、NeoForge type 還是 mapping alias，再查當前 26.2 MDK 的 source。Enum 的 Java 語法可以共通學習，但 loader-specific event result 與生命週期不能互換。

## 10. Enum 介面、泛型與 Minecraft 設計

Enum 可以 implements interface，也可以與泛型集合一起使用：

```java
public interface IdProvider {
    String id();
}

public enum ToolType implements IdProvider {
    PICKAXE("pickaxe"),
    AXE("axe"),
    SHOVEL("shovel");

    private final String id;

    ToolType(String id) {
        this.id = id;
    }

    @Override
    public String id() {
        return id;
    }
}
```

```java
EnumMap<ToolType, List<BlockKind>> effectiveBlocks =
    new EnumMap<>(ToolType.class);
```

這裡同時出現 interface、enum、EnumMap、List 與泛型。遇到 `EnumMap<ToolType, Handler>` 時，先確認 key 是固定 enum；遇到 `Map<Identifier, Block>` 時，key 是可擴充的 identifier，就不能套用 EnumMap。

## 11. Enum 與資料序列化 ⭐⭐⭐

Enum constant 的 Java 名稱不一定適合直接作為使用者可見文字、存檔 id 或網路資料格式。建議提供明確 stable id：

```java
public enum ToolType {
    PICKAXE("pickaxe"),
    AXE("axe"),
    SHOVEL("shovel");

    private final String id;

    ToolType(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public static Optional<ToolType> fromId(String id) {
        return Arrays.stream(values())
            .filter(type -> type.id.equals(id))
            .findFirst();
    }
}
```

正式 mod data、NBT、config 或 payload 應使用明確的 `id()`，並決定未知值的處理方式。不要用 ordinal，因為新增或重新排列 constants 會改變數字意義。Enum 本身具有特殊 serialization handling；若資料格式要跨版本或跨 loader，仍應建立清楚且可演進的 schema。[2]

## 12. Enum、常數與資料驅動設計的選擇

| 需求 | 建議 |
|---|---|
| 編譯時已知且有限的選項 | Enum |
| 單一固定數值或字串設定 | `static final` constant |
| 玩家或資料包可新增的類型 | Registry／data-driven definition |
| 每個狀態共享複雜服務與 dependency | class + interface／strategy |
| enum key 對應資料 | `EnumMap` |
| 多個 enum flags | `EnumSet` |
| 需要自訂排序 | `Comparator`，不要依賴 ordinal |

不要把「現在只有三種」當成永遠不會擴充的保證。如果 Minecraft mod 的工具類型未來要由 datapack、registry 或其他 mod 擴充，enum 可能會成為錯誤的封閉模型；這時應把固定控制狀態與可擴充內容拆開。

## 常見錯誤

1. 用 `String` 或 `int` 取代明確 enum，讓非法狀態可以流進整個 API。
2. 忘記 enum 有 fields 與 methods，只把它當作常數清單。
3. 嘗試呼叫 enum constructor 或對 enum 使用 `new`。
4. 把 `ordinal()` 寫進存檔、NBT、資料庫或網路格式。
5. 用 `toString()` 當 stable serialization id，之後改 UI 文字導致舊資料無法讀取。
6. 把 enum constants 的宣告順序誤當成永久商業排序。
7. 用 `HashSet<SomeEnum>` 或 `HashMap<SomeEnum, V>` 表示明確 enum 集合，卻沒有評估 `EnumSet` 與 `EnumMap`。
8. 對 `EnumSet` 混入不同 enum type 或 `null`。
9. 看到 Fabric、NeoForge、Paper 的結果型別相似，就直接跨 loader 混用。
10. 把應該由 registry 或資料包擴充的 runtime type 硬編碼成 enum。

## S 級練習

請完成 `EnumPractice.java`：

1. 建立 `ToolType`，每個 constant 具備 stable id、display name 與 speed multiplier。
2. 加入 `fromId(String)`，對未知 id 回傳 `Optional.empty()`，不要直接信任外部字串。
3. 建立 `EnumSet<ToolType>`，表示某個 block 支援的工具集合。
4. 建立 `EnumMap<ToolType, Integer>`，保存各工具的 durability cost。
5. 使用 switch expression 根據 `ToolType` 計算基本挖掘速度。
6. 加入一個 enum method，讓每個 constant 提供不同的行為。
7. 寫測試證明新增 enum constant 時，所有重要 switch 都會被檢查。
8. 寫一個反例測試，說明為什麼 `ordinal()` 不可作永久 id。

```java
EnumSet<ToolType> miningTools = EnumSet.of(
    ToolType.PICKAXE,
    ToolType.SHOVEL
);

EnumMap<ToolType, Integer> costs = new EnumMap<>(ToolType.class);
costs.put(ToolType.PICKAXE, 2);
costs.put(ToolType.SHOVEL, 1);
```

如果你能解釋每一個 constant 的 field 如何由 constructor 建立、`values()` 如何走訪、`EnumSet` 為何比 `Set<String>` 更安全，以及 `EnumMap` 為何要求單一 enum key type，就已經具備閱讀 Minecraft enum API 的核心能力。

## 複習速查

- Enum 是有限、型別安全、編譯時已知的選項集合。
- Enum declaration 會建立特殊 class，因此可以有 fields、methods、constructor 與 interface。
- Enum constructor 由 compiler 建立 constants 時呼叫，不能自行 `new`。
- `values()` 取得全部 constants；`valueOf()` 依精確名稱解析；`name()` 是穩定宣告名稱；`toString()` 適合呈現；`ordinal()` 不適合永久資料。
- `EnumSet` 是單一 enum type 專用的 Set；`EnumMap` 是 enum key 專用的 Map。
- Minecraft API 常用 enum 表示方向、互動手、結果、遊戲模式與裝備位置。
- 固定集合用 Enum；可由玩家、datapack 或其他 mod 擴充的內容應考慮 registry 或資料驅動設計。

## References

[1]: https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html "Enum Types — Oracle Java Tutorials"
[2]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Enum.html "Enum — Java SE 25 API"
[3]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/EnumSet.html "EnumSet — Java SE 25 API"
[4]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/EnumMap.html "EnumMap — Java SE 25 API"
