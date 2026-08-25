---
title: 中英文一起學：技術術語與閱讀方式
slug: bilingual-study-guide
category: 開始使用
order: 4
level: 導讀
tags: 雙語, English, glossary, terminology, 技術英文
summary: 先用中文建立理解，再用英文術語連上原始文件；這一頁提供 Java 與 Python 共用的核心詞彙。
---

## 為什麼程式學習要中英文一起看？

程式語言的語法、函式與錯誤訊息幾乎都使用英文。你不需要先把英文學到很強才開始寫程式；更有效的方法是每次學一個概念，就同時記住它在英文文件中的名字。這個網站會採用「**中文解釋 + English term + original code**」的節奏。

> **Read the explanation in Chinese, recognize the term in English, then find it in code.**  
> 先讀中文解釋，再認出英文術語，最後在程式碼中找到它。

## 共用基礎術語 / Shared foundations

| 中文 | English | 最短解釋 |
|---|---|---|
| 程式 | program | 交給電腦執行的一組指令。 |
| 原始碼 | source code | 你撰寫、可閱讀的程式文字。 |
| 變數／名稱 | variable / name | 為資料取名字；Python 常特別稱為 name。 |
| 值 | value | 程式目前處理的資料，例如 `42` 或 `"hello"`。 |
| 型別 | type | 值能做什麼、如何被解讀的分類。 |
| 運算子 | operator | 進行運算的符號，例如 `+`、`==`、`and`。 |
| 條件 | condition | 會判斷成 true 或 false 的表達式。 |
| 分支 | branch | 依條件走向不同程式路徑。 |
| 迴圈 | loop | 重複執行一段程式。 |
| 函式／方法 | function / method | 可命名與重複呼叫的程式行為。 |
| 回傳值 | return value | 函式執行後交回給呼叫端的結果。 |
| 例外／錯誤 | exception / error | 執行出問題時產生的訊號或狀態。 |

## Java 核心術語 / Java essentials

| 中文 | English | 程式碼線索 |
|---|---|---|
| 類別 | class | `class Player { ... }` |
| 物件 | object | 由類別建立出來的實體。 |
| 執行進入點 | entry point | `public static void main(String[] args)` |
| 基本型別 | primitive type | `int`、`double`、`boolean`。 |
| 參考型別 | reference type | `String`、陣列、自訂類別。 |
| 建構子 | constructor | 建立物件時呼叫的特殊方法。 |
| 封裝 | encapsulation | 用 `private` 保護資料，再經方法操作。 |

## Python 核心術語 / Python essentials

| 中文 | English | 程式碼線索 |
|---|---|---|
| 繫結 | binding | `score = 95` 將名稱連到一個值。 |
| 可迭代物件 | iterable | 可被 `for` 逐項走訪的物件。 |
| 縮排 | indentation | 用空白決定程式區塊。 |
| 字串 | string / `str` | Unicode 文字，例如 `"你好"`。 |
| 位元組 | bytes | 編碼後的資料，例如 `b"hello"`。 |
| 切片 | slice / slicing | `text[1:4]` 取出一段序列。 |
| 格式化字串 | formatted string literal / f-string | `f"Score: {score}"`。 |

## 每篇筆記怎麼複習？

| 步驟 | 你要做什麼 | 英文訓練 |
|---|---|---|
| 1. 理解 | 先用中文讀懂定義與範例目標。 | 不求背譯文。 |
| 2. 對照 | 讀「中英文對照」或「English checkpoint」。 | 大聲唸出術語。 |
| 3. 實作 | 自己修改一行程式再執行。 | 從錯誤訊息找出認得的單字。 |
| 4. 回顧 | 關掉中文，只看英文術語說出意思。 | 寫一句英文小筆記。 |

## References

[1]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html "Java Language Specification, Chapter 4"
[2]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
[3]: https://docs.python.org/3/tutorial/controlflow.html "More Control Flow Tools — Python Documentation"
