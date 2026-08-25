---
title: 識別字、字面量與基本型別：避免一開始就記錯
slug: identifiers-literals-types
category: Java 基礎
order: 13
level: 入門
tags: identifier, literal, primitive, null, 型別轉換
summary: 釐清名稱能怎麼取、程式碼中的固定值代表什麼，以及基本型別與 null 的界線。
---

## 識別字是程式裡的名字

類別、方法與變數的名稱都叫識別字。Java 支援 Unicode，所以技術上可使用中文、英文或其他文字；不過團隊程式碼通常採用有意義的英文，方便搜尋、閱讀與跨工具合作。第一個字元不能是數字，不能使用保留字；`$` 雖可使用，但官方只建議用在機器產生的程式碼。單獨的 `_` 也不能再當成名稱。[1]

```java
int score = 90;        // 合法且清楚
String playerName = "Ava";
int 2ndScore = 80;     // 不合法：不能用數字開頭
int class = 1;         // 不合法：class 是保留字
```

## 字面量是直接寫在程式碼裡的值

```java
int lives = 3;             // 整數字面量
double ratio = 1.5;        // 浮點數字面量
char grade = 'A';          // 字元字面量
String message = "Hello"; // 字串字面量
boolean ready = true;      // 布林字面量
```

`null` 也是一種 literal，但它不是「空字串」也不是 `0`。它代表沒有指向任何物件的參考，因此只能用於參考型別，例如 `String`、陣列或你自訂的類別；基本型別如 `int`、`double`、`boolean` 不能存放 `null`。[2]

## 八種基本型別

| 分類 | 型別 | 入門時常見用途 |
|---|---|---|
| 整數 | `byte`、`short`、`int`、`long` | 一般計數先用 `int`；大範圍整數用 `long` |
| 浮點數 | `float`、`double` | 一般小數先用 `double` |
| 字元 | `char` | 單一 UTF-16 code unit，例如 `'A'` |
| 布林 | `boolean` | 條件的真或假 |

`boolean` 只有 `true` 與 `false` 兩個值。Java 語言規格沒有要求它在記憶體中一定占用多少 byte，因此入門筆記不需要背「boolean 一定占 1 byte」。`int` 的範圍是 `-2147483648` 至 `2147483647`。[2]

## 不要背成單一路徑的型別大小表

型別轉換要看規則，不是只比「誰比較大」。例如 `int` 可以自動轉為 `long`，但 `long` 轉為 `float` 雖也是 widening conversion，仍可能失去精度；反過來的 narrowing conversion 通常需要明確 cast，也可能改變值。[3]

```java
int amount = 123;
long exactAmount = amount;      // 自動轉換
double average = 12.8;
int roundedDown = (int) average; // 結果為 12，明確告訴讀者可能失去小數
```

## 複習速查

- 名稱要能說明用途，例如 `totalScore`，避免 `a`、`b`、`temp2`。
- `String` 是參考型別，`int` 是基本型別。
- `null` 不是萬用的「空值」；先問變數是不是參考型別。

## References

[1]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html "Java Language Specification, Chapter 3"
[2]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html "Java Language Specification, Chapter 4"
[3]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html "Java Language Specification, Chapter 5"
