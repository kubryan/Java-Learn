---
title: Debugging｜除錯、Breakpoint 與 Stack Trace
titleEn: Debugging
topic: Debugging
terms: Debugging, Breakpoint, Step Over, Step Into, Step Out, Watch, Call Stack, Debug Console, Exception Stack Trace, Root Cause, Cause, Suppressed Exception, jdb, JPDA, Conditional Breakpoint, Thread Dump
slug: java-debugging
category: Java 開發
order: 7
level: 入門到進階
tags: Java, Debugging, Breakpoint, Stack Trace, jdb, Minecraft, Fabric, NeoForge, Paper, Mod, Plugin
aliases: Debugging, 除錯, Stack Trace, 堆疊追蹤, Breakpoint, 中斷點, Call Stack, 呼叫堆疊
summary: 從 breakpoint、step over／into／out、watch、call stack 與 debug console 開始，建立看到 Exception Stack Trace 後定位真正 root cause 的流程，並對照 Minecraft mod／plugin 啟動與 runtime 錯誤。
---

# Debugging｜除錯、Breakpoint 與 Stack Trace

> **核心目標：** 看到錯誤時，不只複製最後一行，而是從 Exception Stack Trace、`Caused by`、Call Stack 與實際變數狀態，找出真正出錯的 layer、輸入與前置條件。

Debugging｜除錯不是「猜哪一行可能有問題」，而是建立可驗證的假設，再用 breakpoint、log、watch、stack trace、測試與最小重現去排除錯誤。Java 的 `jdb` 是命令列 debugger，可檢查 local 或 remote JVM；IDE debugger 通常也是透過 Java debugging infrastructure 提供類似能力。[1] [2]

對 Minecraft mod／plugin 而言，錯誤可能發生在 loader、mapping、dependency、class loading、resource、registry、event、network payload、server thread 或你的 domain logic。**先定位 layer，再修 code**，比看到 `NullPointerException` 就到處加 null check 更有效。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| Breakpoint | 在正確的 method／line 停住，而不是盲目逐行執行 |
| Step control | 分辨 Step Over、Step Into、Step Out 與 Continue |
| State inspection | 使用 Variables、Watch、Evaluate／Debug Console 觀察 runtime value |
| Call Stack | 從目前 frame 回溯呼叫者，判斷哪一層傳入錯誤狀態 |
| Stack trace | 讀懂 exception type、message、frame、`Caused by` 與 suppressed exception |
| Root cause | 找到最早有意義的 application／mod frame，而非只修最外層包裝例外 |
| Minecraft diagnosis | 區分 loader 啟動錯誤、side／dependency 問題、遊戲狀態錯誤與自己的邏輯 bug |
| 修復驗證 | 建立最小重現、修正後加入 regression test 或明確驗收步驟 |

## 1. Debugging 的問題解法

### 從 symptom 到 root cause

一個錯誤通常有三層：

| 層次 | 問題 | 範例 |
|---|---|---|
| Symptom | 使用者看到了什麼？ | server 啟動失敗、command 沒反應、tick lag |
| Failure point | 程式在哪個操作失敗？ | `Files.readString`、registry lookup、`map.get(key)` |
| Root cause | 為什麼那個操作收到錯誤狀態？ | path 錯、dependency 缺失、順序錯、thread owner 錯 |

```text
觀察 symptom
    ↓
保留完整錯誤輸出與 reproduction steps
    ↓
讀最內層 Caused by 與第一個有意義的 application frame
    ↓
檢查該 frame 的輸入、呼叫者與 lifecycle
    ↓
建立最小假設
    ↓
breakpoint／watch／log／test 驗證
    ↓
修復並加入 regression check
```

### 不要只看最後一行

```text
Exception in thread "Server thread" java.lang.IllegalStateException: Cannot register after freeze
    at com.example.mod.RegistryBootstrap.register(RegistryBootstrap.java:42)
    at com.example.mod.ModInitializer.onInitialize(ModInitializer.java:18)
    at net.fabricmc.loader.impl.entrypoint.EntrypointUtils.invoke(EntrypointUtils.java:70)
Caused by: java.lang.IllegalStateException: registry is frozen
    at com.example.game.Registry.checkMutable(Registry.java:120)
```

在這個示意中，最後一行 `registry is frozen` 是線索；真正要調查的是 `RegistryBootstrap.register` 在第 42 行為什麼於錯誤 lifecycle 呼叫，以及誰讓 registry 進入 frozen state。不要把 `net.fabricmc` frame 當成一定是 Fabric bug，也不要看到 exception type 就跳過呼叫順序分析。

## 2. Breakpoint｜中斷點

Breakpoint 讓程式在指定的 line、method 或 exception 發生時暫停。暫停後你可以查看 local variables、fields、thread、call stack 與下一步執行路徑。

### 放在哪裡？

好的 breakpoint 通常放在：

| 位置 | 目的 |
|---|---|
| exception 發生前一行 | 檢查造成錯誤的輸入與前置條件 |
| service／controller 入口 | 確認呼叫是否抵達、參數是否正確 |
| domain rule 判斷 | 確認哪個條件分支被選中 |
| boundary conversion | 確認 JSON／NBT／command data 是否已驗證 |
| scheduler callback | 確認 callback 在哪條 thread 執行 |
| registry／lifecycle hook | 確認初始化順序與 loader side |

不要一開始在整個程式每一行都設 breakpoint。先選一個可驗證假設，例如「這個玩家 ID 在進入 lookup 前已經是 null」，再在 boundary 與 failure point 各放一個 breakpoint。

### Conditional breakpoint

如果 breakpoint 會被觸發很多次，可以加條件：

```java
for (Player player : players) {
    String id = player.getId();
    if (id.equals(targetId)) {
        process(player);
    }
}
```

可以只在 `id.equals(targetId)` 或 `player.getName().equals("TestPlayer")` 時暫停。條件必須是沒有副作用的 expression；不要在 breakpoint condition 中寫會修改 world、發送 network packet、改變 collection 或呼叫昂貴 I/O 的程式。

## 3. Step Over、Step Into、Step Out

| 操作 | 行為 | 適合問題 |
|---|---|---|
| Continue／Resume | 繼續執行到下一個 breakpoint 或 exception | 已知目前 frame，不想逐行看 |
| Step Over | 執行目前 line，但不進入被呼叫的 method | 想確認目前 method 的順序與結果 |
| Step Into | 進入目前 line 呼叫的 method | 懷疑 helper、mapper、lookup 的內部行為 |
| Step Out | 執行完目前 method，回到 caller | 已經確認此層不是 root cause |
| Run to Cursor | 執行到指定位置 | 快速跳過已理解的中間程式 |

### 範例：找出錯誤 layer

```java
CalibrationResult result = parser.parse(payload);
ValidatedCalibration validated = validator.validate(result);
server.execute(() -> apply(validated));
```

如果錯誤出現在 `apply`：

1. 先用 Step Over 確認 `parser.parse` 與 `validator.validate` 已產生預期值。
2. 如果 `validated` 已錯，對 `validator.validate` 使用 Step Into。
3. 如果值正確但 world 更新失敗，檢查 `server.execute` callback 的 thread、lifecycle 與 player／world 是否仍存在。
4. 若進入 framework internals 後只看到大量無關程式，使用 Step Out 回到自己的 boundary。

不要因為 Step Into 能進入 library 或 loader 就一路追到底。Debugging 的目的不是讀完整個 framework，而是驗證與 bug 有關的假設。

## 4. Variables、Watch 與 Debug Console

### Variables：目前 frame 的狀態

Variables panel 通常能看到 local variables、method arguments、`this` fields 與部分 object contents。你要問的不是「每個值是多少」，而是：

| 問題 | 觀察什麼 |
|---|---|
| 輸入是否合法？ | null、空字串、範圍、ID、版本、side |
| 狀態是否一致？ | 多個 field 是否屬於同一個 snapshot |
| collection 是否被改動？ | size、key、iterator、owner thread |
| object 是否為正確實例？ | class name、mapping、class loader |
| callback 是否已過期？ | server running、entity alive、request id |

### Watch：持續觀察一個 expression

Watch 適合追蹤一個值何時改變：

```java
cache.put(playerId, result);
```

可以觀察 `cache.size()`、`cache.get(playerId)` 或 `result.status()`。若 expression 會呼叫 method，要確定該 method 沒有副作用、沒有改變時間／隨機值，也不會因為 debugger evaluation 產生另一個 bug。

### Debug Console／Evaluate Expression

Debug Console 適合快速驗證小型問題：

```java
request.range() >= 0 && request.range() <= 64
path.toAbsolutePath().normalize()
Thread.currentThread().getName()
```

不要在 Debug Console 執行不可逆操作，例如刪檔、修改 world、呼叫 `sendPacket`、移除 registry entry 或執行會改變 shared state 的 method。Debugger evaluation 不是純觀察時，可能改變你正在調查的現場。

## 5. Call Stack｜呼叫堆疊

Call Stack 是目前 thread 的 method invocation chain。每個 stack frame 通常包含 class、method、source line、locals 與 caller。從下往上讀可以理解「如何走到這裡」；從上往下讀可以看到「錯誤最後在哪一層發生」。

```text
main／server lifecycle
  → ModInitializer.onInitialize
    → RegistryBootstrap.register
      → Registry.checkMutable
        → throw IllegalStateException
```

讀 Call Stack 時問四件事：

1. 目前 thread 是誰？是 server、client render、network、worker 或測試 thread？
2. 第一個屬於自己 package／mod／plugin 的 frame 在哪裡？
3. 在進入 framework 前，自己的輸入與 lifecycle 是否已經錯？
4. caller 是否在正確時機、正確 side、正確 owner thread 呼叫這個 method？

Minecraft stack trace 可能有大量 loader、mixin、reflection、mapping 或 generated frame。先折疊已知 framework noise，再保留完整原始 log；摘要用於溝通，原始 stack 用於之後交叉比對版本與 classpath。

## 6. Exception Stack Trace｜例外堆疊追蹤

### Stack trace 的基本結構

```text
ExceptionType: message
    at package.Class.method(File.java:line)
    at package.Caller.call(Caller.java:line)
Caused by: InnerException: cause message
    at package.Parser.parse(Parser.java:line)
```

| 部分 | 意義 |
|---|---|
| Exception type | 例外分類，例如 `NullPointerException`、`IOException`、`NoClassDefFoundError` |
| Message | 這次 instance 提供的上下文；可能是空的或不完整 |
| `at` frame | 該 thread 呼叫路徑與 source line |
| `Caused by` | 被包裝的底層原因；通常要繼續往內讀 |
| Suppressed | 主要例外之外，在 resource close 或 cleanup 時發生的例外 |
| Thread name | 例外發生在哪條 thread，對 Minecraft 特別重要 |

### 先讀最內層 cause，再回到第一個 application frame

```java
try {
    loadConfig();
} catch (IOException error) {
    throw new IllegalStateException("Cannot start mod", error);
}
```

看到 `IllegalStateException: Cannot start mod` 時，不要停在外層 message。先看 `Caused by: IOException` 的 path、permission 或 encoding，再回到自己的 `loadConfig` 呼叫點判斷修復策略。外層 exception 描述目前 layer 無法繼續；cause 描述更底層 failure。

### `Throwable` 的 cause 與 suppressed

```java
try (Resource resource = openResource()) {
    return resource.read();
} catch (IOException error) {
    error.addSuppressed(new IllegalStateException("resource id=" + id));
    throw error;
}
```

實際程式不應為了示範隨意新增 suppressed exception；要理解它可能保存 cleanup 或 close 階段的額外資訊。使用 `getCause()`、`getSuppressed()` 與 `printStackTrace()` 時，也要注意不要把玩家資料、token、absolute path 或機密設定貼到公開 issue。

### Exception type 是線索，不是診斷結論

| 例外 | 常見方向 | 不要直接假設 |
|---|---|---|
| `NullPointerException` | nullability、初始化順序、錯誤 lookup | 只要加 `if (x == null)` 就完成 |
| `IllegalStateException` | lifecycle、狀態機、呼叫順序 | framework 一定壞掉 |
| `IOException` | path、權限、檔案不存在、編碼、磁碟 | retry 一定能解決 |
| `ClassNotFoundException` | classpath、dependency、loader、side | 只重裝 JDK |
| `NoClassDefFoundError` | runtime linkage／初始化失敗／dependency | source code 沒有 import 就安全 |
| `NoSuchMethodError` | compile／runtime library 版本不一致 | 重新編譯所有 source 就好 |
| `ConcurrentModificationException` | collection mutation 與 iteration 時序 | 換成任意 concurrent collection |
| `CompletionException` | async stage 內層失敗被包裝 | 只看外層 message |
| `OutOfMemoryError` | allocation、cache、leak、heap pressure | 直接增加 `-Xmx` |

## 7. Java debugger：IDE 與 `jdb`

### IDE debugger 的共通操作

不同 IDE 的按鈕名稱可能略有差異，但概念通常一致：設定 breakpoint、啟動 Debug、查看 Variables／Watches、操作 step、切換 thread 與閱讀 Call Stack。Debug build／編譯器的 source debug information 也要保留，否則可能看到錯誤的 line mapping 或無法正常對應 source。

### `jdb` 最小流程

Oracle 的 `jdb` 文件列出 line／method breakpoint、stepping 與 exception catch 等功能。[1]

```bash
# 先編譯帶有 debug information 的 class
javac -g Demo.java

# 啟動命令列 debugger
jdb Demo
```

常見 command 示意：

```text
stop at Demo:22
stop in Demo.calculate
run
next
step
where
locals
print variableName
cont
catch java.io.IOException
clear Demo:22
exit
```

`next` 走到目前 stack frame 的下一行；`step` 可以進入被呼叫的 method；`where` 顯示目前 thread 的 stack。`catch` 可以讓 debugger 在指定 exception throw 時停下，而不是只等未捕捉例外一路退出。[1]

也可以 attach 到已啟動 JVM，但 remote debugging 會暴露 debug port 與 runtime inspection 能力；本地開發以外不要把 debug port 無保護暴露在公開網路。啟動 server、mod 或 plugin 的 debug JVM 時，遵守平台與部署環境的安全設定。

## 8. Minecraft Mod／Plugin Stack Trace 分層

### 啟動失敗的分層流程

```text
JVM／JDK
  ↓
Gradle／launcher／classpath
  ↓
Fabric／NeoForge／Paper loader
  ↓
Mixin／entrypoint／plugin lifecycle
  ↓
Registry／event／resource／config
  ↓
你的 service／domain logic
  ↓
world／entity／network state
```

收到錯誤時先判斷它在哪一層：

| 層 | 代表線索 | 第一個行動 |
|---|---|---|
| JVM／JDK | `UnsupportedClassVersionError`、`ClassFormatError` | 比對 Java、Gradle toolchain、class file version |
| Dependency／classpath | `ClassNotFoundException`、`NoSuchMethodError` | 查 runtime dependency、mapping 與版本衝突 |
| Loader／side | dedicated server 載入 client class | 檢查 common／client source set 與 entrypoint |
| Mixin／transform | injection failed、target method 找不到 | 比對 mappings、method descriptor、Mixin target 版本 |
| Lifecycle／registry | registry frozen、duplicate id | 查初始化順序、註冊時機與唯一 ID |
| Resource／config | file not found、JSON parse error | 查 resource path、charset、schema、config directory |
| Thread／state | wrong thread、concurrent modification | 找出 owner thread，將 mutation 排回正確 scheduler |
| Domain logic | assertion、illegal state、錯誤結果 | 檢查輸入、invariant、測試與 boundary validation |

Fabric、NeoForge 與 Paper 的 loader、mapping、entrypoint、scheduler 與 lifecycle 不同。共通的 Debugging 方法可以共享，但 stack trace 中的 platform frame、修復指令與正式 API 不可混用。

### Stack trace triage checklist

```text
[ ] 保留完整 log、遊戲／server 版本、JDK 版本與重現步驟
[ ] 記下 exception thread name
[ ] 讀 exception type 與 message
[ ] 往下找所有 Caused by
[ ] 找第一個有意義的自有 package／mod／plugin frame
[ ] 檢查 source line 的輸入、狀態、caller 與 lifecycle
[ ] 判斷是 code、dependency、mapping、side、resource 還是 thread boundary
[ ] 建立最小重現，不要一次改十個地方
[ ] 修復後加入 test、assertion、log 或明確驗收步驟
[ ] 分享 log 前移除 token、玩家資料、absolute path 與秘密設定
```

## 9. 最小重現與證據

### 最小重現比大型 log 更有力量

大型 modpack log 有很多 noise。先將問題縮小成一個能穩定觸發的 command、單一 resource、單一 test、最小 dependency set 或單一世界資料。最小重現應回答：

| 項目 | 例子 |
|---|---|
| Setup | Fabric loader 版本、NeoForge MDK、Paper server、JDK |
| Input | command、player、JSON、resource、path |
| Action | 啟動、註冊、tick、network request、reload |
| Expected | 應該出現什麼 |
| Actual | 實際出現什麼與完整 exception |
| Repro rate | 每次、偶發、只在 dedicated server |

### 以 assertion 讓錯誤更靠近 root cause

```java
static void requireServerThread(ServerContext server) {
    if (!server.isOnOwnerThread()) {
        throw new IllegalStateException(
                "World mutation must run on the server owner thread"
        );
    }
}
```

好的 assertion 應該指出 invariant、目前值與修復方向；不要用大量沒有上下文的 `assert true` 或只印 `something failed`。如果 production 環境不保證 Java assertion flags 開啟，對重要輸入使用明確的 exception、validation 或 logger。

## 10. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 只貼最後一行 exception | 遺失 cause、thread、caller 與 context | 保存完整 stack trace |
| 只修最外層 exception | 外層可能只是 wrapper | 往所有 `Caused by` 追到底 |
| 看到自家 line 就不看 caller | caller 可能在錯誤 lifecycle／side 呼叫 | 同時看輸入、caller 與 thread |
| 每行都設 breakpoint | 噪音太多，失去假設導向 | 針對 boundary 與 failure point 設定 |
| 用 Step Into 追完整個 framework | 花時間但未必接近 root cause | 先在自有 boundary 驗證，再 Step Out |
| Watch expression 有副作用 | debugger 改變正在調查的狀態 | 只觀察純 expression |
| 在 debug console 改 world 或刪檔 | 破壞證據，造成第二個問題 | 以 read-only inspection 為主 |
| 把 log 當成所有同步保證 | log 只記錄觀察，不建立 happens-before | 使用正確 concurrency tool |
| 只在 integrated server 測試 | dedicated server 的 side／classpath 不同 | 分別驗證 client、server 與 common |
| 看到 `NoClassDefFoundError` 就重裝 Java | 可能是 dependency、初始化或 side 問題 | 查 JDK、classpath、loader 與 dependency |
| 為了讓測試過而吞 exception | 真正錯誤被隱藏，之後更難定位 | 保留 cause，使用精準錯誤處理 |
| 公開貼完整 log 未清理 | 可能外洩玩家資料、路徑、token | 分享前 redact sensitive data |
| 同時改十個地方 | 無法知道哪個變更修好或造成新問題 | 建立最小重現，一次驗證一個假設 |

## 11. 練習

### 練習一：讀懂 stack trace

建立一個包含 `IOException`、`IllegalStateException` 與 `Caused by` 的最小程式。從外層開始往內找 root cause，標記第一個自有 package frame，並寫出「symptom、failure point、root cause、修復策略」。

### 練習二：Breakpoint 與 step

在 `parse → validate → apply` 三層 method 各放一個 breakpoint。用 Step Over、Step Into 與 Step Out 觀察變數與 Call Stack，確認哪個階段第一次產生錯誤狀態。

### 練習三：Debug Console 安全觀察

在 debug session 中觀察 `Thread.currentThread().getName()`、某個 DTO field 與 `Path.toAbsolutePath().normalize()`。列出哪些 expression 是 read-only，哪些 expression 會改變資料，並說明為什麼後者不應直接執行。

### 練習四：Minecraft 啟動錯誤分層

從一份 Fabric、NeoForge 或 Paper 的啟動錯誤中，將 stack frame 分成 JVM／JDK、build／classpath、loader／side、lifecycle、resource、thread 與 domain logic。不要混用另一平台的修復步驟。

### 練習五：最小重現與 regression test

選擇一個 `NullPointerException`、錯誤 resource path 或錯誤 registry 順序問題，建立最小測試重現它。修復後保留 test，確保未來 refactor 不會讓同一問題回來。

## 12. 複習速查

```text
Stack Trace
  exception type + message
      ↓ all Caused by
  first meaningful application frame
      ↓
  input + caller + lifecycle + thread
      ↓
  breakpoint / watch / log / test
      ↓
  root cause hypothesis
      ↓
  minimal fix + regression verification
```

| 我想做什麼 | 使用方式 |
|---|---|
| 在特定行暫停 | Breakpoint |
| 不進入 method 看下一行 | Step Over |
| 進入 helper／parser | Step Into |
| 離開目前 method | Step Out |
| 看到目前呼叫路徑 | Call Stack |
| 持續追蹤某個 expression | Watch |
| 臨時檢查 runtime value | Debug Console／Evaluate |
| 找 exception 發生點 | Exception breakpoint／`jdb catch` |
| 找呼叫來源 | 由目前 frame 往 caller 回溯 |
| 找真正根因 | 往最內層 `Caused by` 讀，再回到第一個有意義的自有 frame |
| Minecraft 啟動失敗 | 先分 JVM、classpath、loader、side、lifecycle 與 domain layer |
| Debug 完成 | 修復後加入 test、assertion、log 或明確驗收 |

## References

[1]: https://docs.oracle.com/en/java/javase/17/docs/specs/man/jdb.html "The jdb Command — Oracle Java SE 17 Tools Reference"
[2]: https://docs.oracle.com/javase/8/docs/technotes/guides/jpda/ "Java Platform Debugger Architecture — Oracle"
[3]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/lang/Throwable.html "Throwable — Java SE 22 API"
[4]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/lang/StackTraceElement.html "StackTraceElement — Java SE 22 API"
