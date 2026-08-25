---
title: 陣列：固定長度、從零開始的索引，以及常見越界
slug: arrays
category: Java 基礎
order: 15
level: 入門
tags: array, index, length, for, 二維陣列
summary: 用正確語法建立與走訪陣列，並知道 Java 的二維陣列其實是「陣列的陣列」。
---

## 陣列是固定長度的容器

陣列在建立時決定長度，之後不能改變長度；每個元素是同一種型別，索引從 `0` 開始。若長度是 `5`，有效索引就是 `0` 到 `4`。[1]

```java
int[] scores = {80, 91, 76};
System.out.println(scores[0]); // 80
System.out.println(scores.length); // 3
```

## 靜態與動態初始化

```java
int[] fixedValues = {11, 22, 33};
int[] emptySlots = new int[3];
```

第一種在建立時就提供資料；第二種只提供長度。`new int[3]` 的元素預設為 `0`，但不要把這件事和區域變數混為一談：**區域變數沒有自動預設值，使用前必須賦值。**[1]

## 用迴圈走訪

```java
int total = 0;
for (int index = 0; index < scores.length; index++) {
    total += scores[index];
}
System.out.println("總分：" + total);
```

最常見錯誤是寫成 `index <= scores.length`，最後一次會讀取不存在的索引而得到 `ArrayIndexOutOfBoundsException`。當你只需要讀值、不需要知道索引時，也可使用 for-each：

```java
for (int score : scores) {
    System.out.println(score);
}
```

## 二維陣列不是一塊神祕大記憶體

Java 的二維陣列是「陣列的陣列」，每一列可以有不同長度。原稿的範例少了元素之間的逗號；正確寫法如下：

```java
int[][] grid = {
    {1, 2, 3, 4},
    {5, 6}
};
```

因此走訪二維陣列時，每一列都應使用自己的 `length`，不能假設每列一樣長。[1]

## References

[1]: https://dev.java/learn/creating-arrays-in-your-programs/ "Creating Arrays in Your Programs — Dev.java"
