---
title: C 陣列與字串｜Arrays and C Strings
titleEn: C Arrays and Strings
topic: Arrays, Character Arrays and Null-Terminated Strings
terms: array, index, char, string literal, null terminator, strlen, strcpy, strncpy, memcpy, buffer, capacity
slug: c-arrays-strings
category: C 語言基礎
order: 4
level: 入門到中階
tags: C, Array, String, char, Buffer, Memory Safety
aliases: C 陣列, C 字串, char 陣列, buffer
summary: 理解 C array 的固定大小、index 邊界與以 null terminator 結尾的字串，學會 strlen、memcpy 與安全 buffer 思維，避免越界與未終止字串。
---

# C 陣列與字串｜Arrays and C Strings

C array 是連續儲存的同型別元素，大小通常在宣告時決定；它不會自動記住 length。C string 則是以 `\0`（null character）結尾的 `char` 序列，因此容量與目前長度是兩件事。

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char name[16] = "Alex";
    size_t length = strlen(name);

    printf("%s has %zu characters\n", name, length);
    for (size_t i = 0; i < length; ++i) {
        putchar(name[i]);
    }
    putchar('\n');
    return 0;
}
```

`char name[16]` 的 capacity 是 16 bytes；`"Alex"` 實際需要 5 bytes，包含最後的 `\0`。`strlen` 不包含 terminator，且要求輸入確實是 null-terminated string；如果不是，函式會繼續讀出 buffer 邊界，形成 undefined behavior。

## Array index 與邊界

```c
int scores[3] = {10, 12, 15};

for (size_t i = 0; i < 3; ++i) {
    printf("%d\n", scores[i]);
}
// scores[3] = 20; // ❌ out of bounds
```

C 不會替你檢查 `scores[3]`。建立 array API 時，通常要同時傳遞 pointer 與 length：

```c
int sum(const int *values, size_t length) {
    int total = 0;
    for (size_t i = 0; i < length; ++i) {
        total += values[i];
    }
    return total;
}
```

`values` 本身沒有足夠資訊推導 array length；呼叫端必須保證 pointer 有效且至少包含 `length` 個 elements。

## String literal 與可修改性

```c
const char *message = "hello";
// message[0] = 'H'; // ❌ 不可修改 string literal

char mutable_message[] = "hello";
mutable_message[0] = 'H'; // ✅ array 內有可修改的 copy
```

把 string literal 指派給 `const char *` 是清楚且安全的讀取方式；若要修改內容，建立足夠容量的 `char` array。不要以為 `char *` 就代表它指向的文字一定可修改。

## `memcpy` 與 `strcpy` 的差異

`memcpy` 處理指定 bytes，不理解字串；`strcpy` 期待 source 是 null-terminated，並且不會知道 destination capacity。新程式應優先使用能表達容量的設計，並在複製前明確驗證長度：

```c
#include <string.h>

int copy_name(char *destination, size_t capacity, const char *source) {
    size_t length = strlen(source);
    if (length + 1 > capacity) {
        return 0;
    }
    memcpy(destination, source, length + 1);
    return 1;
}
```

這段程式也假設 `source` 是有效的 C string；若輸入來自不可信的 binary buffer，應改用明確 length 的 byte API，而不是先呼叫 `strlen`。

## 常見錯誤

| 錯誤 | 原因 | 修正 |
|---|---|---|
| `strlen` 讀到奇怪位置 | 沒有 `\0` | 保留 capacity，確保 terminator |
| `strcpy` 寫爆 destination | 沒驗證輸入長度 | 先算長度並檢查 capacity |
| `sizeof(pointer)` 被當成 array length | pointer 不含 array 大小 | 額外傳 length |
| `array[-1]` 或 `array[length]` | index 越界 | 使用 `0 <= index < length` |
| 把 Java `String` 當 C string | Java String 有不同 object／encoding 模型 | 先確認 native boundary 與 encoding |

## Minecraft 對照

Fabric、NeoForge、Paper 的文字 API 通常使用 Java `String`、component 或平台專用 text type，不需要手動放 `\0`。C string 的 capacity 與 terminator 模型，主要幫助你理解 native library、network buffer、JNI／FFI 與 binary parser 的風險；不要把 `char[]` 當成可直接傳入 Minecraft Java API 的型別。

## 練習

寫 `int parse_name(char *out, size_t capacity, const char *input)`，只接受不超過 capacity 的名稱，成功時複製 terminator，失敗時回傳 0。再用測試案例覆蓋空字串、剛好填滿與超過容量三種情況。

## References

[1]: https://en.cppreference.com/w/c/language/array "cppreference — arrays"
[2]: https://en.cppreference.com/w/c/string/byte "cppreference — null-terminated byte strings"
[3]: https://en.cppreference.com/w/c/string/byte/memcpy "cppreference — memcpy"
