---
title: Concurrency｜並行、併發與 Thread Safety
titleEn: Concurrency
topic: Concurrency
terms: Concurrency, Parallelism, Thread, Runnable, Executor, ExecutorService, Future, CompletableFuture, synchronized, Lock, ReentrantLock, volatile, Atomic, Concurrent Collections, Thread Safety, Race Condition, Visibility, Atomicity, Happens-before
slug: java-concurrency
category: Java 現代語法
order: 77
level: 中階到進階
tags: Java, Concurrency, Thread, ExecutorService, Future, CompletableFuture, synchronized, Lock, volatile, Atomic, ConcurrentHashMap, Thread Safety, Minecraft Java
aliases: Concurrency, 並行, 併發, 多執行緒, Thread Safety, 執行緒安全, Race Condition, 競爭條件
summary: 從 Thread 與 Runnable 開始，理解 ExecutorService、Future、CompletableFuture、synchronized、Lock、volatile、Atomic 與 concurrent collections，並以 Minecraft server thread boundary、背景 I/O、主執行緒回排與 race condition 為核心實戰。
---

# Concurrency｜並行、併發與 Thread Safety

> **核心目標：** 能判斷哪些工作可以放到背景 thread、哪些資料需要同步、哪些操作必須回到 Minecraft server／client thread，並選擇正確的 executor、lock、atomic 或 concurrent collection。

**Concurrency｜併發** 指多個工作在同一段時間內交錯進行；**Parallelism｜平行** 則是多個工作實際同時使用不同 CPU core。兩者相關但不相同。只要多個 thread 可能存取共享狀態，你就必須考慮 **Thread Safety｜執行緒安全**，即使程式「大部分時間看起來都能跑」。

Java 的 concurrency 工具不能自動讓 Minecraft world、entity、registry 或 UI thread-safe。工具只提供 thread 啟動、工作排程、記憶體可見性、互斥與安全資料結構；你仍要先定義 **owner**、**thread boundary**、**生命週期** 與 **取消方式**。[1] [2]

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| Thread model | 分辨 Thread、Runnable、task、executor 與 worker pool |
| 工作排程 | 使用 `Executor`／`ExecutorService` 執行工作並正確 shutdown |
| 結果與取消 | 使用 `Future` 等待、取消、檢查例外與處理 interrupt |
| 非同步流程 | 使用 `CompletableFuture` 組合背景工作與完成 callback |
| 共享狀態 | 分辨 race condition、visibility、atomicity 與 happens-before |
| 同步工具 | 知道 `synchronized`、`Lock`、`volatile`、Atomic 的適用邊界 |
| 容器選擇 | 根據讀寫模式選擇 `ConcurrentHashMap`、`BlockingQueue` 或 immutable snapshot |
| Minecraft 安全 | 背景 I/O／純計算完成後，將遊戲狀態更新排回正確 thread |

## 1. 先建立 Thread mental model

### Thread 執行什麼？

`Thread` 是執行路徑的 runtime object；真正被執行的工作通常由 `Runnable` 或 `Callable<T>` 表達。不要把「建立 Thread」與「設計一個可取消、可觀測、可關閉的工作系統」混為一談。

```java
Runnable task = () -> System.out.println("running on another thread");
Thread thread = new Thread(task, "io-worker");
thread.start();

// join 會等待 thread 結束；InterruptedException 必須被處理
try {
    thread.join();
} catch (InterruptedException error) {
    Thread.currentThread().interrupt();
}
```

`start()` 會安排新的 thread 執行；直接呼叫 `run()` 只是普通 method call，不會建立新的 thread：

```java
thread.start(); // ✅ 新的執行路徑
thread.run();   // ❌ 只是在目前 thread 直接呼叫
```

### Runnable 與 Callable

`Runnable` 沒有回傳值，`Callable<T>` 可以回傳值並拋出 checked exception。它們都是 task 的描述，不是 thread pool 本身：

```java
Runnable refreshCache = () -> cache.refresh();
Callable<String> loadMarkdown = () -> Files.readString(path, StandardCharsets.UTF_8);
```

Java thread 的語意包含 thread interruption、synchronization 與 memory model；不正確同步時，讀到的值可能不是你直覺以為的最新值。[2] 所以「沒有看到錯誤」不等於程式是正確的。

## 2. `Executor` 與 `ExecutorService`

### Executor：把 task 與 thread 管理分開

`Executor` 只描述「交給某個執行器執行 Runnable」：

```java
Executor executor = command -> new Thread(command, "one-shot-worker").start();
executor.execute(() -> System.out.println("work started"));
```

呼叫端不需要知道 executor 是建立新 thread、使用 pool、在目前 thread 執行，或交給 framework queue。這就是 task 與執行策略分離的價值。

### ExecutorService：可管理生命週期與結果

`ExecutorService` 在 `Executor` 之上增加 task submission、`Future`、bulk execution、shutdown 與 termination 管理。[3]

```java
ExecutorService workers = Executors.newFixedThreadPool(2);
try {
    workers.execute(() -> indexMarkdownFiles());
} finally {
    workers.shutdown();
}
```

`shutdown()` 會拒絕新工作，但讓已提交工作有機會完成；`shutdownNow()` 會嘗試停止執行中的工作，並讓尚未開始的工作不再啟動。停止不是強制殺死 thread，task 必須配合 interruption 才能快速結束。[3]

```java
static void shutdownAndAwait(ExecutorService workers) {
    workers.shutdown();
    try {
        if (!workers.awaitTermination(10, TimeUnit.SECONDS)) {
            workers.shutdownNow();
        }
    } catch (InterruptedException error) {
        workers.shutdownNow();
        Thread.currentThread().interrupt();
    }
}
```

Java 版本允許時可以使用 `ExecutorService` 的 `AutoCloseable` 行為搭配 try-with-resources；若專案需要支援較舊 Java，使用明確的 `shutdown`／`awaitTermination` lifecycle。無論寫法如何，長生命週期的 executor 都必須有 owner 與 shutdown 時機。

### 不要每個 task 都 new Thread

```java
// ❌ 大量工作時會失去 thread 數量控制與生命週期
for (Path path : paths) {
    new Thread(() -> index(path)).start();
}

// ✅ 把 task 交給有界 worker pool
ExecutorService workers = Executors.newFixedThreadPool(4);
for (Path path : paths) {
    workers.submit(() -> index(path));
}
```

pool size 不是越大越好。I/O-bound 工作、CPU-bound 工作、外部服務等待與 Minecraft server 的 tick workload 需要不同策略；先量測 queue length、task latency、CPU、記憶體與 thread count，再調整。

## 3. `Future`：追蹤一個非同步結果

`submit()` 會回傳 `Future<T>`，可以等待結果、取消工作或查詢完成狀態：

```java
ExecutorService workers = Executors.newSingleThreadExecutor();
try {
    Future<String> loaded = workers.submit(
            () -> Files.readString(path, StandardCharsets.UTF_8)
    );

    String markdown = loaded.get();
    System.out.println(markdown.length());
} catch (InterruptedException error) {
    Thread.currentThread().interrupt();
} catch (ExecutionException error) {
    Throwable cause = error.getCause();
    throw new IllegalStateException("Markdown loading failed", cause);
} finally {
    workers.shutdown();
}
```

`Future.get()` 會等待，因此在 Minecraft server thread 或 client render thread 上直接呼叫可能造成 tick lag 或畫面卡頓。應使用 timeout、非同步 completion 或把等待放在合適的 worker lifecycle；不要把背景工作改名後仍然在主 thread blocking。

```java
Future<Result> future = workers.submit(this::computeResult);
boolean accepted = future.cancel(true); // 嘗試取消；task 必須檢查 interruption
```

`cancel(true)` 是取消要求，不保證 task 立刻停止。task 應避免吞掉 `InterruptedException`：

```java
static void cancellableLoop() {
    while (!Thread.currentThread().isInterrupted()) {
        doSmallUnitOfWork();
    }
}
```

## 4. `CompletableFuture`：組合非同步流程

`CompletableFuture<T>` 可以表達一個未來會完成或失敗的結果，並將多個 stage 組合成 pipeline：

```java
ExecutorService workers = Executors.newFixedThreadPool(2);

CompletableFuture<String> markdown = CompletableFuture.supplyAsync(
        () -> loadMarkdownUnchecked(path),
        workers
);

CompletableFuture<Integer> length = markdown
        .thenApply(String::length)
        .exceptionally(error -> 0);

length.whenComplete((value, error) -> {
    try {
        if (error != null) {
            log(error);
        } else {
            System.out.println("length=" + value);
        }
    } finally {
        workers.shutdown();
    }
});
```

常用 stage 的差異如下：

| API | 意義 |
|---|---|
| `supplyAsync(supplier, executor)` | 非同步執行並產生結果 |
| `runAsync(runnable, executor)` | 非同步執行但沒有結果 |
| `thenApply(function)` | 以結果做同步轉換並產生下一個結果 |
| `thenCompose(function)` | 串接另一個 `CompletionStage`，避免巢狀 future |
| `thenCombine(other, combiner)` | 等兩個結果都完成後組合 |
| `thenAccept(consumer)` | 消費結果但不再產生主要結果 |
| `exceptionally(function)` | 發生例外時產生 fallback |
| `handle(function)` | 同時取得 result 與 error，決定下一步 |
| `whenComplete(action)` | 觀察完成，不應偷偷改變主要結果 |

如果沒有指定 executor，部分 async stage 可能使用 common pool。對 plugin、mod 或 server 生命週期敏感的工作，通常要明確傳入自己管理的 executor，並清楚決定 completion callback 執行在哪一條 thread。

```java
CompletableFuture
    .supplyAsync(this::readFromDisk, ioExecutor)
    .thenApply(this::parse)
    .thenAcceptAsync(
            result -> server.execute(() -> applyToWorld(result)),
            callbackExecutor
    );
```

上面 `server.execute(...)` 是 platform-neutral 示意：真正的 Fabric、NeoForge 或 Paper API 各自有不同的 scheduler／server task API，不能直接互換。關鍵設計是 I/O 與 parse 在背景 thread，world mutation 回到擁有該狀態的 server thread。

## 5. 三個 concurrency correctness 概念

### Race condition：結果依賴時序

```java
final class Counter {
    private int value;

    void increment() {
        value++; // read → add → write，不是單一不可分割操作
    }

    int value() {
        return value;
    }
}
```

兩個 thread 同時執行 `value++` 可能讀到同一個舊值，最後遺失一次更新。這不是「CPU 不夠快」，而是 compound operation 沒有正確同步。

### Visibility：一個 thread 是否看得到更新

一個 thread 寫入 field，另一個 thread 不一定依直覺立即觀察到相同值；需要 synchronization、volatile、atomic、executor／future 的 happens-before 關係或其他明確同步機制。JLS Chapter 17 描述了 synchronization、shared variables 與 happens-before order。[2]

### Atomicity：操作是否不可分割

`AtomicInteger.incrementAndGet()` 是針對單一 atomic counter 的工具；它不會讓包含多個 field 的整個 domain state 自動成為 transaction。若需要「檢查 A 再同時更新 B、C」，通常需要 lock、immutable replacement 或 single-owner message passing。

```text
Thread Safety 判斷
    ↓
誰擁有 state？
    ↓
哪些 thread 可讀／寫？
    ↓
讀寫是否需要 atomicity？
    ↓
如何建立 visibility／happens-before？
    ↓
如何取消、關閉與測試？
```

## 6. `synchronized`：以 monitor 保護臨界區

`synchronized` statement 會鎖住某個 object 的 monitor，同一時間只有一個 thread 能持有該 monitor。[2]

```java
final class SafeCounter {
    private int value;

    synchronized void increment() {
        value++;
    }

    synchronized int value() {
        return value;
    }
}
```

也可以明確指定 lock object：

```java
final class Inventory {
    private final Object lock = new Object();
    private int count;

    void add(int amount) {
        synchronized (lock) {
            count += amount;
        }
    }
}
```

不要把 public object、字串 literal 或可能被外部取得的 object 當 private lock，否則別的程式碼可能意外競爭同一把鎖。臨界區應盡量小，不要在 lock 裡做網路 I/O、長時間檔案 I/O 或呼叫未知的 callback。

`synchronized` 不只是防止兩個 thread 同時進入；正確使用時也建立記憶體可見性。但它不會替你避免 deadlock、設計 timeout 或自動取消等待中的工作。

## 7. `Lock`：需要更多控制時

`Lock` 類別提供比 `synchronized` 更顯式的 lock／unlock 操作。最常用的是 `ReentrantLock`：

```java
final class LockedCounter {
    private final Lock lock = new ReentrantLock();
    private int value;

    void increment() {
        lock.lock();
        try {
            value++;
        } finally {
            lock.unlock();
        }
    }
}
```

`unlock()` 必須放在 `finally`，否則 exception 會讓 lock 永遠不釋放。`tryLock()` 可以避免無限等待；`lockInterruptibly()` 可以讓等待 lock 的 thread 回應 interruption：

```java
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try {
        updateSharedState();
    } finally {
        lock.unlock();
    }
}
```

`Lock` 適合需要 timeout、可中斷等待、多個 condition 或明確 lock policy 的情況；如果只是保護簡單 invariant，`synchronized` 通常更容易讀。不要因為 `Lock` API 比較長就以為它自動比 `synchronized` 安全。

## 8. `volatile`：可見性，不是複合操作互斥

`volatile` field 讓對該 field 的讀寫遵守特定的 memory visibility semantics，常用於簡單的 stop flag：

```java
final class Worker implements Runnable {
    private volatile boolean running = true;

    void stop() {
        running = false;
    }

    @Override
    public void run() {
        while (running) {
            doSmallUnitOfWork();
        }
    }
}
```

但 `volatile` 不會讓 `count++` 變成 atomic，也不會保護多個 field 的一致性：

```java
private volatile int count;

void increment() {
    count++; // ❌ 仍然是 read → add → write
}
```

需要單一 counter 的 atomic update 時使用 `AtomicInteger`；需要多欄位 invariant 時使用 lock、immutable state 或單一 owner。

## 9. Atomic types：無 lock 的單值更新工具

`AtomicInteger`、`AtomicLong`、`AtomicBoolean`、`AtomicReference<T>` 提供常見的 compare-and-set、increment、update 與 lazy set 操作：

```java
AtomicInteger processed = new AtomicInteger();
processed.incrementAndGet();
processed.addAndGet(5);

AtomicReference<String> status = new AtomicReference<>("IDLE");
boolean changed = status.compareAndSet("IDLE", "RUNNING");
```

Atomic 適合單一值或可用 compare-and-set 表達的簡單狀態機。它不是「整個 class 自動 thread-safe」標籤，也不是任何 lock-free algorithm 都容易寫對的保證。若 `status` 與 `owner` 必須同時更新，單獨對 status 使用 Atomic 仍可能留下不一致。

大量 counter 由多個 thread 更新時，可以評估 `LongAdder`；但選擇之前要先看你需要即時精確值、snapshot 或高競爭更新吞吐量哪一種語意。

## 10. Concurrent Collections

普通 `ArrayList`、`HashMap` 與 `HashSet` 不是任意多 thread 讀寫都安全。`ConcurrentHashMap`、`CopyOnWriteArrayList`、`ConcurrentLinkedQueue`、`BlockingQueue` 等提供不同的並行語意：

| 容器 | 適合情境 | 注意事項 |
|---|---|---|
| `ConcurrentHashMap<K,V>` | 多 thread 讀寫 map、cache、registry snapshot | 複合 read-then-write 要使用 `compute`／`merge` 或額外同步 |
| `CopyOnWriteArrayList<E>` | 讀多寫少、listener／snapshot list | 每次寫入會複製陣列，不適合頻繁更新 |
| `ConcurrentLinkedQueue<E>` | 非阻塞 queue、producer／consumer | 不提供等待資料的 blocking 語意 |
| `BlockingQueue<E>` | 工作 queue、producer／consumer back-pressure | 要處理 `put`／`take` 的 interruption 與 shutdown |
| immutable `List`／snapshot | 讀取多、更新以整份替換 | 需要明確 publish 與 ownership |

```java
ConcurrentHashMap<String, Integer> counts = new ConcurrentHashMap<>();
counts.merge("minecraft:stone", 1, Integer::sum);

BlockingQueue<Runnable> queue = new LinkedBlockingQueue<>();
queue.put(() -> indexMarkdownFiles());
Runnable next = queue.take();
```

Concurrent collection 保護的是它自己的結構與指定操作，不代表放進去的 value、entity、world 或 callback 也 thread-safe。尤其 `ConcurrentHashMap` 的 iterator 通常是 weakly consistent；不要把 iteration snapshot 誤當成整個 domain transaction。

## 11. Minecraft Thread Safety：真正重要的邊界

Minecraft server 通常有一條負責遊戲世界與 tick 的主要 thread；client 也有 render、input、network 等不同生命週期。實際 scheduler 名稱與規則依 Fabric、NeoForge、Paper 與版本不同，但核心判斷是一樣的：**誰擁有遊戲狀態，就由誰在正確 thread 修改它。**

### 安全的分層模式

```text
Server／client thread
    ↓ submit background work
ExecutorService
    ↓ I/O、parse、純計算、不可變 DTO
Completion callback
    ↓ schedule back to owner thread
Server／client thread
    ↓ apply validated result
World／entity／registry state
```

可放背景 thread 的工作通常包含讀檔、HTTP、解析文字、計算 path 或處理不可變資料；不應直接在背景 thread 觸碰 world、entity、registry lifecycle、render state 或具有 thread contract 的 API。

```java
record IndexResult(List<String> ids) {}

CompletableFuture<IndexResult> result = CompletableFuture.supplyAsync(
        this::scanMarkdownOffThread,
        ioExecutor
);

result.thenAccept(index -> server.execute(() -> {
    // `server.execute` 是示意；使用目前 loader／plugin 的正式 scheduler。
    if (server.isRunning()) {
        applyIndexToServerState(index);
    }
}));
```

### 常見 Minecraft 併發錯誤

| 現象 | 常見根因 | 修正方向 |
|---|---|---|
| tick lag | 在 server thread 做檔案、HTTP 或大型掃描 | 背景處理，結果排回 server thread |
| ConcurrentModificationException | 一邊 iteration、一邊修改普通 collection | owner thread、snapshot 或正確 concurrent collection |
| world state 偶發錯誤 | 背景 thread 直接修改 entity／world | 回排到 world owner thread |
| server 關閉後 callback 仍執行 | executor 沒有 lifecycle／取消策略 | shutdown、cancel、檢查 server lifecycle |
| 讀到半套狀態 | 多欄位更新沒有 atomic boundary | immutable snapshot、lock 或單一 owner |
| client-only class 在 dedicated server 崩潰 | side boundary 與 class loading 混淆 | common／client code 分層，並遵循 loader contract |

不要把 `ConcurrentHashMap` 當作「Minecraft world 可以從任意 thread 存取」的通行證。container thread-safe 與遊戲狀態 thread-safe 是兩個不同問題。

## 12. Cancellation、Interrupt 與 shutdown

可管理的 concurrency 工作必須回答「如何停止」。`Future.cancel(true)`、`shutdownNow()` 與 `CompletableFuture.cancel(true)` 都主要透過 interruption 或 completion state 傳達取消意圖；工作本身要在合理頻率檢查 interruption，並在 I/O、sleep、queue wait 時正確處理 `InterruptedException`。

```java
static void runUntilStopped() {
    try {
        while (!Thread.currentThread().isInterrupted()) {
            doOneBatch();
            Thread.sleep(50);
        }
    } catch (InterruptedException error) {
        Thread.currentThread().interrupt();
        // 清理資源，正常結束 worker
    }
}
```

不要 catch `InterruptedException` 後什麼都不做：

```java
try {
    Thread.sleep(1000);
} catch (InterruptedException ignored) {
    // ❌ 吞掉 cancellation signal
}
```

如果目前 layer 無法立刻結束，至少恢復 interrupt status 或把 interruption 往上傳遞。關閉 server、mod 或 plugin 時，要先停止接受新工作，再等待已提交工作短時間完成，最後取消仍未結束的工作。

## 13. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 直接 `new Thread` 處理所有工作 | thread 數量、命名、錯誤與 shutdown 失控 | 使用有 owner 的 ExecutorService |
| `run()` 當成 `start()` | 沒有建立新的執行路徑 | 需要新 thread 時呼叫 `start()` |
| `HashMap` 多 thread 共享 | 結構與複合操作沒有安全保證 | owner、lock、snapshot 或 concurrent collection |
| 認為 `volatile` 能保護 `count++` | visibility 不等於 atomicity | `AtomicInteger` 或 lock |
| Atomic field 讓整個 object 安全 | 多欄位 invariant 仍可能被打斷 | lock、immutable replacement 或 single owner |
| lock 沒放 `finally` unlock | exception 可能讓 lock 永久不釋放 | `try/finally` 包住臨界區 |
| 在 lock 裡做 I/O | 放大等待、降低吞吐，可能造成 deadlock | 先取 snapshot，lock 外做 I/O |
| `Future.get()` 放在 server tick | blocking 造成 tick lag | completion callback 與 scheduler 回排 |
| 吞掉 `InterruptedException` | cancellation 與 shutdown 失效 | restore interrupt 或向上傳遞 |
| background callback 修改 world | 違反遊戲狀態 owner 的 thread contract | 排回正確 server／client thread |
| 以 `ConcurrentHashMap` 解決所有問題 | map 安全不代表 value 或 domain state 安全 | 分開評估 container 與 domain ownership |
| 使用 common pool 卻沒有 lifecycle | 工作可能跨越 mod／server 關閉 | 使用明確 executor 與 shutdown policy |
| 只測單一 thread | race condition 可能只在壓力或特定時序出現 | barrier、repeated test、timeout 與 deterministic ownership |

## 14. 練習

### 練習一：安全的 Markdown indexer

使用固定大小的 `ExecutorService` 對多篇 Markdown 做純讀取與 parse，結果先放入 immutable `IndexResult`，最後用一個模擬的 `serverExecutor` 套用索引。要求原稿是 source，index 是 derived data，並在 workspace 關閉時停止 worker。

### 練習二：Race condition 重現

用兩個 thread 對普通 `int` counter 執行大量 `++`，再分別改成 `synchronized`、`AtomicInteger` 與 `LongAdder`。比較最後結果、可讀性與適用語意，不要只比較一次執行時間。

### 練習三：Future cancellation

建立一個會逐批掃描檔案的 `Callable`，用 `Future.cancel(true)` 取消它。確認 task 有檢查 interrupt、`InterruptedException` 不會被吞掉、executor 會 shutdown，並記錄 cancelled、failed 與 completed 三種結果。

### 練習四：CompletableFuture thread trace

建立「讀取 → parse → validate → 回排」pipeline，在每一個 stage 印出 thread name。確認哪些 stage 在 worker executor，哪些 stage 在模擬的 server executor；加入一個 parse error，觀察 `exceptionally` 與 `whenComplete` 的差異。

### 練習五：Minecraft thread boundary review

選擇 Fabric、NeoForge 或 Paper 其中一個平台，查明正式的 scheduler／server task API。把一個會讀檔的背景工作改成「背景讀取，主 thread 套用」兩段，並在 server shutdown 時取消尚未完成的工作。

## 15. 複習速查

```text
Task
  Runnable / Callable
        ↓ submit
Executor / ExecutorService
        ↓
Future / CompletableFuture
        ↓ result or cancellation
owner thread applies state

Shared state correctness
  race condition → synchronization / atomicity
  visibility      → happens-before / volatile / lock / future
  compound state  → lock / immutable snapshot / single owner
```

| 我想解決什麼 | 優先考慮 |
|---|---|
| 執行一次簡單工作 | `Runnable` + `Executor` |
| 管理 worker pool | `ExecutorService` |
| 等待、取消、取得結果 | `Future` |
| 組合多個非同步 stage | `CompletableFuture` |
| 保護簡單臨界區 | `synchronized` |
| 需要 timeout／可中斷 lock | `Lock`／`ReentrantLock` |
| 只需要單一 flag 的可見性 | `volatile` 或 interruption |
| 單一 counter／reference 的 atomic update | `AtomicInteger`／`AtomicReference` |
| 多 thread map 讀寫 | `ConcurrentHashMap` |
| producer／consumer 工作流 | `BlockingQueue` |
| Minecraft world／entity 更新 | 排回真正的 owner thread |
| I/O、parse、純計算 | 背景 executor，但要有 shutdown 與 cancellation |

## References

[1]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/concurrent/package-summary.html "java.util.concurrent Package — Java SE 22 API"
[2]: https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html "Chapter 17. Threads and Locks — Java Language Specification"
[3]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/concurrent/ExecutorService.html "ExecutorService — Java SE 22 API"
[4]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/concurrent/CompletableFuture.html "CompletableFuture — Java SE 22 API"
[5]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/concurrent/locks/Lock.html "Lock — Java SE 22 API"
[6]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/concurrent/atomic/package-summary.html "java.util.concurrent.atomic Package — Java SE 22 API"
