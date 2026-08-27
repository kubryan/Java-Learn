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
| ⭐ | String／StringBuilder｜字串與字串建構器獨立篇 | ⭐⭐⭐ | `01-java-basics/08-strings.md` |
| ⭐ | Package／Import／Access Modifier｜套件、匯入與存取修飾子獨立篇 | ⭐⭐⭐ | `01-java-basics/09-packages-access-modifiers.md` |
| ⭐ | Immutability／Mutable Object｜不可變性與可變物件獨立篇 | ⭐⭐⭐ | `01-java-basics/10-immutability.md` |

## String／StringBuilder 獨立學習入口

`String` 與 `StringBuilder` 已獨立成 `01-java-basics/08-strings.md`。請先理解 String immutable 與 StringBuilder mutable，再練習 `equals`、`append`、`String.join`、多行文字、Minecraft log／command 與 JSON 邊界。小型固定文字組合可使用 `"A" + value`；大量動態累積才考慮 StringBuilder，但正式 JSON／NBT／payload 仍應使用 serializer／codec。

## Package／Import／Access Modifier 獨立學習入口

`package`、`import`、`public`、`protected`、`private` 與 package-private 已整理到 `01-java-basics/09-packages-access-modifiers.md`。請用 exact package、fully qualified name 與 access table 判斷 class／method 為什麼可見；再把 `common`、`client`、`registry`、`entity`、`item`、`block` 與 `util` 對照到 Minecraft 專案。特別注意：subpackage 不是同一個 package，`import` 不會增加權限，而 package 名稱也不會自動建立 Fabric／NeoForge／Paper 的 side boundary。

## Immutability／Mutable Object 獨立學習入口

`final` reference 與 object immutable 是不同問題，已整理到 `01-java-basics/10-immutability.md`。請先掌握 `final List<String>` 為什麼仍可 `add`、`List.copyOf` 與 `Collections.unmodifiableList` 的差異，再練習 defensive copy、record shallow immutability、HashMap mutable key 與 Minecraft immutable snapshot。這篇會連結 Collections、Object Contract、Concurrency 與 Serialization，避免把 final、只讀 view、snapshot、deep immutable 與 thread-safe 混成同一個概念。

## OOP

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ✅ | 類別｜Class | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ✅ | 物件｜Object | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ✅ | 繼承｜Inheritance | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ✅ | 封裝｜Encapsulation | ⭐⭐⭐ | `03-oop/01-objects.md` |
| ⬜ | 多型｜Polymorphism | ⭐⭐⭐ | `03-oop/02-oop-core-gaps.md` |
| ⬜ | 抽象類別｜Abstract Class | ⭐⭐⭐ | `03-oop/02-oop-core-gaps.md` |
| ⭐ | 介面｜Interface S 級獨立篇 | ⭐⭐⭐ | `03-oop/03-interface.md` |
| ⬜ | 組合｜Composition | ⭐⭐ | `03-oop/02-oop-core-gaps.md` |
| ⭐ | Object Contract｜equals、hashCode、toString 獨立篇 | ⭐⭐⭐ | `03-oop/04-object-contract.md` |

## S 級核心：Interface 獨立學習入口

Interface 不再只放在 OOP 缺口總覽中，而是獨立成一篇 S 級 handbook：`03-oop/03-interface.md`。請依序學習 interface contract、`implements`、default method、static method、Functional Interface、multiple interface conflict，再比較 Interface、Abstract Class 與 Composition。

Fabric callback、Paper Listener、Java `Comparator` 與許多 Minecraft registry／event contract 都會使用 interface。這篇會特別區分 Java 共通語法與 Fabric、NeoForge、Paper 各自的 API，避免把不同 loader 的註冊生命週期混為一談。

## S 級核心：Object Contract 獨立學習入口

`equals()`、`hashCode()` 與 `toString()` 已獨立成 `03-oop/04-object-contract.md`。請先理解 `==` 與 value equality，再掌握 equals 的 reflexive、symmetric、transitive、consistent、non-null 契約，以及「equals 相等 ⇒ hashCode 必須相等」的核心規則。

這篇會接著連結 `HashSet`、`HashMap`、mutable key、record、繼承 equality 與 Minecraft 的 `UUID`、`BlockPos`、Fabric／Yarn 的 `Identifier`、NeoForge／Mojang mappings 的 `ResourceLocation` 與 registry key。它是 Collections 的必要前置，不是只為了寫漂亮的 log。

## Collections

| 狀態 | 主題 | Minecraft 優先級 |
|---|---|---:|
| ⬜ | 集合框架｜Collections Framework | ⭐⭐⭐ |
| ⬜ | `List`、`ArrayList` | ⭐⭐⭐ |
| ✅ | `Set`、`HashSet`（依賴 equals／hashCode） | ⭐⭐ |
| ✅ | `Map`、`HashMap`（依賴 equals／hashCode） | ⭐⭐⭐ |
| ⬜ | `Queue`、`Deque` | ⭐⭐ |
| ⬜ | `Iterator` | ⭐⭐ |
| ⬜ | `Comparable`、`Comparator` | ⭐⭐⭐ |

## Java 現代語法

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ⭐ | 泛型｜Generics S 級獨立篇 | ⭐⭐⭐ | `05-modern-java/00-generics.md` |
| ✅ | Lambda Expression｜Lambda 表達式（含 Method Reference） | ⭐⭐ | `05-modern-java/01-modern-java.md` |
| ✅ | Functional Interface｜函式式介面 | ⭐⭐ | `05-modern-java/01-modern-java.md` |
| ⭐ | Stream API 獨立篇 | ⭐⭐ | `05-modern-java/04-stream-api.md` |
| ✅ | Optional｜可能沒有值的回傳 API | ⭐ | `05-modern-java/01-modern-java.md` |
| ⬜ | Record | ⭐ | `05-modern-java/01-modern-java.md` |
| ⭐ | Enum｜列舉 S 級獨立篇 | ⭐⭐⭐ | `05-modern-java/02-enum.md` |
| ⬜ | Pattern Matching｜模式匹配 | ⭐ | `05-modern-java/01-modern-java.md` |
| ⭐ | Annotation｜註解 S 級獨立篇 | ⭐⭐⭐ | `05-modern-java/03-annotations.md` |
| ⭐ | Reflection｜反射 S 級關聯篇 | ⭐⭐⭐ | `05-modern-java/03-annotations.md` |
| ⭐ | I/O｜輸入輸出獨立篇 | ⭐⭐ | `05-modern-java/05-io.md` |
| ⭐ | Serialization｜序列化與 JSON 獨立篇 | ⭐⭐ | `05-modern-java/06-serialization.md` |
| ⬜ | Dependency Injection｜依賴注入 | ⭐⭐ | `05-modern-java/01-modern-java.md` |
| ⭐ | Concurrency｜並行／併發獨立篇 | ⭐⭐⭐ | `05-modern-java/07-concurrency.md` |

## S 級核心：Enum 獨立學習入口

Enum 不再只放在現代 Java 總覽中，而是獨立成 `05-modern-java/02-enum.md`。請依序學習 Enum constants、Enum fields、Enum methods、Enum constructor、`values()`／`valueOf()`、switch、`EnumSet` 與 `EnumMap`，再進入 Minecraft 的 `Direction`、`InteractionHand`、`InteractionResult` 與工具／狀態設計。

Enum 特別適合表示編譯時已知的有限集合；如果類型需要由玩家、datapack 或其他 mod 在 runtime 擴充，應改評估 registry 或資料驅動設計。不要把 `ordinal()` 當成永久存檔、NBT 或網路 protocol id。

## S 級核心：Annotation 獨立學習入口

Annotation 不再只放在現代 Java 總覽中，而是獨立成 `05-modern-java/03-annotations.md`。請依序學習 annotation metadata、Built-in Annotation、Custom Annotation、`@Retention`、`@Target`、SOURCE／CLASS／RUNTIME、Reflection，再進入各 framework 的 annotation consumer。

`@Override` 主要是 compiler contract；`@Inject`、`@Mixin`、`@Environment` 是 Fabric／Mixin toolchain metadata；`@Nullable` 要看 provider；`@Mod`、`@SubscribeEvent`、Spring、Lombok 與 JUnit 也各自有不同的 loader、container、processor 或 test engine。不要因為語法都以 `@` 開頭，就把它們當成同一種機制。

## Stream API 獨立學習入口

Stream API 不再只放在現代 Java 總覽中，而是獨立成 `05-modern-java/04-stream-api.md`。請依序掌握 source、intermediate operation、terminal operation 與 lazy evaluation，再練習 `stream()`、`filter()`、`map()`、`flatMap()`、`sorted()`、`distinct()`、`limit()`、`collect()`、`toList()`、`reduce()`、`anyMatch()`、`allMatch()` 與 `findFirst()`。

`players.stream().filter(Player::isOnline).map(Player::getName).toList()` 是最重要的閱讀模型。Stream 語法屬於 Java standard library，但玩家、世界、registry、event callback 與 thread contract 仍屬於 Fabric、NeoForge 或 Paper 各自的 API；不要將不同平台型別混用。`parallelStream()` 也不是 Minecraft tick 的通用加速方式，必須先確認 thread ownership 與資料生命週期。

## I/O 獨立學習入口

I/O 不再只放在其他主題的零散範例中，而是獨立成 `05-modern-java/05-io.md`。請依序掌握 `Path`、`Files`、文字與 binary data 的差異，再練習 `InputStream`、`OutputStream`、`Reader`、`Writer`、`BufferedReader`、`BufferedWriter` 與 try-with-resources。

JavaBase 的本地 Markdown Workspace 正好是 I/O 的實戰場景：Markdown 是唯一真實來源，程式需要安全地 resolve workspace 內的路徑、用 UTF-8 讀寫原稿、掃描 `.md` 建立可重建索引，並把 backup／revision 與錯誤 recovery 分開設計。I/O 語法屬於 Java standard library；resource、config directory、loader lifecycle 與 server thread contract 則要依 Fabric、NeoForge 或其他平台文件判斷。

## Debugging｜除錯

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ⭐ | Debugging｜除錯與 Stack Trace 獨立篇 | ⭐⭐⭐ | `08-debugging/01-debugging.md` |
| ⬜ | Breakpoint、Step Over／Into／Out | ⭐⭐⭐ | `08-debugging/01-debugging.md` |
| ⬜ | Watch、Call Stack、Debug Console | ⭐⭐⭐ | `08-debugging/01-debugging.md` |
| ⬜ | Exception Stack Trace 與 Root Cause | ⭐⭐⭐ | `08-debugging/01-debugging.md` |

## Java 專案工具

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ⭐ | Maven｜`pom.xml` 獨立篇 | ⭐⭐ | `09-project-tools/01-java-project-tools.md` |
| ⭐ | Gradle｜`build.gradle` 獨立篇 | ⭐⭐⭐ | `09-project-tools/01-java-project-tools.md` |
| ✅ | Dependency、Repository、Lifecycle、Plugin、Scope | ⭐⭐⭐ | `09-project-tools/01-java-project-tools.md` |
| ✅ | Task、Gradle Wrapper、`settings.gradle` | ⭐⭐⭐ | `09-project-tools/01-java-project-tools.md` |
| ⬜ | Fabric Loom、NeoForge Gradle、Paper build | ⭐⭐⭐ | `09-project-tools/01-java-project-tools.md` |

## Exception

| 狀態 | 主題 | Minecraft 優先級 |
|---|---|---:|
| ⭐ | 例外處理｜Exception Handling handbook | ⭐⭐⭐ |
| ⭐ | `Throwable` → `Error`／`Exception` → `RuntimeException` | ⭐⭐⭐ |
| ⭐ | Checked Exception、Unchecked Exception、Error | ⭐⭐⭐ |
| ✅ | `try-catch`、`finally`、try-with-resources | ⭐⭐⭐ |
| ✅ | `throw`、`throws` | ⭐⭐⭐ |
| ✅ | 自訂例外｜Custom Exception | ⭐⭐ |
| ⭐ | `catch` 邊界、`InterruptedException`、cause／suppressed exception | ⭐⭐⭐ |

Exception hierarchy、`Throwable`、`Error` 與「不是所有 Throwable 都應該 catch」已整理在 `06-exceptions/01-exceptions.md`。Minecraft handler 應在 command／payload／config 邊界處理真正可恢復的錯誤，保留 cause 與 interruption；不要用 `catch (Throwable)` 掩蓋 mod bug、classloading failure、`OutOfMemoryError` 或其他 JVM／lifecycle 問題。

## JVM

| 狀態 | 主題 | Minecraft 優先級 | JavaBase 入口 |
|---|---|---:|---|
| ✅ | JVM｜Java Virtual Machine 基礎 | ⭐⭐ | `07-jvm/01-jvm.md` |
| ✅ | JDK｜Java Development Kit | ⭐⭐⭐ | `07-jvm/01-jvm.md` |
| ✅ | JRE｜Java Runtime Environment | ⭐ | `07-jvm/01-jvm.md` |
| ✅ | Java Compiler｜Java 編譯器 | ⭐⭐⭐ | `07-jvm/01-jvm.md` |
| ✅ | Bytecode｜位元組碼 | ⭐⭐ | `07-jvm/01-jvm.md` |
| ✅ | Class Loader｜類別載入器 | ⭐⭐⭐ | `07-jvm/01-jvm.md` |
| ✅ | Heap｜堆積、Stack｜堆疊 | ⭐⭐ | `07-jvm/01-jvm.md` |
| ✅ | Garbage Collection｜垃圾回收 | ⭐⭐ | `07-jvm/01-jvm.md` |
| ⭐ | JVM 深入｜JIT、Metaspace、GC Roots、Memory Leak | ⭐⭐ | `07-jvm/02-jvm-deep-dive.md` |

## 建議學習順序

若目標是 Fabric 或 NeoForge，建議先完成 `static`、`final`、介面、抽象類別、多型、泛型、`ArrayList`、`HashMap`、`Enum` 與 Annotation，再學習事件 callback、Registry、payload 與 datagen。Lambda、Functional Interface 與 Method Reference 已在 `05-modern-java/01-modern-java.md` 提供最小可用範例；Optional 也已在同一篇補齊建立、轉換與 fallback API，但它的定位是表達可能缺值的回傳結果，不是全面取代 null。Stream、Serialization、Concurrency、Debugging 與 Java project tools 依序連接到真實 mod／plugin 工程；JVM 深入則放在後段，用診斷證據理解 class loading、GC、thread 與 memory leak，而不是一開始就調 JVM flags。

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
I/O + JSON／Codec + Maven／Gradle
    ↓
Fabric / NeoForge / Paper API
    ↓
Debugging + Stack Trace
    ↓
JVM 深入與記憶體診斷
```

## S 級核心：Generics 獨立學習入口

Generics 不再只放在現代 Java 總覽中，而是獨立成一篇 S 級 handbook：`05-modern-java/00-generics.md`。請依序學習 Type Parameter、Generic Class、Generic Method、Bounded Type Parameter、Wildcard、`? extends`、`? super` 與 Type Erasure，再回頭讀現代 Java 總覽中的 Lambda、Stream、Record 與 Concurrency。

第一優先是 **Interface、Generics、HashMap、ArrayList、Enum、Annotation、Reflection、Concurrency、Debugging**；第二優先是 **Serialization／JSON、I/O、Maven／Gradle**、Lambda 與 Dependency Injection；JVM 深入排在後段，但在 server crash、tick lag、class loading 與 memory leak 診斷時非常重要。這些主題會直接出現在 loader API 的事件訂閱、註冊器、資料生成、payload 型別、callback 與遊戲狀態管理中。學習時不要只看名詞，請把每篇的練習改寫成一個小型 registry、event handler 或 data object。

## References

[1]: https://dev.java/learn/ "Learn Java — Dev.java"
[2]: https://dev.java/learn/oop/ "Objects, Classes, Interfaces, Packages, and Inheritance — Dev.java"
[3]: https://docs.oracle.com/javase/tutorial/collections/interfaces/index.html "Collections Framework Interfaces — Oracle Java Tutorials"
[4]: https://docs.oracle.com/javase/tutorial/java/generics/ "Generics — Oracle Java Tutorials"
