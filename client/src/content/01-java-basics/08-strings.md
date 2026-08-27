---
title: String 與 StringBuilder｜字串與字串建構器
titleEn: String / StringBuilder
topic: String and StringBuilder
terms: String, StringBuilder, Immutable, Mutable, String Concatenation, String Literal, String Pool, append, insert, delete, replace, reverse, capacity, toString, Text Composition
slug: java-strings
category: Java 基礎
order: 18
level: 入門到中階
tags: Java, String, StringBuilder, Immutable, Mutable, String Concatenation, Minecraft, Logging, Command, JSON, Text Composition
aliases: 字串, 字串建構器, String immutable, StringBuilder mutable, 字串串接
summary: 建立 String immutable 與 StringBuilder mutable 的正確心智模型，學會字串比較、串接、append、capacity 與 toString，並以 Minecraft log、指令、JSON 與大量文字組合說明何時使用哪一種工具。
---

# String 與 StringBuilder｜字串與字串建構器

> **核心差異：** `String` 是 immutable；建立後內容不能被修改。`StringBuilder` 是 mutable；可以在同一個 builder 上持續 `append`、`insert`、`delete` 或 `replace`。

Java 程式幾乎每天都會處理文字：玩家名稱、Minecraft command、log message、resource id、JSON、設定檔、錯誤訊息與 UI 文案。`String` 與 `StringBuilder` 都代表字元序列，但用途不同。Oracle 的 API 將 `String` 定義為不可變的字串，也將 `StringBuilder` 定義為可變的字元序列。[1] [2]

這篇的目標不是鼓勵你看到每個 `+` 就改成 `StringBuilder`，而是讓你知道：**小型、固定的文字組合用 `String` 很自然；迴圈中的大量累積或需要逐步修改的文字，才考慮 `StringBuilder`；JSON 與 network payload 則應使用正式 serializer／codec，不要用字串拼接冒充資料格式。**

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| String model | 說明 `String` immutable，以及為什麼 `result = result + value` 是重新指定 reference |
| Content comparison | 使用 `equals`、`equalsIgnoreCase`、`isBlank`、`contains` 等 API，而不是用 `==` 比較文字內容 |
| StringBuilder | 使用 `append`、`insert`、`delete`、`replace`、`reverse` 與 `toString` |
| 選擇工具 | 判斷固定短句、迴圈累積、共享 thread 與正式 JSON 哪一種 API 合適 |
| 效能判斷 | 理解 `+` 的 compiler optimization，不做沒有證據的 micro-optimization |
| Minecraft 實戰 | 正確處理 log、command usage、resource id、JSON／Codec 與多行文字 |

## 1. `String` 是 immutable

### 建立後內容不能改

```java
String name = "Alex";
name.toUpperCase();

System.out.println(name); // Alex
```

`toUpperCase()` 不會改變原本的 `name`，而是回傳一個新的 `String`：

```java
String name = "Alex";
String upperName = name.toUpperCase();

System.out.println(name);      // Alex
System.out.println(upperName); // ALEX
```

如果你想讓變數指向新結果，必須重新指定：

```java
String result = "A";
result = result + "B";
result = result + "C";

System.out.println(result); // ABC
```

這裡不是修改原本的 `"A"`。每一次運算都產生一個新的字串結果，再讓 `result` 指向新值。String immutable 的好處是值可以安全共享、可作為穩定的 value object 與 map key，也不會被某個呼叫端偷偷改變內容。[1]

### `String` variable 與 String object 不同

```java
String message = "hello";
message = "world";
```

`message` 這個變數可以改為指向另一個 String；不可變的是 String object 的內容，不是 reference variable 永遠不能重新指定。這和 `final` reference 的概念不同：

```java
final String message = "hello";
// message = "world"; // ❌ final variable 不能重新指定
```

### String literal 與共享

```java
String first = "stone";
String second = "stone";

System.out.println(first.equals(second)); // true
```

String literals 由 Java language 與 runtime 以特殊方式處理，可以共享相同文字內容的表示。你不應依賴這個實作細節用 `==` 判斷文字相等：

```java
String first = new String("stone");
String second = new String("stone");

first == second;       // 不保證是 true；這是 reference identity
first.equals(second);  // true；這是文字內容 equality
```

判斷文字內容時使用 `equals`；如果兩邊可能是 null，使用 `Objects.equals(left, right)`。`==` 只適合判斷 reference identity 或 `value == null`。

## 2. 常用 String API

`String` 提供查詢、比較、切割、取代與格式化操作。大多數操作會回傳新 String，而不改變原始值：

```java
String id = "minecraft:calibration_stone";

boolean namespaced = id.contains(":");
boolean minecraft = id.startsWith("minecraft:");
String path = id.substring(id.indexOf(':') + 1);
String normalized = id.toLowerCase();
String replaced = id.replace(':', '/');

System.out.println(namespaced); // true
System.out.println(path);       // calibration_stone
```

| API | 意義 | 注意事項 |
|---|---|---|
| `equals` | 比較內容是否相等 | 不要用 `==` 比較 String 內容 |
| `equalsIgnoreCase` | 忽略大小寫比較 | 只適合不區分大小寫的 domain 規則 |
| `isEmpty` | 長度是否為 0 | `"   "` 不是 empty |
| `isBlank` | 是否為空或只含 whitespace | Java 11+；依 Unicode whitespace 判斷 |
| `length` | UTF-16 code unit 數量 | 不一定等於使用者看到的字元數 |
| `contains` | 是否包含文字片段 | 不是 regex |
| `startsWith`／`endsWith` | 前綴／後綴判斷 | 適合 namespace、副檔名與 command prefix |
| `substring` | 取出範圍 | index 越界會丟例外 |
| `replace` | 取代文字或 char | literal replacement，不是 regex |
| `replaceAll` | 依 regex 取代 | regex 中的特殊字元要小心 |
| `split` | 依 regex 拆分 | `split(".")` 的 `.` 是 regex wildcard，不是 literal dot |
| `String.join` | 以 delimiter 組合多個文字 | 適合固定 delimiter 的 collection |
| `formatted`／`format` | 依 format template 產生文字 | 外部輸入不要直接當 format string |
| `strip`／`stripLeading`／`stripTrailing` | 移除 Unicode whitespace | 與舊式 `trim` 的語意不完全相同 |

### 空字串、空白與 null 是三種狀態

```java
String empty = "";
String blank = "   ";
String missing = null;

empty.isEmpty(); // true
blank.isBlank(); // true
// missing.isBlank(); // ❌ NullPointerException
```

`""` 是存在但長度為零的 String；`"   "` 是存在但只含空白；`null` 是沒有 String reference。API contract 要明確區分三者，不要看到使用者輸入就直接呼叫 `.isBlank()` 而忽略 null。

```java
boolean missingOrBlank = value == null || value.isBlank();
```

## 3. `String result = "A" + value;`

### 小型、固定組合：直接使用 `+`

```java
String playerName = "Alex";
int level = 12;

String message = "Player " + playerName + " reached level " + level + ".";
```

這種短小、可讀、只有幾個片段的組合通常不需要手動改成 StringBuilder。Java compiler 可以依 language specification 與 JDK implementation 選擇適當的 concatenation strategy；不能簡化成「每一個 `+` 一定手動建立一個 StringBuilder」。[1] [3]

### 迴圈中的大量串接：考慮 `StringBuilder`

```java
String result = "";
for (String name : names) {
    result = result + name + ", ";
}
```

這段在大量迭代時可能建立許多中間 String。若需求是逐步累積一段文字，可以明確使用 StringBuilder：

```java
StringBuilder builder = new StringBuilder();
for (String name : names) {
    builder.append(name).append(", ");
}

String result = builder.toString();
```

`StringBuilder` 不代表一定更快；真正效能受 JDK、compiler、迴圈大小、allocation、字串長度與 workload 影響。固定短句不要為了「看起來很底層」增加複雜度；大量動態累積時再使用能表達意圖的 builder。

### `String.join` 與 `Collectors.joining`

如果只是把 collection 用 delimiter 組合，宣告式 API 通常比手動處理最後一個 delimiter 更清楚：

```java
String commaSeparated = String.join(", ", names);

String report = players.stream()
        .map(Player::getName)
        .collect(Collectors.joining(", ", "Players: ", "."));
```

選擇原則是：`String.join` 適合簡單 join；`Collectors.joining` 適合已經在 Stream pipeline 中的資料；StringBuilder 適合有條件、分支、多行或逐段 append 的 imperative builder。

## 4. `StringBuilder` 是 mutable

### 基本操作

```java
StringBuilder builder = new StringBuilder("Hello");

builder.append(' ');
builder.append("Minecraft");
builder.insert(0, "[Log] ");
builder.replace(0, 5, "[Info]");

String message = builder.toString();
System.out.println(message);
```

`append` 與 `insert` 是 StringBuilder 的主要操作；它們會直接改變 builder 目前的字元序列。[2]

```text
起始：Hello
append(" World")  → Hello World
insert(0, "[ ")   → [ Hello World
replace(...)      → 依索引修改目前內容
```

| API | 意義 | 回傳 |
|---|---|---|
| `append(value)` | 在尾端加入內容 | 同一個 `StringBuilder` |
| `insert(index, value)` | 在指定位置插入內容 | 同一個 `StringBuilder` |
| `delete(start, end)` | 刪除範圍 `[start, end)` | 同一個 builder |
| `deleteCharAt(index)` | 刪除一個字元 | 同一個 builder |
| `replace(start, end, value)` | 取代範圍 | 同一個 builder |
| `reverse()` | 反轉目前字元序列 | 同一個 builder |
| `setLength(length)` | 調整長度，可截斷或補 `\0` | `void` |
| `length()` | 目前長度 | `int` |
| `capacity()` | 目前容量 | `int` |
| `ensureCapacity(n)` | 確保至少有指定容量 | `void` |
| `toString()` | 產生目前內容的 String | 新的 String representation |

### Builder 內容會被修改

```java
StringBuilder builder = new StringBuilder("A");
StringBuilder sameBuilder = builder.append("B");

System.out.println(builder);     // AB
System.out.println(sameBuilder); // AB
System.out.println(builder == sameBuilder); // true
```

`append` 回傳同一個 builder，方便 method chaining：

```java
String line = new StringBuilder()
        .append("id=")
        .append(42)
        .append(", enabled=")
        .append(true)
        .toString();
```

`toString()` 是交界點：builder 適合建構，`String` 適合傳遞、保存、比較與作為不可變結果。建構完成後通常把 builder 轉成 String，不要把可變 builder 到處傳遞成共享狀態。

### capacity 與 length 不同

```java
StringBuilder builder = new StringBuilder(128);

System.out.println(builder.length());   // 0
System.out.println(builder.capacity()); // 至少 128
```

`length` 是目前內容長度；`capacity` 是內部 buffer 在不必重新配置前可以容納的容量。超過容量時，builder 會自動擴大。[2] 如果你合理知道輸出大小，可以提供初始 capacity；不確定時使用預設 constructor，避免以猜測容量增加維護成本。

### StringBuilder 不是 thread-safe

Oracle API 明確指出 `StringBuilder` 不保證多 thread 使用安全；需要同步的情況可考慮 `StringBuffer`。[2] 更常見的設計是讓每個 task 擁有自己的 builder，不要在多條 thread 之間共享同一個 mutable builder：

```java
// ✅ 每次呼叫建立自己的 local builder
String formatPlayer(Player player) {
    return new StringBuilder()
            .append(player.getName())
            .append(" at ")
            .append(player.getBlockX())
            .append(",")
            .append(player.getBlockY())
            .append(",")
            .append(player.getBlockZ())
            .toString();
}
```

`StringBuffer` 不是「所有情況都應該取代 StringBuilder」；如果文字建構真的需要跨 thread 共享，先重新檢查 ownership，通常 immutable result、local builder 或 message passing 比共享可變 buffer 更容易正確。

## 5. Minecraft 實戰：Log message

### 短訊息使用 logger 的 parameterized style

Minecraft mod／plugin 使用的 logger 可能來自 SLF4J、平台 wrapper 或其他 logging API；以 API 提供的 placeholder style 為準：

```java
logger.info("Calibration completed for player={} pos={}", playerId, pos);
```

不要為了每一條 log 都手動使用 StringBuilder：

```java
// ❌ 多餘且可能在 log level 關閉時仍先組合完整文字
logger.debug(new StringBuilder()
        .append("player=")
        .append(playerId)
        .append(" pos=")
        .append(pos)
        .toString());
```

如果 logging API 支援 parameterized logging，它可以把訊息 template 與 arguments 分開，並依 level 決定是否進一步格式化。實際 placeholder 語法請依 Fabric、NeoForge、Paper 或 backend 使用的 logger contract，不要假設每個 logger 都相同。

### 大型診斷報告才使用 builder

```java
String buildCalibrationReport(List<CalibrationResult> results) {
    StringBuilder report = new StringBuilder("Calibration report\n");

    for (CalibrationResult result : results) {
        report.append("- player=")
                .append(result.playerId())
                .append(" status=")
                .append(result.status())
                .append("\n");
    }

    return report.toString();
}
```

這裡 builder 表達「逐筆產生多行報告」的意圖。它仍然只負責文字建構，不代表可以在背景 thread 直接讀取 world、entity 或 registry；資料應先在正確 thread 取得 snapshot，再在 builder 中組合純文字。

## 6. Minecraft 實戰：Command 與 usage text

command usage 通常是短字串，可以直接使用 `+` 或 `String.format`；如果有許多可選分支與多行說明，StringBuilder 會比較適合：

```java
String buildUsage(String commandName, boolean admin) {
    StringBuilder usage = new StringBuilder()
            .append("Usage: /")
            .append(commandName)
            .append(" <player> <range>\n")
            .append("  /")
            .append(commandName)
            .append(" inspect\n");

    if (admin) {
        usage.append("  /")
                .append(commandName)
                .append(" reload\n");
    }

    return usage.toString();
}
```

指令 arguments 是使用者輸入，不能只靠文字組合就視為合法資料。先 parse、validate permission、範圍與 domain rule，再產生回覆。StringBuilder 只解決 output construction，不解決 command security、escaping 或 authorization。

## 7. Minecraft 實戰：JSON 與資料格式

### 不要手動串接 JSON

下面的寫法看起來簡單，但遇到引號、反斜線、Unicode、null、number、array 或 nested object 就可能產生非法 JSON 或 injection-like data corruption：

```java
// ❌ 不要用字串串接當正式 JSON serializer
String json = "{\"name\":\"" + playerName + "\"}";
```

即使使用 StringBuilder，也只是更有效率地產生錯誤字串：

```java
// ❌ StringBuilder 不會自動處理 JSON escaping 或 schema
StringBuilder json = new StringBuilder("{\"name\":\"")
        .append(playerName)
        .append("\"}");
```

正式 JSON、Minecraft NBT／Codec、network payload 與 API response 應使用專案指定的 serializer、codec 或 data model。Serialization handbook 會處理 schema、版本化、validation 與跨平台資料邊界；本篇只需要記住：**StringBuilder 是文字建構器，不是 JSON library。**

### 何時可以用 builder？

如果目標是給人看的 debug preview，且你明確處理 escaping 或只是輸出內部已驗證的文字，builder 可以用於 presentation layer：

```java
String preview = new StringBuilder()
        .append("CalibrationPreview{player=")
        .append(playerId)
        .append(", attempts=")
        .append(attempts)
        .append('}')
        .toString();
```

這個 preview 不是 JSON、不是 network protocol，也不是 persistence format。要跨 process、跨版本或供其他程式讀取，就必須使用明確資料格式與 serializer。

## 8. Unicode 與索引邊界

Java `String` 與 `StringBuilder` 的 `charAt`、`length` 等基本索引以 UTF-16 code unit 為基礎。某些 Unicode supplementary character 會使用 surrogate pair，因此 `length()` 不一定等於使用者認知的 glyph 或 code point 數量：

```java
String text = "A😀B";

System.out.println(text.length()); // UTF-16 code units，不是視覺字元數
text.codePoints().forEach(System.out::println);
```

一般 Minecraft id、command keyword、英文 API 名稱與大多數 log 欄位可以使用一般 String API；若要正確處理任意 Unicode 的 code point、游標或字元邊界，使用 `codePoints()`、`Character` API 或明確的文字處理 library。不要用 `substring` 的 index 假設每個畫面上的字元都只佔一個 `char`。

## 9. 選擇指南

| 情境 | 優先選擇 | 原因 |
|---|---|---|
| 固定短句 | `String` literal | 可讀、不可變、最簡單 |
| 幾個變數組合 | `"A" + value` | 語意直接，compiler 可處理 concatenation |
| 迴圈大量累積 | `StringBuilder` | 明確表達逐步 append，減少不必要中間結果的風險 |
| collection 簡單 join | `String.join` | 不用手動處理最後 delimiter |
| Stream 中 join | `Collectors.joining` | 與 pipeline 語意一致 |
| 跨 thread 傳遞結果 | 完成後轉成 `String` | 不共享 mutable builder |
| 多 thread 共享可變文字 | 重新設計 ownership；必要時 `StringBuffer` | StringBuilder 不保證 thread-safe |
| Logger message | logger parameterized API | 避免不必要預先組合，依 logger contract |
| 正式 JSON | JSON library／codec／serializer | 自動處理 escaping、型別、schema 與 validation |
| Minecraft network／NBT | 對應 loader／platform API | 不要用一般文字串接替代 protocol |
| 多行 report／usage | `StringBuilder` | 需要條件與逐段 append |
| 需要比較或作 key | `String` | immutable value；使用 `equals`／`hashCode` |

## 10. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 用 `==` 比較兩個 String 內容 | 比較 reference identity | 使用 `equals` 或 `Objects.equals` |
| 呼叫 `toUpperCase()` 後期待原 String 改變 | String immutable | 接住回傳的新 String |
| 看到任何 `+` 就改 StringBuilder | 造成不必要複雜度，且 compiler 可最佳化固定 concatenation | 只在大量動態累積或逐段修改時改用 builder |
| 在大迴圈中重複 `result = result + value` | 可能建立許多中間 String 與 allocation | 使用 StringBuilder、join 或 joining |
| 忘記呼叫 builder 的 `toString()` | 把可變建構器當成最終 String 傳出 | 建構完成後轉成 String |
| 把 StringBuilder 分享給多個 thread | StringBuilder 不保證 thread-safe | local builder、immutable result、同步或重新設計 ownership |
| 把 `capacity` 當成目前文字長度 | capacity 是內部 buffer 容量 | 用 `length()` 讀目前內容長度 |
| 用 StringBuilder 手動組 JSON | 沒有 escaping、schema、型別與 validation | 使用 JSON library／Minecraft Codec |
| 用 builder 取代 logger placeholder | log level 關閉時可能仍預先組合 | 使用 logger 支援的 parameterized API |
| 用 `toString()` 當 JSON／database format | representation 不是正式資料契約 | 使用明確 serializer 與 schema |
| `split(".")` 想依句點切割 | `.` 在 regex 中代表任意字元 | 使用 `split("\\.")` 或 `Pattern.quote` |
| 忽略 null 與 empty／blank 的差異 | 三種狀態會被錯誤合併 | 明確定義 nullability 與 whitespace rule |
| 用 char index 代表視覺字元數 | supplementary Unicode 可能是 surrogate pair | 需要時使用 code points 與正確文字 API |
| 將玩家／world 查詢塞入 toString 或 builder | 造成 thread、lifecycle、效能與副作用問題 | 先在正確 owner thread snapshot，再建構文字 |

## 11. 練習

### 練習一：immutable 觀察

建立一個 `String message = "A"`，依序呼叫 `concat`、`toUpperCase` 與 `replace`，記錄每個 method 前後的 reference 與內容。說明為什麼每次都要接住回傳值，並比較 `String` 與 `final String` 的差異。

### 練習二：三種 join

用 `String +`、`StringBuilder` 與 `String.join` 產生相同的玩家名稱清單。處理空 list、單一元素與最後 delimiter，說明哪個 API 的意圖最清楚。

### 練習三：大量 report

建立 10,000 筆 immutable `CalibrationResult`，分別用迴圈中的 String concatenation 與 StringBuilder 建立 report。使用 profiler 或簡單 metrics 觀察 allocation 與時間；不要只執行一次就下結論，也不要把 benchmark 結果當成所有 JDK 的保證。

### 練習四：安全 command usage

以 StringBuilder 產生有 admin／一般玩家差異的 command usage，要求 command name 先通過 validation，並把 user input 當資料而不是可執行的 format template。確認 builder 只負責 output construction。

### 練習五：JSON 邊界 review

故意讓玩家名稱包含引號、反斜線與 Unicode，分別用手動 StringBuilder 與專案指定 JSON serializer 建立資料。比較兩者輸出，寫下為什麼 builder 不能取代 serializer。

## 12. 複習速查

```text
String
  immutable value
  equals 比內容
  固定短句／少量串接／跨 thread 傳遞

StringBuilder
  mutable character sequence
  append／insert／delete／replace
  大量逐段文字組合
  完成後 toString()
  不直接跨 thread 共享

正式資料格式
  JSON／NBT／Codec／network payload
  使用 serializer／codec
  不用 + 或 StringBuilder 手動冒充
```

| 看到的程式 | 先問自己 |
|---|---|
| `String result = "A" + value;` | 這是短小固定組合，還是大型迴圈？ |
| `result = result + value` 在 loop | 是否應改用 StringBuilder、join 或 joining？ |
| `builder.append(...)` | 這個 mutable builder 的 owner 是誰？ |
| `builder.toString()` | 是否已完成建構，之後只傳 immutable String？ |
| `logger.debug("..." + value)` | logger 是否支援 parameterized message？ |
| `"{\"name\":\"" + value` | 這是不是應該交給 JSON serializer？ |
| `map.get(new String(...))` | 是否以 equals／hashCode 做 value lookup？ |
| Minecraft `Identifier`／command text | 這是 log／presentation，還是正式 protocol／resource identity？ |

**最後記住：** `String` 適合表達不可變的文字值；`StringBuilder` 適合在單一 owner 內逐步建構文字；正式 JSON、Minecraft payload 與跨版本資料則需要 serializer／codec。工具選擇應由資料語意與生命週期決定，而不是只看哪一個 API 看起來更快。

## References

[1]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html "String — Java SE 21 API"
[2]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html "StringBuilder — Java SE 21 API"
[3]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18.1 "String Concatenation Operator + — Java Language Specification"
