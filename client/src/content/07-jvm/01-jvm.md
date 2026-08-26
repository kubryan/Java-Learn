---
title: JVM 基礎：JDK、Bytecode、Class Loader、Heap、Stack 與 GC
slug: java-jvm
category: JVM
order: 71
level: 中階到進階
tags: JVM, Java Virtual Machine, JDK, JRE, Java Compiler, Bytecode, Class Loader, Heap, Stack, Garbage Collection, Minecraft Java
aliases: Java Virtual Machine, Java Development Kit, Java Runtime Environment, 位元組碼, 類別載入器, 堆積, 堆疊, 垃圾回收
summary: 從 Java 原始碼到 JVM 執行的完整路徑，理解 JDK、JRE、bytecode、class loader、heap、stack 與 GC，協助 Minecraft mod 啟動與除錯。 ⭐⭐ Minecraft 必學
---

# JVM 基礎：JDK、Bytecode、Class Loader、Heap、Stack 與 GC

JVM 是執行 Java bytecode 的虛擬機器。理解 JVM 不代表第一天就要調整 GC 參數；你首先要知道 Java 原始碼如何被 compiler 轉成 bytecode、class 如何被載入、method invocation 使用什麼 stack frame、物件放在哪裡，以及 garbage collection 為何能回收不再可達的物件。這些概念能幫你讀懂 Minecraft loader 的啟動錯誤與記憶體問題。

## JDK、JRE 與 JVM

| 名稱 | 意義 | 主要用途 |
|---|---|---|
| JVM｜Java Virtual Machine | 執行 bytecode 的 runtime engine | 載入 class、執行指令、管理記憶體 |
| JRE｜Java Runtime Environment | JVM 加上執行 Java 程式所需的 runtime libraries | 執行已編譯的 Java application |
| JDK｜Java Development Kit | JRE／runtime 加上 compiler 與開發工具 | 編譯、測試、執行、分析 Java |

現代 Java 發行版通常以 JDK 為主要安裝單位；開發 Minecraft mod 時，Gradle toolchain 與 loader 文件會指定需要的 JDK 版本。不要只看自己終端機的 `java --version`；也要確認 `javac --version`、Gradle 使用的 toolchain，以及 CI runner 的 Java 版本。

```bash
java --version
javac --version
./gradlew --version
```

如果 `java` 可以執行但 `javac` 找不到，你可能只有 runtime，或 `JAVA_HOME`／PATH 指向錯誤位置。Fabric、NeoForge 與 Minecraft 本身的實際相容版本，以專案 Gradle 設定與官方 MDK 為準。

## Java Compiler 與 Bytecode

`javac` 將 `.java` 原始碼編譯成 `.class` bytecode。bytecode 不是特定 CPU 的 machine code；JVM 會在不同平台載入與執行它。這也是 Java 能在多種作業系統共享同一套 class artifact 的原因之一。

```bash
javac HelloJava.java
java HelloJava

javap -c HelloJava.class
```

典型流程是：

```text
HelloJava.java
    ↓ javac
HelloJava.class（bytecode）
    ↓ class loader
JVM runtime
    ↓ interpreter / JIT compiler
作業系統與硬體
```

JIT（Just-In-Time）compiler 會在 runtime 將常執行的 bytecode 路徑最佳化成 native code。不要把 `javac`、JIT 與 Gradle 混成同一件事：Gradle 負責 build workflow；`javac` 負責 Java 編譯；JVM 負責載入與執行。

## Class Loader｜類別載入器 ⭐⭐⭐

Class loader 將 class 的 binary representation 載入 JVM，通常經過 loading、linking 與 initialization。Java 使用 delegation model，讓核心 class 不會被一般 application class 隨意取代。實務上，class 的身份不只由 fully qualified name 決定，也與載入它的 class loader 有關。

```java
Class<?> type = Class.forName("java.lang.String");
System.out.println(type.getClassLoader()); // bootstrap class 通常顯示 null
```

Minecraft mod loader 會管理遊戲、loader、mod 與第三方 library 的 classpath。遇到 `ClassNotFoundException`、`NoClassDefFoundError`、`LinkageError` 或 client class 在 dedicated server 載入的問題時，先問：哪一個 class loader、哪一個 side、哪一個 dependency 在嘗試載入它？

不要在 common code 直接引用 client-only class 來「試著跑看看」。Class loader 在 dedicated server 啟動期間可能提早解析 class，導致整個 server 在真正執行 method 前就崩潰。

## Stack｜堆疊

每個 thread 都有自己的 stack；method invocation 會建立 stack frame，保存 local variables、operand stack 與 return information。遞迴太深或建立過大的 frame 可能造成 `StackOverflowError`。

```java
static int countDown(int value) {
    if (value == 0) return 0;
    return 1 + countDown(value - 1);
}
```

stack 是 thread-local，因此 local variable 不會因為另一個 thread 直接共享而變安全；如果 local variable 指向 heap object，該 object 仍可能被多個 thread 共享。這是理解 concurrency 的重要分界。

## Heap｜堆積

物件與陣列通常配置在 heap，由 JVM 管理生命週期。reference variable 本身可能存在 stack、field 或 collection 中；reference 被清除不代表物件立刻消失，重點是該物件是否仍然從 GC roots 可達。

```java
List<String> ids = new ArrayList<>();
ids.add("minecraft:stone");

// 讓 list 不再被這個變數引用，不等於立刻觸發 GC
ids = null;
```

Minecraft 中一次建立大量 temporary object、把永遠不清理的 world／player reference 放進 static map，或長期保留大型 cache，都可能造成 heap 壓力。先用 profiler、heap dump 與 metrics 找證據，不要只憑猜測增加記憶體。

## Garbage Collection｜垃圾回收

GC 會尋找不再從 roots 可達的物件並回收其記憶體。Java 不保證某個 object 何時被回收，也不應依賴 `System.gc()` 來修正設計問題。GC pause、allocation rate、heap occupancy 與 collector 選擇會影響應用程式表現。[1]

```java
// 不要用 finalize 或 System.gc() 管理遊戲資源
try (InputStream input = Files.newInputStream(path)) {
    // 使用 try-with-resources 管理外部資源
}
```

GC 只管理 heap memory，不會自動關閉檔案、socket、native resource 或停止 executor。這些資源需要 try-with-resources、`close`、shutdown 或 loader 指定的 lifecycle API。

## Minecraft 啟動與除錯對照

| 現象 | 優先檢查 |
|---|---|
| `UnsupportedClassVersionError` | 編譯 JDK 與執行 JDK 版本不一致 |
| `ClassNotFoundException` | dependency、classpath、mod loader 與 side |
| `NoClassDefFoundError` | class 初次載入失敗或 runtime dependency 缺失 |
| `NoSuchMethodError` | runtime 使用的 library 版本與 compile-time 不一致 |
| `OutOfMemoryError: Java heap space` | allocation、cache、heap 設定與 leak 證據 |
| `StackOverflowError` | 遞迴終止條件、互相呼叫或過深 handler |
| server 啟動載入 client class | common／client source set 與 class loader 邊界 |

先完整讀取最早的 `Caused by`，再確認 Gradle、loader、JDK、mapping 與 dependency；不要只複製最後一行錯誤。

## 可觀測性工具

```bash
jps -lv
jcmd <pid> VM.version
jcmd <pid> GC.heap_info
jstack <pid>
javap -verbose Example.class
```

這些工具可能需要同一個使用者權限與相容 JDK。生產或多人伺服器上使用前，先確認輸出不會包含不應分享的路徑、參數或玩家資料。

## 常見錯誤

1. 以為 JDK、JRE、JVM 是同一個東西；開發與執行邊界不同。
2. 用 `java` 的版本推測 `javac` 或 Gradle toolchain 的版本。
3. 看到 class loader 錯誤就只重裝 Java，卻沒有檢查 dependency 與 client/server side。
4. 以為 object `null` 後就會立刻被 GC；GC 時機由 JVM 決定。
5. 把 GC 當成外部資源管理器；file、socket、thread pool 仍要明確關閉。
6. 在 Minecraft mod 使用 static collection 永久保存 player 或 world reference，造成 cache 不可回收。
7. 以為 bytecode 是直接可在任何版本 JVM 執行；class file version 仍有相容性限制。

## 練習

建立 `JvmPractice.java`，先用 `javac` 與 `javap -c` 查看一個簡單 method 的 bytecode，再用 `List` 建立可達與不可達的物件。用 `jcmd` 觀察一個本地 Java process 的版本與 heap 資訊。最後在 Fabric 或 NeoForge 開發環境中故意把 client-only import 放到 common class，記錄 dedicated server 啟動時的錯誤位置，再移回正確 side。

## 複習速查

- JDK 用來開發，JRE／runtime 用來執行，JVM 負責載入與執行 bytecode。
- `javac` 產生 bytecode；JVM 透過 class loader 載入，再由 interpreter／JIT 執行。
- 每個 thread 有自己的 stack；物件通常在 heap；GC 回收不可達物件。
- JVM 不會替你關閉外部資源；使用 try-with-resources 與明確 lifecycle。
- Minecraft 啟動錯誤常和 JDK、Gradle、dependency、class loader 或 client/server side 有關。

## References

[1]: https://dev.java/learn/ "Learn Java — Dev.java"
[2]: https://dev.java/learn/jvm/ "Getting to know the JVM — Dev.java"
[3]: https://dev.java/learn/jvm/tooling/ "The Core JDK Tools — Dev.java"
[4]: https://dev.java/learn/jvm/garbage-collection/ "Garbage Collection in Java Overview — Dev.java"
[5]: https://docs.oracle.com/javase/specs/jvms/se25/html/ "The Java Virtual Machine Specification, Java SE 25"
