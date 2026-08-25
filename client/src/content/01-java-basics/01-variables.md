---
title: 變數與資料型別：讓程式記住資料
slug: variables
category: Java 基礎
order: 11
level: 入門
tags: 變數, int, double, boolean, String
summary: 用正確型別保存數字、文字與真假值，並知道何時該選哪一種。
---

## 本章目標

變數可以想成有名字的資料位置。Java 要求你在使用變數前先說明型別，這會讓編譯器提早發現不少錯誤。

```java
int age = 16;
double price = 49.5;
boolean isMember = true;
String name = "小明";

System.out.println(name + " 的年齡是 " + age);
```

## 常用型別

| 型別 | 用途 | 範例 |
|---|---|---|
| `int` | 整數 | 生命值、數量、年齡 |
| `double` | 有小數的數字 | 價格、座標、平均值 |
| `boolean` | 只有真或假 | 是否登入、是否完成 |
| `String` | 文字 | 名稱、訊息、路徑 |

## 練習：計算總價

請建立 `ShoppingCart.java`。設定單價、數量與會員身分；會員可打九折，最後輸出總價。先寫出變數，再寫條件判斷。不要一開始把所有計算塞在一行。

## 常見錯誤

`String` 是類別名稱，所以開頭要大寫；`int` 和 `boolean` 則是 Java 的基本型別。另一個常見錯誤是把 `=` 當成「相等比較」：在 Java 中，`=` 是指定值，`==` 才是比較。

## 複習速查

- 變數宣告格式是「型別 名稱 = 值;」。
- 名稱請用能看懂用途的英文，例如 `totalPrice`，不要只寫 `a`。
- 型別不確定時，先問：它是整數、帶小數、真假，還是一段文字？

## References

[1]: https://dev.java/learn/language-basics/ "Java Language Basics — Dev.java"
