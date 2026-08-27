---
title: Packages、Import 與 Access Modifiers｜套件、匯入與存取修飾子
titleEn: Packages / Import / Access Modifiers
topic: Packages and Access Modifiers
terms: Package, Import, Static Import, Fully Qualified Name, Access Modifier, public, protected, private, package-private, Default Access, Visibility, Encapsulation, Classpath, Subpackage, Nested Class
slug: java-packages-access-modifiers
category: Java 基礎
order: 19
level: 入門到中階
tags: Java, Package, Import, Access Modifier, public, protected, private, package-private, Visibility, Encapsulation, Minecraft Java, Fabric, NeoForge, Paper
aliases: 套件, 匯入, 存取修飾子, 存取權限, package-private, default access, public protected private
summary: 從 package 與 import 開始，完整理解 public、protected、private、package-private 的可見範圍、protected 跨套件規則、classpath 錯誤與 Minecraft client／common／registry 專案分層。
---

# Packages、Import 與 Access Modifiers｜套件、匯入與存取修飾子

> **核心目標：** 看到 `com.example.mod.common`、`package`、`import` 或 `protected` 時，能判斷型別／method 為什麼可見、為什麼不能使用，以及問題究竟是命名、classpath、存取權限、loader side 還是 lifecycle。

大型 Java 專案不會把所有 class 放在同一個資料夾。它會使用 **Package｜套件** 組織名稱與責任，使用 **Import｜匯入** 讓 source code 可以用簡短名稱，使用 **Access Modifier｜存取修飾子** 控制哪些 class、field、constructor 與 method 可以被其他程式碼使用。

Oracle 將 Java access control 分成 top-level class 的 `public`／package-private，以及 member 的 `public`、`protected`、`private`／package-private。[1] 這些是 Java compiler 與 language rules；它們和 Fabric、NeoForge、Paper 的 loader side、entrypoint、mapping 與 runtime lifecycle 是不同層次，不能因為資料夾叫 `client` 就自動得到 client-only 語意。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| Package | 寫出正確的 `package` declaration，理解 fully qualified name 與 exact package |
| Import | 使用單一 type import、wildcard import、static import，並知道 import 不會賦予權限 |
| Access | 分辨 `public`、`protected`、`private`、package-private 的可見範圍 |
| Protected | 解釋同套件與跨套件 subclass 為什麼可以或不可以使用 protected member |
| Project layout | 將 `client`、`common`、`registry`、`entity`、`item`、`block`、`util` 分成可理解的 package |
| Error diagnosis | 分辨 `cannot find symbol`、package not found、access error、classpath 與 runtime class loading 問題 |
| Encapsulation | 優先使用最小必要的 API，避免用 public fields 洩漏 implementation |
| Minecraft | 分辨 Java package visibility 和 Fabric／NeoForge／Paper 的 side／entrypoint contract |

## 1. Package 是什麼？

### Package 是 fully qualified name 的一部分

```java
package com.example.mod.registry;

public final class ModBlocks {
    // fully qualified name:
    // com.example.mod.registry.ModBlocks
}
```

上例中的 package 是 `com.example.mod.registry`，class 的完整名稱是 `com.example.mod.registry.ModBlocks`。另一個 package 即使名字看起來很接近，也不是同一個 package：

```text
com.example.mod
com.example.mod.client
com.example.mod.common
```

這三個是三個不同的 exact package。`com.example.mod.client` 是名稱上的 subpackage，但不會自動取得 `com.example.mod` 的 package-private access。

### Package 宣告與資料夾結構

常見 Java 專案會讓資料夾路徑符合 package name：

```text
src/main/java/
└── com/example/mod/
    ├── ModInitializer.java
    ├── common/
    │   └── CalibrationService.java
    ├── client/
    │   └── CalibrationScreen.java
    ├── registry/
    │   └── ModBlocks.java
    ├── entity/
    │   └── CalibrationEntity.java
    ├── item/
    │   └── CalibrationItem.java
    ├── block/
    │   └── CalibrationBlock.java
    └── util/
        └── Ids.java
```

```java
// 檔案：src/main/java/com/example/mod/common/CalibrationService.java
package com.example.mod.common;
```

實務上，build tool、IDE、source set 與 classpath 會依賴這種一致結構。package declaration 才是 Java type identity 的關鍵；只把檔案拖到另一個資料夾而不更新 declaration，通常會造成 compile 或 classpath 問題。

### Package 的責任分層

| Package | 通常放什麼 | Minecraft 例子 |
|---|---|---|
| `common` | loader 共通的 domain、data、service | calibration rule、DTO、純計算 |
| `client` | client-only UI、render、input | screen、HUD、key binding |
| `registry` | 註冊入口與 id | block、item、entity type |
| `entity` | entity class、state、behavior | calibration entity |
| `item` | item class 與 item behavior | calibration item |
| `block` | block class、block entity、state | calibration block |
| `util` | 真正跨責任共用的小工具 | id parser、math、validation |

Package 命名應反映 dependency direction 與責任，不要把所有沒有歸類的 class 都丟進 `util`。`util` 不是「不想設計 API」的垃圾桶。

## 2. `import` 做什麼？

### Import 是名稱簡化，不是權限申請

```java
package com.example.mod.common;

import java.util.UUID;
import java.util.Objects;

public final class PlayerKey {
    private final UUID playerId;

    public PlayerKey(UUID playerId) {
        this.playerId = Objects.requireNonNull(playerId);
    }
}
```

沒有 import 時仍然可以使用 fully qualified name：

```java
private final java.util.UUID playerId;
```

因此 `import` 主要是讓 compiler 將 simple name 對應到另一個 package 的 type；它不會把 private、package-private 或 protected member 變成 public，也不是 runtime dependency loader。

```java
import com.example.mod.registry.ModBlocks;

ModBlocks.register();
```

如果 `ModBlocks` 或 `register()` 本身不可見，加上 import 仍然會 compile error。解決方法是檢查 declaration 的 access modifier、package、module／classpath 與 dependency，不是重複加 import。

### 單一 type import

```java
import java.util.HashMap;
import java.util.Map;
```

這是最清楚的寫法，讀者知道 simple name 來自哪裡。不同 package 出現同名 type 時可以使用 fully qualified name 或重新命名自己的 domain type：

```java
java.util.UUID javaId;
com.example.protocol.UUID protocolId; // 假設另一個 library 也有同名 type
```

### Wildcard import

```java
import java.util.*;
```

Wildcard import 只涵蓋該 package 的 types，不會遞迴包含 subpackages：

```text
import java.util.*;
  ├─ java.util.List       ✅
  ├─ java.util.Map        ✅
  └─ java.util.concurrent.Future  ❌ 不會自動包含
```

Wildcard import 也不會使 package-private type 變得可見。若有同名 type，explicit import、fully qualified name 或 compiler ambiguity 會決定你需要如何修正。

### Static import

`static import` 讓你直接使用另一個 class 的 static field 或 method：

```java
import static java.util.Objects.requireNonNull;

String dimension = requireNonNull(input.dimension());
```

它適合少量、語意非常清楚的 constants 或 assertion methods；大量 static import 會讓讀者難以判斷名稱的來源：

```java
// 不一定清楚 MAX_RANGE 從哪個 class 來
if (range > MAX_RANGE) {
    // ...
}
```

不確定來源時，保留 `Limits.MAX_RANGE` 或 `Objects.requireNonNull(...)` 通常更容易維護。static import 同樣不改變 access rules。

## 3. 四種 Access Modifier

Oracle 的 access table 可以先用下面的模型記憶：[1]

| Modifier | 宣告 class 本身 | 同一 exact package | 不同 package 的 subclass | 其他 world class |
|---|---:|---:|---:|---:|
| `public` | ✅ | ✅ | ✅ | ✅ |
| `protected` | ✅ | ✅ | ✅（受 subclass 存取形式限制） | ❌ |
| package-private（無 modifier） | ✅ | ✅ | ❌ | ❌ |
| `private` | ✅ | ❌ | ❌ | ❌ |

表格中的「world」是另一個不在同一 package、也不是合法 subclass access context 的 class。class 自己永遠可以存取自己的 members；真正容易卡住的是 package boundary、subclass boundary 與 nested class boundary。

### `public`

```java
package com.example.mod.api;

public final class CalibrationApi {
    public CalibrationResult inspect(CalibrationRequest request) {
        return inspectInternal(request);
    }

    private CalibrationResult inspectInternal(CalibrationRequest request) {
        // implementation detail
        return new CalibrationResult();
    }
}
```

`public` type 或 member 是對外 contract。公開 API 要考慮版本相容性、命名、nullability、thread safety、exception、loader side 與未來是否能修改 implementation。不要因為另一個 package 暫時需要一個 field，就把所有 fields 宣告成 public。

### `private`

```java
public final class CalibrationState {
    private int attempts;

    public void recordAttempt() {
        attempts++;
    }

    public int attempts() {
        return attempts;
    }
}
```

`private` member 只有 declaring class 可以直接存取。它是最常見的封裝起點，適合保護 invariant、避免外部隨意修改 state，並保留日後更換 representation 的空間。

### Package-private：省略 modifier

```java
package com.example.mod.registry;

final class RegistryValidator {
    static boolean valid(String id) {
        return id != null && !id.isBlank();
    }
}
```

上例的 class、method 與 constructor 都是 package-private，因為沒有寫 modifier。只有 `com.example.mod.registry` 這個 exact package 的其他 class 可以使用；`com.example.mod.registry.internal` 或 `com.example.mod.client` 都不算同一個 package。

Package-private 適合 package 內協作但不想成為 public API 的 helper、test seam、factory implementation 或 package invariant。它不是 `private` 的另一種拼法，也不是「整個 project 都能用」。

### `protected`

`protected` 有兩種主要 access path：

1. 同一 exact package 的任何 class 可以使用。
2. 不同 package 的合法 subclass 可以使用 inherited member，但受跨 package 的 protected access form 限制。[1]

```java
package com.example.mod.common;

public class BaseProcessor {
    protected void resetState() {
        // protected hook
    }
}
```

同一 package 可以直接使用：

```java
package com.example.mod.common;

final class SamePackageProcessor {
    void reset(BaseProcessor processor) {
        processor.resetState(); // ✅ 同一 exact package
    }
}
```

不同 package 的 subclass 可以透過自己繼承到的 context 使用：

```java
package com.example.mod.client;

import com.example.mod.common.BaseProcessor;

public final class ClientProcessor extends BaseProcessor {
    public void resetThisProcessor() {
        resetState(); // ✅ inherited protected member
        this.resetState(); // ✅ subclass instance
    }

    public void resetAnother(ClientProcessor processor) {
        processor.resetState(); // ✅ receiver 也是 subclass type
    }
}
```

但「我是 subclass」不等於「我可以在任何地方對任意 BaseProcessor instance 呼叫 protected member」：

```java
public final class ClientProcessor extends BaseProcessor {
    public void resetBase(BaseProcessor processor) {
        // processor.resetState();
        // ❌ 跨 package 時，不能把 protected 當成任意 public member 使用
    }
}
```

初學者最容易誤會的是：「protected = package-private + 全世界 subclass」。比較精確的說法是：它保留同 package access，並給 subclass 一條受規則限制的 inherited access path。若只是想讓不相關的 package 使用，就應考慮 `public` method；若只需要 class 內使用，就用 `private`。

## 4. Top-level class 與 nested class

### Top-level class

Top-level class 通常只能使用 `public` 或 package-private：

```java
public class PublicEntryPoint {
}

class PackageInternalHelper {
}
```

若 top-level class 是 `public`，source file 名稱通常必須與 class 名稱相同：

```text
PublicEntryPoint.java
└── public class PublicEntryPoint
```

Top-level class 不能宣告成 `private` 或 `protected`，因為它沒有 enclosing class 可以提供這種 member-level context。

### Nested class

nested class 是另一個 class 的 member，因此可以使用更多 modifier：

```java
public final class ModBlocks {
    private static final class RegistrationPlan {
        // 只有 ModBlocks 與 Java nested access rules 相關 context 使用
    }

    protected static class ExtensionHook {
        // 依 protected 規則可被 package／subclass 使用
    }
}
```

nested class 的 access 與 enclosing class 的 access 都要同時通過：即使 nested class 是 public，如果外層 class 是 package-private，其他 package 仍然無法透過它使用 nested type。

## 5. Package、Import 與 Access 的共同判斷流程

看到「這個 class 找不到」時，不要立刻亂改 package。先沿著以下流程排查：

```text
source 中的 simple name
    ↓
import 或 fully qualified name 是否正確？
    ↓
package declaration 是否正確？
    ↓
檔案是否在正確 source set／classpath？
    ↓
type 的 access modifier 是否允許？
    ↓
依賴的 build module／jar 是否存在？
    ↓
runtime 是否使用同一版本與 classloader？
```

### Compile-time 與 runtime 錯誤

| 錯誤訊息方向 | 常見層級 | 先檢查 |
|---|---|---|
| `cannot find symbol` | 名稱、import、package、source set | class／method 名稱、import、檔案位置 |
| `package ... does not exist` | compile classpath 或 package declaration | dependency、source root、package path |
| `is not public ... cannot be accessed` | type visibility | top-level class 是否 public |
| `has private access` | member visibility | 呼叫端是否應透過 public method 使用 |
| `has protected access` | package／subclass context | exact package、receiver type、繼承關係 |
| package-private 不可見 | package boundary | `com.example.mod` 與 `.client` 是否被誤當同包 |
| `ClassNotFoundException` | runtime 主動載入 class 失敗 | runtime dependency、classloader、side |
| `NoClassDefFoundError` | linkage 或之前初始化失敗 | 完整 `Caused by`、runtime classpath、`<clinit>` |
| `IllegalAccessError` | runtime linkage access mismatch | compile／runtime jar、版本、classloader |

`import` 只能改善 source name resolution；它無法修復錯誤的 source set、缺失的 dependency、錯誤的 package declaration 或 runtime classloader。

## 6. Minecraft 專案分層

### Package name 不等於 loader side

```text
com.example.mod.client
```

這個名稱可以表達設計意圖，但 Java compiler 不會因為名稱含有 `client` 就禁止 dedicated server 載入它。真正的 client／server separation 可能由 Fabric source set／entrypoint、NeoForge distribution／event setup、Paper server runtime 或 project build configuration 決定；不同平台的規則不能互換。

```text
Java package responsibility
    ≠
Fabric／NeoForge／Paper loader side contract
```

### 建議的依賴方向

```text
common domain／data／service
    ↑
registry／block／item／entity
    ↑
loader entrypoint

client rendering／screen／input
    └── 只由 client entrypoint／client source set 引入
```

`common` 不應直接 import client-only class；`client` 可以 import common contract，前提是該平台的 build／loader setup 允許。registry package 是否在 common、client 或 platform module，要由 loader lifecycle 與 registration API 決定，而不是單靠資料夾名稱。

### API boundary 範例

```java
// com.example.mod.common.CalibrationService
package com.example.mod.common;

public final class CalibrationService {
    public CalibrationResult inspect(CalibrationRequest request) {
        // 不依賴 client-only rendering class
        return new CalibrationResult();
    }
}
```

```java
// com.example.mod.client.CalibrationScreen
package com.example.mod.client;

import com.example.mod.common.CalibrationService;

public final class CalibrationScreen {
    private final CalibrationService service;

    public CalibrationScreen(CalibrationService service) {
        this.service = service;
    }
}
```

這個例子展示 package 與 import 的 Java 層次；實際 Fabric、NeoForge 或 Paper 的 entrypoint、screen、server task、registry 與 event API 必須使用該平台版本的正式 contract。

## 7. 如何選擇 Access Modifier

Oracle 建議使用「對該 member 合理的最嚴格 access level」，通常從 `private` 開始，並避免 public fields，除了確實是 constants 的情況。[1]

| 需求 | 優先考慮 | 原因 |
|---|---|---|
| 僅 class 內維持 invariant | `private` | 最小暴露面 |
| package 內協作，不想公開 | package-private | 建立 exact package boundary |
| 提供 subclass extension hook | `protected` | 明確表示可被繼承擴充，但要控制契約 |
| 對外穩定 API | `public` method／type | 讓 contract 清楚，避免 public mutable field |
| 常數 | `public static final`（必要時） | 只公開真正穩定且無狀態的值 |
| shared implementation | package-private class + public facade | 避免 implementation 成為對外依賴 |
| Minecraft client-only code | platform source set／entrypoint + 合理 access | package 名稱單獨不足以隔離 side |

```java
public final class ModIds {
    public static final String MOD_ID = "calibrationstone";

    private ModIds() {
        // utility class 不建立 instance
    }
}
```

`public static final` 不代表任何 public object 都深層 immutable。若 constant 指向可變 collection，仍需使用不可變 representation 或 defensive copy。

## 8. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 只加 import 就期待 private member 可用 | import 不改變 access rules | 檢查 API 是否應提供 public method |
| 以為 subpackage 會繼承 parent package access | package 是 exact name，不是資料夾階層權限 | 明確設計 package boundary |
| 把 protected 當成 public subclass API | 跨 package subclass access 受 receiver／context 限制 | 先理解 protected access form，必要時設計 public hook |
| 把 protected 當成「只有 subclass 可用」 | 同 package 的任何 class 也可用 | 檢查 exact package 與 encapsulation 風險 |
| 所有 class 都宣告 public | 擴大 API、增加 coupling、難以重構 | 從 private／package-private 開始 |
| 所有 field 都宣告 public | 外部可破壞 invariant | private field + method／immutable value |
| 把 `client` package 當作 client-only | Java package 名不會改變 loader side | 使用 loader source set／entrypoint／platform contract |
| common class import client-only class | dedicated server 可能在 class loading 失敗 | common／client source set 分離 |
| wildcard import 期待包含 subpackage | `*` 不會遞迴 import | explicit import 或正確 package import |
| static import 太多 | 名稱來源不清楚、容易 collision | 保留 class qualifier |
| 只移動檔案不更新 package declaration | type name、source root 與 path 不一致 | 同時更新 declaration、path、import、build source set |
| 用 package-private helper 卻從 test 的另一 package 呼叫 | test package 也必須是同一 exact package 才有權限 | 調整 test package 或提供測試 API |
| `ClassNotFoundException` 當成 import 錯誤 | import 只在 compile time | 查 runtime classpath、dependency、classloader |
| `NoClassDefFoundError` 只重加 import | 可能是 linkage 或 static initialization failure | 讀完整 cause、版本與 runtime dependency |
| 以 public field 取代 domain API | 外部能任意寫入無效狀態 | 提供 command、validation、immutable snapshot |
| package 依檔案類型亂分 | dependency direction 與責任不清 | 依 feature、layer、side 與 ownership 設計 |

## 9. 練習

### 練習一：建立 package tree

建立 `com.example.mod` 下的 `common`、`client`、`registry`、`entity`、`item`、`block` 與 `util` package。每個 package 放一個最小 class，為所有 source 寫正確 `package` declaration，再用 explicit import 從一個 package 使用另一個 package 的 public type。

### 練習二：四種 modifier 實驗

建立四個 member：public、protected、private、package-private。在同 package class、不同 package class、同 package subclass 與不同 package subclass 中分別嘗試使用。把每次 compile 結果記錄在表格，特別說明 protected 為什麼不是任意 cross-package access。

### 練習三：import 不是 permission

把一個 package-private class 加上 import，觀察 compiler error；再改用 fully qualified name，確認仍然不能越過 access boundary。最後將 class 改成 public，重新檢查 source path 與 file name。

### 練習四：Minecraft common／client 分層

建立一個不依賴 client API 的 `common.CalibrationService`，再建立 `client.CalibrationScreen` 依賴它。嘗試讓 common class import client class，觀察為什麼 package 命名本身不會阻止錯誤；最後用 Fabric、NeoForge 或 Paper 的正式 project／entrypoint 規則修正。

### 練習五：錯誤訊息分類

故意製造 `cannot find symbol`、`package does not exist`、`private access`、`protected access` 與 runtime `ClassNotFoundException`。對每一個錯誤標記它屬於 name、package、access、classpath、linkage 或 loader layer，並寫出最小修復。

## 10. 複習速查

```text
package
  → 定義 type 的 fully qualified name 與 package boundary

import
  → 簡化 source 中的 type／static member 名稱
  → 不增加權限、不取代 dependency、不代表 runtime load

access modifier
  public          → everywhere（class 可見前提下）
  protected       → same package + legal subclass context
  package-private → same exact package
  private         → declaring class

Minecraft
  package name
    ≠ loader side
  source set／entrypoint／platform contract
    → 真正的 client／server boundary
```

| 問題 | 第一個檢查點 |
|---|---|
| class 找不到 | package declaration、import、source set、classpath |
| method 不能用 | member modifier、receiver type、package、subclass context |
| subpackage 能否用 package-private？ | 不能；subpackages 是不同 exact packages |
| protected 為什麼這裡能用？ | 同 package，或目前 class 是合法 subclass access context |
| import 後仍然失敗 | import 不改 access，也不補 dependency |
| client class 為什麼 server 崩潰？ | package 名稱不負責 side isolation；檢查 source set／entrypoint／loader |
| 什麼 modifier 最安全？ | 先 `private`，再依穩定 contract 開放 package-private／protected／public |
| public class 為什麼檔名有要求？ | top-level public class 通常需與 source file 名稱一致 |

**最後記住：** `package` 解決「這個 type 屬於哪個命名與責任範圍」，`import` 解決「source 怎麼簡短引用它」，access modifier 解決「誰有權限使用它」。Minecraft 的 `client`、`common`、`registry` 分層還要再加上 loader、source set、entrypoint 與 lifecycle 規則；不要用 Java package 名稱單獨取代平台安全邊界。

## References

[1]: https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html "Controlling Access to Members of a Class — Oracle Java Tutorials"
[2]: https://dev.java/learn/packages/ "Packages — Dev.java"
[3]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-6.html "Names — Java Language Specification"
[4]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html "Packages and Modules — Java Language Specification"
