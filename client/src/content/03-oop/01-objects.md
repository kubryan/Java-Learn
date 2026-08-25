---
title: 類別與物件：把資料與行為放在一起
slug: objects
category: 物件導向
order: 31
level: 入門
tags: class, object, constructor, encapsulation
summary: 從一個 Player 類別開始，理解類別是設計圖、物件是實際建立出來的資料與行為。
---

## 類別不是物件

類別像一張設計圖；物件則是依照設計圖建立出來的實體。把相關資料和操作資料的方法放在同一個類別裡，能讓程式比較容易擴充與測試。

```java
public class Player {
    private final String name;
    private int health;

    public Player(String name, int health) {
        this.name = name;
        this.health = health;
    }

    public void takeDamage(int damage) {
        health = Math.max(0, health - damage);
    }

    public int getHealth() {
        return health;
    }
}
```

## 為什麼 `private` 很重要

把欄位設為 `private`，代表外部程式不能隨便把生命值改成負數。要修改資料時，透過方法檢查規則，這就是封裝的第一步。

## getter、setter 與 this

慣例上，getter 不接收參數、只讀取值；setter 才接收一個新值。`this` 出現在實例方法或建構子時，代表目前這個物件的參考，常用來區分同名的欄位與參數。

```java
public class Profile {
    private String name;

    public Profile(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        if (!name.isBlank()) {
            this.name = name;
        }
    }
}
```

不要把 `this` 解釋為可以直接操作的「記憶體位址」；在 Java 程式碼層次，把它理解為「目前物件」最安全也最實用。

## 練習：把待辦事項物件化

建立 `Task` 類別，包含標題、是否完成與 `complete()` 方法。然後建立兩個物件並輸出狀態。不要急著學繼承；先讓一個類別的責任清楚。

## 複習速查

- `class` 定義資料與行為。
- `new Player(...)` 建立一個物件。
- 建構子負責設定物件初始狀態。
- `private` 欄位配合公開方法，有助於守住資料規則。

## References

[1]: https://dev.java/learn/classes-objects/ "Classes and Objects — Dev.java"
