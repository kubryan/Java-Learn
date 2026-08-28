---
title: C 結構、列舉與標頭檔｜Structs, Enums and Headers
titleEn: C Structs, Enums and Headers
topic: Struct, Enum, Typedef and Header Design
terms: struct, enum, typedef, header, header guard, translation unit, include, opaque type, designated initializer
slug: c-structs-enums-headers
category: C 語言基礎
order: 6
level: 中階
tags: C, Struct, Enum, Typedef, Header, Modular Design, Data Modeling
aliases: C struct, C enum, C 標頭檔, typedef
summary: 學會用 struct 表達資料、用 enum 表達有限狀態、用 typedef 改善可讀性，並以 header guard 與 opaque type 建立可維護的 C 模組邊界。
---

# C 結構、列舉與標頭檔｜Structs, Enums and Headers

C 沒有 Java class 的完整封裝語法，但可以用 `struct`、function 與 header／implementation 分離資料模型與操作。設計重點是清楚的 ownership、可見欄位與 API 邊界。

## `struct` 與 designated initializer

```c
#include <stdbool.h>

typedef struct {
    int health;
    bool alive;
} PlayerState;

PlayerState state = {
    .health = 20,
    .alive = true,
};
```

`struct` 內的 fields 預設是公開可見的；任何 include 該 header 的 code 都可能直接改欄位。如果需要隱藏 representation，可以在 header 只 forward-declare `struct Inventory;`，把真正定義放在 `.c`，形成 opaque type。

## `enum` 表達有限狀態

```c
typedef enum {
    TOOL_PICKAXE,
    TOOL_AXE,
    TOOL_SHOVEL,
} ToolType;

const char *tool_name(ToolType type) {
    switch (type) {
        case TOOL_PICKAXE: return "pickaxe";
        case TOOL_AXE:     return "axe";
        case TOOL_SHOVEL:  return "shovel";
        default:           return "unknown";
    }
}
```

C `enum` 的 enumerator 會對應 integer-like value；不要假設外部輸入一定落在列出的成員。`switch` 應保留 `default` 或明確處理未知值。這和 Java `enum` 不同：Java enum 可以有 fields、methods、constructor 與 object identity；C enum 主要是整數常數集合。

## Header 與 implementation

```c
/* player_state.h */
#ifndef PLAYER_STATE_H
#define PLAYER_STATE_H

typedef struct PlayerState PlayerState;

PlayerState *player_state_create(int health);
void player_state_destroy(PlayerState *state);
int player_state_health(const PlayerState *state);

#endif
```

```c
/* player_state.c */
#include "player_state.h"
#include <stdlib.h>

struct PlayerState {
    int health;
};

PlayerState *player_state_create(int health) {
    PlayerState *state = malloc(sizeof *state);
    if (state == NULL) return NULL;
    state->health = health;
    return state;
}

void player_state_destroy(PlayerState *state) {
    free(state);
}

int player_state_health(const PlayerState *state) {
    return state == NULL ? 0 : state->health;
}
```

header 暴露 function contract，`.c` 保留 representation。呼叫端只需要知道 `PlayerState *` 的使用方式，不必知道欄位布局；這是 C 中常見的封裝技巧。

## Include 與 translation unit

每個 `.c` 檔案會先經過 preprocessing，形成 translation unit，再由 compiler 產生 object file，最後由 linker 組合。header guard 避免同一 header 在一個 translation unit 中重複展開；`#include` 不是 Java `import` 的同義詞。

## 常見錯誤

不要在 header 定義可被多重 include 的 non-`static` global，否則可能出現 multiple definition；不要把 implementation detail 全部暴露出去；不要用任意 integer 取代 enum validation；也不要在 `struct` 仍可能為 incomplete type 時直接存取欄位。

## Minecraft 對照

C `struct` 可幫助你理解 data layout 與 native serialization，但不等於 Minecraft Java 的 `class`、`record` 或 `enum`。Fabric、NeoForge、Paper 的 registry、event、item 與 entity contract 仍以 Java type system、mapping 與平台 lifecycle 為準。

## 練習

把 `PlayerState` 改成 opaque type，新增 `player_state_set_health`，限制 health 在 `0` 到 `20`，並將 create／destroy／getter／setter 分成 header 與 implementation。用另一個 `.c` 檔案呼叫它並確認外部無法直接存取 private representation。

## References

[1]: https://en.cppreference.com/w/c/language/struct "cppreference — struct and union declarations"
[2]: https://en.cppreference.com/w/c/language/enum "cppreference — enum declarations"
[3]: https://en.cppreference.com/w/c/preprocessor/include "cppreference — include directive"
