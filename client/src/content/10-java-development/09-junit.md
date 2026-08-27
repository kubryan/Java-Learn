---
title: JUnit｜Java 測試
titleEn: JUnit
topic: Java Testing
terms: JUnit, @Test, Assertions, @BeforeEach, @AfterEach, @BeforeAll, @AfterAll, parameterized test, regression test, test fixture
slug: java-junit
category: Java 開發
order: 10
level: 入門到中階
tags: Java, JUnit, Testing, Test, Assertions, Regression Test, Maven, Gradle, Minecraft Java
aliases: JUnit 測試, Java 單元測試, regression test, test fixture
summary: 用 JUnit 建立可重複、可讀且快速的 Java 測試，涵蓋 @Test、Assertions、fixture lifecycle、parameterized test、exception test，以及 Minecraft registry、parser、command validation 與 utility 的 regression boundary。
---

# JUnit｜Java 測試

> **測試不是證明程式永遠正確，而是把一個可重複的行為契約固定下來。** 當你修復 Minecraft mod／plugin 的 bug，JUnit regression test 能防止同一個錯誤在下一次 refactor、mapping 更新或 dependency 升級後再次出現。

JUnit 是 Java 測試的 framework；Maven Surefire、Gradle test task 與 IDE test runner 負責發現並執行測試。JUnit 的 annotation、assertion 與 test engine 是 testing layer，不是 Minecraft event annotation，也不是 production runtime lifecycle。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| `@Test` | 為一個 public behaviour 寫出最小可讀測試 |
| Assertions | 使用 `assertEquals`、`assertTrue`、`assertFalse`、`assertThrows`、`assertAll` |
| Fixture | 使用 `@BeforeEach`／`@AfterEach`，避免測試互相依賴 |
| Naming | 從測試名稱看出 input、condition 與 expected result |
| Parameterized test | 用多筆資料測同一個規則，不複製大量測試 body |
| Regression | 先固定重現 bug，再修改 production code，最後保留測試 |
| Minecraft boundary | 優先測純 Java registry key、parser、codec mapping、command validation 與 service rule，不把整個 game runtime 都塞進 unit test |

## 1. 第一個 `@Test`

```java
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ResourceIdTest {
    @Test
    void normalizesNamespaceAndPath() {
        String result = normalize("Example Mod", "Calibration Stone");

        assertEquals("example_mod:calibration_stone", result);
    }

    private String normalize(String namespace, String path) {
        return namespace.trim().toLowerCase().replace(' ', '_')
                + ":"
                + path.trim().toLowerCase().replace(' ', '_');
    }
}
```

測試應該有單一清楚的 reason to fail。若一個測試同時建立 server、載入 resource、註冊 item、發送 network payload 並檢查 log，失敗時很難知道哪一層壞了。

## 2. 常用 Assertions

| Assertion | 用途 |
|---|---|
| `assertEquals(expected, actual)` | 比較 value |
| `assertNotEquals` | 確認不應相等 |
| `assertTrue`／`assertFalse` | boolean condition |
| `assertNull`／`assertNotNull` | nullability contract |
| `assertSame` | 檢查是否是同一個 object identity，不是 value equality |
| `assertThrows` | 檢查預期 exception type |
| `assertDoesNotThrow` | 檢查 input 不應拋錯，但不要濫用 |
| `assertAll` | 把同一 fixture 的多個獨立欄位一起檢查 |

```java
@Test
void invalidStrengthIsRejected() {
    IllegalArgumentException error = assertThrows(
            IllegalArgumentException.class,
            () -> calibrate(-1)
    );

    assertEquals("strength must be >= 0", error.getMessage());
}
```

`assertEquals` 要把 expected 放前面、actual 放後面。這樣失敗訊息的方向更一致；也不要用 `assertTrue(actual == expected)` 取代具體 assertion，因為失敗訊息會變得不清楚。

## 3. Test lifecycle 與 isolation

```java
class InventoryCalculatorTest {
    private InventoryCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new InventoryCalculator();
    }

    @AfterEach
    void tearDown() {
        calculator = null;
    }

    @Test
    void emptyInventoryHasZeroValue() {
        assertEquals(0, calculator.totalValue(List.of()));
    }
}
```

每個測試應能獨立執行，不能依賴測試檔案的執行順序、上一個測試留下的 static state、共享 mutable list、現存的 server world 或本機時間。`@BeforeAll`／`@AfterAll` 可以做昂貴的共用 setup／cleanup，但共享 state 越多，測試越容易互相污染。

## 4. Parameterized test

當多組 input 遵守同一規則時，可以使用 parameterized test：

```java
@ParameterizedTest
@CsvSource({
        "minecraft, stone, minecraft:stone",
        "Example Mod, Calibration Stone, example_mod:calibration_stone"
})
void normalizesManyResourceIds(String namespace, String path, String expected) {
    assertEquals(expected, normalize(namespace, path));
}
```

參數化測試應該仍然保持每一列容易讀懂。若一行塞了十個欄位，請改成 `@MethodSource` 和命名的 argument object；不要為了減少行數犧牲 failure diagnosis。

## 5. 測什麼，怎麼切 boundary

| Production code | 優先測試 |
|---|---|
| resource／registry ID parser | valid namespace、invalid character、空值、default namespace |
| `equals`／`hashCode` value object | reflexivity、equal objects、HashSet／HashMap lookup |
| command validation | permission、argument range、錯誤訊息、成功 branch |
| config parser | default、missing field、invalid type、version migration |
| serializer／codec adapter | round trip、unknown field、schema version、invalid input |
| collection helper | empty、duplicate、ordering、null contract |
| event handler | handler method 自己的 decision rule，不需先啟動整個 server |
| concurrency service | deterministic executor、timeout、cancellation、race-sensitive invariant |

測試一個純 Java rule 通常比測試整個 Minecraft runtime 更快、更穩、更容易定位。需要 loader、server、client 或 real mapping 的整合測試仍然有價值，但應明確標為 integration／game test，不要讓所有 `@Test` 都依賴遊戲啟動。

## 6. Minecraft regression test 範例

```java
@Test
void calibrationStoneUsesStableRegistryId() {
    Identifier id = ModItems.CALIBRATION_STONE_ID;

    assertEquals("calibration_stone", id.getPath());
    assertEquals("calibration", id.getNamespace());
}
```

實際 Fabric、NeoForge 或 Paper API 型別會依 loader 與 mappings 不同；上例的重點是「把穩定的 domain contract 抽出來測」，不是把一個平台的 import 直接貼到另一個平台。對 loader-specific registration，使用對應平台的 integration test 或 game test harness。

## 7. Maven／Gradle 執行測試

Maven：

```bash
mvn test
mvn verify
```

Gradle：

```bash
./gradlew test
./gradlew check
./gradlew build
```

Windows Gradle Wrapper：

```powershell
.\gradlew.bat test
.\gradlew.bat build
```

實際 test engine、Surefire、Gradle task 與 Minecraft plugin task 以專案設定為準。看到「沒有找到測試」時，先檢查 source set、檔名、test dependency、JUnit Platform、plugin 與 task，而不是先把 assertion 改成更寬鬆的條件。

## 8. 常見錯誤

| 錯誤 | 問題 | 改法 |
|---|---|---|
| 測試依賴順序 | 先跑的測試改變 static／global state | 每測試自行建立 fixture，清理外部 state |
| 測試只測 implementation detail | 小 refactor 就全紅，但 behaviour 沒變 | 測 public contract 與 observable result |
| assertion 太寬 | `assertTrue(result != null)` 遮住錯誤 value | 使用具體 expected value |
| 只測 happy path | invalid input、empty、duplicate 沒被保護 | 加上 boundary cases |
| 使用 real time／random | 偶發 flaky test | clock、random source、executor 注入 deterministic fake |
| 共享 Minecraft world | test 互相污染且啟動很慢 | 抽出純 Java rule，另做 integration／game test |
| catch 所有 exception | 讓測試「通過」但吞掉 bug | 預期用 `assertThrows`，非預期 exception 直接讓測試失敗 |
| 測試修改 production data | test 後 registry／config 被污染 | 使用 fixture、copy 或專用 test workspace |

## 9. Regression workflow

遇到 bug 時使用以下順序：

```text
stack trace／bug report
    ↓
最小重現 input
    ↓
先寫一個目前會失敗的 test
    ↓
修改 production code
    ↓
測試變綠
    ↓
跑完整 test／check／build
    ↓
用 Git commit 保存原因與修復
```

這個流程讓 JUnit、Debugging、Logging 與 Git 互相連起來。測試不是修復完成後才補的說明文件，而是把原本會失敗的行為固定成未來的 guardrail。

## 10. 練習

1. 為 `Identifier` parser 寫 valid、空 namespace、非法字元、空 path 與 whitespace 的 parameterized tests。
2. 為一個 `HashMap<BlockPos, Integer>` utility 寫 empty、duplicate 與 stable key tests，並連回 Object Contract handbook。
3. 為 command validation 寫 permission denied、invalid range、missing argument 與 success tests，不啟動完整 server。
4. 讓一個測試故意共享 mutable list，觀察測試順序如何造成 failure，再改成每個測試建立自己的 fixture。
5. 從一個真實 stack trace 找出 root cause，先寫 regression test，再提交最小修復。

## References

[1]: https://docs.junit.org/current/user-guide/ "JUnit User Guide"
[2]: https://docs.junit.org/current/api/org.junit.jupiter.api/org/junit/jupiter/api/Test.html "@Test — JUnit API"
[3]: https://docs.junit.org/current/api/org.junit.jupiter.api/org/junit/jupiter/api/Assertions.html "Assertions — JUnit API"
[4]: https://maven.apache.org/surefire/maven-surefire-plugin/ "Maven Surefire Plugin"
[5]: https://docs.gradle.org/current/userguide/java_testing.html "Testing in Java & JVM projects — Gradle"
