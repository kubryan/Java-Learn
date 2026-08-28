---
title: C 語法、型別與輸入輸出｜Syntax, Types and I/O
titleEn: C Syntax, Types and I/O
topic: C Syntax and Fundamental Types
terms: main, statement, block, int, char, float, double, sizeof, const, printf, scanf, format specifier
slug: c-syntax-types-io
category: C 語言基礎
order: 2
level: 入門
tags: C, Syntax, Types, Variables, printf, scanf, Compiler
aliases: C 語法, C 型別, C 變數, C 輸入輸出
summary: 從 main、statement、block 與基本型別開始，學會宣告變數、使用 const、sizeof、printf 與安全的輸入邊界，並理解 C 型別與 Java primitive 的差異。
---

# C 語法、型別與輸入輸出｜Syntax, Types and I/O

C 程式由 declarations、expressions、statements 與 functions 組成。最小可執行程式從 `main` 開始：

```c
#include <stdio.h>

int main(void) {
    printf("Hello, C!\n");
    return 0;
}
```

`#include <stdio.h>` 是 preprocessing directive，將標準輸入輸出宣告提供給 compiler；`main` 是 hosted C program 的入口；`return 0` 表示成功結束。它與 Java 的 `public static void main(String[] args)` 都是入口概念，但宣告語法、runtime 與錯誤模型不同。

## 基本型別與變數

| C type | 常見用途 | 注意事項 |
|---|---|---|
| `char` | 字元或小型整數 | C string 是 `char` 陣列，不是單一 char |
| `int` | 一般整數 | 實際寬度依 implementation；需要固定寬度時使用 `<stdint.h>` |
| `long`、`long long` | 較大整數 | 不要只依賴平台上的 byte 數 |
| `float`、`double` | 浮點數 | 不適合直接用 `==` 判斷計算結果 |
| `_Bool`／`bool` | 布林值 | `bool` 來自 `<stdbool.h>`；C23 有更新的語言支援 |
| `void` | 無值或通用指標 | `void *` 需要正確轉換與生命週期管理 |

```c
#include <stdbool.h>
#include <stdio.h>

int main(void) {
    int health = 20;
    const double gravity = 9.81;
    bool alive = health > 0;
    char grade = 'A';

    printf("health=%d gravity=%.2f alive=%d grade=%c\n",
           health, gravity, alive, grade);
    return 0;
}
```

`const` 讓這個 identifier 不能透過該名稱被重新賦值，但它不是 Java `final` 的完整等價物；尤其遇到 pointer 時，必須分辨「pointer 本身 const」與「pointer 指向的資料 const」。

## `sizeof` 與 format specifier

`sizeof` 回傳 `size_t`，用 `%zu` 印出；不要猜測 type 的大小：

```c
#include <stdio.h>

int main(void) {
    printf("int: %zu bytes\n", sizeof(int));
    printf("double: %zu bytes\n", sizeof(double));
    return 0;
}
```

`printf` 的 format specifier 必須與 argument type 相容。`%d` 用於 `int`、`%f` 在 `printf` 中接收 `double`、`%c` 用於字元、`%s` 用於以 null 結尾的字串。format 不匹配可能造成 warning，甚至 undefined behavior。

## 運算子與整數除法

```c
int total = 7;
int count = 2;
int quotient = total / count;       // 3：整數除法
int remainder = total % count;      // 1
 double average = (double) total / count; // 3.5
```

C 的 implicit conversion 可能讓結果與直覺不同。看到 arithmetic expression 時，先確認每個 operand 的 type，再決定是否需要明確 cast；不要用 cast 掩蓋真正的型別設計問題。

## 輸入：先設計邊界

初學範例可以使用 `scanf` 讀取整數，但 `%s` 若沒有長度限制容易寫出 buffer overflow：

```c
#include <stdio.h>

int main(void) {
    int value;
    if (scanf("%d", &value) != 1) {
        fprintf(stderr, "invalid integer\n");
        return 1;
    }
    printf("value=%d\n", value);
    return 0;
}
```

讀取文字時，優先使用 `fgets(buffer, sizeof buffer, stdin)`，再以 `strtol` 等 API 驗證內容。這與 Java `Scanner` 或 `BufferedReader` 不同：C 不會自動替你管理 buffer 長度與輸入轉換錯誤。

## 常見錯誤

| 症狀 | 真正問題 | 修正方向 |
|---|---|---|
| compiler 說 format 不匹配 | `printf` specifier 與 type 不一致 | 開啟 `-Wall -Wextra -Wformat=2` |
| `7 / 2` 得到 3 | 兩邊都是 integer | 明確決定是否轉成 floating point |
| 字串輸入覆蓋其他資料 | buffer 沒有容量邊界 | `fgets`、長度檢查與 validation |
| `bool` 找不到 | 未 include `<stdbool.h>` 或 compiler mode 不符 | 確認標準版本與 header |
| 把 Java reference 當 C pointer | 語言模型混用 | 先畫出 address、object 與 owner |

## Minecraft 對照

這些 C 型別範例不能直接取代 Fabric、NeoForge 或 Paper 的 Java API。它們適合用來理解 Java primitive 與 native boundary；Minecraft mod／plugin 的 command input、config parsing 與 logger 仍應使用該平台的 Java 型別與 validation API。

## 練習

寫一個程式讀取玩家名稱的最大長度與目前生命值，驗證生命值介於 `0` 到 `20`，再輸出是否存活。要求使用 `fgets`、明確的 error path，並用 `-Wall -Wextra` 編譯到沒有 warning。

## References

[1]: https://en.cppreference.com/w/c/language "cppreference — C language"
[2]: https://en.cppreference.com/w/c/io/fprintf "cppreference — formatted output"
[3]: https://en.cppreference.com/w/c/io/fgets "cppreference — fgets"
