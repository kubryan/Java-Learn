---
title: C 指標與記憶體｜Pointers and Memory
titleEn: C Pointers and Memory
topic: Pointers, Dynamic Memory and Ownership
terms: pointer, address, dereference, NULL, malloc, calloc, realloc, free, heap, stack, ownership, lifetime, dangling pointer, memory leak
slug: c-pointers-memory
category: C 語言基礎
order: 5
level: 中階
tags: C, Pointer, Memory, malloc, free, Heap, Stack, Ownership, Memory Safety
aliases: C 指標, C 記憶體, malloc, 動態記憶體, pointer
summary: 建立 address、pointer、dereference、stack、heap、ownership 與 lifetime 的正確模型，學會 malloc、calloc、realloc、free，並辨識 dangling pointer、double free、memory leak 與 use-after-free。
---

# C 指標與記憶體｜Pointers and Memory

Pointer 是保存另一個 object address 的變數。`&value` 取得 address，`*pointer` 取得該 address 所指向的 object；pointer 本身也有自己的 type、lifetime 與 validity。

```c
#include <stdio.h>

void increment(int *value) {
    if (value != NULL) {
        ++(*value);
    }
}

int main(void) {
    int score = 10;
    int *address = &score;

    printf("score=%d\\n", *address);
    increment(address);
    printf("score=%d\\n", score);
    return 0;
}
```

這裡 `address` 指向 `score`，所以 function 能修改 caller 的 object。C pointer arithmetic 與 dereference 必須符合 pointer 所指向 object 的生命週期與邊界；任意整數轉成 pointer 或解參照無效 pointer 都可能是 undefined behavior。

## Stack 與 heap

| 區域 | 常見內容 | 生命週期與風險 |
|---|---|---|
| stack | local variables、function frames | 通常在 block／function 結束時失效，不可回傳 local address |
| heap | dynamic allocation | 直到 `free` 才結束，需明確管理 ownership |
| static storage | global 或 `static` objects | 通常涵蓋整個 program lifetime，但 global state 仍需設計 |

不要把 stack／heap 當成絕對的語言標準分類；實際配置由 implementation、ABI 與 runtime 決定。對初學者最重要的是 object 的 lifetime 與誰負責釋放，而不是背一張記憶體圖片。

## Dynamic allocation

```c
#include <stdlib.h>

int *make_scores(size_t length) {
    int *scores = calloc(length, sizeof *scores);
    if (scores == NULL) {
        return NULL;
    }
    return scores;
}

int main(void) {
    int *scores = make_scores(3);
    if (scores == NULL) {
        return 1;
    }

    scores[0] = 20;
    free(scores);
    scores = NULL;
    return 0;
}
```

`malloc` 配置未初始化 bytes；`calloc` 配置並清零；`realloc` 嘗試調整既有 allocation；`free` 釋放 allocation。每次成功 allocation 都要有清楚的 owner 與 exactly-once release path。

## `realloc` 的安全寫法

不要直接把 `realloc` 結果覆蓋唯一 pointer，因為失敗時原 allocation 仍然存在：

```c
int *temporary = realloc(scores, new_length * sizeof *scores);
if (temporary == NULL) {
    // scores 仍然有效；依需求處理失敗
} else {
    scores = temporary;
}
```

還要檢查 `new_length * sizeof *scores` 是否 overflow，並確認新長度與任何 index／terminator 規則一致。

## 四種危險

| 名稱 | 例子 | 後果 |
|---|---|---|
| memory leak | 配置後沒有 `free` | allocation 失去 owner，長時間程式持續消耗記憶體 |
| dangling pointer | `free(pointer)` 後仍使用 pointer | 指向已失效 object |
| double free | 同一 allocation 呼叫兩次 `free` | undefined behavior |
| use-after-free | 釋放後讀／寫資料 | 可能資料損壞、crash 或安全漏洞 |

`free(NULL)` 是安全的，但不能因此忽略 ownership。設定 pointer 為 `NULL` 只能降低同一 variable 被誤用的機會，不能修復其他 alias 手上的 dangling pointer。

## C pointer 與 Java reference

Java reference 也是一種 value，但 Java 不允許一般程式直接取得 object address、做 pointer arithmetic 或呼叫 `free`。C pointer 的 alias、ownership 與 lifetime 需要明確設計；Java 的 GC 只處理可回收 object，不代表 file、socket、native allocation 或 Minecraft scheduler resource 自動正確關閉。

## Minecraft 對照

Fabric、NeoForge、Paper 的 Java object 不應直接以 C pointer 操作。這篇的概念適合用來理解 JNI／FFI、native library、server process 記憶體與 crash diagnosis；Minecraft world、entity、registry 與 scheduler 的 thread／lifecycle 規則仍由各平台 Java API 決定。

## 練習

實作 `int *copy_scores(const int *source, size_t length)`，配置新 array、複製內容，並在 allocation 失敗時回傳 `NULL`。寫出 caller 的 cleanup path，使用 AddressSanitizer 檢查是否有 leak 或 use-after-free。

## References

[1]: https://en.cppreference.com/w/c/memory "cppreference — C dynamic memory management"
[2]: https://en.cppreference.com/w/c/language/pointer "cppreference — pointer declarations"
