---
title: C 預處理器與巨集應用｜Preprocessor and Macros
titleEn: C Preprocessor and Macros
topic: Preprocessor Directives and Macro Design
terms: preprocessor, #include, #define, #if, #ifdef, #ifndef, #error, #warning, stringizing, token pasting, variadic macro, __VA_ARGS__, __FILE__, __LINE__
slug: c-preprocessor-macros
category: C 語言基礎
order: 9
level: 中階到進階
tags: C, Preprocessor, Macro, Conditional Compilation, Header, Build Configuration, Diagnostics
aliases: C 巨集, 預處理器, conditional compilation, C macro
summary: 理解 C preprocessing 階段與 #include、#define、條件編譯、stringizing、token pasting、variadic macro，學會用巨集處理 build configuration 與 diagnostics，同時避免巨集的型別、優先序與重複求值陷阱。
---

# C 預處理器與巨集應用｜Preprocessor and Macros

> **設計原則：** 巨集適合做 preprocessing 時期的選擇與少量語法生成；凡是需要 type checking、scope、單次求值或 debugger 可讀性的工作，優先考慮 function、`const`、`enum` 或 inline function。

C preprocessor 在 compiler 主要分析 C 語法前處理 token。它會展開 `#include`、替換 `#define`、根據 `#if` 選擇區塊，也能用 `#error` 阻止不支援的 build configuration。這與 Java 的 annotation processor、`import` 或 runtime reflection 不是同一層。

## 1. Object-like 與 function-like macro

```c
#define MAX_HEALTH 20
#define SQUARE(x) ((x) * (x))

int health = MAX_HEALTH;
int area = SQUARE(4);
```

`MAX_HEALTH` 是 object-like macro；`SQUARE` 是 function-like macro。每個 macro parameter 都應加括號，整個 replacement expression 也應加括號，降低 operator precedence 造成的錯誤。

```c
#define BAD_SQUARE(x) x * x
#define GOOD_SQUARE(x) ((x) * (x))

int a = BAD_SQUARE(1 + 2);  // 展開成 1 + 2 * 1 + 2
int b = GOOD_SQUARE(1 + 2); // 9
```

即使加了括號，`SQUARE(next_value())` 仍可能把 argument 求值兩次。若 expression 可能有副作用，使用 function 或 inline function：

```c
static inline int square_int(int value) {
    return value * value;
}
```

## 2. Stringizing：`#`

在 function-like macro 中，`#` 可將 argument 轉成 string literal：

```c
#include <stdio.h>

#define SHOW_VALUE(name, value) \
    printf("%s=%d\n", #name, (value))

int score = 20;
SHOW_VALUE(score, score);
```

這對建立簡單 diagnostics 很有用，但仍要注意 format specifier、argument type 與重複求值。`#` 是 preprocessing token 操作，不是 runtime reflection，也不會知道變數的真正型別。

## 3. Token pasting：`##`

`##` 將兩個 token 合併成一個 token，可用來產生一致命名：

```c
#define MAKE_COUNTER(name) int counter_##name = 0

MAKE_COUNTER(players); // int counter_players = 0
```

token pasting 只適用於合併後仍是合法 token 的情況。不要把 `##` 當成通用文字拼接工具，也不要讓生成名稱變得比原始 code 更難搜尋與除錯。

## 4. Variadic macro

C99 起支援 variadic macro；`__VA_ARGS__` 代表額外 arguments：

```c
#include <stdio.h>

#define LOG_INFO(format, ...) \
    fprintf(stderr, "INFO: " format "\n", __VA_ARGS__)

LOG_INFO("health=%d", health);
```

這種寫法必須清楚定義 format contract；使用者傳入錯誤型別仍可能產生 undefined behavior。若需要 optional empty argument，C23 的 `__VA_OPT__` 或 compiler extension 可能有不同支援，必須指定標準與測試 compiler，不要默認所有 GCC／Clang／MSVC 行為相同。

## 5. Conditional compilation

```c
#if defined(ENABLE_DEBUG)
    #define DEBUG_ONLY(code) code
#else
    #define DEBUG_ONLY(code)
#endif

#ifndef GAME_CONFIG_H
#define GAME_CONFIG_H
#define GAME_MAX_PLAYERS 20
#endif
```

`#if`、`#ifdef`、`#ifndef` 可依 build flags 選擇 code；header guard 防止同一 header 在一個 translation unit 重複展開。大型專案應把 configuration 集中在少數 header 或 build definitions，避免整個 codebase 到處出現難以追蹤的 `#ifdef`。

## 6. 用 `#error` 阻止錯誤配置

```c
#if !defined(TARGET_WINDOWS) && !defined(TARGET_LINUX)
#error "Supported targets are Windows and Linux"
#endif

#if defined(TARGET_WINDOWS) && defined(TARGET_LINUX)
#error "Choose exactly one target"
#endif
```

`#error` 適合在 preprocessing 時回報明確、不可支援的組合；`#warning` 可提示 deprecated configuration，但 warning 不應被當成永遠安全的訊息。GCC 也支援命令列 `-DNAME=value` 傳入 macro，應把實際 build command 記錄在 build system 或 CI 中。

## 7. 預定義 macro 與 diagnostics

```c
#include <stdio.h>

#define TRACE(message) \
    fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, message)
```

`__FILE__` 與 `__LINE__` 可協助定位來源，但它們不是完整 stack trace。敏感資料不可因為加上 trace 就直接寫入 log；正式專案應建立明確 logging policy。

## 8. 常見巨集陷阱

| 陷阱 | 例子 | 修正 |
|---|---|---|
| precedence | `#define ADD(a,b) a+b` | `((a) + (b))` |
| multiple evaluation | `MAX(i++, j++)` | 使用 function／temporary |
| 名稱污染 | `#define min ...` | 命名加前綴、縮小 scope、`#undef` |
| 隱藏控制流程 | macro 內含裸 `if`／`return` | 使用 `do { ... } while (0)` 或 function |
| 缺少型別檢查 | format macro 接收錯誤 type | 使用 inline function 與 compiler warnings |
| 平台依賴 | 只在某 compiler extension 可用 | 指定 C standard、compiler 與 fallback |

若 macro 包含多個 statements，常見包裝形式如下：

```c
#define RESET_PAIR(first, second) \
    do {                           \
        (first) = 0;               \
        (second) = 0;              \
    } while (0)
```

即使如此，也要問這段邏輯是否更適合 function；macro 不是免費的 abstraction。

## Java／Minecraft 對照

C macro 發生在 preprocessing，不等於 Java annotation、Gradle property、Mixin annotation 或 Minecraft loader lifecycle。Fabric、NeoForge、Paper 的 API 不應用 C 巨集模擬；這篇比較適合協助理解 native build flags、JNI header、平台差異、C library diagnostics 與 generated source 的風險。Minecraft Java 專案仍應使用 Gradle、Java compiler、平台 mapping 與各自的 runtime contract。

## 練習

建立 `LOG_ERROR` macro，輸出 `__FILE__`、`__LINE__` 與 format message；再故意寫出一個會重複求值的 `MAX` macro，用 compiler warning 與最小測試證明問題，最後改成 `static inline` function。另寫一組 `#error` 條件，拒絕同時啟用兩個互斥 target。

## References

[1]: https://en.cppreference.com/w/c/preprocessor "cppreference — C preprocessor"
[2]: https://en.cppreference.com/w/c/preprocessor/replace "cppreference — macro replacement, stringizing and token pasting"
[3]: https://gcc.gnu.org/onlinedocs/cpp/ "GCC — The C Preprocessor"
[4]: https://gcc.gnu.org/onlinedocs/cpp/Diagnostics.html "GCC — preprocessor diagnostics"
