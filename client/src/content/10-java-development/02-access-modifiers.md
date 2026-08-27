---
title: Access Modifiers｜存取修飾子
titleEn: Access Modifiers
topic: Java Access Control
terms: public, protected, private, package-private, access modifier, package, subclass, inheritance
slug: java-access-modifiers
category: Java 開發
order: 3
level: 入門到中階
tags: Java, Access Modifiers, public, protected, private, package-private, Encapsulation, Minecraft Java
aliases: 存取修飾子, 存取控制, visibility, 可見性
summary: 用一張清楚的 access table 理解 public、protected、private 與 package-private，並判斷 Minecraft client、common、registry、entity、item、block、util package 之間為什麼能或不能使用某個 class 與 method。
---

# Access Modifiers｜存取修飾子

> **核心規則：** access modifier 決定「哪些程式碼可以使用這個 type 或 member」；`import` 只改變名稱書寫方式，不會增加 permission。

Java 的 `public`、`protected`、`private` 與 package-private（省略 modifier）不是裝飾文字，而是 class、field、constructor 與 method 的 API boundary。大型 Minecraft mod／plugin 若沒有明確的 visibility，任何 class 都可能直接改動別人的 state，最後很難維護。

## 四種存取層級查表

| Modifier | 同一個 class | 同一個 exact package | 不同 package 的 subclass | 其他不同 package class |
|---|---:|---:|---:|---:|
| `public` | 可 | 可 | 可 | 可 |
| `protected` | 可 | 可 | 可，但受 subclass access context 限制 | 不可 |
| package-private | 可 | 可 | 不可 | 不可 |
| `private` | 可 | 不可 | 不可 | 不可 |

「同一個 package」指完全相同的 package name；`com.example.mod.common` 與 `com.example.mod.common.registry` 是不同 package，不會因為名稱有前綴就互相享有 package-private 存取權。[1]

## `public`

`public` member 是對外承諾。其他 package 可以使用它，只要 class 本身也可見：

```java
package com.example.mod.registry;

public final class ModItems {
    public static final String CALIBRATION_STONE_ID = "calibration_stone";

    public static void register() {
        // public entry point
    }
}
```

不是所有 implementation detail 都應該 `public`。如果 method 只服務同一個 package，package-private 可能更能保護設計；如果 field 必須維持 invariant，通常應使用 `private` 加上受控 method。

## `private`

`private` 只在 declaring class 內可用，適合保護 mutable state：

```java
public final class PlayerCooldown {
    private long expiresAt;

    public boolean isReady(long now) {
        return now >= expiresAt;
    }

    public void extend(long duration, long now) {
        if (duration < 0) throw new IllegalArgumentException("duration must be >= 0");
        expiresAt = Math.max(expiresAt, now) + duration;
    }
}
```

不要為了省事把 `private` field 改成 `public`。這會讓任何 caller 都能跳過 validation，也會讓未來改變 representation 變成 breaking change。

## package-private

不寫 modifier 就是 package-private：

```java
package com.example.mod.registry;

final class RegistryBootstrap {
    static void registerInternal() {
        // 只有 com.example.mod.registry 內的 class 能呼叫
    }
}
```

這是很實用的 package boundary：同一個 subsystem 可以共用 implementation，而其他 package 看不到它。注意 subpackage 不算同一個 package。

## `protected`

`protected` 有兩條規則：同 package 的 class 可以使用；不同 package 時，只有 subclass 可以透過合法的 subclass access context 使用。它不是「所有 package 都能用」的 public 版本：

```java
package com.example.game;

public class Entity {
    protected void markDirty() {
        // protected hook
    }
}
```

```java
package com.example.mod;

import com.example.game.Entity;

public final class CustomEntity extends Entity {
    public void update() {
        markDirty(); // ✅ 在 subclass 內透過 this／super 使用
    }
}
```

```java
package com.example.mod;

import com.example.game.Entity;

public final class EntityTools {
    public void update(Entity entity) {
        // entity.markDirty(); // ❌ 不是 subclass context，不能任意跨 package 呼叫
    }
}
```

判斷 `protected` 時，先問三個問題：目前是否同一個 exact package？若不是，使用者是否真的是 subclass？存取是否發生在合法的 subclass context？

## Top-level class 的限制

Top-level class 只能是 `public` 或 package-private；不能直接宣告成 `private` 或 `protected`。`private`／`protected` 可用在 member 與 nested class，但不能套用到 top-level class：

```java
public class PublicApi {
}

class PackageImplementation {
}

// private class HiddenTopLevel {}   // ❌
// protected class HookTopLevel {}   // ❌
```

## Minecraft package 設計

```text
com.example.mod
├── client       ← client-only screen、renderer、client event
├── common       ← loader-neutral domain model、service、rule
├── registry     ← item、block、entity、sound registration
├── entity       ← entity type 與 behaviour
├── item         ← item logic
├── block        ← block logic
└── util         ← 穩定、低耦合的通用工具
```

可以把 `common` 的正式 API 宣告為 `public`，把 `registry` 的初始化細節保留為 package-private，把 mutable game state 留在 owner class 的 `private` member。`client` 不應反向成為 `common` 的 dependency；access modifier 能協助暴露這些意圖，但不能取代 Fabric／NeoForge 的 side separation。

## 常見錯誤定位

| 錯誤 | 先問什麼 |
|---|---|
| `cannot find symbol` | 名稱是否拼錯？是否在正確 package？source set／classpath 是否包含？ |
| `package ... does not exist` | dependency、source root、module path 或 import 是否正確？ |
| `... has private access` | 是否應透過 public method，而不是打開 field？ |
| `... has protected access` | 是否真的在同一 package 或合法 subclass context？ |
| import 後仍不能用 | import 只改名，不會跨越 access boundary |
| runtime `ClassNotFoundException` | compile classpath 有，但 runtime classpath 是否缺 dependency？ |

## 快速決策

```text
只有 declaring class 需要
    → private
同一個 subsystem package 需要
    → package-private
同 package + 有意義的 subclass hook
    → protected
真正對外的穩定 API
    → public
```

在 Minecraft 專案中，少用 `public` 不是保守，而是讓 dependency direction、owner 與 lifecycle 更容易被讀懂。若某個 method 只有測試或 loader integration 需要，先明確標出它的 boundary，不要因為某次 compile error 就把整個 class 改成 public。

## 練習

1. 在一個 `registry` package 建立 public registration facade、package-private bootstrap 與 private mutable state，寫出三個不同 package 的呼叫結果。
2. 建立跨 package subclass，分別從 subclass method 與一般 helper class 嘗試呼叫 protected method，記錄 compiler error。
3. 將一個 Fabric client renderer 放到 common package 的錯誤依賴中，說明為什麼 access modifier 修好之後仍可能有 loader side 問題。

## References

[1]: https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html "Controlling Access to Members of a Class — Oracle Java Tutorials"
[2]: https://dev.java/learn/packages/ "Packages — Dev.java"
