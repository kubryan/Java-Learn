---
title: JVM 深入｜JIT、Class Loading、記憶體與 GC Roots
titleEn: JVM Deep Dive
topic: JVM Deep Dive
terms: JVM, JIT Compiler, Class Loading, Class Loader, Linking, Initialization, Bytecode, Heap, Stack, Metaspace, Method Area, Runtime Constant Pool, Garbage Collection, GC Roots, Memory Leak, Heap Dump, Thread Dump, jcmd, jstack, jstat
slug: java-jvm-deep-dive
category: JVM
order: 72
level: 進階
tags: JVM, JIT Compiler, Class Loading, Bytecode, Heap, Stack, Metaspace, Garbage Collection, GC Roots, Memory Leak, jcmd, Minecraft Java
aliases: JVM 深入, JIT, Class Loading, Metaspace, GC Roots, Memory Leak, 記憶體洩漏
summary: 在 JVM 基礎之上深入理解 JIT Compiler、class loading／linking／initialization、bytecode、run-time data areas、Metaspace、GC Roots、garbage collection 與 memory leak，並以 jcmd、jstack、jstat 與 Minecraft server 診斷做實戰對照。
---

# JVM 深入｜JIT、Class Loading、記憶體與 GC Roots

> **核心目標：** 能把 JVM 問題分成 compile／bytecode、class loading、heap／stack、Metaspace、GC、thread 或 native resource layer，先用診斷證據定位，再決定是否需要修改程式或 JVM 設定。

JVM Specification 定義了 class file、執行模型、run-time data areas、frames、class loading 與 instruction semantics；它不承諾所有 JVM 都用同一種實體記憶體配置、JIT 策略或 garbage collector。[1] 因此本篇會先區分 **規範概念** 與 **HotSpot／JDK implementation detail**，避免把一個 JVM 的觀察誤當成所有 JVM 的保證。

你不需要在第一次寫 Minecraft mod 時調整一大串 `-XX` 參數。更重要的是理解：為什麼 `NoClassDefFoundError` 與 `ClassNotFoundException` 不完全相同、為什麼 class 可能在真正呼叫 method 前就初始化失敗、為什麼 heap 仍然有空間卻建立不了 thread、為什麼 GC 不會自動關閉檔案，以及什麼叫做「仍然 reachable 但已經不應存在」的 memory leak。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| JVM layers | 分辨 Java source、`javac`、class file、class loader、JVM execution 與 JIT |
| Bytecode | 使用 `javap` 查看 instruction、constant pool、line table 與 class file version |
| Class lifecycle | 說明 loading、linking、initialization 與 static initializer 失敗 |
| Memory areas | 理解 stack、heap、method area、runtime constant pool、Metaspace 的角色與限制 |
| GC | 以 reachability、GC Roots、allocation rate 與 pause evidence 來分析 GC 問題 |
| Memory leak | 找出 static collection、listener、ThreadLocal、cache 或 classloader 導致的 retention |
| JVM diagnostics | 使用 `jcmd`、`jstack`、`jstat`、heap dump 或 profiler 建立證據 |
| Minecraft | 把 server tick、mod lifecycle、classloader、heap pressure 與 resource cleanup 分層診斷 |

## 1. 從 `.java` 到 JIT execution

### 四個不同階段

```text
Hello.java
    ↓ javac
Hello.class（class file + bytecode）
    ↓ class loader + verification + linking
JVM runtime
    ↓ interpreter / profiling / JIT compilation
native machine code + execution
```

| 階段 | 主要角色 | 產物或行為 |
|---|---|---|
| Source compile | `javac` 或 build tool compiler | `.class` class file |
| Class loading | class loader | JVM 取得 class 的 binary representation |
| Verification／linking | JVM implementation | 檢查與準備 symbolic references |
| Interpretation | JVM execution engine | 直接逐步執行 bytecode |
| Profiling | runtime implementation | 收集 hot method、branch、type 與 call information |
| JIT compilation | JVM implementation | 將 hot code 編成 native code，可能做 runtime optimization |

`javac` 與 JIT 都可能被初學者稱為「編譯」，但它們發生在不同時間、輸入也不同。`javac` 將 source 轉成 class file；JIT 在 runtime 根據實際執行情況優化 bytecode path。Gradle／Maven 則負責 build workflow、dependency、task／lifecycle 與輸出管理。

### JIT Compiler｜Just-In-Time Compiler

JIT 通常會觀察哪些 method 或 loop 執行頻繁，再將它們編譯成更適合目前 runtime profile 的 machine code。最佳化可能包含 method inlining、dead code elimination、loop optimization 或 devirtualization；如果 runtime 假設後來被打破，JVM 可能 deoptimization 回到較保守的執行路徑。

```java
static int score(int base, int bonus) {
    return base + bonus;
}

long total = 0;
for (int i = 0; i < 10_000_000; i++) {
    total += score(i, 1);
}
```

不要從一個小 benchmark 直接推論 Minecraft server 的效能。JIT 需要 warm-up，實際結果受 JDK、CPU、allocation、GC、branch、loader、模組數量、world workload 與 thread contention 影響。先用 profiler 或 JFR 建立證據，再談 inline、escape analysis 或 compiler flags。

可以用下列方式觀察而不是猜測：

```bash
java -XX:+PrintCompilation Example
java -Xlog:class+load=info Example
```

這些 flag 的可用性與輸出格式依 JDK／VM implementation 而異；除錯時記錄 Java version 與 JVM vendor。不要把診斷 flag 不加條件放進 production launcher。

## 2. Bytecode 與 class file

### `javap` 基本操作

```bash
javac -g Hello.java
javap -c Hello.class
javap -verbose Hello.class
javap -p -c Hello.class
```

| 指令 | 你可以觀察什麼 |
|---|---|
| `javap Hello.class` | public class、method signature |
| `javap -c` | bytecode instructions |
| `javap -p` | private／protected members |
| `javap -verbose` | constant pool、flags、attributes、class file version |
| `javap -l` | line number、local variable 與 source mapping |
| `javap -s` | JVM descriptors |

### Bytecode 不是 source，也不是 machine code

```java
static int add(int left, int right) {
    return left + right;
}
```

`javap -c` 可能顯示類似：

```text
static int add(int, int);
  Code:
     0: iload_0
     1: iload_1
     2: iadd
     3: ireturn
```

實際 instruction、method descriptor 與 output 會依 Java compiler 與 class file version 變化。這些 instruction 使用 JVM 的 operand stack 與 local variable array；它們不是 CPU 的 x86／ARM instruction。

### class file version

```bash
javac --release 21 Hello.java
javap -verbose Hello.class | findstr "major version"
```

如果用較新的 JDK compile，再用較舊 JVM execute，可能出現 `UnsupportedClassVersionError`。Minecraft mod 的 Java version 必須同時符合遊戲、loader、Gradle toolchain、IDE、CI 與玩家 runtime；不要只看你目前終端機的 `java --version`。

## 3. Class Loading、Linking 與 Initialization

### 三個概念

JVM Specification 描述 class 或 interface 的 loading、linking 與 initialization lifecycle。[1]

| 階段 | 簡化理解 | 常見問題 |
|---|---|---|
| Loading | 找到 binary representation，建立 JVM class representation | classpath、classloader、resource、side |
| Linking | verification、preparation、resolution 等工作 | bytecode invalid、dependency、symbolic reference |
| Initialization | 執行 class／interface initialization method，包含 static initialization | static field、`<clinit>`、初始化順序、例外 |

```java
final class ModConfig {
    static final String PATH = loadPath();

    private static String loadPath() {
        throw new IllegalStateException("config is not ready");
    }
}
```

當程式第一次觸發需要初始化 `ModConfig` 的行為時，static initializer 可能失敗。後續使用可能看到 `ExceptionInInitializerError` 或 `NoClassDefFoundError: Could not initialize class ...`。這和「根本找不到 class」不是同一個問題；要讀最早的 cause 與第一次初始化的 stack trace。

### Class loader identity

class 的身份不只由 fully qualified name 決定，也和定義它的 class loader 有關：

```java
Class<?> stringType = String.class;
System.out.println(stringType.getName());
System.out.println(stringType.getClassLoader());
```

兩個 class loader 即使各自載入同名 class，也可能產生不能互相 cast 的不同 type。Minecraft loader、mod isolation、plugin server 與 shading 都可能讓 classpath／classloader 問題變複雜。

```text
same package.ClassName
  loaded by loader A → type A
  loaded by loader B → type B
  A cannot always cast to B
```

### Minecraft side 與 class loading

Fabric、NeoForge 與 Paper 都可能有自己的 loader、mapping、entrypoint 與 side boundary。common code 如果直接引用只在 client 存在的 class，server 可能在 class loading 或 linking 階段就失敗，而不是等到 render method 真正被呼叫才失敗。

| 線索 | 先問什麼 |
|---|---|
| `ClassNotFoundException` | 哪個 code 主動嘗試載入 class？classpath／dependency 是否存在？ |
| `NoClassDefFoundError` | class 是否曾經載入失敗或初始化失敗？ |
| `NoSuchMethodError` | compile 與 runtime 使用的 library／mapping 是否不同？ |
| `ClassCastException` | 同名型別是否由不同 loader 定義？ |
| client class on dedicated server | common／client source set 與 entrypoint 是否分開？ |
| Mixin target not found | mapping、descriptor、版本與 class transform 順序是否正確？ |

## 4. JVM Run-Time Data Areas

JVM Specification 定義幾個 run-time data areas，但規範概念不等於每個 JVM 實體上都有一塊同名記憶體區域。需要記住的是 ownership、生命週期與可觀察症狀。[1]

| Area | Ownership | 主要內容 | Minecraft 對照 |
|---|---|---|---|
| `pc` register | 每個 thread | 目前 instruction 位置的抽象概念 | stack trace／thread dump 的執行位置 |
| JVM Stack | 每個 thread | frames、local variables、operand stacks | recursion、thread count、`StackOverflowError` |
| Heap | JVM／threads 共享 | objects、arrays、部分 runtime data | entity、world data、cache、temporary objects |
| Method Area | JVM 共享的規範概念 | class structure、method、field、runtime constant pool 等 | mod class、generated class、class metadata |
| Run-Time Constant Pool | 每個 class／interface 的 runtime representation | literals、symbolic references、method／field references | class linking、reflection、method resolution |
| Native Method Stack | implementation dependent | native method execution | JNI、VM tool、native library |

### Stack｜每個 thread 的 frames

每次 method invocation 都會建立 frame，通常包含 local variable array、operand stack 與 dynamic linking／return information。[1]

```java
static int factorial(int value) {
    if (value <= 1) {
        return 1;
    }
    return value * factorial(value - 1);
}
```

遞迴沒有正確終止條件可能造成 `StackOverflowError`。stack 不是「所有 local object 都在那裡」的簡單規則：local variable 可能是 reference，真正被 reference 指向的 object 通常位於 heap；實體配置與 escape optimization 由 JVM implementation 決定。

### Heap｜共享物件空間

heap 是供所有 JVM threads 共享的 runtime area，objects 與 arrays 通常配置於此。GC 會追蹤物件是否仍然 reachable；`reference = null` 只移除一個 reference，不代表 object 立刻被收集。

```java
List<byte[]> batches = new ArrayList<>();
batches.add(new byte[1024 * 1024]);

batches.clear();
// object 是否能回收要看是否還有其他 reference／GC root
```

allocation rate 高不一定等於 memory leak；短命 object 可以被正常回收。要分辨兩者，需要比較 heap after GC、retained size、allocation profile 與時間趨勢。

## 5. Metaspace 與 Class Metadata

### Metaspace 是什麼？

在 HotSpot 中，class metadata 使用 native memory 的 Metaspace 管理；它是 implementation detail，不是 JVM Specification 要求所有 VM 都以同名方式實作的區域。大量動態產生 class、重複 classloader、plugin reload 或生成 proxy 可能讓 class metadata 持續增加。

```text
class bytes + class metadata
    ↓ load
ClassLoader / VM metadata
    ↓ classloader unreachable?
eligible for class unloading
```

Metaspace 壓力的根因可能包括：

| 根因 | 可能現象 |
|---|---|
| 動態 class 生成失控 | `OutOfMemoryError: Metaspace` |
| plugin／mod reload 沒釋放 classloader | 每次 reload metadata 增加 |
| static reference 指向舊 classloader | classloader 無法回收 |
| proxy／bytecode generation 沒有限制 | 大量 generated class |
| dependency／loader 重複 | 同一 library 出現多份 type |

不要看到 Metaspace OOM 就只加 `-XX:MaxMetaspaceSize`。限制上限可能更快暴露 leak，但不會修復仍被 reference 保留的 classloader。先用 class histogram、classloader statistics、heap dump 或 profiler 找 retention path。

## 6. Garbage Collection 與 GC Roots

### GC 的核心是 reachability

Garbage Collection 不是「按照變數名稱刪除 object」，而是從 root set 探索仍可達的 object graph。無法從 GC Roots 到達的 object 才具備被回收的資格；何時真正回收由 JVM 與 collector 決定。[3] [4]

```text
GC Roots
  ├─ live thread stack references
  ├─ static references
  ├─ active JNI references
  └─ other VM-defined roots
          ↓ reachability graph
      live objects
          ↓ no path from roots
      eligible garbage
```

實際 root 類型與 collector implementation 有細節差異，因此 heap dump 工具顯示的 root category 要以工具與 JDK 文件為準。教學上先記住：**object 還活著，不代表它仍然有業務價值；只要仍被 root path 引用，GC 就不能替你收走。**

### Garbage collection 不是 resource management

GC 管理的是 JVM object memory，不會自動替你關閉：

- file descriptor、`InputStream`、`Reader`、`Writer`；
- socket、database connection、native handle；
- `ExecutorService` 的 worker thread；
- Minecraft event registration、scheduler task 或 platform resource。

```java
try (InputStream input = Files.newInputStream(path)) {
    // I/O resource 由 close 管理，不要等待 GC
}
```

`System.gc()` 只是提示，不能當成修復 memory leak、tick lag 或 resource leak 的策略。不要在 server tick 中週期性呼叫它來「整理記憶體」。

### Collector 與診斷思路

不同 JDK／VM 可能提供不同 garbage collector，例如 G1 或 ZGC；選擇涉及 heap size、pause target、allocation pattern、throughput、latency 與 deployment。不要從網路貼上的一串 JVM flags 開始，先建立：

```text
allocation rate
    + heap occupancy
    + pause duration
    + CPU
    + live set after GC
    + server tick latency
```

GC log 中的 pause 不等於每次都是 bug；短暫、符合 workload 的 pause 與持續增長的 live set 是不同問題。對 Minecraft server，還要將 GC pause 和 tick time、player count、chunk load、entity count、mod task queue 一起觀察。

## 7. Memory Leak｜仍可達但不再需要

### Java 的 memory leak 形式

Java 有 GC，但仍可能有 memory leak。典型定義是：程式仍然保留 object 的 reference，使 object reachable；可是業務上已經不需要它，因此 GC 無法回收。

```java
final class PlayerCache {
    private static final Map<String, PlayerSnapshot> CACHE = new HashMap<>();

    static void remember(String playerId, PlayerSnapshot snapshot) {
        CACHE.put(playerId, snapshot);
    }

    // 如果永遠不移除離線玩家，cache 會隨玩家數成長
}
```

常見 retention source：

| Retention source | 修復方向 |
|---|---|
| static `Map`／`List` | 明確 eviction、lifecycle clear 或 bounded cache |
| event listener 沒 unregister | 對應 register／unregister，處理 reload |
| scheduler task capture 大 object | cancel task，避免 lambda capture 過多 state |
| `ThreadLocal` 未清理 | thread pool task 結束後 remove |
| queue 沒有 consumer 或上限 | back-pressure、bounded queue、reject policy |
| cache 沒 TTL／size limit | eviction policy、metrics、manual invalidation |
| classloader 被 static reference 保留 | release plugin／mod references，避免舊 loader retention |
| debug／history collection 無限追加 | 設定 retention policy 與 sampling |

### Minecraft 常見 memory leak

| 情境 | 可能被保留的物件 |
|---|---|
| player join 時加入 static map，leave 時不移除 | player、world、profile、持有的 mod state |
| 每次 reload 重複註冊 event | listener、classloader、captured service |
| 每 tick 追加 debug history | `List`、log snapshot、NBT 或 block data |
| chunk／entity cache 沒有 eviction | 大量 world data、references、path result |
| background future 永遠排隊 | request、payload、callback、buffer |
| command 建立 thread 但不 shutdown | thread stack、executor queue、captured objects |

不要用「把 field 設成 null」當作通用 leak 修復；先找出真正的 retaining path，確認誰仍然持有 reference，再修 lifecycle、ownership、eviction 或 cancellation。

## 8. JVM 診斷工具

### `jcmd`

`jcmd` 可以向正在執行的 JVM 發送診斷命令，協助取得 VM、thread、class、GC 與 heap 資訊。[5]

```bash
jps -lv
jcmd <pid> VM.version
jcmd <pid> VM.command_line
jcmd <pid> Thread.print
jcmd <pid> GC.heap_info
jcmd <pid> GC.class_histogram
jcmd <pid> GC.heap_dump filename.hprof
```

heap dump 可能很大，也可能包含敏感資料。執行前先確認磁碟空間、process permission、server impact、玩家資料、token、路徑與分享規則。不要在沒有理解 impact 的 production server 上任意 dump heap。

### `jstack` 與 thread dump

```bash
jstack <pid>
```

thread dump 可以協助判斷：

| Thread 狀態 | 可能方向 |
|---|---|
| `RUNNABLE` 長時間佔 CPU | busy loop、熱點計算、lock-free spin、I/O 顯示方式需交叉判斷 |
| `BLOCKED` | 等待 monitor、lock contention、可能 deadlock |
| `WAITING` | queue、future、condition 或 scheduler wait |
| `TIMED_WAITING` | sleep、timeout、scheduled wait |
| 大量 pool worker idle | 不一定是問題，要看 pool size 與 lifecycle |
| server thread 卡住 | 可能是 I/O、lock、GC pause 或大型 world operation |

### `jstat` 與 GC 觀察

```bash
jstat -gcutil <pid> 1000
jstat -class <pid> 1000
```

`jstat` 的輸出要和 JDK、collector、heap config 與 workload 一起解讀。單一時間點的數值不能證明 leak；要觀察一段時間、重現相同行為，並比較 GC 後 live set 是否持續成長。

### `javap`、JFR 與 profiler

```bash
javap -verbose -c SomeClass.class
jcmd <pid> JFR.start name=investigation duration=60s filename=investigation.jfr
```

JFR 與 profiler 可以提供 allocation、CPU、lock、thread、class loading 與 I/O 線索。工具本身也可能有 overhead 或敏感輸出；在 Minecraft server 使用時先用短時間、低風險設定，並保存 Java／loader／mod version。

## 9. OOM 與 JVM 錯誤分層

| 錯誤 | 主要方向 | 第一個檢查 |
|---|---|---|
| `OutOfMemoryError: Java heap space` | heap allocation／retention／heap size | heap dump、GC 後 live set、retaining path |
| `OutOfMemoryError: Metaspace` | class metadata／classloader retention | class histogram、classloader、dynamic class generation |
| `OutOfMemoryError: Direct buffer memory` | off-heap direct buffer | network／NIO buffer lifecycle、native memory |
| `OutOfMemoryError: unable to create native thread` | OS thread／native memory／thread count | thread dump、pool size、OS limits |
| `StackOverflowError` | recursion／過深 call stack | call stack、termination condition、cycle |
| `InternalError` 或 VM crash | JVM／native／JNI／硬體或 implementation | hs_err log、JDK、native library、reproduction |
| 高 GC 但 heap 不滿 | allocation rate、短命 object、collector／pause policy | allocation profile、GC log、CPU與tick time |
| heap 持續成長 | leak 或 workload live set 增長 | after-GC trend、heap dump diff、retention path |

增加 `-Xmx` 可能延後 heap OOM，但也可能讓 process 使用更多記憶體、GC pause 變長、container 被 kill 或掩蓋 leak。先判斷是 live set、allocation rate、native memory、Metaspace、stack 還是 external resource。

## 10. Minecraft server 診斷流程

```text
現象：tick lag／server crash／記憶體增加
    ↓
記錄 Minecraft、loader、mod／plugin、JDK、JVM args、player／entity／chunk workload
    ↓
讀完整 log、Caused by、thread name 與時間線
    ↓
分類：class loading／heap／GC／thread／I/O／domain
    ↓
用 jcmd／jstack／jstat／JFR／profiler 取得證據
    ↓
建立最小 reproduction 或移除一個變因
    ↓
修正 ownership、lifecycle、cache、task、dependency 或資料流
    ↓
以同一 workload 驗證改善，加入 regression check
```

| 現象 | 不要先做 | 應先做 |
|---|---|---|
| server 定期卡頓 | 盲目增加 `-Xmx` | 比對 GC pause、tick time、allocation 與 task queue |
| heap 使用量持續增加 | 每分鐘呼叫 `System.gc()` | 比較 GC 後 live set 與 heap dump retention path |
| reload 後 Metaspace 成長 | 只提高 MaxMetaspaceSize | 找舊 classloader、listener、static reference |
| 輸入／輸出造成卡頓 | 在 tick 中加更多 thread | 將 I/O 放背景 executor，結果排回 owner thread |
| server 啟動失敗 | 只重裝 Java | 分 classpath、JDK、plugin、mapping、side 與 `<clinit>` |
| thread 數量增加 | 只看 heap | 讀 thread dump、executor lifecycle、native thread error |

Fabric、NeoForge 與 Paper 的 profiling、scheduler、run config、mapping 與 lifecycle 入口不同；上述是 Java／JVM 層的診斷框架，不是可直接互換的 loader command。

## 11. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 把 JVM spec 當成 HotSpot 實體 layout | 規範定義抽象語意，implementation 可不同 | 區分規範概念與 JDK／VM implementation |
| 把 `javac` 與 JIT 當成同一個 compiler | source compile 與 runtime optimization 不同階段 | 分清 javac、interpreter、profiling、JIT |
| 看到 heap OOM 就加大 `-Xmx` | 可能掩蓋 leak 或耗盡主機記憶體 | 先看 GC 後 live set 與 retaining path |
| 看到 GC 就呼叫 `System.gc()` | 不能修復 leak，可能增加 pause | 使用 metrics、GC log、heap dump、profiler |
| 以為 GC 會關閉檔案與 executor | GC 只管理 object memory | try-with-resources、close、shutdown |
| 以為 `null` 代表 object 立即消失 | 其他 reference／GC root 仍可能保留它 | 找完整 object graph 與 retaining path |
| 把 Metaspace 當所有 JVM 的標準區域 | 它是 HotSpot implementation detail | 查目前 JVM vendor／version 與 diagnostics |
| `ClassNotFoundException` 與 `NoClassDefFoundError` 混為一談 | 主動載入失敗與 linkage／初始化失敗方向不同 | 讀完整 cause、首次載入點與 classpath |
| common code import client class | server 可能在執行前就 class loading 失敗 | 分 common／client source set 與 entrypoint |
| 使用 `jcmd GC.heap_dump` 卻未考慮影響 | dump 可能很大且造成 latency、含敏感資料 | 短時維護窗口、檢查空間與 redact |
| 只看一次 `jstat` 數值 | 沒有趨勢就不能判斷 leak | 觀察 workload、GC 後 live set 與時間序列 |
| 只看 thread count 不看狀態 | idle pool 與 blocked worker 意義不同 | 讀 thread dump、CPU、queue 與 executor lifecycle |
| 把 JIT warm-up benchmark 當真實 server 效能 | workload、warm-up、GC 與 tick pattern 不同 | 使用代表性 workload 與 profiler |

## 12. 練習

### 練習一：從 source 到 bytecode

建立含有 local variable、if、loop 與 method call 的 `BytecodePractice.java`。用 `javac -g`、`javap -c -v -l` 觀察 class file version、constant pool、operand stack、line table 與 method descriptor。

### 練習二：class initialization failure

建立一個有失敗 static initializer 的 class，觀察第一次使用與第二次使用的 exception 差異。用完整 stack trace 找出第一次 `<clinit>` 失敗的 root cause，再比較 `ClassNotFoundException` 與 initialization failure 的差別。

### 練習三：GC Roots 與 memory retention

建立一個 static map、一個 bounded cache 與一個會清除 entry 的 listener。讓 object 被不同 reference 持有，使用 heap dump 或 profiler 觀察哪些 object 仍然 reachable，並畫出 retaining path。

### 練習四：thread 與 heap diagnostics

啟動一個有固定 thread pool 的 Java process，使用 `jps`、`jcmd Thread.print`、`jcmd GC.heap_info` 與 `jstat -gcutil` 記錄資料。調整 queue、worker 數量與 allocation workload，說明哪一個指標改變了。

### 練習五：Minecraft server investigation

在測試用 Fabric、NeoForge 或 Paper 環境中，選擇 tick lag、class loading、resource leak 或 cache growth 其中一種現象。保留版本、JDK、完整 log、thread dump／GC evidence 與 reproduction，最後寫出「現象 → layer → root cause → fix → verification」。

## 13. 複習速查

```text
.java
  ↓ javac
.class / bytecode
  ↓ class loading → linking → initialization
JVM runtime data areas
  ├─ per-thread stack + frames
  ├─ shared heap
  ├─ method area / runtime constant pool
  └─ implementation-specific native memory / Metaspace
  ↓ profiling + interpreter
JIT compiled code
  ↓
execution + allocation + GC + threads
```

| 我想回答什麼 | 先看什麼 |
|---|---|
| 為什麼 class 找不到 | classpath、dependency、classloader、side |
| 為什麼 class 初始化崩潰 | `<clinit>`、static field、最早的 cause |
| 為什麼 code 執行變快 | warm-up、profiling、JIT、allocation、GC |
| 為什麼 stack overflow | recursion、cycle、frame depth、thread stack |
| 為什麼 heap 增長 | allocation rate、GC 後 live set、GC Roots、retention path |
| 為什麼 Metaspace 增長 | classloader、dynamic classes、reload、static references |
| 為什麼 GC pause 影響 tick | pause time、heap、allocation、server workload |
| 為什麼 thread 太多 | executor／pool lifecycle、blocked／waiting thread、OS limit |
| 要用哪個診斷工具 | `javap`、`jcmd`、`jstack`、`jstat`、JFR、profiler |
| 先改哪裡 | 先分類 layer，取得 evidence，再改 code／config |

**JVM 深入的最重要習慣是：不要用猜的。** 看到 heap、GC、classloader 或 tick 問題時，先記錄 workload 與版本，取得可重現的數據，再沿著 object graph、call stack、class path 或 thread state 找真正的 root cause。

## References

[1]: https://docs.oracle.com/javase/specs/jvms/se26/html/index.html "The Java Virtual Machine Specification, Java SE 26"
[2]: https://dev.java/learn/jvm/ "Getting to know the JVM — Dev.java"
[3]: https://dev.java/learn/jvm/garbage-collection/ "Garbage Collection in Java Overview — Dev.java"
[4]: https://docs.oracle.com/en/java/javase/22/gctuning/ "Garbage Collection Tuning Guide — Oracle"
[5]: https://docs.oracle.com/en/java/javase/25/docs/specs/man/jcmd.html "The jcmd Command — Oracle Java SE 25 Tools Reference"
[6]: https://docs.oracle.com/en/java/javase/22/docs/specs/man/jstat.html "The jstat Command — Oracle Java SE 22 Tools Reference"
