---
title: Java 專案工具｜Maven、Gradle 與 Minecraft Build
titleEn: Java Project Tools
topic: Java Project Tools
terms: Maven, pom.xml, Dependency, Repository, Lifecycle, Plugin, Scope, Gradle, build.gradle, settings.gradle, Task, Gradle Wrapper, Fabric Loom, NeoForge Gradle, Paper
slug: java-project-tools
category: Java 開發
order: 9
level: 入門到中階
tags: Java, Maven, Gradle, pom.xml, build.gradle, settings.gradle, Dependency, Repository, Plugin, Task, Wrapper, Fabric Loom, NeoForge, Paper, Minecraft Java
aliases: Java 專案工具, Java Build Tools, Maven, Gradle, Gradle Wrapper, build.gradle, pom.xml
summary: 以實際 JavaBase 專案為背景，解釋 Maven 的 pom.xml、dependency、repository、lifecycle、plugin、scope，以及 Gradle 的 build.gradle、settings.gradle、task、plugin、repository、dependency 與 Wrapper，並比較 Fabric Loom、NeoForge Gradle 與 Paper 的 build 邊界。
---

# Java 專案工具｜Maven、Gradle 與 Minecraft Build

> **核心目標：** 看到 `pom.xml` 或 `build.gradle` 時，能知道它們在描述什麼、dependency 從哪裡來、task 如何被執行、Wrapper 為什麼重要，以及 Fabric、NeoForge、Paper 的 build 設定為什麼不能直接互換。

Java 程式不是只有 `.java` 檔案。實際專案還需要編譯器版本、dependencies、source sets、測試、資源處理、打包、執行環境、plugin 與 CI command。**Maven** 與 **Gradle** 是 build automation／dependency management 工具；它們不是 Java 語言，也不是 runtime。

JavaBase 目前同時存在不同類型的專案：前端使用 pnpm／Vite，`exercises/backend-learning-api` 使用 Maven／Spring Boot，`minecraft/fabric-mod` 與 `minecraft/neoforge-mod` 使用 Gradle。這正是你會遇到 build.gradle、pom.xml、Gradle Wrapper 與 loader-specific plugin 的原因。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| 讀懂 Maven | 知道 `pom.xml`、coordinates、dependency、repository、lifecycle、plugin 與 scope 的責任 |
| 讀懂 Gradle | 知道 `settings.gradle`、`build.gradle`、project、task、plugin、dependency configuration 與 repository 的責任 |
| 使用 Wrapper | 透過 `./gradlew`／`gradlew.bat` 使用專案指定的 Gradle 版本 |
| 查 build 問題 | 分辨 source code、dependency、plugin、JDK、mapping、task graph 與 runtime error |
| 理解 Minecraft | 分辨 Fabric Loom、NeoForge ModDev／Gradle 與 Paper build ecosystem，不混用平台設定 |
| 維護 CI | 讓本機、CI 與其他開發者使用可重現的 JDK、Wrapper、dependency lock 與 command |

## 1. Build tool 的基本模型

### Build tool 在做什麼？

```text
source code + resources
        ↓
compiler／annotation processor
        ↓
classes／generated resources
        ↓
test
        ↓
jar／distribution／run configuration
        ↓
local repository／CI／server／game launcher
```

build tool 常見責任如下：

| 責任 | Maven／Gradle 中的表現 |
|---|---|
| 專案識別 | Maven coordinates；Gradle project name、group、version |
| 依賴解析 | `dependencies`、版本、transitive dependencies、exclusions |
| 取得 artifact | repositories、local cache、Maven Central 或 mod repository |
| 執行工作 | Maven lifecycle phases；Gradle tasks 與 task graph |
| 延伸 build | Maven plugin；Gradle plugin |
| Java 版本 | compiler release、toolchain、source／target compatibility |
| 測試 | Surefire／Failsafe 或 Gradle test task、JUnit integration |
| 輸出 | class files、jar、sources、javadoc、remapped mod jar |

**Dependency** 是程式編譯、測試或執行需要的 artifact；**Plugin** 是改變或擴充 build tool 行為的元件。Spring Boot starter 是 dependency；Spring Boot Maven plugin 是 plugin。Fabric API 是 mod dependency；Fabric Loom 是 Gradle plugin。不要把兩者當成同一種設定。

## 2. Maven：從 `pom.xml` 開始

### POM 是 Project Object Model

Maven 的 `pom.xml` 是 Project Object Model，用 XML 描述 project metadata、dependencies、build、plugins、repositories、profiles 與 module relationship。[1]

JavaBase 的 backend POM 使用 Spring Boot parent、Java 21、web／validation dependencies 與 Spring Boot plugin：

```xml
<project>
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.5</version>
    </parent>

    <groupId>dev.javabase</groupId>
    <artifactId>backend-learning-api</artifactId>
    <version>0.1.0-SNAPSHOT</version>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

POM 中的 coordinates 通常以 `groupId`、`artifactId` 與 `version` 識別 artifact。`parent` 可以提供共用設定與 dependency management；它不代表所有 dependency 都自動被加入 classpath。需要使用的 library 仍要在 `dependencies` 宣告，除非 parent 或 BOM 只提供了版本管理。

### Maven dependency

一個 dependency 至少回答「是哪個 artifact、哪個版本、在哪個使用階段」：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>example-client</artifactId>
    <version>1.2.3</version>
    <scope>runtime</scope>
</dependency>
```

Maven 會解析 transitive dependencies，因此加入一個 artifact 可能同時帶入其他 artifact。遇到版本衝突、重複 class 或 `NoSuchMethodError` 時，要看 dependency tree，不要只看自己的 POM 表面內容：

```bash
mvn dependency:tree
mvn help:effective-pom
```

### Maven scope

| Scope | 編譯可用 | 測試可用 | 執行／打包可用 | 常見用途 |
|---|---:|---:|---:|---|
| `compile` | 是 | 是 | 是 | 一般 application／library dependency，預設 scope |
| `provided` | 是 | 是 | 由執行環境提供 | container、servlet API 或外部 runtime 提供的 API |
| `runtime` | 否 | 是 | 是 | 執行時需要、編譯時不直接引用的 implementation |
| `test` | 否 | 是 | 否 | JUnit、測試 fixture、測試專用 library |
| `system` | 是 | 是 | 依設定 | 對固定本機路徑的 legacy 依賴，不建議一般專案使用 |

`scope` 不只是「這個 jar 要不要放進來」；它影響 dependency 可見性、transitive propagation、test classpath 與 package 行為。Spring Boot 的 `spring-boot-starter-test` 標成 `test`，因此 production runtime 不會把測試套件當正式依賴。

### Maven repository

Repository 是 Maven 取得 artifact 或 plugin 的位置。常見有 local repository、remote repository 與 plugin repository。不要把任何網路 URL 隨便加進 POM；repository 會影響可重現性、供應鏈風險、下載速度與 artifact trust。

```xml
<repositories>
    <repository>
        <id>company-releases</id>
        <url>https://repo.example.com/releases</url>
    </repository>
</repositories>
```

一般 library 優先使用可信且穩定的中央 repository 或組織內部 proxy。Minecraft mod 依賴常需要 Fabric、NeoForge、Paper 或其他平台指定 repository；請依該平台文件加入，而不是把 Fabric repository 套到 NeoForge 或 Paper 專案。

### Maven lifecycle

Maven lifecycle 是一組有順序的 phases。初學最常見的流程可以理解成：

```text
validate
  ↓
compile
  ↓
test
  ↓
package
  ↓
verify
  ↓
install
  ↓
deploy
```

實際執行 `mvn package` 時，Maven 會執行 package 之前的 phases；執行 `mvn test` 則不會建立 production package。phase 是 lifecycle 的位置，plugin goal 是實際執行的操作：

```bash
mvn clean test
mvn clean package
mvn verify
mvn spring-boot:run
```

`clean` 通常屬於另一個 lifecycle；`spring-boot:run` 是直接呼叫某個 plugin goal。不要看到 `test`、`package` 與 `spring-boot:run` 都是 command 就以為它們屬於同一種階段。

### Maven plugin

Maven core 透過 plugin 執行大量工作，例如 compiler、surefire、jar、resources、Spring Boot package。plugin 可以綁定在 lifecycle phase，也可以用 `groupId:artifactId:goal` 直接呼叫：

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <release>21</release>
    </configuration>
</plugin>
```

`plugin` 與 `dependency` 的 classpath 不同。把 build plugin 寫進 dependencies，或把 runtime library 寫進 plugins，通常代表你混淆了 build-time 與 application-time。

## 3. Gradle：`settings.gradle` 與 `build.gradle`

### `settings.gradle`：專案結構與 plugin management

Gradle build 通常先讀 settings file，再讀一個或多個 build script。`settings.gradle`／`settings.gradle.kts` 主要描述 root project、subprojects、project name、include modules 與 plugin management：

```groovy
rootProject.name = 'calibration-stone'

// 多模組專案示意
include 'common', 'fabric', 'neoforge'
```

單一 Minecraft mod 專案的 settings file 可能很短，但它仍然負責讓 Gradle 知道「這是一個什麼 project」。不要把所有 dependency 與 task 都塞進 settings file。

### `build.gradle`：build logic

Gradle 的 build script 可以使用 Groovy DSL 或 Kotlin DSL：

```groovy
plugins {
    id 'java-library'
    id 'maven-publish'
}

group = 'dev.javabase'
version = '0.1.0'

repositories {
    mavenCentral()
}

dependencies {
    api 'org.example:public-api:1.0.0'
    implementation 'org.example:internal-lib:1.0.0'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.12.0'
}

tasks.test {
    useJUnitPlatform()
}
```

JavaBase 的 Fabric mod 目前使用 Fabric Loom：

```groovy
plugins {
    id 'net.fabricmc.fabric-loom' version "${loom_version}"
    id 'maven-publish'
}

dependencies {
    minecraft "com.mojang:minecraft:${project.minecraft_version}"
    implementation "net.fabricmc:fabric-loader:${project.loader_version}"
    implementation "net.fabricmc.fabric-api:fabric-api:${project.fabric_api_version}"
}
```

NeoForge mod 則使用 NeoForge ModDev plugin，並透過 `neoForge {}` 設定版本、client／server／data run configuration 與 source binding。這不是把 Fabric Loom 的 block 改名就能完成的轉換；plugin model、mappings、run task 與 dependency coordinates 都不同。

### Gradle dependency configurations

| Configuration | 常見意義 | 例子 |
|---|---|---|
| `api` | library 對使用者公開的 compile dependency | 公開 API 的型別出現在 method signature |
| `implementation` | 本專案內部使用的 dependency | implementation detail，不向下游公開 |
| `compileOnly` | 編譯需要、runtime 由別處提供 | optional API、annotation、platform-provided API |
| `runtimeOnly` | 編譯不需要、執行需要 | runtime driver 或 implementation |
| `testImplementation` | 測試編譯與執行需要 | JUnit、AssertJ、test fixture |
| `testRuntimeOnly` | 測試 runtime 需要 | test engine、runtime provider |
| `localRuntime` | 某些 Minecraft／mod build setup 的本機測試 runtime | NeoForge example 中的 optional local mod |

`implementation`、`compileOnly` 與 `runtimeOnly` 不只是不同名字；它們決定 compile classpath、runtime classpath、published metadata 與 downstream visibility。Minecraft mod 還要考慮 loader 是否會在遊戲啟動時提供某個 API，以及 dependency 是 mod、library、dev-only artifact 還是 runtime test artifact。

### Gradle repository

```groovy
repositories {
    mavenCentral()
    maven {
        name = 'ExampleRepository'
        url = uri('https://repo.example.com/releases')
    }
}
```

Repository 只解決「去哪裡找 artifact」；它不會自動讓 dependency 相容。遇到 resolution failed、找不到版本、metadata 不一致或下載被拒絕時，檢查 coordinates、repository order、network、credentials、cache 與 Gradle version。不要為了讓 build 通過而把不明 repository 加到所有專案。

### Gradle Task 與 task graph

Gradle 以 task 為工作單位，task 可以依賴其他 task；執行一個 task 時，Gradle 會建立並執行必要的 task graph：

```groovy
tasks.register('printJavaBaseInfo') {
    group = 'help'
    description = 'Print project information'
    doLast {
        println "project=${project.name}"
        println "version=${project.version}"
    }
}
```

常用命令：

```bash
./gradlew tasks
./gradlew help
./gradlew dependencies
./gradlew test
./gradlew build
./gradlew clean build
./gradlew :subproject:test
```

Windows 使用：

```powershell
.\gradlew.bat tasks
.\gradlew.bat build
```

`tasks` 是列出可用 task 的 task；`build` 通常會依賴 compile、processResources、test、jar 或平台 plugin 定義的輸出。Minecraft Loom／NeoForge plugin 可能額外提供 remap、run client、run server、data generation、game test 與 mod metadata task。先用 `tasks` 和 `dependencies` 看實際 plugin 加了什麼，不要猜 task 名稱。

### Gradle task 與 Java code 不同

```groovy
tasks.register('generateNoteIndex') {
    inputs.dir('src/content')
    outputs.dir(layout.buildDirectory.dir('generated/index'))
    doLast {
        // build-time indexing work
    }
}
```

Task 是 build-time automation；它可以產生 resource、執行 compiler、打包 jar 或啟動測試。它不是 runtime service，也不是 Minecraft server thread。不要把 Gradle task 中的 `println`、file generation 與遊戲內的 event callback 混成同一層。

## 4. Gradle Wrapper：為什麼不能只用全域 Gradle

### Wrapper 做什麼？

Gradle Wrapper 讓專案以 repository 中指定的 Gradle version 執行；開發者與 CI 透過 `gradlew`／`gradlew.bat` 使用相同的入口，而不是依賴每台機器安裝的全域 Gradle。[2] [3]

典型檔案：

```text
gradlew
gradlew.bat
gradle/
  wrapper/
    gradle-wrapper.jar
    gradle-wrapper.properties
```

`gradle-wrapper.properties` 會指向 distribution URL：

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.x-bin.zip
```

實際版本以專案檔案為準。不要因為本機全域 Gradle 較新，就直接跳過 Wrapper；Minecraft plugin、Java version、mapping 與 Gradle version 之間可能有嚴格相容性。

### Wrapper 常用命令

```bash
./gradlew --version
./gradlew tasks
./gradlew build
./gradlew clean build
```

更新 Wrapper 應是有意識的升級：先查 plugin compatibility、JDK compatibility、CI、Minecraft loader、mapping 與所有 build task，再提交 `gradle-wrapper.properties` 與必要 wrapper files。不要只改一個版本字串就假設 build 已經完成升級。

## 5. Fabric、NeoForge 與 Paper 的 build 分層

### Fabric Loom

Fabric Loom 是 Gradle plugin，負責把 Fabric／Minecraft 開發需要的 mappings、Minecraft dependency、run environment、資源處理與 remapped artifact 接到 Gradle build。JavaBase 的 `minecraft/fabric-mod/build.gradle` 使用：

```groovy
plugins {
    id 'net.fabricmc.fabric-loom' version "${loom_version}"
    id 'maven-publish'
}

loom {
    splitEnvironmentSourceSets()
}
```

常見判斷順序是：

```text
Gradle Wrapper
    ↓
Fabric Loom plugin
    ↓
Minecraft + mappings + Fabric Loader + Fabric API
    ↓
compile／run／remap／build
```

Fabric Loom 的設定不只是在 dependencies 放一個 Fabric API；`splitEnvironmentSourceSets()`、mod metadata、client／common side 與 remap task 都會影響專案結構。Fabric 專案不要拿 NeoForge 的 `neoForge { runs { ... } }` block 直接貼過來。

### NeoForge Gradle／ModDev

NeoForge 專案的 Gradle plugin 會處理 NeoForge version、userdev／run configuration、source binding、generated resources、data generation 與其他 mod build integration。JavaBase 的 NeoForge script 使用：

```groovy
plugins {
    id 'java-library'
    id 'maven-publish'
    id 'net.neoforged.moddev' version '2.0.144'
}

java.toolchain.languageVersion = JavaLanguageVersion.of(25)

neoForge {
    version = project.neo_version

    runs {
        client { client() }
        server { server(); programArgument '--nogui' }
        data { clientData() }
    }
}
```

上面是 NeoForge-specific DSL。`neoForge {}` 不是一般 Gradle Java 的內建 block；只有相容的 plugin 載入後才有意義。當你看到 `Could not find method neoForge()` 或 unknown property，優先檢查 plugin、Gradle version、settings、properties 與 project type，而不是在 Java source 裡找錯誤。

### Paper

Paper plugin／plugin project 通常以一般 Java build tool 加上 Paper API dependency、plugin metadata、server run／test tooling 與可能的 shading／reobf workflow。它與 Fabric、NeoForge 的 mod loader、mappings、client／server source set 與 metadata 不同。

```text
Fabric mod
  Gradle + Fabric Loom + fabric.mod.json + mappings

NeoForge mod
  Gradle + NeoForge ModDev + neoforge.mods.toml + runs／datagen

Paper plugin
  Maven／Gradle + Paper API + plugin.yml 或 paper-plugin.yml + server lifecycle
```

三者都可能使用 Gradle，但「都使用 Gradle」不代表 build scripts、runtime classpath、entrypoint、metadata 或 task 可以互換。先確認目標是 mod、server plugin、common library 還是 backend service。

## 6. 看到 build error 時怎麼分層

```text
command／Wrapper
    ↓
JDK／Gradle／Maven version
    ↓
settings／POM／build script
    ↓
plugin resolution
    ↓
dependency／repository resolution
    ↓
compile／resources／generated sources
    ↓
test／package／remap
    ↓
runtime launcher／server／game
```

| 錯誤線索 | 優先檢查 |
|---|---|
| `JAVA_HOME`、`Unsupported class file major version` | JDK、toolchain、Gradle／Maven 相容性 |
| `Plugin ... not found` | plugin repositories、plugin version、settings plugin management、Wrapper |
| `Could not resolve ...` | group／artifact／version、repository、network、cache |
| `Could not find method` | plugin 是否套用、DSL 是否屬於另一個 project type |
| `NoSuchMethodError` | compile／runtime dependency version、transitive conflict |
| compile 找不到 class | dependency configuration、source set、mapping、side |
| test 通過但 server 崩潰 | runtimeOnly、packaging、loader、server environment |
| resource 不在 jar | processResources、source set、generated resources、metadata |
| remap／Mixin 失敗 | mappings、target version、method descriptor、loader plugin |
| build 卡住或下載失敗 | daemon、network、repository、lock、worker 與 timeout |

### 建議診斷命令

Maven：

```bash
mvn --version
mvn help:effective-pom
mvn dependency:tree
mvn -X test
```

Gradle：

```bash
./gradlew --version
./gradlew tasks --all
./gradlew dependencies
./gradlew build --info
./gradlew build --stacktrace
./gradlew build --scan
```

`--info`、`--stacktrace` 與 build scan 會產生較多環境、路徑、dependency 與 command 資訊；分享 log 前移除 token、private repository credential、absolute path 與玩家／伺服器敏感資料。

## 7. JavaBase 實際專案對照

### backend-learning-api：Maven

```text
exercises/backend-learning-api/
  pom.xml
  src/main/java/
  src/main/resources/
  src/test/java/
```

它是 Spring Boot backend learning API，因此使用 Maven POM、Spring Boot parent、web／validation dependency、test scope 與 Boot plugin。執行前先確認 `java --version` 與 POM 的 `java.version`，再用 Maven lifecycle 驗證 compile、test 與 package。

### fabric-mod：Gradle + Fabric Loom

```text
minecraft/fabric-mod/
  build.gradle
  gradle.properties
  settings.gradle
  gradlew
  gradlew.bat
  gradle/wrapper/
  src/main/
  src/client/
```

Fabric mod 的 Gradle build 會處理 Minecraft、Fabric Loader、Fabric API、mappings、split environment、resources 與 remapped jar。不要把前端 pnpm command、Maven phase 或 NeoForge run DSL 當成 Fabric task。

### neoforge-mod：Gradle + NeoForge ModDev

```text
minecraft/neoforge-mod/
  build.gradle
  gradle.properties
  settings.gradle
  gradlew
  gradlew.bat
  gradle/wrapper/
  src/main/
  src/generated/resources/
```

NeoForge build script 有 `neoForge { runs { ... } }`、generated resources、mod metadata expansion、`localRuntime` 與 toolchain 設定。遇到 data generation、GameTest、run client／server 或 mod metadata 錯誤時，先看 Gradle task 與 generated output，再進 Java source。

## 8. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| 全域 Gradle 直接執行 | 可能與專案 plugin／Java 不相容 | 使用 `./gradlew`／`gradlew.bat` |
| 把 Maven dependency 寫成 Gradle syntax | DSL 與 configuration 不同 | 依目前 build tool 查官方 dependency 語法 |
| 把 plugin 當 dependency | plugin 改變 build 行為，不是 application classpath | 放在 plugins／plugin configuration |
| 把 dependency 當 plugin | library 不會自動提供 build DSL | 放到 dependencies 的正確 configuration |
| `implementation`、`compileOnly` 隨便換 | 會改變 compile／runtime／published visibility | 先定義使用階段與下游契約 |
| 到處新增 repository | 增加解析不確定性與供應鏈風險 | 只加必要、可信且有文件的 repository |
| 修改一個版本就升級整套 build | plugin、JDK、mapping、loader 可能互相依賴 | 查 compatibility matrix，逐步驗證 |
| 用 Fabric Loom DSL 建 NeoForge | plugin-specific DSL 不存在或行為不同 | 使用 NeoForge 官方 plugin／DSL |
| 用 NeoForge run config 建 Fabric | run、mappings、metadata 與 source set 不同 | 回到目標 loader 的 template |
| 只跑 compile 不跑 test／package | runtime、resources、打包或 remap 仍可能失敗 | 執行專案完整驗收 command |
| 只看 build 失敗最後一行 | 失去最早的 dependency／plugin／JDK cause | 保存完整 log 與 `--stacktrace` |
| 把 Gradle task 當 runtime code | task 在 build time 執行，不是 server thread | 分開 build automation 與遊戲 runtime |
| 直接覆蓋 wrapper | 可能遺漏 jar、properties 或 executable bit | 使用 wrapper task 並檢查 diff |
| 把 `clean` 當萬用修復 | 只清輸出，不會修正錯誤 dependency／DSL | 先理解 cache、classpath 與 task inputs |
| CI 和本機 command 不同 | 綠燈不能代表可重現 | CI 使用 Wrapper、固定 JDK 與明確 task |

## 9. 練習

### 練習一：讀懂 POM

在 `exercises/backend-learning-api/pom.xml` 中標記 parent、coordinates、Java version、compile dependency、test dependency 與 plugin。執行 `mvn help:effective-pom`，比較原始 POM 與 parent 展開後的有效設定。

### 練習二：讀懂 Gradle build

在 Fabric 與 NeoForge 專案各自標記 plugins、repositories、dependencies、Java toolchain、resources、run configuration 與 publishing。列出兩份 build script 哪些 block 只屬於自己的 loader。

### 練習三：dependency scope 實驗

建立一個只在測試使用的 library，分別改成 Maven `test`、Gradle `testImplementation` 與 `runtimeOnly`，觀察 compile、test、package 與 runtime classpath 的差異。不要只看 build 是否成功，也要檢查實際輸出與 dependency tree。

### 練習四：Wrapper 與 JDK

用 `gradlew.bat --version` 記錄 Gradle、JVM 與 OS，再比較全域 `gradle --version`。不要用全域版本執行正式 build；說明為什麼 Wrapper 能降低團隊差異，但不能自動解決錯誤 JDK 或不相容 plugin。

### 練習五：Stack trace 分層

故意造成一個 dependency resolution、compile、resource、runtime 或 loader 啟動錯誤。把它分類到 command、JDK、build script、plugin、dependency、resource、remap 或 runtime layer，再寫出最小修復與驗收 command。

## 10. 複習速查

```text
Maven
  pom.xml
    → dependency + repository
    → plugin + lifecycle phase
    → compile / test / package / verify

Gradle
  settings.gradle
    → project structure
  build.gradle
    → plugins + repositories + dependencies + tasks
  gradlew / gradlew.bat
    → project-pinned Gradle version
```

| 我想查什麼 | Maven | Gradle |
|---|---|---|
| 專案設定 | `pom.xml` | `settings.gradle`、`build.gradle` |
| 依賴 | `<dependency>` | `implementation`、`api`、`compileOnly` 等 |
| 儲存庫 | `<repositories>` | `repositories {}` |
| Build 擴充 | `<plugin>` | `plugins {}` |
| 執行工作 | lifecycle phase／plugin goal | task／task graph |
| 依賴分析 | `mvn dependency:tree` | `./gradlew dependencies` |
| 版本固定 | Maven／JDK／parent／BOM policy | Gradle Wrapper、toolchain、version catalog |
| 測試 | `mvn test`、`mvn verify` | `./gradlew test`、`./gradlew build` |
| Minecraft | 通常不是主要 mod build tool | Fabric Loom／NeoForge plugin／Paper ecosystem |

| Minecraft project | Build 核心 | 不可直接混用的部分 |
|---|---|---|
| Fabric mod | Gradle + Fabric Loom | mappings、mod metadata、split environment、remap |
| NeoForge mod | Gradle + NeoForge ModDev | `neoForge {}`、runs、datagen、generated resources |
| Paper plugin | Maven／Gradle + Paper API 與 plugin metadata | plugin lifecycle、server API、plugin descriptor |

最後記住：**看到 build error，先判斷它是「建置時」還是「執行時」；再判斷是 JDK、Wrapper、DSL、plugin、dependency、resource、loader 還是 Java code。**

## References

[1]: https://maven.apache.org/pom.html "POM Reference — Apache Maven"
[2]: https://docs.gradle.org/current/userguide/gradle_basics.html "Gradle Basics — Gradle User Manual"
[3]: https://docs.gradle.org/current/userguide/gradle_wrapper.html "Gradle Wrapper — Gradle User Manual"
[4]: https://docs.gradle.org/current/userguide/declaring_dependencies.html "Declaring Dependencies — Gradle User Manual"
[5]: https://docs.gradle.org/current/userguide/declaring_repositories.html "Declaring Repositories — Gradle User Manual"
[6]: https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html "The Build Lifecycle — Apache Maven"
[7]: https://docs.fabricmc.net/develop/loom/ "Loom — Fabric Documentation"
[8]: https://docs.neoforged.net/toolchain/docs/ "NeoForge ModDev — NeoForged Documentation"
[9]: https://docs.papermc.io/paper/dev/project-setup/ "Project Setup — Paper Documentation"
