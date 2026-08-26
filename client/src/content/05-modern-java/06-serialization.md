---
title: Serialization｜序列化、JSON 與資料格式
titleEn: Serialization
topic: Serialization
terms: Serialization, Deserialization, JSON, Object Serialization, Serializable, ObjectOutputStream, ObjectInputStream, serialVersionUID, transient, DTO, Codec, schema, data format
slug: java-serialization
category: Java 現代語法
order: 76
level: 中階到進階
tags: Java, Serialization, Deserialization, JSON, Object Serialization, DTO, Codec, Data Format, NBT, Fabric, NeoForge, Minecraft Java
aliases: Serialization, 序列化, Deserialization, 反序列化, JSON, Object Serialization, Java Serializable
summary: 以現代 API 與資料格式為中心，說明 Serialization、Deserialization、JSON、Object Serialization、schema、版本相容、輸入驗證與 Minecraft／Markdown Workspace 的資料邊界；只保留 Java 原生 Serializable 的必要概念。
---

# Serialization｜序列化、JSON 與資料格式

> **核心目標：** 能分辨「物件如何被轉成資料」、「資料如何被還原成物件」與「資料格式本身如何演進」，並選擇適合 API、設定檔、網路 payload、Minecraft data 或本地 Markdown backup 的 serialization strategy。

**Serialization｜序列化** 是把程式中的資料結構或物件狀態轉成可以保存、傳輸或交換的資料表示；**Deserialization｜反序列化** 則是把資料表示解析回程式可以使用的資料結構。序列化的目的不是把任意 object 變成「永遠相容的魔法格式」，而是建立一個明確的資料邊界：資料有哪些欄位、型別如何表示、缺少欄位怎麼辦、版本如何升級，以及不可信輸入如何驗證。

現代開發中，JSON、CBOR、MessagePack、Protocol Buffers、NBT、遊戲 codec 與各種 API schema 通常比 Java 原生 `Serializable` 更值得優先理解。Java Object Serialization 仍然值得知道，因為你會在舊系統、工具與錯誤訊息中遇到 `ObjectInputStream`；但不要把它預設成新的 HTTP API、跨版本 Minecraft payload 或長期儲存格式。[1]

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| 分辨方向 | 清楚說明 serialization 與 deserialization 的輸入、輸出與責任 |
| 讀懂 JSON | 看懂 object、array、string、number、boolean 與 `null` |
| 設計 API | 用 DTO／record、schema、版本與驗證設計資料邊界 |
| 理解 Java 原生機制 | 知道 `Serializable`、`ObjectOutputStream`、`ObjectInputStream`、`serialVersionUID` 與 `transient` 的作用與限制 |
| 防禦輸入 | 不把不可信 bytes 或 JSON 直接還原成可執行或有權限的物件 |
| 套用 Minecraft | 分清 loader／遊戲指定的 NBT、Codec、payload 與 Java 共通資料模型 |
| 套用 JavaBase | 讓 Markdown 原稿、backup、revision 與 derived index 使用不同的資料責任 |

## 1. 先分清楚三個層次

很多 serialization bug 不是 API 不會呼叫，而是把三個層次混成一個概念：

| 層次 | 要回答的問題 | 範例 |
|---|---|---|
| Object model | 程式內部資料長什麼樣子？ | `PlayerSetting`、DTO、record、Map |
| Data format | 資料以什麼規則表示？ | JSON、NBT、binary protocol、Markdown |
| Transport／storage | 資料要去哪裡？ | HTTP、檔案、資料庫、packet、backup |

同一個 object model 可以被序列化成 JSON、NBT 或 binary format；同一個 JSON 也可以經由 HTTP 傳送、寫入檔案或放進 queue。選擇 serialization library 之前，先定義資料格式與邊界，否則很容易讓 library 的預設行為偷偷變成你的 API contract。

```text
Java object / DTO
        ↓ serialization
JSON / NBT / binary / text data
        ↓ transport or storage
HTTP / file / packet / database / backup
        ↓ deserialization
validated DTO / domain object
```

## 2. JSON｜現代 API 常見資料格式

### JSON 的基本值

JSON 是資料格式，不是 Java class，也不是某個特定 framework 的 annotation。它由 object、array、string、number、`true`、`false` 與 `null` 組成。[2]

```json
{
  "id": "minecraft:stone",
  "count": 12,
  "tags": ["building", "common"],
  "enabled": true,
  "owner": null
}
```

| JSON 值 | Java 常見對應 | 注意事項 |
|---|---|---|
| object | DTO、record、`Map<String, Object>` | 欄位名稱與 schema 要固定或可演進 |
| array | `List<T>`、陣列 | 元素型別與順序要定義 |
| string | `String`、enum id | 不要把所有數值都當字串 |
| number | `int`、`long`、`double`、`BigDecimal` | 範圍、精度與 overflow 要驗證 |
| boolean | `boolean`／`Boolean` | `null` 與 false 不是同一件事 |
| null | `null`、Optional 或明確缺值狀態 | 要先定義欄位可否缺值 |

JSON 的優點是可讀、跨語言、適合 HTTP API 與設定檔；缺點是型別表達能力、數值精度、schema enforcement 與 payload 大小需要由應用程式補足。不要看到 JSON 就假設它天然安全或天然向後相容。

### JSON 與 Java object 的邊界

Java SE 提供 I/O、文字處理與資料結構，但實際的 JSON parser／object mapper 通常來自專案指定的 library 或 framework。Spring、Minecraft loader、backend service 與其他平台可能各自提供不同 codec；不要在 handbook 中把某一套 library 的 annotation 當成 Java 語言本身。

可以先用一個 provider-neutral 的 codec contract 思考：

```java
record PlayerSetting(String mode, int range) {}

interface JsonCodec {
    String encode(PlayerSetting setting);
    PlayerSetting decode(String json);
}
```

真正的實作可以由 Jackson、Gson、JSON-B、Spring converter、Fabric／Minecraft codec 或專案自訂 parser 提供。重要的是呼叫端只依賴「輸入與輸出契約」，不應把 parser 的內部細節散落在所有 service、event handler 與 command 中。

## 3. Serialization 與 Deserialization 的流程

### Serialization：Object → Data

序列化時，程式要決定哪些資料屬於公開格式、哪些是內部 implementation detail。以 DTO 為例：

```java
record PlayerSetting(String mode, int range) {
    String toJsonLikeText() {
        return "{\"mode\":\"" + mode + "\",\"range\":" + range + "}";
    }
}

PlayerSetting setting = new PlayerSetting("SAFE", 4);
String json = setting.toJsonLikeText();
```

上面的 `toJsonLikeText()` 只是一個教學示意，不是完整 JSON serializer；真正的 JSON writer 必須正確 escape quote、backslash、控制字元與 Unicode，也要處理數值與 null。不要在 production 用字串串接取代成熟且受測試的 JSON library。

### Deserialization：Data → Validated Object

反序列化不只是「呼叫 parser 得到 object」。外部資料可能缺欄位、型別錯誤、數值超界、版本過舊、欄位多餘或帶有不允許的權限資訊。建議把流程拆成 parse、validate、normalize 與 domain conversion：

```text
raw bytes / JSON text
        ↓ parse
syntax tree / DTO
        ↓ validate
合法的範圍、欄位與 schema
        ↓ normalize
補預設值、轉換版本、整理格式
        ↓ domain conversion
可被遊戲或服務使用的 domain object
```

```java
record RawPlayerSetting(String mode, Integer range) {}
record ValidatedPlayerSetting(String mode, int range) {}

static ValidatedPlayerSetting validate(RawPlayerSetting raw) {
    if (raw.mode() == null || raw.mode().isBlank()) {
        throw new IllegalArgumentException("mode is required");
    }
    if (raw.range() == null || raw.range() < 0 || raw.range() > 64) {
        throw new IllegalArgumentException("range must be between 0 and 64");
    }
    return new ValidatedPlayerSetting(raw.mode().toUpperCase(), raw.range());
}
```

不要讓「parser 成功」等同於「資料可以套用到遊戲世界」。例如 JSON 可能合法地包含 `range: 999999999`，但不代表 server 應接受它；權限、座標、數量、ID、資源成本與 side-specific 行為都應在正確的 server boundary 重新驗證。

## 4. Schema 與資料版本

### Schema 是資料契約

Schema 描述資料欄位、型別、必填性、允許範圍與版本行為。即使沒有使用正式 JSON Schema 檔案，也應在程式與文件中明確寫出規則：

```json
{
  "schemaVersion": 2,
  "mode": "SAFE",
  "range": 4
}
```

`schemaVersion` 是資料格式版本，不等於 Java class 的版本，也不等於 mod version。前者描述 payload 如何讀；後者描述軟體或 mod 發布內容。不要把 `serialVersionUID`、Minecraft mod version 與 JSON `schemaVersion` 混用。

### 新增、移除與改名欄位

| 變更 | 常見相容策略 |
|---|---|
| 新增 optional field | 讀取舊資料時使用預設值 |
| 新增 required field | 提供 migration 或拒絕舊版本並顯示修復指引 |
| 移除 field | 讀取時忽略舊欄位，確認不再依賴它 |
| 改名 field | 同時讀取舊名與新名，寫出時只使用新名，或執行 migration |
| 改變型別 | 增加版本轉換，不要期待 parser 自動猜測 |
| 改變語意 | 增加新欄位或明確版本，不要只重用原欄位名稱 |

設定檔、玩家資料、世界資料與網路 payload 的相容要求不同。短命的 request 可以快速淘汰舊版本；玩家世界與 backup 則通常需要 migration、備份與可回復策略。

### Migration 範例

```java
record VersionedSetting(int schemaVersion, String mode, Integer range) {}

static PlayerSetting migrateAndValidate(VersionedSetting raw) {
    int range = raw.range() == null ? 4 : raw.range();
    String mode = raw.mode() == null ? "SAFE" : raw.mode();

    if (raw.schemaVersion() < 1 || raw.schemaVersion() > 2) {
        throw new IllegalArgumentException("Unsupported schema version");
    }
    return new PlayerSetting(mode.toUpperCase(), range);
}
```

真正的 migration 應該有測試，並記錄「來源版本 → 目標版本」。不要用一個充滿 if／else 的巨大 parser 隱藏所有歷史格式；當版本變多時，拆成明確的 migration functions 會更容易維護。

## 5. Java Object Serialization：知道它，但不要濫用

### 最小概念

Java Object Serialization 會把可序列化 object graph 編碼成 Java-specific binary stream，再由 `ObjectInputStream` 嘗試還原。類別通常實作 `Serializable`，可用 `serialVersionUID` 協助版本相容，`transient` 欄位則不會依一般欄位規則被序列化。[1]

```java
import java.io.Serializable;

record LocalCacheEntry(String key, String value) implements Serializable {
    private static final long serialVersionUID = 1L;
}
```

`record` 是否適合序列化、private static 欄位如何處理，以及版本演進細節要查 Java Serialization Specification 與該 JDK 版本文件。這個範例只用來理解 marker interface 與版本欄位，不代表應把 player data、HTTP payload 或 mod network protocol 改成 Java native serialization。

### ObjectOutputStream 與 ObjectInputStream

以下是受控、可信、本地測試用途的最小範例：

```java
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

record LocalSetting(String mode, int range) implements Serializable {
    private static final long serialVersionUID = 1L;
}

static byte[] serialize(LocalSetting setting) throws IOException {
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
         ObjectOutputStream output = new ObjectOutputStream(bytes)) {
        output.writeObject(setting);
        return bytes.toByteArray();
    }
}

static LocalSetting deserialize(byte[] bytes)
        throws IOException, ClassNotFoundException {
    try (ObjectInputStream input = new ObjectInputStream(
            new ByteArrayInputStream(bytes))) {
        return (LocalSetting) input.readObject();
    }
}
```

### 為什麼不能把它當 API 預設？

`ObjectInputStream.readObject()` 會重建 object graph。對不可信來源直接反序列化可能造成嚴重安全風險；輸入來源可能來自網路、上傳檔案、玩家提供的資料、共享 backup 或被竄改的 cache。即使資料來源「目前看起來是本機」，未來經過同步、匯入或管理員上傳後，信任邊界也可能改變。

Java native serialization 也會把 Java class 結構與版本相依性帶進資料格式，讓跨語言、跨版本、schema review、migration 與可觀測性變得困難。現代 API 通常選擇 JSON、明確 binary protocol、資料庫 schema、NBT 或專案指定 codec，並在反序列化後建立受驗證的 DTO。

| 選擇 | 適合場景 | 不適合場景 |
|---|---|---|
| Java `Serializable` | 受控本地工具、legacy compatibility、短期內部 cache | 不可信輸入、公開 API、跨語言資料、長期玩家存檔 |
| JSON | HTTP API、設定檔、可讀資料交換 | 高效能固定 binary protocol、極大資料量 |
| NBT／遊戲 codec | Minecraft world／data／payload 的平台指定格式 | 與其他平台直接共用的 generic REST API |
| Protocol Buffers 等 binary schema | 明確 schema、高效能、跨服務協定 | 需要人直接編輯的設定檔 |
| Markdown | 人類可編輯原稿、文件與知識庫 | 需要嚴格 binary integrity 的 payload |

## 6. API Serialization 的設計方式

### DTO 與 domain object 分開

不要直接把 domain object、entity 或 service instance 整個丟進 serializer。domain object 可能包含 lazy reference、thread-bound state、cache、內部欄位或不應暴露的權限資訊。為 API 建立 DTO，讓資料格式只包含有意義的公開欄位：

```java
record CalibrationResultDto(
        String playerId,
        int distance,
        String status
) {}

static CalibrationResultDto toDto(CalibrationResult result) {
    return new CalibrationResultDto(
            result.playerId(),
            result.distance(),
            result.status().name()
    );
}
```

DTO 是資料邊界；domain object 是程式行為與規則。序列化 DTO 可以降低 library、framework、mapping 與內部 class refactor 對外部資料的影響。

### 不要把所有 field 自動暴露

自動 object mapping 很方便，但要審查：密碼、token、permission、server-only state、debug stack、internal IDs 與 mutable reference 不應因為「public getter 存在」就自動出現在 JSON。建立 allowlist 通常比建立 denylist 更容易確認公開資料。

```java
record PublicPlayerDto(String name, String team) {}

static PublicPlayerDto toPublicDto(Player player) {
    return new PublicPlayerDto(player.getName(), player.getTeam());
}
```

這裡的 `Player` 是教學用型別，不代表 Fabric、NeoForge 或 Paper 的共同 API。真正的 loader／plugin code 要依平台取得可公開資料，再轉成自己的 DTO。

### 錯誤與未知欄位策略

API 需要決定遇到未知欄位時是 ignore、warn 還是 reject；遇到缺少欄位時是 default、null、error 還是 migration。對玩家設定與 backup，通常需要可診斷的錯誤；對 forward-compatible network payload，可能需要保留未知欄位或忽略它們。這是產品與協定決策，不是 parser 的小細節。

```java
record ParseResult<T>(T value, List<String> warnings) {}
```

將 warnings、來源版本、路徑與 error code 保留下來，會比只丟出 `RuntimeException("bad json")` 更容易讓使用者修復設定檔。

## 7. JavaBase 本地 Markdown Workspace 實戰

### Markdown 原稿與索引不是同一份資料

JavaBase 的架構是 Markdown 唯一真實來源；IndexedDB 只保存可丟棄、可重建的搜尋索引、閱讀進度、UI 狀態與快取。因此「儲存 Markdown」與「建立 index」應視為兩個階段：

```text
Markdown file
    ↓ UTF-8 read／write
Parser
    ↓ note model
Derived search index
    ↓ searchText／tags／graph
IndexedDB
```

不要把 derived index serialization 回寫成新的 Markdown 原稿，也不要把 IndexedDB cache 當成唯一 backup。當 index 壞掉時，應能重新掃描 Markdown；當網站壞掉時，原稿仍應能由 VS Code 或其他工具開啟。

### Markdown export

Java I/O handbook 已說明 `Files.readString` 與 `Files.writeString`；若要做 Java 版 Markdown export，可以把輸出責任集中在一個 service：

```java
record NoteExport(String relativePath, String markdown) {}

static void exportNote(Path workspace, NoteExport note) throws IOException {
    Path target = resolveInside(workspace, note.relativePath());
    if (!target.getFileName().toString().endsWith(".md")) {
        throw new IllegalArgumentException("Only Markdown is allowed");
    }
    Files.createDirectories(target.getParent());
    Files.writeString(
            target,
            note.markdown(),
            StandardCharsets.UTF_8,
            StandardOpenOption.CREATE,
            StandardOpenOption.TRUNCATE_EXISTING,
            StandardOpenOption.WRITE
    );
}
```

這個方法只負責寫原稿；它不應偷偷更新搜尋 index、閱讀狀態或 UI cache。呼叫端可以在 write 成功後再觸發 parser／indexer，失敗時則保留舊資料並顯示明確 error。

### Backup 與 revision

Backup／revision 是另一種 serialization：它把某一時刻的原稿與 metadata 保存成可復原的 representation。設計時應記錄 revision id、created time、來源 path、content hash 與 schema version；不要只把 `ObjectOutputStream` 的 binary blob 當成可檢查的 backup。

```java
record RevisionMetadata(
        String revisionId,
        String relativePath,
        Instant createdAt,
        String contentHash
) {}
```

真正的 backup format 可以是 Markdown + JSON metadata、ZIP、資料庫 row 或 object storage。選擇取決於可讀性、大小、atomicity、retention policy 與 restore flow；重點是使用者能知道哪一份是原稿、哪一份是索引、哪一份是 revision。

## 8. Minecraft Java 對照

Minecraft 的 serialization 不是單一 API。不同 loader、Minecraft 版本與資料位置可能使用 NBT、Codec、packet buffer、JSON、resource data 或自訂 payload。Java 的 DTO、validation、schema version 與 trust boundary 可以共通，但具體型別、註冊流程與 network API 不可混用。

| Minecraft 情境 | 常見資料格式／API 方向 | 重要判斷 |
|---|---|---|
| world／block entity data | NBT 或遊戲指定 codec | 遵循遊戲與 loader 的 data contract |
| resource／datagen | JSON、resource stream、codec | resource 不一定是可寫 Path |
| mod config | JSON、TOML、JSON5 或 loader config API | 需處理使用者編輯、版本與錯誤修復 |
| network payload | loader／Minecraft 指定 buffer、codec 或 payload API | server 端重新驗證 client 輸入 |
| HTTP backend | JSON DTO、明確 schema | 不要把 entity 或 native Java object 直接送出 |
| backup／匯出 | ZIP、JSON metadata、Markdown、binary | 記錄版本、來源、hash 與 restore 策略 |

Fabric、NeoForge、Paper 的 serializer、codec、event 與 payload API 不應放進同一個可編譯範例。先確認目前專案的平台，再把 Java 共通的資料模型轉換到該平台的正式 API；不要為了省幾行程式碼而讓資料格式和 loader implementation detail 綁死。

### Server 端永遠重新驗證

client 傳來的 JSON、payload 或 command argument 都是不可信輸入。即使 client UI 已限制範圍，server 仍要重新檢查玩家身份、權限、座標、數量、距離、registry id、版本與操作是否合法。Deserialization 只證明「格式可以解析」，不證明「遊戲狀態允許套用」。

```java
record CalibrationRequest(String playerId, int range) {}

static void validateRequest(CalibrationRequest request, ServerContext server) {
    if (!server.isOnline(request.playerId())) {
        throw new IllegalArgumentException("player is not online");
    }
    if (request.range() < 0 || request.range() > 64) {
        throw new IllegalArgumentException("range out of bounds");
    }
    if (!server.canCalibrate(request.playerId())) {
        throw new SecurityException("permission denied");
    }
}
```

`ServerContext` 也是教學用 abstraction；真實 API 要依 Fabric、NeoForge 或 Paper 的 server thread、player lookup 與 permission contract 實作。

## 9. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 把 serialization 當成等同 JSON | serialization 是過程，JSON 是格式之一 | 分開討論 object model、format 與 transport |
| 直接字串串接 JSON | quote、backslash、Unicode、null 與 nested data 容易錯 | 使用受測試的 JSON library／codec |
| 以為 parser 成功就代表資料安全 | 合法 JSON 仍可能有越界、權限或錯誤語意 | parse 後再 validate、normalize、convert |
| 把 Java entity 整個自動 map 成 API response | 會暴露內部、lazy state、權限或循環 reference | 建立明確 DTO allowlist |
| 用 `Serializable` 做公開 API | Java class 結構、版本與安全風險會滲入格式 | JSON、schema binary protocol 或平台 codec |
| 對不可信 bytes 直接 `readObject()` | native deserialization 可能重建危險 object graph | 不使用 native deserialization，或採取嚴格 allowlist／過濾與隔離 |
| 以 `serialVersionUID` 當資料 migration | 它不是完整 schema migration 工具 | 另設 schema version 與 migration functions |
| 忽略 `schemaVersion` | 新舊資料可能被錯誤解讀 | 明確版本、預設值、migration 與拒絕策略 |
| 把 client validation 當 server validation | client 可被修改或繞過 | server 端重新驗證所有信任邊界 |
| 混用 Fabric、NeoForge、Paper serializer | framework contract、型別與生命週期不同 | 文件與程式碼明確標示平台 |
| 把 IndexedDB index 當 Markdown backup | index 是 derived data，不能取代原稿 | Markdown source、index、backup 分離 |
| 用 binary blob 當唯一 revision | 難以檢查、migration 與手動修復 | 保存 metadata、content hash 與可讀資料 |

## 10. 練習

### 練習一：JSON DTO 設計

建立 `PlayerSettingDto`，定義 `schemaVersion`、`mode`、`range` 與 `enabled`。寫出一份 JSON 範例，並說明哪些欄位必填、哪些可以使用 default，以及 `range` 的合法範圍。

### 練習二：parse、validate、domain conversion

把輸入資料拆成 raw DTO、validated DTO 與 domain object。故意測試缺少 `mode`、`range` 為負數、`range` 超過上限、未知 schema version 與額外欄位，為每種情況設計可理解的錯誤訊息。

### 練習三：安全的本地 serialization

使用 `Files.writeString` 將 Markdown 原稿寫入 UTF-8 檔案，再建立 JSON metadata 記錄 revision id、時間、相對路徑與 content hash。比較「可讀的 metadata + Markdown」與「ObjectOutputStream binary blob」在 restore、debug 與 migration 上的差異。

### 練習四：Java native serialization review

完成本篇 `LocalSetting` 的 byte array round trip 後，列出它不適合拿來做公開 API、玩家輸入與跨語言傳輸的理由。不要將不可信的網路資料交給 `ObjectInputStream`。

### 練習五：Minecraft loader review

選擇 Fabric 或 NeoForge 的一個 payload、config、NBT 或 codec 使用情境。先查明資料格式與 server thread contract，再畫出「raw data → parse → validate → domain object → game state」流程；程式碼中不可混入另一個 loader 的 class。

## 11. 複習速查

```text
Object model
    ↓ serialize
Data format
    ├─ JSON / text
    ├─ NBT / codec
    ├─ binary protocol
    └─ Markdown / backup
    ↓ transport or storage
HTTP / file / packet / database
    ↓ deserialize
parse → validate → normalize → domain conversion
```

| 名詞 | 一句話理解 |
|---|---|
| Serialization | 把 object／資料模型轉成可保存或傳送的 representation |
| Deserialization | 把 representation 解析回資料模型，之後仍要驗證 |
| JSON | 常見、可讀、跨語言的資料格式，不是 Java object 本身 |
| Object Serialization | Java-specific object graph binary mechanism，需特別注意信任與版本 |
| DTO | 專門位於資料邊界的資料模型，避免直接暴露 domain object |
| Schema | 描述欄位、型別、必填性、範圍與版本規則 |
| Codec | 在某種 object model 與資料格式間轉換的元件 |
| Migration | 將舊 schema 的資料轉成新 schema |
| Validation | 確認解析後的資料符合型別、範圍、權限與業務規則 |
| Source of truth | JavaBase 中 Markdown 原稿；index 與 cache 都是可重建資料 |

## References

[1]: https://docs.oracle.com/en/java/javase/11/docs/specs/serialization/index.html "Java Object Serialization Specification — Oracle"
[2]: https://www.rfc-editor.org/rfc/rfc8259 "The JavaScript Object Notation (JSON) Data Interchange Format — RFC 8259"
[3]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/io/ObjectOutputStream.html "ObjectOutputStream — Java SE 22 API"
[4]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/io/ObjectInputStream.html "ObjectInputStream — Java SE 22 API"
[5]: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/io/Serializable.html "Serializable — Java SE 22 API"
