---
title: 環境準備：讓第一個 Java 程式能跑
slug: environment
category: 開始使用
order: 2
level: 零基礎
tags: JDK, IDE, 指令列, 編譯
summary: 了解 JDK、原始碼、編譯與執行四件事，並建立第一次成功執行的環境。
---

## 你需要什麼

請安裝一個穩定的 JDK，並使用一套能編輯 Java 的 IDE。JDK 包含 Java 編譯器和執行環境；IDE 則幫你管理檔案、顯示錯誤並執行程式。Minecraft 模組的 Java 版本必須依目標 Minecraft 與 loader 的官方需求決定，因此不要假設所有專案只用同一版 JDK。[1]

## 第一個檢查

在終端機輸入：

```bash
java --version
javac --version
```

若兩行都能顯示版本資訊，代表系統找得到 Java。`java` 用來執行已編譯的程式；`javac` 用來把 `.java` 原始碼編譯成 JVM 可執行的 class 檔。

## HelloJava

建立 `HelloJava.java`，內容如下：

```java
public class HelloJava {
    public static void main(String[] args) {
        System.out.println("你好，Java！");
    }
}
```

接著在同一個資料夾輸入：

```bash
javac HelloJava.java
java HelloJava
```

## 常見錯誤

| 現象 | 常見原因 | 先檢查什麼 |
|---|---|---|
| 找不到 `javac` | 只安裝了 runtime 或 PATH 尚未設定 | 重新安裝 JDK，重開終端機 |
| `class HelloJava is public` 錯誤 | 檔名與 public class 名稱不同 | 兩者都應叫 `HelloJava` |
| 找不到或無法載入主類別 | 執行時加了 `.class` 或不在正確資料夾 | 使用 `java HelloJava` |

## 複習速查

- `.java` 是你寫的原始碼。
- `javac` 把原始碼編譯成 `.class`。
- `java 類別名稱` 會啟動 `main` 方法。

## References

[1]: https://dev.java/learn/getting-started/ "Getting Started with Java — Dev.java"
