---
title: Windows 命令列：找到並執行你的 Java 檔案
slug: windows-command-line
category: 開始使用
order: 3
level: 零基礎
tags: Windows, CMD, cd, dir, javac, java
summary: 用最少的 CMD 指令定位資料夾、編譯 Java 檔，並理解每一行在做什麼。
---

## 先認識目前位置

在 Windows 按下 `Win + R`、輸入 `cmd` 後，會開啟命令提示字元。命令列的每一行都在「目前資料夾」執行，所以先知道自己在哪裡很重要。

| 命令 | 用途 | 範例 |
|---|---|---|
| `dir` | 列出目前資料夾的檔案與子資料夾 | `dir` |
| `cd 資料夾名` | 進入下一層資料夾 | `cd Desktop` |
| `cd ..` | 回到上一層資料夾 | `cd ..` |
| `cd \` | 回到目前磁碟機的根目錄 | `cd \` |
| `E:` | 切換到 E 磁碟機 | `E:` |
| `cls` | 清除畫面 | `cls` |
| `exit` | 關閉 CMD | `exit` |

若資料夾名稱有空白，請用雙引號包住路徑，例如：

```bat
cd "C:\Users\你的名字\Desktop\Java 練習"
```

## 編譯與執行

假設目前資料夾裡有 `HelloJava.java`，請執行：

```bat
javac HelloJava.java
java HelloJava
```

第一行會產生 `HelloJava.class`；第二行用類別名稱啟動程式，所以**不要**寫成 `java HelloJava.java` 或 `java HelloJava.class`。請先確認 `javac --version` 能顯示版本，否則代表 JDK 尚未正確安裝或沒有加入 PATH。[1]

## 練習

建立一個 `practice` 資料夾，把 `HelloJava.java` 放進去，依序使用 `dir`、`cd`、`javac` 和 `java`。每成功一次，就在你自己的筆記裡記錄「我所在的路徑」與「我執行的命令」。

## References

[1]: https://dev.java/learn/getting-started/ "Getting Started with Java — Dev.java"
