---
title: C 記憶體管理最佳實踐｜Memory Management Best Practices
titleEn: C Memory Management Best Practices
topic: Safe Dynamic Memory and Resource Ownership
terms: ownership, lifetime, malloc, calloc, realloc, free, cleanup, allocation failure, integer overflow, dangling pointer, double free, sanitizer, RAII-like cleanup
slug: c-memory-best-practices
category: C 語言基礎
order: 8
level: 中階到進階
tags: C, Memory Management, Pointer, malloc, free, realloc, Ownership, Memory Safety, Sanitizer
aliases: C 記憶體管理, 記憶體最佳實踐, memory ownership, memory safety
summary: 從 ownership contract、allocation failure、size overflow、realloc 與 cleanup path 出發，建立可審查的 C 記憶體管理流程，並以 sanitizer 驗證 leak、越界與 use-after-free。
---

# C 記憶體管理最佳實踐｜Memory Management Best Practices

> **核心規則：** 每一次成功的 allocation 都必須有唯一、可追蹤的 owner；每個 owner 都必須知道何時以哪一條 cleanup path 釋放資源。

C 的 `malloc`、`calloc`、`realloc` 與 `free` 不只是 API，而是一份必須由團隊維護的 ownership contract。文件若只寫「呼叫端自行處理」，通常不足以防止 leak；更好的 API 會明確說明誰建立、誰擁有、誰釋放，以及失敗時 object 是否仍有效。

## 1. 先寫 ownership contract

```c
/* caller owns the returned buffer and must call free(). */
char *duplicate_name(const char *source);

/* borrows source; does not free it. */
size_t name_length(const char *source);
```

把 pointer 分成三種角色：**owning pointer** 負責釋放、**borrowed pointer** 只在保證的 lifetime 內使用、**observer pointer** 只讀取且不延長 lifetime。函式名稱、註解、header 與測試都應一致表達這項規則。

## 2. 檢查 size calculation overflow

```c
#include <stdint.h>
#include <stdlib.h>

int allocate_items(size_t count, size_t item_size, void **out) {
    if (out == NULL || item_size == 0 || count > SIZE_MAX / item_size) {
        return 0;
    }

    void *memory = calloc(count, item_size);
    if (memory == NULL) {
        return 0;
    }
    *out = memory;
    return 1;
}
```

`count * item_size` overflow 後可能變成比預期小的 allocation，接著大量寫入就會越界。先檢查乘法邊界，再配置；不要只依賴「通常不會有那麼大的輸入」。

## 3. `realloc` 保留原 pointer

```c
int grow_scores(int **scores, size_t old_count, size_t new_count) {
    if (scores == NULL || new_count > SIZE_MAX / sizeof **scores) {
        return 0;
    }

    int *candidate = realloc(*scores, new_count * sizeof **scores);
    if (candidate == NULL && new_count != 0) {
        return 0; // 原本的 *scores 仍由 caller 擁有
    }

    *scores = candidate;
    (void)old_count;
    return 1;
}
```

`realloc` 成功時，舊 pointer 可能失效；失敗時，原 allocation 仍然存在。使用 temporary pointer 才能在失敗路徑保留 cleanup 能力。若 `new_count` 是 0，標準與 implementation 行為需要另外查閱並建立明確 contract，不要把它當成一般 resize。

## 4. 單一 cleanup path

C 沒有 Java `try-finally` 的相同語法，資源逐步建立時可用 `goto cleanup` 保持釋放順序清楚：

```c
int load_snapshot(void) {
    char *text = NULL;
    int *values = NULL;
    int result = 0;

    text = malloc(1024);
    if (text == NULL) goto cleanup;

    values = malloc(16 * sizeof *values);
    if (values == NULL) goto cleanup;

    result = 1;

cleanup:
    free(values);
    free(text);
    return result;
}
```

這裡的 `goto` 不是任意跳躍，而是集中 cleanup label。資源釋放順序通常與取得順序相反；每個 pointer 在宣告時先設為 `NULL`，讓 `free(NULL)` 可以安全處理尚未配置的 path。

## 5. 讓 invalid state 難以出現

釋放後將 owner pointer 設為 `NULL`，並避免把同一 allocation 複製給多個不清楚的 owner：

```c
free(buffer);
buffer = NULL;
```

這不能修復其他 alias 手上的 dangling pointer，因此更好的做法是減少 alias、把 mutation 留在 owner、使用 opaque type，並在 API 文件寫出借用期限。C 沒有自動 borrow checker；review、測試與 sanitizer 必須共同補足風險。

## 6. Sanitizer 與測試矩陣

```bash
gcc -std=c17 -Wall -Wextra -Wpedantic -g \
    -fsanitize=address,undefined -fno-omit-frame-pointer \
    memory_case.c -o memory_case
./memory_case
```

至少測試正常輸入、零長度、最大合理長度、allocation failure simulation、realloc failure path、越界、double free 與 use-after-free。Sanitizer 能觀察到執行過的錯誤，但不能證明所有未執行 path 都安全；仍需 code review 與清楚的 ownership model。

## 常見錯誤

| 錯誤 | 改善方式 |
|---|---|
| 直接把 `realloc` 寫回原 pointer | 先用 temporary pointer 接收結果 |
| `count * sizeof(T)` 沒檢查 overflow | 先用除法檢查乘法上限 |
| 多個 caller 都以為自己是 owner | 在 header 定義 ownership contract |
| error path 忘了釋放前面資源 | 統一 cleanup path 與 reverse-order release |
| 只測成功路徑 | 對 allocation failure、zero、boundary 與 sanitizer 建立案例 |
| 以 `free` 解決所有 resource | file、socket、lock、native handle 也要各自定義 cleanup |

## Java／Minecraft 對照

Java GC 能處理部分 heap object 的可達性，但不會讓所有 native resource 自動正確關閉；Java 的 `try-with-resources` 與 C cleanup path 都是在表達 resource lifetime，只是語法與保證不同。Fabric、NeoForge、Paper 的 world、entity 與 scheduler state 仍然由 Java API 的 thread／lifecycle contract 管理，不應以 C pointer 直接操作。

## 練習

實作一個可擴張的 `IntBuffer`，包含 `init`、`push`、`destroy`；檢查 capacity multiplication overflow，使用安全 `realloc`，並在每個失敗 path 保持原 buffer 可釋放。最後以 AddressSanitizer 執行正常、零容量與故意越界案例。

## References

[1]: https://en.cppreference.com/w/c/memory "cppreference — C dynamic memory management"
[2]: https://en.cppreference.com/w/c/memory/realloc "cppreference — realloc"
[3]: https://en.cppreference.com/w/c/memory/free "cppreference — free"
[4]: https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html "GCC instrumentation options"
