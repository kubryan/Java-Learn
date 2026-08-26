---
title: Java 學習缺口與 Minecraft 開發路線圖
slug: java-gap-roadmap
category: 開始使用
order: 5
level: 入門到進階
tags: Java, 學習地圖, Minecraft Java, 課程缺口, roadmap, checklist
aliases: Java 缺少什麼, Java 學習清單, Minecraft Java 必學
summary: 對照 JavaBase 現有內容，補齊 Java 基礎、OOP、Collections、現代語法、例外處理與 JVM，並標記 Minecraft Java 開發優先主題。
---

# Java 學習缺口與 Minecraft 開發路線圖

這份清單不是要你一次背完所有 Java API，而是把 JavaBase 從「能開始寫程式」補到「能讀懂大型 Java 專案、Minecraft loader 與 backend code」。官方 Dev.java 的學習入口也把類別、介面、繼承、泛型、例外、Collections、Stream、Reflection 與 JVM 工具視為不同但互相連接的學習區段。[1]

## 如何讀這份清單

`✅` 代表 JavaBase 已有可以先閱讀的 Markdown；`⬜` 代表本次新增的完整主題 handbook。`⭐` 是 Minecraft Java 開發必學，星號越多代表越早應該投入練習。新增 handbook 會把同一組主題集中整理，但正文仍使用中英文 API 關鍵字，方便全文搜尋與回到官方文件。

## Java 基礎

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ✅ | 變數｜Variables | ⭐⭐ | `01-java-basics/01-variables.md` |
| ✅ | 資料型別｜Data Types | ⭐⭐ | `01-java-basics/01-variables.md`、`03-identifiers-literals-types.md` |
| ⬜ | 型別轉換｜Type Casting | ⭐⭐ | `01-java-basics/07-java-core-gaps.md` |
| ⬜ | 運算子｜Operators | ⭐⭐ | `01-java-basics/07-java-core-gaps.md` |
| ⬜ | 作用域｜Scope | ⭐⭐ | `01-java-basics/07-java-core-gaps.md` |
| ⬜ | `static`｜Static | ⭐⭐⭐ | `01-java-basics/07-java-core-gaps.md` |
| ⬜ | `final`｜Final | ⭐⭐⭐ | `01-java-basics/07-java-core-gaps.md` |

## OOP

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ✅ | 類別｜Class | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ✅ | 物件｜Object | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ✅ | 繼承｜Inheritance | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ✅ | 封裝｜Encapsulation | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ⬜ | 多型｜Polymorphism | ⭐⭐⭐ | `03-oop/02-oop-core-gaps.md` |
| ⬜ | 抽象類別｜Abstract Class | ⭐⭐⭐ | `03-oop/02-oop-core-gaps.md` |
| ⬜ | 介面｜Interface | ⭐⭐⭐ | `03-oop/02-oop-core-gaps.md` |
| ⬜ | 組合｜Composition | ⭐⭐ | `03-oop/02-oop-core-gaps.md` |

## Collections

| 狀態 | 主題 | Minecraft 優先級 |
|---|---|---:|
| ⬜ | 集合框架｜Collections Framework | ⭐⭐⭐ |
| ⬜ | `List`、`ArrayList` | ⭐⭐⭐ |
| ⬜ | `Set`、`HashSet` | ⭐⭐ |
| ⬜ | `Map`、`HashMap` | ⭐⭐⭐ |
| ⬜ | `Queue`、`Deque` | ⭐⭐ |
| ⬜ | `Iterator` | ⭐⭐ |
| ⬜ | `Comparable`、`Comparator` | ⭐⭐⭐ |

## Java 現代語法

| 狀態 | 主題 | Minecraft 優先級 |
|---|---|---:|
| ⬜ | 泛型｜Generics | ⭐⭐⭐ |
| ⬜ | Lambda Expression｜Lambda 表達式 | ⭐⭐ |
| ⬜ | Functional Interface｜函式式介面 | ⭐⭐ |
| ⬜ | Stream API | ⭐⭐ |
| ⬜ | Optional | ⭐ |
| ⬜ | Record | ⭐ |
| ⬜ | Enum｜列舉 | ⭐⭐⭐ |
| ⬜ | Pattern Matching｜模式匹配 | ⭐ |
| ⬜ | Annotation｜註解 | ⭐⭐⭐ |
| ⬜ | Reflection｜反射 | ⭐⭐⭐ |
| ⬜ | Serialization｜序列化 | ⭐⭐ |
| ⬜ | Dependency Injection｜依賴注入 | ⭐⭐ |
| ⬜ | Concurrency｜並行／併發 | ⭐⭐⭐ |

## Exception

| 狀態 | 主題 | Minecraft 優先級 |
|---|---|---:|
| ⬜ | 例外處理｜Exception Handling | ⭐⭐⭐ |
| ⬜ | Checked Exception、Unchecked Exception | ⭐⭐ |
| ⬜ | `try-catch`、`finally` | ⭐⭐⭐ |
| ⬜ | `throw`、`throws` | ⭐⭐⭐ |
| ⬜ | 自訂例外｜Custom Exception | ⭐⭐ |

## JVM

| 狀態 | 主題 | Minecraft 優先級 |
|---|---|---:|
| ⬜ | JVM｜Java Virtual Machine | ⭐⭐ |
| ⬜ | JDK｜Java Development Kit | ⭐⭐⭐ |
| ⬜ | JRE｜Java Runtime Environment | ⭐ |
| ⬜ | Java Compiler｜Java 編譯器 | ⭐⭐⭐ |
| ⬜ | Bytecode｜位元組碼 | ⭐⭐ |
| ⬜ | Class Loader｜類別載入器 | ⭐⭐⭐ |
| ⬜ | Heap｜堆積、Stack｜堆疊 | ⭐⭐ |
| ⬜ | Garbage Collection｜垃圾回收 | ⭐⭐ |

## 建議學習順序

若目標是 Fabric 或 NeoForge，建議先完成 `static`、`final`、介面、抽象類別、多型、泛型、`ArrayList`、`HashMap`、`Enum` 與 Annotation，再學習事件 callback、Registry、payload 與 datagen。Lambda、Stream、Optional、Record 與 Pattern Matching 能提升閱讀現代 Java 程式碼的速度，但不必阻塞你先建立第一個模組。

```text
型別與作用域
    ↓
介面／抽象類別／多型
    ↓
泛型 + List/Map + Enum
    ↓
Annotation + Lambda + Callback
    ↓
例外處理 + Serialization + Concurrency
    ↓
Fabric / NeoForge API
    ↓
JVM 效能與模組除錯
```

## 對 Minecraft Java 開發最重要的十個主題

第一優先是 **Interface、Generics、HashMap、ArrayList、Enum、Annotation、Reflection、Concurrency**；第二優先是 **Lambda** 與 **Dependency Injection**。這些主題會直接出現在 loader API 的事件訂閱、註冊器、資料生成、payload 型別、callback 與遊戲狀態管理中。學習時不要只看名詞，請把每篇的練習改寫成一個小型 registry、event handler 或 data object。

## References

[1]: https://dev.java/learn/ "Learn Java — Dev.java"
[2]: https://dev.java/learn/oop/ "Objects, Classes, Interfaces, Packages, and Inheritance — Dev.java"
[3]: https://docs.oracle.com/javase/tutorial/collections/interfaces/index.html "Collections Framework Interfaces — Oracle Java Tutorials"
[4]: https://docs.oracle.com/javase/tutorial/java/generics/ "Generics — Oracle Java Tutorials"
