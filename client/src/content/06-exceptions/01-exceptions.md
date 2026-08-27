---
title: Java Exception：例外處理、throw 與自訂例外
slug: java-exceptions
category: Exception
order: 61
level: 中階
tags: Exception, Throwable, Error, RuntimeException, Exception Hierarchy, Exception Handling, Checked Exception, Unchecked Exception, try-catch, finally, throw, throws, Custom Exception, InterruptedException, Minecraft Java
aliases: 例外處理, Exception Hierarchy, Throwable, Error, RuntimeException, checked exception, unchecked exception, try catch, 自訂例外
summary: 學會辨識、傳遞與處理 Java 例外，避免吞掉錯誤或讓 Minecraft server 因未驗證輸入而崩潰。 ⭐⭐⭐ Minecraft 必學
---

# Java Exception：例外處理、`throw` 與自訂例外

例外（Exception）是程式執行時用來表示非正常流程的機制。好的例外處理不是把所有程式包進一個巨大 `try-catch`，而是讓錯誤在適當邊界被辨識、補充上下文、記錄或轉換。Minecraft mod 尤其需要區分「玩家輸入不合法」「資源不存在」「設定檔格式錯誤」與「程式真的有 bug」。

## Exception hierarchy

Java 的例外階層根在 `Throwable`。Oracle API 指出，只有 `Throwable` 或其 subclass 的 object 可以由 JVM／`throw` 丟出，也只有 `Throwable` 或其 subclass 可以作為 `catch` parameter。[4]

```text
Throwable
├── Error
│   ├── VirtualMachineError
│   │   ├── OutOfMemoryError
│   │   └── StackOverflowError
│   ├── LinkageError
│   └── AssertionError
└── Exception
    ├── RuntimeException
    │   ├── IllegalArgumentException
    │   ├── NullPointerException
    │   └── NumberFormatException
    ├── IOException
    ├── InterruptedException
    └── 其他 checked Exception subclasses
```

| 分支 | 代表什麼 | compiler 是否要求 catch／throws？ | 一般策略 |
|---|---|---:|---|
| `Throwable` | 所有 error 與 exception 的共同父型別 | 不適合作為一般 API contract | 不要把它當萬用 catch |
| `Error` | 通常不是普通 application 可以恢復的嚴重問題 | 否，屬於 unchecked | 通常讓它向上傳播，交給 process／server policy |
| `Exception` | application 可能希望處理的 exceptional condition | 取決於是否為 RuntimeException subclass | 只在目前層真正理解如何處理時 catch |
| `RuntimeException` | runtime evaluation、輸入／呼叫契約或程式邏輯問題 | 否，屬於 unchecked | 修正 caller、驗證輸入，或在清楚邊界轉換／記錄 |
| `Exception` 但不是 `RuntimeException` | checked exception，例如 `IOException` | 是，必須 catch 或 throws | 呼叫端能恢復時處理，否則保留 cause 向上傳遞 |

Java Language Specification 將 unchecked exception 定義為 `RuntimeException` subtree 加上 `Error` subtree；其餘 `Throwable` classes 是 checked exceptions。[3] 因此「unchecked」不是「不重要」，「checked」也不是「一定比較嚴重」；它們描述的是 compiler 的宣告規則與 class hierarchy。

```java
try {
    int range = Integer.parseInt(input);
    if (range < 0) {
        throw new IllegalArgumentException("range cannot be negative");
    }
    System.out.println(range);
} catch (NumberFormatException error) {
    System.err.println("不是有效的整數：" + input);
}
```

上例只處理它能理解的輸入錯誤。它沒有 catch `Throwable`，也沒有把 `Error` 當成玩家輸入問題。`NumberFormatException` 是 `IllegalArgumentException` 的 subclass，也是 `RuntimeException` 的 subclass，因此 compiler 不要求 method 寫 `throws`。

### 不是所有 Throwable 都應該 catch

下面兩種寫法的範圍完全不同：

```java
catch (Exception error) {
    // 不會捕捉 Error，但仍會捕捉 RuntimeException
}

catch (Throwable error) {
    // 會捕捉 Exception、RuntimeException 與 Error
}
```

`catch (Exception)` 也不是自動安全，因為它仍可能吞掉 `NullPointerException`、`IllegalStateException` 或其他程式 bug。`catch (Throwable)` 更危險，因為它還會捕捉 `OutOfMemoryError`、`StackOverflowError`、`LinkageError` 與其他不應被普通 recovery code 掩蓋的問題。Oracle 將 `Error` 描述為合理 application 通常不應嘗試 catch 的嚴重問題。[2]

只有非常窄的 infrastructure boundary 才可能暫時 catch `Throwable`，例如記錄 crash context 後立刻 rethrow、維護明確的 task runner policy，或實作必須保護 process 邊界的框架。即使如此，也不能把它變成「顯示成功、繼續執行」的萬用處理器：

```java
void runPluginTask(Runnable task) {
    try {
        task.run();
    } catch (Throwable fatalOrFailure) {
        logger.error("Plugin task failed; preserving failure", fatalOrFailure);
        throw fatalOrFailure; // policy 明確：記錄後仍讓失敗可見
    }
}
```

多數 mod／plugin handler 應 catch 更具體的 exception，或讓它向上傳播到正確的 loader／server error boundary。不要為了讓 server log 看起來乾淨而把錯誤吃掉。

## Checked Exception 與 Unchecked Exception

| 類型 | 編譯器要求 | 常見例子 | 適合情境 |
|---|---|---|---|
| checked exception | method 必須 catch 或 throws | `IOException` | 呼叫端有機會恢復的外部 I/O 問題 |
| unchecked exception | 編譯器不強制宣告 | `IllegalArgumentException`、`NullPointerException` | 呼叫契約違反或程式邏輯問題 |
| `Error` | 通常不應處理 | `OutOfMemoryError` | JVM／系統層級失敗 |

checked 不代表一定比較嚴重，unchecked 也不代表可以忽略。設計 API 時請思考呼叫端是否能合理恢復；若不能，讓它在正確的邊界被轉換或記錄，不要只為了通過 compiler 而空 catch。

## 什麼時候該 catch？

catch 的判斷重點不是「這個 exception 能不能被語法捕捉」，而是**目前這一層是否知道如何處理它**。如果目前層能修正輸入、使用 fallback、重試、轉換成 domain exception、補充 context 或完成必要清理，就可以在這裡 catch；如果只能把錯誤吞掉或印一句模糊訊息，通常應讓它向上傳播。

| 例外 | 常見處理邊界 | 不應做什麼 |
|---|---|---|
| `IOException` | 檔案／網路／resource 邊界，可使用 fallback 或轉換 | 空 catch，或假裝設定已成功載入 |
| `IllegalArgumentException` | command／payload／config input boundary | 把 server 內部 bug 一律說成使用者輸入錯 |
| `NullPointerException` | 通常是 bug；修正 invariant 或 caller | 廣泛 catch 後繼續執行 |
| `InterruptedException` | task cancellation／executor boundary | 吞掉 interrupt status |
| `Error` | process／server／framework policy boundary | 當成普通玩家輸入恢復 |
| `Throwable` | 極窄的 framework guard；通常記錄後 rethrow | 作為所有 handler 的萬用 catch |

`catch (Exception)` 會排除 `Error`，但仍會捕捉 `RuntimeException`；因此它只能在你刻意設計成「此層處理所有 ordinary application exceptions」的邊界使用。它不是比 `catch (Throwable)` 安全就代表可以隨便寫。

## `try-catch`

`try` 放可能失敗的程式；`catch` 只處理它真正理解的例外型別。先 catch 具體型別，再 catch 共通父型別；不要一開始就 `catch (Exception error)`。

```java
try {
    Config config = ConfigParser.parse(rawConfig);
    applyConfig(config);
} catch (InvalidConfigException error) {
    logger.warn("使用預設設定：{}", error.getMessage());
    applyConfig(Config.defaults());
}
```

如果 catch 之後無法恢復，應補充 context 後重新丟出，而不是假裝成功。log 內容不要包含 token、玩家個資或不必要的完整輸入。

## `finally` 與 try-with-resources

`finally` 通常用來做一定要執行的清理；若資源實作 `AutoCloseable`，優先使用 try-with-resources，讓 compiler 自動管理 close。

```java
try (BufferedReader reader = Files.newBufferedReader(path)) {
    return reader.readLine();
} catch (IOException error) {
    throw new ConfigLoadException("無法讀取設定檔：" + path, error);
}
```

`finally` 即使 try 或 catch 以 `return` 結束通常仍會執行，但不要在 finally 再 `return`，那會遮蔽原本的結果或例外。Minecraft server 的資源載入、檔案與 network buffer 都要確認生命週期由哪一層負責。

## `InterruptedException` 與取消

`InterruptedException` 不是一般「工作失敗」訊息，而是通知目前 thread：等待、阻塞或 task 可能需要停止。若目前 method 無法合理處理取消，應宣告 `throws InterruptedException`；若必須在這一層轉換或結束 task，通常要恢復 interrupt flag，避免把取消訊號吞掉：

```java
void awaitReload(Future<?> future) {
    try {
        future.get();
    } catch (InterruptedException interrupted) {
        Thread.currentThread().interrupt(); // ✅ 保留取消訊號
        logger.debug("Reload wait interrupted");
    } catch (ExecutionException failure) {
        throw new ConfigLoadException("Reload task failed", failure.getCause());
    }
}
```

不要只寫 `catch (InterruptedException ignored) {}`。在 Minecraft mod／plugin 中，server shutdown、reload、executor cancellation 與 worker lifecycle 都可能依賴這個訊號；恢復 flag 或依 framework contract 傳遞它，才能讓上層知道 task 沒有正常完成。

## Cause 與 Suppressed Exception

`Throwable` 可以保存 detail message、stack trace、cause 與 suppressed exceptions。[4] 當高層 API 要把低層 `IOException` 轉成 `ConfigLoadException` 時，保留 cause 能讓 Debugging handbook 的 stack trace 仍然追到真正來源：

```java
try {
    return parse(Files.readString(path));
} catch (IOException error) {
    throw new ConfigLoadException("無法載入 calibration config：" + path, error);
}
```

try-with-resources 發生「主要例外」和 `close()` 例外時，後者可能以 suppressed exception 保存。不要只記錄 `getMessage()` 而丟掉整個 throwable；logger 通常應收到 exception object，才能保留 cause、stack trace 與 suppressed information：

```java
try (BufferedReader reader = Files.newBufferedReader(path)) {
    return reader.readLine();
} catch (IOException error) {
    logger.error("讀取設定檔失敗：{}", path, error);
    throw error;
}
```

`getMessage()` 只是文字摘要；`printStackTrace()`、logger exception parameter 與 `getCause()` 才能保留診斷鏈。不要用新的 exception 取代舊 exception 而不傳 cause，也不要把 token、完整玩家 payload 或敏感路徑直接放進 message。

## `throw` 與 `throws`

`throw` 是在某個程式位置實際丟出一個 exception；`throws` 是 method signature 宣告它可能傳遞的 checked exception。

```java
static int requirePositive(int value) {
    if (value <= 0) throw new IllegalArgumentException("value must be positive");
    return value;
}

static String readText(Path path) throws IOException {
    return Files.readString(path);
}
```

`throw` 後的程式路徑必須符合 compiler 的控制流程分析。不要把 `throws Exception` 當成所有錯誤的垃圾桶；宣告更具體的 exception，或在 module 邊界轉換成有意義的 domain exception。

## 自訂例外｜Custom Exception

自訂例外可以表達特定 domain failure，並保留原始 cause。通常在 exception message 提供可讀上下文，cause 則保留低層 stack trace。

```java
public final class InvalidCalibrationException extends RuntimeException {
    public InvalidCalibrationException(String message) {
        super(message);
    }

    public InvalidCalibrationException(String message, Throwable cause) {
        super(message, cause);
    }
}

static CalibrationConfig load(Path path) {
    try {
        return parse(Files.readString(path));
    } catch (IOException error) {
        throw new InvalidCalibrationException("Calibration 設定無法載入：" + path, error);
    }
}
```

不要為每一個普通條件都建立 exception；可預期的分支應用回傳值、Optional 或 result object 表達。例外適合表示非正常流程、違反契約或無法在當前層恢復的失敗。

## Minecraft 的 server 邊界

client 傳給 server 的 payload、command argument、設定值與檔案內容都必須視為不可信輸入。server handler 應先驗證範圍、權限與當前 world state，再執行動作；捕捉例外時要讓 server 保持穩定，並回傳安全的錯誤訊息。

```java
void handleCalibrate(ServerPlayer player, int requestedRange) {
    try {
        int range = requirePositive(requestedRange);
        if (!player.hasPermissions(2)) throw new SecurityException("permission denied");
        if (range > 16) throw new IllegalArgumentException("range too large");
        applyCalibration(player, range);
    } catch (IllegalArgumentException | SecurityException error) {
        player.sendSystemMessage(Component.literal("校準參數無效"));
        logger.warn("拒絕校準請求：{}", error.getMessage());
    }
}
```

不要把 client 端的「驗證成功」當成 server 端安全保證，也不要在共用 class 直接 import client-only type。Exception handling 仍然要服從 Minecraft 的 logical side 與 thread 邊界。

## 常見錯誤

1. `catch (Exception)` 後什麼都不做，導致真正錯誤被吞掉。
2. `catch` 了錯誤型別，讓預期的例外仍然向外傳播。
3. 在 `finally` return，遮蔽 try／catch 原本的結果。
4. 把所有 method 都宣告 `throws Exception`，讓呼叫端失去處理方向。
5. 用 exception 取代一般的 if 條件，讓正常分支變成昂貴且難讀的流程。
6. 只在 client 驗證 payload，沒有在 server 重複檢查權限、範圍與 world state。
7. 記錄完整 request 或玩家資料，造成不必要的敏感資訊外洩。

## 練習

建立 `CalibrationConfigException` 與 `CalibrationConfigLoader`。先讓 loader 將 `IOException` 轉成帶 cause 的 domain exception，再在 command handler 只捕捉能恢復的錯誤。最後寫一個模擬 payload handler，測試負數、過大 range、沒有權限與正常輸入四種結果。

## 複習速查

- checked exception 要 catch 或 throws；unchecked 通常表示契約違反或程式邏輯問題。
- `try-catch` 只捕捉目前這一層真正能處理的錯誤。
- `finally` 負責清理；`throw` 實際丟出；`throws` 宣告可能傳遞的 checked exception。
- 自訂 exception 應保留 cause；不要吞錯，也不要把所有問題都包成 `Exception`。
- Minecraft 的 client input、command、payload 與 config 都要在正確 server 邊界驗證。

## References

[1]: https://dev.java/learn/exceptions/ "Exceptions — Dev.java"
[2]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Error.html "Error — Java SE 21 API"
[3]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-11.html "Exceptions — Java Language Specification"
[4]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html "Throwable — Java SE 21 API"
[5]: https://docs.oracle.com/javase/tutorial/essential/exceptions/ "Exceptions — Oracle Java Tutorials"
