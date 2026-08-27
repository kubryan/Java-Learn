---
title: Java Logging｜Java 日誌
titleEn: Java Logging
topic: Java Runtime Observability
terms: Logger, logging, log level, DEBUG, INFO, WARN, ERROR, stack trace, structured logging, logger name, MDC
slug: java-logging
category: Java 開發
order: 8
level: 入門到中階
tags: Java, Logging, Logger, DEBUG, INFO, WARN, ERROR, Stack Trace, Observability, Minecraft Java, Fabric, NeoForge, Paper
aliases: Java 日誌, Java Logger, log level, runtime observability
summary: 學會用 Logger 觀察 Java 與 Minecraft mod／plugin 的執行狀態，正確選擇 DEBUG、INFO、WARN、ERROR、保留 exception cause、避免昂貴串接與敏感資料，讓 stack trace 能協助除錯而不是製造噪音。
---

# Java Logging｜Java 日誌

> **Logging 的目的不是把所有變數印出來，而是讓未來的你能在沒有 debugger 的現場回答：什麼時間、哪一個元件、處理哪個識別碼、發生什麼事件、是否成功、失敗的 root cause 是什麼。**

在 Minecraft mod／plugin 中，log 通常是唯一能看到 server startup、registry、resource reload、command、network payload、world lifecycle 與 background task 狀態的證據。`System.out.println` 可以做一次性的本地實驗，但正式 Java 專案應使用專案提供的 `Logger`，讓 level、format、destination、filter 與 exception stack trace 可被統一管理。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| Logger | 取得正確的 class／subsystem logger，不在每個 method 手動建立混亂名稱 |
| Level | 分清 DEBUG、INFO、WARN、ERROR 的訊息責任 |
| Context | 在訊息中放入穩定識別碼、operation、dimension、player UUID 等必要 context |
| Exception | 把 exception 作為 throwable 參數保留完整 cause 與 stack trace |
| 效能 | 避免在 disabled level 下預先組合昂貴字串或 dump 大型 object |
| 安全 | 移除 token、密碼、完整玩家資料、private path 與不必要 payload |
| Minecraft | 分清 startup、registration、runtime、event、network、background task 的 log 邊界 |

## 1. Logger 與 log level

常見 API 會提供不同 level；實際 method 名稱依 logging facade 或 Minecraft loader 而異，但責任可以用這個模型理解：

| Level | 用途 | Minecraft 例子 |
|---|---|---|
| `DEBUG`／`TRACE` | 開發診斷，通常可關閉 | 某次 recipe lookup、task timing、payload size |
| `INFO` | 正常的重要 lifecycle／狀態 | mod initialized、server started、資料遷移完成 |
| `WARN` | 可繼續，但需要注意或即將退化 | 缺少 optional config、fallback、版本不完全相容 |
| `ERROR` | 這次操作失敗或服務無法提供 | resource parse failure、database write failure、handler exception |
| `FATAL` | 某些 logger 支援；通常交由 top-level runtime | 不要在 library 任意宣告整個 JVM fatal |

```java
private static final Logger LOGGER = LoggerFactory.getLogger(CalibrationService.class);

public void calibrate(UUID playerId, int strength) {
    LOGGER.debug("calibration requested player={} strength={}", playerId, strength);
    if (strength < 0) {
        LOGGER.warn("calibration rejected player={} reason=negative-strength", playerId);
        return;
    }
    LOGGER.info("calibration completed player={} strength={}", playerId, strength);
}
```

不同 framework 的 logger 取得方式可能不同：Fabric／Minecraft 常見 Log4j 或 loader 提供的 logger；NeoForge 可能使用其建議的 logging facade；Paper plugin 會使用 plugin logger 或 SLF4J 介面。**Logger API 可相似，但不要把 Fabric／NeoForge／Paper 的 lifecycle 或 logger acquisition code 直接互換。**

## 2. 訊息要有 context，但不要洩漏資料

好的 log message 讓人不需要重新執行程式就能判斷範圍：

```text
resource reload failed mod=calibration_stone resource=recipes/calibration.json phase=parse
```

```text
bad command input command=calibrate player=<uuid> argument=strength reason=not-integer
```

不要直接把整個 request、玩家 token、Authorization header、密碼、私密 world path 或大型 NBT／JSON payload 印出來。需要追查時，可記錄 hash、size、identifier、version 或經過遮罩的摘要：

```java
LOGGER.debug("payload received id={} bytes={} version={}", payloadId, bytes.length, version);
```

`UUID`、resource identifier 與 registry key 通常比玩家名稱更穩定；但是否可記錄仍要依專案 privacy policy 與 server owner 的要求。

## 3. Exception 必須保留 cause

錯誤 log 不應只印 `exception.getMessage()`，那常常會丟失最有用的 stack trace：

```java
try {
    repository.save(snapshot);
} catch (IOException error) {
    LOGGER.error("snapshot save failed path={}", safePath(snapshot.path()), error);
    throw new SnapshotWriteException("Unable to save snapshot", error);
}
```

常見 logger facade 將最後一個 throwable argument 視為 exception；若要跨 facade 維持清楚語意，請查目前 API 的 placeholder 與 throwable overload。不要把 `error.getStackTrace()` 當成可讀文字，也不要只寫：

```java
LOGGER.error("save failed: {}", error.getMessage()); // ❌ root cause 遺失
```

## 4. 避免 disabled level 的不必要工作

短小、無副作用的 placeholder logging 很容易讀；大型序列化、`toString()`、stream collect 或 NBT dump 則可能在 DEBUG 關閉時仍先執行：

```java
// ✅ 通常的 parameterized logging
LOGGER.debug("loaded item id={} count={}", itemId, count);

// ⚠️ 可能先執行昂貴的 serialize
LOGGER.debug("state={}", serializeEntireWorldState());
```

如果 logger API 支援 level guard 或 Supplier，就在昂貴計算前檢查；但不要為了每個簡單字串都加複雜 guard。Logging 本身也是 runtime cost：大型 server 不應在每 tick 印 INFO，也不應把完整 world、entity list 或 packet body 無條件 dump。

## 5. Minecraft lifecycle 的 log 邊界

| 階段 | 建議 log |
|---|---|
| mod／plugin initialization | `INFO`：版本、初始化完成、必要 dependency 狀態 |
| registry | `DEBUG` 詳細項目；`INFO` 只記錄摘要與數量 |
| resource／data reload | `INFO` 開始／完成；`WARN` fallback；`ERROR` parse failure 與 resource id |
| command | `DEBUG` input shape；`WARN` rejected reason；不要記錄完整敏感輸入 |
| event handler | 只有重要 lifecycle 或錯誤才 log；不要每個 tick `INFO` |
| network payload | `DEBUG` type、id、bytes、version；避免完整 payload |
| background task | task name、duration、success／failure、thread interruption |
| shutdown | `INFO` resource close／executor shutdown；失敗保留 cause |

Fabric event callback、NeoForge event bus handler 與 Paper listener 都可能被高頻呼叫。把 debug tracing 放在可控 level，並避免在 event handler 中把每個玩家、每個 tick 或每個 block change 都寫成 INFO。

## 6. Logger 與 Debugger 的分工

| 問題 | 比較適合 |
|---|---|
| 只在本機、可重現、需要看 local variables | Breakpoint／Debugger |
| server 啟動後才發生、需要長期證據 | Logging |
| concurrency timing、thread name、task duration | Logging + thread dump |
| method 呼叫順序 | Debugger call stack 或 structured log |
| exception 根因 | 完整 stack trace、cause、suppressed exception |
| 不確定是否發生 | INFO／DEBUG 的低成本 observation |

Logging 不應取代 debugger，debugger 也不應取代可靠的 runtime observability。

## 7. 常見錯誤

| 錯誤 | 問題 | 改法 |
|---|---|---|
| 到處 `System.out.println` | 無 level、無統一格式、難以過濾 | 使用專案 logger |
| 每 tick `INFO` | log 爆量，真正錯誤被淹沒 | 降到 DEBUG 或記錄聚合摘要 |
| 只印 `getMessage()` | cause 與 stack trace 遺失 | 把 throwable 傳給 error logger |
| catch 後只 log 不 rethrow | caller 以為成功，state 可能半完成 | 依責任決定 return、rethrow 或 recovery |
| 直接印整個 JSON／NBT | 敏感資料、效能與噪音 | 印 id、bytes、version、hash 或遮罩摘要 |
| eager `toString()` | disabled level 仍付出組合成本 | parameterized logging 或 level guard |
| 把 logger API 跨平台複製 | lifecycle 與 facade 可能不同 | 依 Fabric／NeoForge／Paper 文件整合 |
| 把 `WARN` 當 exception | warning 並不一定代表操作失敗 | 訊息要描述 fallback 或風險 |

## 8. 練習

1. 為一個 resource reload service 設計 INFO、DEBUG、WARN、ERROR 四種訊息，要求每則訊息都包含 operation 與 resource identifier，但不印完整內容。
2. 將一個只印 `error.getMessage()` 的 catch 改成保留 cause 的 log，並比較 Debugging handbook 中 `Caused by` 的差異。
3. 找出 Minecraft 專案中高頻 event handler 的 INFO log，改成 debug trace 或聚合統計，說明這樣如何提高真正錯誤的可見性。
4. 為 background task 記錄 thread name、開始時間、duration、interrupted 與 failure cause，禁止吞掉 `InterruptedException`。

## References

[1]: https://logging.apache.org/log4j/2.x/manual/api.html "Log4j API — Apache Logging Services"
[2]: https://www.slf4j.org/manual.html "SLF4J User Manual"
[3]: https://docs.fabricmc.net/develop/entrypoint/ "Entrypoints — Fabric Documentation"
[4]: https://docs.neoforged.net/docs/misc/logging/ "Logging — NeoForged Documentation"
[5]: https://docs.papermc.io/paper/dev/getting-started/plugin-yml/ "Plugin Configuration — Paper Documentation"
