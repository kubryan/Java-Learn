---
title: Java Exception：例外處理、throw 與自訂例外
slug: java-exceptions
category: Exception
order: 61
level: 中階
tags: Exception, Exception Handling, Checked Exception, Unchecked Exception, try-catch, finally, throw, throws, Custom Exception, Minecraft Java
aliases: 例外處理, checked exception, unchecked exception, try catch, 自訂例外
summary: 學會辨識、傳遞與處理 Java 例外，避免吞掉錯誤或讓 Minecraft server 因未驗證輸入而崩潰。 ⭐⭐⭐ Minecraft 必學
---

# Java Exception：例外處理、`throw` 與自訂例外

例外（Exception）是程式執行時用來表示非正常流程的機制。好的例外處理不是把所有程式包進一個巨大 `try-catch`，而是讓錯誤在適當邊界被辨識、補充上下文、記錄或轉換。Minecraft mod 尤其需要區分「玩家輸入不合法」「資源不存在」「設定檔格式錯誤」與「程式真的有 bug」。

## Exception hierarchy

`Throwable` 下面主要有 `Error` 與 `Exception`。通常應處理或傳遞 `Exception`；`Error` 多半代表 JVM 或系統層級問題，不應用普通 catch 來掩蓋。`RuntimeException` 及其子類別屬於 unchecked exceptions。

```java
try {
    int range = Integer.parseInt(input);
    if (range < 0) throw new IllegalArgumentException("range cannot be negative");
    System.out.println(range);
} catch (NumberFormatException error) {
    System.err.println("不是有效的整數：" + input);
}
```

## Checked Exception 與 Unchecked Exception

| 類型 | 編譯器要求 | 常見例子 | 適合情境 |
|---|---|---|---|
| checked exception | method 必須 catch 或 throws | `IOException` | 呼叫端有機會恢復的外部 I/O 問題 |
| unchecked exception | 編譯器不強制宣告 | `IllegalArgumentException`、`NullPointerException` | 呼叫契約違反或程式邏輯問題 |
| `Error` | 通常不應處理 | `OutOfMemoryError` | JVM／系統層級失敗 |

checked 不代表一定比較嚴重，unchecked 也不代表可以忽略。設計 API 時請思考呼叫端是否能合理恢復；若不能，讓它在正確的邊界被轉換或記錄，不要只為了通過 compiler 而空 catch。

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
[2]: https://docs.oracle.com/javase/tutorial/essential/exceptions/ "Exceptions — Oracle Java Tutorials"
[3]: https://docs.oracle.com/javase/specs/jls/se25/html/jls-11.html "Exceptions — Java Language Specification"
