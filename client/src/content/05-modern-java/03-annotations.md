---
title: S 級 Annotation：註解、Retention、Target 與 Reflection
slug: java-annotations
category: Java 現代語法
order: 73
level: 中階到進階
tags: S 級, Annotation, 註解, Built-in Annotation, Custom Annotation, Retention, RetentionPolicy, Target, ElementType, Runtime Annotation, Reflection, Override, Inject, ModifyArg, Redirect, Overwrite, Mixin, Environment, Nullable, Spring, Lombok, JUnit, Minecraft Java
aliases: Annotation, 註解, Java Annotation, Built-in Annotation, Custom Annotation, Retention, Target, Runtime Annotation, Reflection, ModifyArg, Redirect, Overwrite
summary: Fabric、NeoForge、Spring、Lombok 與 JUnit 都會遇到的 Annotation S 級章節，完整拆解內建註解、自訂註解、Retention、Target、runtime processing 與 Reflection。 ⭐⭐⭐
---

# S 級 Annotation：註解、Retention、Target 與 Reflection

> **Annotation 是寫給 compiler、工具或 runtime framework 讀的 metadata。** `@Override` 可以讓 compiler 檢查你的意圖；`@Inject` 與 `@Mixin` 可以讓 Mixin 工具處理 bytecode；`@Test` 讓 JUnit 找到測試；Spring、Lombok、Fabric 與 NeoForge 則各自定義自己的 annotation contract。[1]

Annotation 本身不會自動產生行為。真正執行行為的是 compiler、annotation processor、bytecode transformer、測試 runner、dependency injection container 或 Reflection code。看到一個 `@Something` 時，第一個問題不應該是「它是不是魔法」，而應該是：「誰定義它、何時讀它、讀到後做什麼？」

## 本章目標

完成這篇後，你應該能夠：

1. 分辨 Built-in Annotation、framework annotation、annotation processor 與 runtime annotation。
2. 寫出 Custom Annotation，並用 `@Retention` 與 `@Target` 限制它。
3. 理解 `SOURCE`、`CLASS` 與 `RUNTIME` 三種 retention policy。
4. 使用 Reflection 讀取 class、method、field 上的 runtime annotation。
5. 分辨 annotation 的 declaration target 與 type-use target。
6. 正確閱讀 `@Override`、`@Inject`、`@ModifyArg`、`@Redirect`、`@Overwrite`、`@Mixin`、`@Environment` 與 `@Nullable`。
7. 理解 Fabric、NeoForge、Spring、Lombok 與 JUnit 的 annotation 行為不能直接混用。

## 1. Annotation 是 metadata，不是自動行為

最小的 annotation 使用方式如下：

```java
@Override
public String toString() {
    return "CalibrationStone";
}
```

`@Override` 表達「這個 method 是刻意覆寫 superclass 或 interface 的 method」。它主要提供 compiler 檢查；如果 method signature 寫錯，compiler 會報錯，而不是讓錯誤悄悄留在程式裡。[1]

Annotation 可以套用在 class、method、field、constructor、parameter 或 type use 上。Java SE 8 起也支援 type annotations，例如在泛型型別或 cast 上標註；實際能放在哪裡，由 annotation 自己的 `@Target` 決定。[1]

```java
@Deprecated
public void oldCalibrationPath() {
    // compiler 會對呼叫端產生 deprecated warning
}
```

`@Deprecated`、`@Override` 與 `@SuppressWarnings` 是 Java 語言與 Java SE 提供的 built-in annotation；它們的主要使用者是 compiler 與工具，不等於所有 annotation 都會在 runtime 存在。[1]

## 2. Built-in Annotation｜內建註解 ⭐⭐⭐

Java 平台提供的常見 annotation 可以先用用途分類：

| Annotation | 主要讀取者 | 典型用途 |
|---|---|---|
| `@Override` | Java compiler | 檢查 method 是否真的覆寫父型別成員 |
| `@Deprecated` | compiler、IDE、文件工具 | 標示 API 不建議再使用 |
| `@SuppressWarnings` | compiler | 抑制指定類型的 warning，應縮小範圍使用 |
| `@SafeVarargs` | compiler | 宣告 varargs generic method 已由作者處理 unchecked risk |
| `@FunctionalInterface` | compiler | 確認 interface 只有一個 abstract method contract |
| `@Retention` | compiler／JVM 規則 | 定義 annotation 保存到哪個階段 |
| `@Target` | compiler | 限制 annotation 可以套用的元素 |
| `@Documented` | Javadoc | 讓 annotation 出現在產生的 API 文件 |
| `@Inherited` | Reflection | 讓 class-level annotation 可由 subclass 查到 |
| `@Repeatable` | compiler／Reflection | 允許同一 annotation 重複套用 |

這些 annotation 的名字相似，但處理階段不同。`@Override` 主要在編譯時提供檢查；`@Retention` 是用來描述另一個 annotation 的 meta-annotation；`@Inherited` 則只有在 Reflection 查 class annotation 時才會影響繼承查詢。[1] [2]

### `@Override` 不是 runtime hook

```java
@Override
public void tick(ServerContext context) {
    // compiler 確認 tick() 真的是 override
}
```

不要把 `@Override` 想成 event handler。它不會註冊 callback、不會啟動 thread，也不會在 server 啟動時自動找到這個 method；它主要是讓 compiler 驗證你的 override 意圖。

### `@Deprecated` 與 `@SuppressWarnings`

`@Deprecated` 應搭配 migration 說明，而不是只把 warning 壓掉：

```java
@Deprecated(since = "2.0", forRemoval = true)
public void oldApi() { }
```

`@SuppressWarnings` 應盡可能靠近真正需要抑制的 statement、method 或 local scope：

```java
@SuppressWarnings("unchecked")
private static <T> T unsafeRead(Object value) {
    return (T) value;
}
```

把 `@SuppressWarnings("all")` 貼在整個 class 上，會讓真正有價值的 compiler warning 一起消失，通常不是好做法。

## 3. Custom Annotation｜自訂註解 ⭐⭐⭐

Custom annotation 使用 `@interface` 宣告。它看起來像 interface，但 annotation type 的 elements 具有自己的限制；element 可以是 primitive、String、Class、enum、annotation 或上述型別的 array，不能直接使用任意 object 或 collection。

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface ModFeature {
    String id();
    String owner() default "unknown";
    FeatureStage stage() default FeatureStage.EXPERIMENTAL;
}

public enum FeatureStage {
    EXPERIMENTAL,
    STABLE
}
```

使用 custom annotation：

```java
@ModFeature(
    id = "calibration_stone",
    owner = "javabase",
    stage = FeatureStage.STABLE
)
public final class CalibrationStoneFeature {
}
```

annotation element 像 method declaration，但使用時提供的是 metadata value：

```java
public @interface Route {
    String value();
    String method() default "GET";
}

@Route(value = "/calibration", method = "POST")
public void createCalibration() { }
```

如果只有一個名為 `value` 的 element，可以省略 element name；如果沒有 element，連括號也可以省略：

```java
@Marker
public final class Example { }

@Route("/health")
public void health() { }
```

### Annotation 沒有自動行為

下面的 `@ModFeature` 不會自動建立 registry entry，也不會自動修改 class：

```java
@ModFeature(id = "stone")
final class StoneFeature { }
```

必須有另一個 consumer 讀取它：

```java
for (Class<?> type : discoveredTypes) {
    ModFeature feature = type.getAnnotation(ModFeature.class);
    if (feature != null) {
        register(feature.id(), type);
    }
}
```

這個 consumer 可以是 Reflection scanner、annotation processor、Spring container、JUnit engine、Mixin transformer 或其他 build tool。沒有 consumer 的 annotation 只是 metadata，不會自己產生功能。

## 4. `@Retention` 與 RetentionPolicy ⭐⭐⭐

`@Retention` 決定 annotation 被保存到哪個階段。如果 annotation type 沒有寫 `@Retention`，Java 預設是 `RetentionPolicy.CLASS`。[3]

| Policy | 保留位置 | Runtime Reflection 能讀到嗎？ | 適合用途 |
|---|---|---:|---|
| `SOURCE` | 只存在 source code | 否 | compiler hint、source generator、Lombok 類工具 |
| `CLASS` | 寫進 `.class` | 通常不供 runtime reflection 讀取 | bytecode／class-file 工具或預設保存 |
| `RUNTIME` | `.class` 並由 JVM 保留 | 是 | Reflection、DI、測試 runner、runtime framework |

### `SOURCE`

`SOURCE` annotation 在 compile 後通常不會留給 JVM：

```java
@Retention(RetentionPolicy.SOURCE)
@Target(ElementType.METHOD)
public @interface GenerateLog { }
```

它適合在 compiler 或 annotation processor 階段處理。若你想在 `Class.getAnnotation(...)` 讀到它，`SOURCE` 會失敗。

### `CLASS`

`CLASS` 是沒有明確 `@Retention` 時的預設 policy。annotation 會被 compiler 保留在 class file，但 Java runtime 不保證 Reflection 能讀到它。bytecode scanner、class-file transformer 或其他 build-time tool 仍可能直接解析 class file。

### `RUNTIME`

需要由 Reflection、DI container 或測試 runner 在程式執行時讀取時，必須使用 `RUNTIME`：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Benchmark {
    int warmupRounds() default 3;
}
```

如果你在 runtime 查不到 annotation，第一個檢查點就是 retention policy；第二個檢查點是 `@Target` 是否真的套用在你查詢的 element 上；第三個檢查點是你查詢的 class／method 是否為實際 runtime type。

## 5. `@Target` 與 ElementType ⭐⭐⭐

`@Target` 限制 annotation 可以套用到哪些 Java element。若沒有寫 `@Target`，annotation 可以作為任何 declaration 的 modifier；如果有寫，compiler 會強制檢查指定的 `ElementType`。[4]

```java
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.PARAMETER})
public @interface Audited {
    String value();
}
```

常見 `ElementType` 如下：

| ElementType | 可套用位置 |
|---|---|
| `TYPE` | class、abstract class、interface、annotation、enum、record |
| `FIELD` | field 或 property |
| `METHOD` | method |
| `CONSTRUCTOR` | constructor |
| `PARAMETER` | method／constructor parameter |
| `LOCAL_VARIABLE` | local variable |
| `ANNOTATION_TYPE` | 另一個 annotation type |
| `PACKAGE` | package declaration |
| `MODULE` | module declaration |
| `TYPE_PARAMETER` | generic type parameter，例如 `<T>` |
| `TYPE_USE` | type 被使用的地方，例如 cast、泛型參數、implements |
| `RECORD_COMPONENT` | record component |

### Declaration annotation 與 Type annotation

這兩段的目標不同：

```java
@Audited("method")
public void save() { }

List<@NonNull String> names;
```

第一個 annotation 標註 method declaration；第二個是 type-use annotation，標註 `String` 這個型別使用。不要只看 `@` 的位置；要看 annotation type 的 `@Target` 是否包含 `METHOD`、`FIELD`、`TYPE_USE` 或其他 element。

## 6. Runtime Annotation 與 Reflection ⭐⭐⭐

Reflection API 中，`Class`、`Field`、`Method` 與 `Constructor` 都能透過 `AnnotatedElement` 相關方法查詢 annotation。[2]

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface ModFeature {
    String id();
}

@ModFeature(id = "calibration_stone")
public final class CalibrationStoneFeature { }
```

讀取 class annotation：

```java
Class<CalibrationStoneFeature> type = CalibrationStoneFeature.class;

if (type.isAnnotationPresent(ModFeature.class)) {
    ModFeature feature = type.getAnnotation(ModFeature.class);
    System.out.println(feature.id());
}
```

讀取 method annotation：

```java
Method method = CalibrationStoneFeature.class
    .getDeclaredMethod("calibrate", CalibrationContext.class);

Benchmark benchmark = method.getAnnotation(Benchmark.class);
if (benchmark != null) {
    runBenchmark(benchmark.warmupRounds());
}
```

### `getAnnotation` 與 `getDeclaredAnnotation`

| 方法 | 查詢範圍 |
|---|---|
| `getAnnotation(A.class)` | 查詢指定 annotation，class 情境可能包含 `@Inherited` 的父 class annotation |
| `getDeclaredAnnotation(A.class)` | 只查目前 class／method／field 自己直接宣告的 annotation |
| `getAnnotations()` | 取得可見的 annotation 陣列，class 情境可能包含 inherited annotation |
| `getDeclaredAnnotations()` | 只取得目前 element 直接宣告的 annotation |
| `isAnnotationPresent(A.class)` | 判斷指定 annotation 是否可見 |
| `getAnnotationsByType(A.class)` | 讀取包含 repeatable annotation 的所有 instances |

`@Inherited` 只影響 class declaration 的 annotation，不會讓 method、field 或 interface implementation 自動繼承 annotation。要查 method annotation 時，通常需要自行沿著 superclass 或 interface hierarchy 查詢。

### Reflection 的成本與邊界

Reflection 適合做 framework discovery、啟動掃描、測試 runner 與工具整合；不應在 Minecraft 每個 tick 對大量 entity 反覆掃描 annotation。常見做法是在啟動或載入階段掃描一次，將結果轉成一般的 typed registry、Map 或 callback，遊戲迴圈只使用已建立的資料。

## 7. Repeating Annotation 與 `@Repeatable`

如果同一個 annotation 需要在同一個 declaration 上套用多次，可以用 `@Repeatable` 指定 container annotation：[1]

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Repeatable(Routes.class)
public @interface Route {
    String method();
    String path();
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Routes {
    Route[] value();
}

@Route(method = "GET", path = "/tools")
@Route(method = "POST", path = "/tools")
public void tools() { }
```

讀取 repeating annotation 時，優先使用 `getAnnotationsByType(Route.class)`，不要只讀 container 而漏掉直接套用與 compiler 展開的差異。

## 8. `@Override`、`@Inject`、`@Mixin`、`@Environment`、`@Nullable` 的分層

你之後看到的 annotation 不一定屬於 Java SE。先確認 package 與 consumer：

| Annotation | 所屬層級 | 主要作用 |
|---|---|---|
| `@Override` | Java compiler | 檢查 override 意圖 |
| `@Inject` | Sponge Mixin／Fabric mod toolchain | 描述要注入 method 的位置與 callback |
| `@ModifyArg` | Sponge Mixin／Fabric mod toolchain | 修改 target method 中某次 invocation 的 argument |
| `@Redirect` | Sponge Mixin／Fabric mod toolchain | 將指定 method／field invocation 導向 mixin handler |
| `@Overwrite` | Sponge Mixin／Fabric mod toolchain | 直接取代 target method implementation，侵入性較高 |
| `@Mixin` | Sponge Mixin／Fabric mod toolchain | 指定要修改或擴充的 target class |
| `@Environment` | Fabric API／loader | 標示 client 或 server environment 的使用邊界 |
| `@Nullable` | 外部 nullness／IDE／static-analysis library | 表達可能為 null；實際 runtime 行為依 provider |
| `@Mod` | NeoForge | 標示 mod entrypoint class，實際處理者是 NeoForge loader |
| `@SubscribeEvent` | NeoForge | 提供給 NeoForge event bus 的 handler discovery |
| `@Component`／`@Bean` | Spring | 提供給 Spring container 的 component／bean discovery |
| `@Getter`／`@Builder` | Lombok | 由 annotation processor 產生 Java source-level members |
| `@Test` | JUnit | 由 JUnit engine discovery 與執行測試 method |

名稱相似不代表 package、retention 或處理工具相同。`@Nullable` 特別需要先查 import；JetBrains、JSpecify、Checker Framework、AndroidX 等 provider 可能有不同 annotation 與 nullness model。

## 9. Fabric：`@Mixin` 與 `@Inject` ⭐⭐⭐

Fabric mod 常會使用 Sponge Mixin annotations 描述 bytecode transformation。典型結構如下：

```java
@Mixin(ServerPlayer.class)
public abstract class ServerPlayerMixin {
    @Inject(method = "tick", at = @At("HEAD"))
    private void onTick(CallbackInfo callbackInfo) {
        // injected callback
    }
}
```

這裡有幾層不同的 annotation：

1. `@Mixin(ServerPlayer.class)` 指定 transformation target。
2. `@Inject(...)` 描述要注入的 method 與位置。
3. `@At("HEAD")` 描述 injection point。
4. `@Override` 若出現，仍然只是 Java compiler contract，不是 Mixin injection。

`@Inject` 的語意由 Mixin transformer 在 class processing 階段處理，不是 Java Reflection 自動執行。實際 method name、descriptor、mapping 與 callback signature 必須以目前 Minecraft／Fabric 版本的 source 與 mappings 為準；不要從另一個版本直接複製。

### `@ModifyArg`、`@Redirect` 與 `@Overwrite`

這些 annotation 都是 Mixin transformer metadata，不是 Java built-in，也不是普通的 runtime event registration。選擇時先問：「我需要增加 callback、改一個 invocation argument、改一個 invocation，還是完全取代 method？」

| Annotation | 介入方式 | 風險與適用情境 |
|---|---|---|
| `@Inject` | 在 target method 的 injection point 增加 callback | 通常最可組合；要正確處理 `@At`、callback signature 與 cancellable 規則 |
| `@ModifyArg` | 修改某次 method invocation 傳入的 argument | 影響範圍較窄，但必須精準指定 target invocation 與 argument index |
| `@Redirect` | 取代指定的 method call、field get 或 field set | 行為改變較直接；target descriptor 與 mapping 變動時容易失效 |
| `@Overwrite` | 直接提供 target method 的替代實作 | 最侵入、較難與其他 mod 組合；只有在其他 injector 不足時才考慮 |

概念範例如下；實際 class、method、descriptor 與 callback signature 必須依目前 Minecraft／Fabric mappings 驗證：

```java
@Mixin(CalibrationTarget.class)
public abstract class CalibrationTargetMixin {
    @ModifyArg(
        method = "buildMessage",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/text/Text;literal(Ljava/lang/String;)Lnet/minecraft/text/Text;"
        ),
        index = 0
    )
    private String addPrefix(String original) {
        return "[Calibration] " + original;
    }

    @Redirect(
        method = "tick",
        at = @At(
            value = "INVOKE",
            target = "Lcom/example/CalibrationTarget;isEnabled()Z"
        )
    )
    private boolean redirectEnabled(CalibrationTarget target) {
        return target.isEnabled() && !target.isSuspended();
    }

    // @Overwrite 應最後才使用，並且要有清楚的版本與衝突風險說明。
}
```

`@Overwrite` 不是「比較短的 `@Inject`」。它會取代原本 method body，因此可能覆蓋 vanilla、loader 或其他 mod 的修改；在可行時，優先使用較窄的 `@Inject`、`@ModifyArg` 或 `@Redirect`。所有 Mixin injector 都要測試 target method 是否存在、啟動時 mapping 是否正確，以及不同 loader／Minecraft 版本是否仍相容。

`@Environment(EnvType.CLIENT)` 則是 loader／API 層級的 environment metadata。client-only class、renderer 或 client initializer 不能因為加了 annotation 就安全地在 dedicated server 載入；side separation 仍然要從 entrypoint、source set、class loading 與依賴設計一起處理。

## 10. NeoForge：Loader Annotation 與 Event Discovery ⭐⭐⭐

NeoForge 的 `@Mod`、event bus annotation 與其他 loader metadata 都由 NeoForge toolchain 讀取。它們不是 Java built-in，也不能套用 Fabric 的 Mixin 或 `@Environment` 語意。

```java
@Mod(CalibrationMod.MOD_ID)
public final class CalibrationMod {
    public static final String MOD_ID = "calibration";
}
```

如果使用 NeoForge 的 annotation-based event registration：

```java
public final class CommonEvents {
    @SubscribeEvent
    public static void onServerStarting(ServerStartingEvent event) {
        // NeoForge event bus 會依自己的規則發現這個 handler
    }
}
```

這裡要分清楚三件事：Java compiler 只負責解析合法 annotation 語法；NeoForge loader／event bus 負責讀取與註冊；實際 event type、bus、static／instance handler 規則要依 26.2 MDK 與官方文件確認。不要把 `@SubscribeEvent` 當成 Paper 的 `@EventHandler`，也不要把 Fabric 的 `EVENT.register()` 改名後直接使用。

## 11. Spring、Lombok 與 JUnit 的 Annotation 對照

### Spring：Runtime／container processing

Spring 常用 annotation 讓 container 建立 component、bean、dependency 或 transaction metadata：

```java
@Component
public final class CalibrationService {
    private final CalibrationRepository repository;

    public CalibrationService(CalibrationRepository repository) {
        this.repository = repository;
    }
}
```

`@Component` 不是 Java compiler 的 built-in；Spring component scanner 或 configuration processing 會讀取它。使用 constructor injection 時，應理解 dependency 是由 Spring container 提供，而不是 annotation 本身呼叫 constructor。

### Lombok：Compile-time code generation

```java
@Getter
@Builder
public final class CalibrationConfig {
    private final int range;
    private final boolean enabled;
}
```

Lombok annotation 通常由 annotation processor 在編譯階段產生 getter、builder 或 constructor 等 members。這和 runtime Reflection 不同：你在 source 看到的 method 可能是 Lombok 產生的，必須使用 IDE 的 generated view、delombok 或編譯器輸出理解實際 API。

### JUnit：Test engine discovery

```java
@Test
void calibrationUsesTheConfiguredRange() {
    // JUnit engine discovers and runs this method
}
```

`@Test` 的 consumer 是 JUnit platform／engine，不是 Java compiler。compiler 只檢查 method 語法與型別；測試 runner 會在執行測試時掃描並呼叫符合規則的方法。

## 12. 如何閱讀陌生 Annotation

看到陌生 annotation 時，依照以下順序查，不要先猜：

| 步驟 | 問題 |
|---|---|
| 1 | import 來自哪個 package？Java SE、loader、framework、IDE library 還是 annotation processor？ |
| 2 | annotation declaration 的 `@Retention` 是什麼？ |
| 3 | `@Target` 允許放在 class、method、field、parameter 還是 type use？ |
| 4 | consumer 是 compiler、annotation processor、bytecode transformer、Reflection 還是 framework container？ |
| 5 | element value 的 method／descriptor／class name 是否依版本或 mapping？ |
| 6 | annotation 只是 metadata，還是會改變 lifecycle、註冊 event、產生 code 或修改 bytecode？ |
| 7 | 如果是 client／server、Spring bean 或測試，載入與執行的 boundary 是什麼？ |

例如遇到：

```java
@Inject(method = "tick", at = @At("HEAD"))
```

不要只記成「在 tick 前執行」。你應該繼續確認 `@Inject` 的 import、Mixin environment、target method descriptor、mapping version、callback method signature 與 cancellation／cancellable 規則。

## 13. 自訂 Annotation 的設計原則

好的 custom annotation 應該有明確的 consumer 與生命週期。設計前先回答：它是給 compiler、annotation processor、build tool、runtime Reflection 還是 framework scanner？只有 runtime 會讀時才選 `RUNTIME`；只需 source checker 時不要無理由保留到 runtime。

同時應限制 `@Target`，避免 annotation 被套用到毫無意義的元素；element 應提供合理 default，避免每次使用都填寫重複 metadata；stable identifier 與 user-facing label 也應分開，不能拿可變 display text 當 framework key。

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Documented
public @interface GameCommand {
    String value();
    PermissionLevel permission() default PermissionLevel.PLAYER;
}
```

如果 annotation value 需要表達複雜可變設定，annotation 可能已經不是合適的資料模型；可以考慮 config、registry 或一般 class。

## 常見錯誤

1. 把所有 `@Something` 都當成 Java built-in，沒有先查看 import。
2. 以為 annotation 自己會產生行為，卻沒有找到 compiler、processor、transformer、runner 或 framework consumer。
3. 用 Reflection 讀 `SOURCE` 或 `CLASS` annotation，然後誤以為 `getAnnotation()` 壞了。
4. 沒有限制 `@Target`，導致 custom annotation 被錯誤套用到 field、method 或 type use。
5. 把 `@Override` 當成 event registration，把 `@Nullable` 當成 runtime null check。
6. 把 Fabric 的 `@Inject`／`@Mixin` 與 NeoForge 的 event annotation 或 Paper 的 handler annotation 混用。
7. 把 Lombok 產生的 compile-time code 與 Reflection runtime annotation 混為一談。
8. 在 Minecraft tick loop 每次使用 Reflection 掃描 annotation，造成不必要成本。
9. 只修改 annotation 名稱或 element，卻沒有同步 consumer、mapping、processor 或測試。
10. 用 `@SuppressWarnings("all")` 掩蓋整個 class 的真正問題。

## S 級練習

請完成 `AnnotationPractice.java`：

1. 建立 `@GameCommand` custom annotation，限制只能套用在 method，並使用 `RUNTIME` retention。
2. 建立 `PermissionLevel` enum element，加入 default value。
3. 用 Reflection 掃描 class 的 methods，找出所有 `@GameCommand` 並輸出 command id。
4. 比較 `getAnnotation()` 與 `getDeclaredAnnotation()` 在 superclass annotation 上的差異。
5. 建立一個 `SOURCE` annotation 與一個 `RUNTIME` annotation，實際驗證只有後者能由 Reflection 讀到。
6. 建立 `@Repeatable` 的 `@Route`，使用 `getAnnotationsByType()` 讀取多個 route。
7. 解釋 Fabric `@Inject`、NeoForge `@SubscribeEvent`、Spring `@Component`、Lombok `@Getter` 與 JUnit `@Test` 的 consumer 分別是誰。
8. 對一個 Minecraft callback 寫出 package、retention、target、處理階段與 side boundary 的查證表。

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface GameCommand {
    String value();
}

final class CommandHandlers {
    @GameCommand("calibrate")
    public void calibrate() { }
}
```

如果你能回答「這個 annotation 誰讀、何時讀、讀到後改變什麼、是否會留到 runtime、能放在哪裡」，就已經從只會看 `@` 符號進步到能讀懂大型 Java framework 與 Minecraft loader 程式碼。

## 複習速查

- Annotation 是 metadata；行為來自 compiler、processor、transformer、runner、container 或 Reflection consumer。
- Built-in annotation 不等於所有 annotation；`@Inject`、`@Mixin`、`@Environment`、`@Nullable`、`@Mod`、`@Test` 都要看 import。
- Custom annotation 使用 `@interface` 宣告；element 只能使用 Java 規定的 annotation value 型別。
- `@Retention(SOURCE)` 只給 source／compile 階段；`CLASS` 保留在 class file；`RUNTIME` 才能正常供 Reflection 使用。
- `@Target` 限制套用位置；`TYPE_USE` 與 class／method declaration target 不同。
- Reflection 透過 `AnnotatedElement` 讀取 class、method、field、constructor 的 runtime annotation。
- Fabric、NeoForge、Spring、Lombok、JUnit 都使用 annotation，但它們的 consumer、生命週期與處理方式不同。
- Minecraft 中看到 `@Inject` 或 `@Mixin` 時，還要查 target method、descriptor、mapping、side 與版本。

## References

[1]: https://dev.java/learn/annotations/ "Annotations — Dev.java"
[2]: https://dev.java/learn/reflection/annotations/ "Reading Annotations — Dev.java"
[3]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/annotation/Retention.html "Retention — Java SE 25 API"
[4]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/annotation/Target.html "Target — Java SE 25 API"
[5]: https://docs.fabricmc.net/develop/events "Events 26.2 — Fabric Developer Documentation"
[6]: https://docs.neoforged.net/docs/1.21.11/concepts/events "Events — NeoForge Documentation"
[7]: https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html "Classpath Scanning and Managed Components — Spring Framework"
[8]: https://projectlombok.org/features/ "Lombok Features"
[9]: https://docs.junit.org/current/user-guide/ "JUnit User Guide"
