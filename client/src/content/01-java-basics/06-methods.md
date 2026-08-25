---
title: 方法：把一個清楚的工作交給一個名字
slug: methods
category: Java 基礎
order: 16
level: 入門
tags: method, parameter, return, void, static
summary: 用方法消除重複、表達一件事的意圖，並分清參數、回傳值與 void。
---

## 方法的責任

方法不是「最小執行單位」，而是一段有名稱、可被呼叫的程式碼。當多處需要同一規則，或一段邏輯能用一句話說明目的時，就值得抽成方法。

```java
public static int findLarger(int left, int right) {
    if (left >= right) {
        return left;
    }
    return right;
}
```

這個方法的參數是 `left` 和 `right`，回傳型別是 `int`。呼叫它的人可以再使用結果：

```java
int larger = findLarger(8, 12);
System.out.println(larger);
```

## void 與 return

若方法的目的是做事而不是提供結果，可用 `void`：

```java
public static void printWelcome(String name) {
    System.out.println("歡迎，" + name);
}
```

`void` 方法可以省略 `return`；也可寫 `return;` 來提早結束，但後面不能接回傳值。非 `void` 的方法則必須在所有可能路徑回傳符合型別的值。

## 初學時的兩個規則

一般 Java 不能在一個方法裡再宣告另一個具名方法，所以方法通常寫在類別內、彼此平行。另一方面，範例中的 `public static` 是為了能從 `main` 直接呼叫；之後學物件導向時，許多行為會是物件的實例方法，不一定有 `static`。

## 練習

寫一個 `isEven(int number)`，回傳 `boolean`。然後在 `main` 中呼叫它，分別測試 `2`、`7` 和 `0`。先讓方法只做「判斷偶數」一件事，不要在裡面混入輸出和使用者輸入。

## References

[1]: https://dev.java/learn/classes-objects/ "Classes and Objects — Dev.java"
