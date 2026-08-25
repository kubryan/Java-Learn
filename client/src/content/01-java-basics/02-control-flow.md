---
title: 條件與迴圈：讓程式做選擇與重複工作
slug: control-flow
category: Java 基礎
order: 12
level: 入門
tags: if, switch, for, while, 控制流程
summary: 用 if、for 與 while 把「如果…就…」和「重複做…」寫成清楚程式。
---

## `if`：根據條件做選擇

```java
int score = 82;

if (score >= 60) {
    System.out.println("通過");
} else {
    System.out.println("再練習一次");
}
```

條件必須是 `boolean`，也就是最後能得到 `true` 或 `false` 的表達式。

## `for`：知道要重複幾次時

```java
for (int day = 1; day <= 7; day++) {
    System.out.println("第 " + day + " 天：寫一個小練習");
}
```

`for` 的三個區域依序是初始化、繼續條件與每次結束後的更新。先用完整大括號寫清楚，再考慮精簡。

## 多條件與 switch

`else if` 必須帶條件；原稿少了這一段會無法編譯。

```java
int score = 75;

if (score >= 90) {
    System.out.println("優秀");
} else if (score >= 60) {
    System.out.println("通過");
} else {
    System.out.println("需要複習");
}
```

當選項是有限且離散的值，可以使用 `switch`。新式箭頭標籤不會發生 case 穿透；這種語法曾是預覽，已在 JDK 14 正式提供。[2]

```java
int day = 2;
switch (day) {
    case 1 -> System.out.println("星期一");
    case 2 -> System.out.println("星期二");
    default -> System.out.println("其他日期");
}
```

`&&` 是短路與：左側為 `false` 時不會計算右側；`||` 是短路或：左側為 `true` 時不會計算右側。條件區間要拆開寫成 `x > 5 && x < 15`，不能寫成數學式的 `5 < x < 15`。

## 練習：成績統計

給你一個整數陣列，例如 `int[] scores = {60, 75, 90};`，請用迴圈計算總分與平均。完成後試著處理空陣列，避免除以零。

## 常見錯誤

| 錯誤 | 為什麼會發生 | 修正方向 |
|---|---|---|
| 無限迴圈 | 條件永遠成立，或忘了更新計數器 | 在每一輪確認 `day` 是否改變 |
| 陣列越界 | 最後一個有效索引是 `length - 1` | 使用 `i < array.length` |
| 少了大括號 | 新增第二行敘述後才發現不在 if 內 | 入門期一律保留大括號 |

## References

[1]: https://dev.java/learn/control-flow/ "Control Flow Statements — Dev.java"
[2]: https://docs.oracle.com/en/java/javase/24/language/switch-expressions-and-statements.html "Switch Expressions and Statements — Oracle"
