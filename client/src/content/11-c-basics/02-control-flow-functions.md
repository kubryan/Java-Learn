---
title: C 控制流程與函式｜Control Flow and Functions
titleEn: C Control Flow and Functions
topic: Control Flow, Functions and Scope
terms: if, switch, for, while, do-while, break, continue, function, parameter, return, scope, recursion
slug: c-control-flow-functions
category: C 語言基礎
order: 3
level: 入門
tags: C, Control Flow, Function, Scope, Loop, Recursion
aliases: C 控制流程, C 函式, C 迴圈, C 作用域
summary: 學會使用 if、switch、for、while、break、continue 與 function，理解 C 的 scope、parameter、return 與 recursion，並從 call stack 角度對照 Java method。
---

# C 控制流程與函式｜Control Flow and Functions

控制流程決定程式執行哪些 statements；函式則把可重複的工作封裝成有名稱的 code path。C 的 function 宣告必須讓 compiler 知道 return type、名稱與 parameters。

```c
#include <stdio.h>

static int clamp_health(int health) {
    if (health < 0) return 0;
    if (health > 20) return 20;
    return health;
}

int main(void) {
    for (int health = -2; health <= 22; health += 4) {
        printf("%d -> %d\\n", health, clamp_health(health));
    }
    return 0;
}
```

`static` 放在 file-scope function 前面時，代表該 function 只在目前 translation unit 可見；這和 Java class-level `static` 不是同一個語意。C 的 `static` 有不同使用位置，看到它時必須先問它修飾的是 function、file-scope variable 還是 block-scope variable。

## `if`、`switch` 與條件

```c
switch (slot) {
    case 0:
        puts("main hand");
        break;
    case 1:
        puts("off hand");
        break;
    default:
        puts("unknown slot");
        break;
}
```

C 沒有 Java 的 boolean-only 條件限制；整數 `0` 會被視為 false，非零值視為 true。這提供彈性，也容易把未驗證的整數誤當成布林值。請讓條件保持可讀，必要時使用 `<stdbool.h>` 的 `bool`。

## Loop 與控制跳轉

`for` 適合有明確初始化、條件與更新式的重複工作；`while` 適合由條件控制的工作；`break` 結束最近一層 loop 或 switch，`continue` 跳到下一輪。

```c
int total = 0;
for (int i = 1; i <= 5; ++i) {
    if (i == 3) continue;
    total += i;
}
```

不要使用無法說明終止條件的 loop。若 loop 讀取 array、字串或外部輸入，終止條件必須同時受到資料長度與 buffer capacity 保護。

## Function prototype 與 header

```c
/* math_utils.h */
#ifndef MATH_UTILS_H
#define MATH_UTILS_H

int add_score(int base, int bonus);

#endif
```

```c
/* math_utils.c */
#include "math_utils.h"

int add_score(int base, int bonus) {
    return base + bonus;
}
```

header 宣告 function prototype，implementation 放在 `.c`；另一個 `.c` 檔案 include header 後，compiler 才能檢查呼叫端的型別。這與 Java package／import 不同：C header 會參與 preprocessing，而 link 時還需要找到 function definition。

## C 的 parameter 傳遞

C 的 argument 是以 value 傳入。若要讓 function 修改 caller 的資料，必須傳入 pointer：

```c
void increment(int *value) {
    if (value != NULL) {
        ++(*value);
    }
}

int score = 4;
increment(&score);
```

這不是 Java 的「reference pass-by-reference」；Java 也是 pass-by-value，只是 value 可能是 reference。C 範例中的 `&score` 取得 address，`*value` 透過 address 存取資料，生命週期與 null validity 都要由程式設計者負責。

## Scope 與生命週期

| Scope | 例子 | 注意 |
|---|---|---|
| block scope | `for` 內的 `int i` | 離開 `{}` 後名稱不可見 |
| function parameter | `int health` | 只在該 function invocation 中有效 |
| file scope | 檔案頂端的 declaration | 需考慮 external linkage 與 `static` |
| global state | file-scope mutable variable | 可能造成 hidden coupling，應限制 ownership |

```c
int main(void) {
    int score = 10;
    {
        int bonus = 2;
        score += bonus;
    }
    // bonus 在這裡不可見
    return score;
}
```

## 常見錯誤

不要回傳 local variable 的 address，因為 function return 後它的 lifetime 已結束：

```c
int *bad_pointer(void) {
    int value = 42;
    return &value; // ❌ dangling pointer
}
```

也不要在沒有 prototype 的情況下呼叫 function、漏掉 `break`、以 `=` 代替 `==`，或讓 recursion 沒有明確的 base case。

## Minecraft 對照

C function 與 Java method 都能拆分責任，但 Fabric、NeoForge、Paper 的 event callback、command handler 與 scheduler callback 必須遵守各自 Java API 的執行緒與 lifecycle contract。C 的 global state、pointer 與 manual lifetime 不可直接套用到 Minecraft world／entity state。

## 練習

建立 `is_valid_slot(int slot)` 與 `clamp_health(int health)`，再寫一個 loop 讀取 5 個整數並統計有效值。把 function prototype 放入 header，使用 GCC 分別編譯兩個 `.c` 檔案並 link。

## References

[1]: https://en.cppreference.com/w/c/language/function "cppreference — function declarations and definitions"
[2]: https://en.cppreference.com/w/c/language/scope "cppreference — scope"
