---
title: 既有筆記審核：哪些內容保留、哪些需要改寫
slug: hackmd-review
category: 開始使用
order: 0
level: 導讀
tags: 筆記審核, 勘誤, 學習方法, HackMD
summary: 這份網站不是複製原筆記，而是保留有價值的學習順序，並依官方文件修正錯誤與過時資訊。
---

## 審核原則

本網站參考你原先整理的學習範圍：CMD、基礎語法、變數、流程控制、陣列、方法和物件導向；不直接搬運段落或圖片。每個概念都先以目前可用的官方文件檢查，再用更適合回頭複習的方式重寫。原稿沒有實質的 Spring、Fabric 或 NeoForge 技術內容，因此後端與 Minecraft 的章節仍以另外查證過的官方資料為主，而不是假裝它們出自這份原筆記。[1]

## 已修正的重點

| 原稿說法 | 審核結果 | 網站採用的正確說法 |
|---|---|---|
| `null` 是「空類型」 | 用語不精確 | `null` 是 null literal，只能指派給參考型別。 |
| 識別字「都是漢字」 | 錯誤 | 可用 Unicode 字母、數字、`_`、`$`；首字元不能是數字。 |
| `int` 上限為 `2147483648` | 錯誤 | `int` 上限是 `2147483647`。 |
| `bollean`，且固定佔 1 byte | 錯誤／不宜當成規格 | 拼字是 `boolean`；語言規格不承諾固定記憶體大小。 |
| `double > float > long > int ...` | 易誤導 | 改用明確的 widening 與 narrowing 轉換規則。 |
| `else if { ... }` | 語法錯誤 | 必須寫成 `else if (條件) { ... }`。 |
| switch 箭頭是 JDK 12 特性 | 不完整 | 這個形式曾為預覽，已在 JDK 14 正式提供。 |
| `&&`、`||` 都是「而且」 | 錯誤 | 分別是短路與、短路或。 |
| `getXxx(參數)` | 錯誤 | 一般 getter 不接受參數；setter 才接受新值。 |
| `this` 是位址值 | 不精確 | 在實例方法或建構子中，`this` 代表目前物件的參考。 |

## 仍然值得保留的學習順序

原筆記先從「看懂如何執行程式」再進入變數、判斷、迴圈、陣列與方法，這個順序很合理。這次調整的重點不是否定先前整理，而是讓每一頁都可以在日後忘記時安全地回來查；因此網站會優先放入可編譯的短範例、常見錯誤與明確的版本說明。

> 筆記的價值不在於一次寫得多，而在於半年後回來看時，仍分得清楚哪些是規格、哪些是慣例、哪些是特定版本的語法。

## References

[1]: https://hackmd.io/@kukuku/HyKqntWQWe "使用者提供的 Java 入門筆記"
[2]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html "Java Language Specification, Chapter 4"
[3]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html "Java Language Specification, Chapter 3"
[4]: https://docs.oracle.com/en/java/javase/24/language/switch-expressions-and-statements.html "Switch Expressions and Statements — Oracle"
