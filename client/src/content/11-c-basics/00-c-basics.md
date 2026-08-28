---
title: C 語言基礎｜C Language Fundamentals
titleEn: C Language Fundamentals
topic: C Language Basics
terms: C, compiler, source file, header, variable, type, function, pointer, memory, struct, array, string, undefined behavior
slug: c-basics
category: C 語言基礎
order: 1
level: 入門到中階
tags: C, C Language, Programming Fundamentals, Compiler, Pointer, Memory, Native Development
aliases: C 語言, C 基礎, C Programming, C Fundamentals
summary: 以可編譯、可複製的範例建立 C 語言基礎，涵蓋型別、控制流程、函式、陣列、字串、指標、記憶體、struct 與編譯除錯，並清楚區分 C 與 Java／Minecraft API 的使用邊界。
---

# C 語言基礎｜C Language Fundamentals

> **學習目標：** 讀懂並寫出小型 C 程式，理解 compiler、stack、heap、pointer、header 與 undefined behavior；同時知道 C 是獨立語言，不是 Fabric、NeoForge 或 Paper API 的替代品。

C 是一門以明確型別、函式、記憶體與編譯流程為核心的語言。它不像 Java 有 garbage collector、class、interface 與 exception hierarchy；C 程式通常直接面對 object representation、pointer arithmetic、manual resource management 與 compiler diagnostics。

對 Java／Minecraft 開發者而言，C 的價值主要在於建立更精確的底層模型：理解 native library、JNI／FFI、作業系統、binary、memory layout、效能與 crash dump。**Fabric、NeoForge、Paper 的 gameplay API 仍然是 Java／JVM 世界；不要把 C 的 pointer 當成 Java reference，也不要把 C 的 header 當成 Java package。**

## 建議學習路線

| 順序 | Handbook | 核心能力 | 與 Java／Minecraft 的連結 |
|---:|---|---|---|
| 1 | `01-syntax-types-io.md` | source file、`main`、型別、變數、`printf` | 對照 Java primitive、compiler 與 entry point |
| 2 | `02-control-flow-functions.md` | `if`、loop、function、scope、return | 對照 Java method、控制流程與 call stack |
| 3 | `03-arrays-strings.md` | array、C string、`char`、buffer boundary | 理解 Java String 背後的 byte／encoding 邊界 |
| 4 | `04-pointers-memory.md` | address、pointer、`malloc`、`free` | 建立 Java reference 與 native memory 的正確區別 |
| 5 | `05-structs-enums-headers.md` | `struct`、`enum`、`typedef`、header | 對照 Java class／record／enum，但不混用語意 |
| 6 | `06-build-debugging.md` | GCC、warnings、GDB、sanitizer、undefined behavior | 對照 Java compiler、debugger、stack trace 與 JVM tooling |
| 7 | `07-memory-best-practices.md` | ownership、cleanup、overflow、safe `realloc`、sanitizer | 對照 Java resource lifetime 與 native boundary |
| 8 | `08-preprocessor-macros.md` | conditional compilation、stringizing、token pasting、variadic macro | 對照 Java annotation／Gradle configuration，但不混用層次 |

## 完成標準

完成本 track 後，你應該能說明 C source 如何經過 preprocessing、compilation、assembly 與 linking 產生 executable；能使用 `gcc -Wall -Wextra -std=c17` 編譯小程式；能分辨 array、pointer、C string 與動態記憶體；也能從 compiler warning 或 GDB breakpoint 開始定位錯誤。進一步完成進階篇後，應能寫出 ownership contract、設計單一 cleanup path、檢查 allocation size overflow，並判斷一個 macro 是否應改成 function 或 `static inline`。

## C 與 Java 的邊界表

| C | Java | 不應混淆的地方 |
|---|---|---|
| `struct` | `class`／`record` | C `struct` 預設只有資料欄位，不自動提供 method、封裝或 GC |
| pointer | reference | C pointer 可做 pointer arithmetic；Java reference 不提供這種操作 |
| `malloc`／`free` | `new`／garbage collector | C 要明確管理生命週期；Java 通常由 GC 回收，但 native resource 仍需管理 |
| header `#include` | `import` | header 會參與 preprocessing；Java import 主要是名稱解析，不是文字貼上 |
| `printf` | `System.out.println`／logger | C `printf` 需注意 format string 與型別；Minecraft 專案應依平台使用 Java logger |

## Minecraft 對照原則

Fabric、NeoForge 與 Paper 的 API 都是 Java API，這些 handbook 不會把 C 範例宣稱為可直接放進 mod 或 plugin。C 的學習成果可用來理解 JNI、native launcher、作業系統 library、記憶體效能與 crash 診斷；註冊 block、item、event、command 或 server lifecycle 時，仍應回到各平台自己的 Java 文件與 lifecycle contract。

## References

[1]: https://en.cppreference.com/w/c "cppreference — C language and standard library reference"
[2]: https://gcc.gnu.org/onlinedocs/gcc/ "GNU Compiler Collection documentation"
[3]: https://sourceware.org/gdb/current/onlinedocs/gdb.html "GNU GDB documentation"
