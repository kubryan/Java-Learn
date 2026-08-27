---
title: Java Development｜Java 開發能力
titleEn: Java Development
topic: Java Development Workflow
terms: Java Development, Java 開發, Packages, Access Modifiers, Object Contract, Immutability, StringBuilder, Debugging, Logging, Maven, Gradle, JUnit, Git
slug: java-development
category: Java 開發
order: 1
level: 入門到進階
tags: Java, Java Development, Build Tools, Debugging, Logging, Testing, Git, Minecraft Java
aliases: Java 開發, Java 工具鏈, Java 專案能力, Java Development Track
summary: 將 Java 語言知識串成可交付的開發能力：讀懂 package 與 access boundary、維護 object contract、理解 immutable state、使用 debugger 與 logging、執行 Maven／Gradle、撰寫 JUnit 測試並用 Git 管理可重現的 Minecraft mod／plugin 專案。
---

# Java Development｜Java 開發能力

> **這是一條工程能力路線，不是另一份 Java 語法百科。** 你已經會寫 `public class ...` 只是起點；真正能維護 Fabric、NeoForge、Paper 或 backend 專案，還必須讀懂 package、dependency、mapping、compiler、stack trace、debugger、logging、test 與 Git history。

本分類將「Java 語言知識 → Java 開發能力 → Minecraft 開發能力」串成同一條路線。每一篇只保留一個 canonical source，其他分類只做基礎概念或導覽，不複製全文。

## 建議學習順序

| 順序 | 能力 | Canonical handbook | 為什麼要學 |
|---:|---|---|---|
| 1 | Packages／Imports | `java-packages-access-modifiers` | 看懂 package tree、import 與 API boundary |
| 2 | Access Modifiers | `java-access-modifiers` | 快速判斷 public、protected、private、package-private 的可見範圍 |
| 3 | Object Contract | `java-object-contract` | 理解 `equals()`、`hashCode()`、`toString()` 與 HashMap／HashSet |
| 4 | Immutability／Mutable Object | `java-immutability` | 分清 `final reference`、object state、snapshot 與 ownership |
| 5 | String／StringBuilder | `java-strings` | 處理 log、command、JSON 與大量文字組合 |
| 6 | Debugging | `java-debugging` | 從 stack trace、breakpoint 與 call stack 找到 root cause |
| 7 | Logging | `java-logging` | 讓 mod／plugin 的 runtime 行為可觀測、可追查 |
| 8 | Maven／Gradle | `java-project-tools` | 讀懂 POM、build script、dependency、mapping 與 Wrapper |
| 9 | JUnit | `java-junit` | 用測試鎖住 registry、parser、utility 與 bug regression |
| 10 | Git for Java | `java-git-for-java` | 管理 source、build files、lockfiles、reproducible history 與回歸 |

## 目前的檔案分層

```text
10-java-development/
├── 00-java-development.md       ← 本分類總覽
├── 01-packages-imports.md       ← package + import + access boundary
├── 02-access-modifiers.md       ← 存取修飾子快速入口與查表
├── 03-equals-hashcode-tostring.md
├── 04-immutability.md
├── 05-string-stringbuilder.md
├── 06-debugging.md
├── 07-logging.md
├── 08-maven-gradle.md         ← Maven／Gradle 對照的單一 canonical source
├── 09-junit.md
└── 10-git-for-java.md
```

`01-packages-imports.md` 與 `02-access-modifiers.md` 故意分成「package／import 導覽」與「四種 access level 查表」；它們互相連結，但不會把同一份長篇內容重複兩次。Maven 與 Gradle 也由同一份 `08-maven-gradle.md` 實際專案工具 handbook 維護，這是有意識的 canonical 設計：以檔名、slug、aliases 與全文搜尋同時提供兩者的入口，避免 Maven POM 與 Gradle DSL 的例子重複維護而失去對照。

## Minecraft 工程閱讀模型

```text
source tree
    ↓
package + access boundary
    ↓
Java type／object contract／state ownership
    ↓
logging + debugger + stack trace
    ↓
Maven／Gradle + dependency + mappings
    ↓
JUnit regression tests
    ↓
Git diff + commit + reproducible build
    ↓
Fabric／NeoForge／Paper runtime
```

Fabric、NeoForge 與 Paper 都可能使用 Java，但它們不是同一個 runtime 或 build ecosystem。請先辨認目前正在看的層次：Java compiler、Gradle plugin、loader mapping、server API、Mixin transformer、event bus、plugin lifecycle，或遊戲中的 server thread。

## 如何使用這個分類

遇到「class 找不到」時先讀 Packages 與 Access Modifiers；遇到 HashMap 找不到 key 時回到 Object Contract 與 Immutability；遇到 server 啟動失敗時先看 Debugging 與 Logging，再判斷是 JDK、dependency、mapping、loader 或 Java code；遇到 build 失敗時進入 Maven／Gradle；改完修復後用 JUnit 與 Git 保留證據。

這樣的分層讓 Java 基礎可以保持乾淨，也讓 Java Development 成為真正可以每天拿來開發 mod、plugin、backend 與工具的工作區。

## References

[1]: https://dev.java/learn/packages/ "Packages — Dev.java"
[2]: https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html "Controlling Access to Members of a Class — Oracle Java Tutorials"
[3]: https://git-scm.com/book/en/v2 "Pro Git — Git documentation"
[4]: https://docs.junit.org/current/user-guide/ "JUnit User Guide"
