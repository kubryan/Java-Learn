---
title: C 編譯、建置與除錯｜Build and Debugging
titleEn: C Build and Debugging
topic: GCC, Compiler Diagnostics and GDB
terms: GCC, preprocessing, compilation, assembly, linking, object file, -Wall, -Wextra, -Werror, GDB, breakpoint, backtrace, AddressSanitizer, undefined behavior
slug: c-build-debugging
category: C 語言基礎
order: 7
level: 中階
tags: C, GCC, Compiler, Linker, GDB, Debugging, Sanitizer, Undefined Behavior
aliases: C 編譯, C 建置, C 除錯, GCC, GDB
summary: 理解 C 從 preprocessing 到 linking 的建置流程，學會使用 GCC warnings、GDB breakpoint／backtrace 與 AddressSanitizer，建立面對 compiler error、linker error 與 undefined behavior 的除錯流程。
---

# C 編譯、建置與除錯｜Build and Debugging

C 程式通常經過 preprocessing、compilation、assembly 與 linking。這些階段的錯誤訊息代表不同層級，不要看到所有錯誤都只改 source syntax。

```text
main.c + headers
    ↓ preprocessing
translation unit
    ↓ compilation
assembly / object file
    ↓ assembly
main.o
    ↓ linking + libraries
executable
```

最小編譯指令：

```bash
gcc -std=c17 -Wall -Wextra -Wpedantic -g main.c -o main
./main
```

`-std=c17` 選擇語言標準；`-Wall`、`-Wextra`、`-Wpedantic` 開啟重要 diagnostics；`-g` 產生 debugger 使用的 symbol information；`-o` 指定輸出檔名。warning 不是一定可忽略的裝飾，尤其是 format mismatch、未初始化值、implicit declaration、signedness 與 array boundary 警告。

## 四種錯誤層級

| 訊息 | 階段 | 先問什麼 |
|---|---|---|
| syntax error | preprocessing／compilation | `{}`、`;`、keyword 與 declaration 是否正確 |
| type／format warning | compilation | expression 與 API contract 的 type 是否一致 |
| undefined reference | linking | function definition、object file 或 library 是否加入 |
| segmentation fault | runtime | 是否 dereference 無效 pointer、越界或 use-after-free |

`-Werror` 可以把 warning 當成 error，適合 CI 或重要 library，但學習階段先讀懂 warning 再決定是否強制零 warning。

## 分開編譯與 link

```bash
gcc -std=c17 -Wall -Wextra -g -c player_state.c -o player_state.o
gcc -std=c17 -Wall -Wextra -g -c main.c -o main.o
gcc player_state.o main.o -o demo
```

如果 header 有 prototype、implementation 有 definition，但 link command 漏了 `player_state.o`，compiler 可能已通過，linker 仍會報 `undefined reference`。這和 Java 的 compile classpath／runtime dependency 也有相似的分層概念，但工具與檔案格式不同。

## GDB 基本流程

```bash
gcc -std=c17 -Wall -Wextra -g main.c -o main
gdb ./main
```

```text
(gdb) break main
(gdb) run
(gdb) next
(gdb) print score
(gdb) backtrace
(gdb) continue
(gdb) quit
```

`break` 設定 breakpoint，`run` 執行，`next` step over，`print` 查看 expression，`backtrace` 查看 call stack。若程式 crash，先取得 backtrace，再確認第一個屬於自己 source 的 frame 與變數狀態。

## AddressSanitizer

GCC 與 Clang 常可使用 AddressSanitizer 找出越界、use-after-free 與部分 memory error：

```bash
gcc -std=c17 -Wall -Wextra -g -fsanitize=address,undefined \
    -fno-omit-frame-pointer main.c -o main
./main
```

Sanitizer 是診斷工具，不是 proof of correctness；沒有被執行到的 path 仍可能有 bug。把最小重現案例保留成 regression test，避免修正後問題再次出現。

## Undefined behavior

C standard 對某些錯誤不定義結果，例如 signed integer overflow、越界存取、解參照失效 pointer、錯誤 format argument 或使用已結束 lifetime 的 object。程式「這次看起來能跑」不代表它正確；最佳化、平台、compiler version 或輸入改變後可能完全不同。

## Minecraft／Java 對照

JavaBase 中的 Java Debugging handbook 使用 debugger、call stack、exception stack trace；C 的 GDB／sanitizer 是另一套 native toolchain。Fabric、NeoForge、Paper 的 mod／plugin 不應用 `gcc` 取代 Gradle build，也不應把 C segmentation fault 當成 Java exception。只有當你處理 JNI、native library、launcher 或作業系統層時，這套 C 工具鏈才是直接入口。

## 練習

建立一個故意越界的 array 範例，先用 `-Wall -Wextra -g` 編譯，再用 GDB 定位 index，最後用 AddressSanitizer 重跑。修正程式後，把編譯指令與修正前後的錯誤訊息記錄成 Markdown 筆記。

## References

[1]: https://gcc.gnu.org/onlinedocs/gcc/Option-Summary.html "GCC option summary"
[2]: https://sourceware.org/gdb/current/onlinedocs/gdb.html "Debugging with GDB"
[3]: https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html "GCC instrumentation options"
