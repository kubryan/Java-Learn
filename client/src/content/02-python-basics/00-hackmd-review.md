---
title: Python 既有筆記審核：保留學習順序，重寫錯誤說法
slug: python-hackmd-review
category: Python 基礎
order: 100
level: 導讀
tags: Python, 筆記審核, 勘誤, HackMD
summary: 這一組 Python 筆記依官方文件重新編寫；保留原先由輸出、變數、判斷到字串的路線，但不直接複製原文。
---

## 審核方式

這個單元以你原本的 Python HackMD 筆記為學習地圖：先看輸出與變數，再學條件、迴圈、字串和編碼。網站不會把原文直接搬進來，而是對照 Python 官方文件，改寫為可執行的 Python 3 範例，並標示需要修正的重點。[1]

## 已修正的重點

| 原稿重點 | 審核結果 | 本網站採用的說法 |
|---|---|---|
| 數字不能放進引號 | 錯誤 | `'123'` 是字串、`123` 是整數；是否加引號取決於你要表達的型別。 |
| `print("...", sep=",")` 會改字串內逗號 | 錯誤 | `sep` 只會放在多個 `print` 位置參數之間。 |
| 變數是固定的儲存空間 | 容易誤導 | Python 名稱會繫結到物件；先以「名字指向值」理解即可。 |
| `Ture`、`Flase` | 拼字錯誤 | 必須是 `True` 與 `False`。 |
| 複數虛數單位是 `J` | 不完整 | Python 字面量可用 `j` 或 `J`，慣例用小寫 `j`。 |
| `-=` 等於加法 | 錯誤 | `a -= b` 等同於 `a = a - b`。 |
| `//` 一律無條件捨去 | 不精確 | 它是向負無限大取整；負數例子特別容易看出差異。 |
| `input()` 會得到數字 | 錯誤 | `input()` 一律回傳 `str`，需要時自行 `int()` 或 `float()`。 |
| `\t` 固定四格、`\r` 是 delete | 錯誤 | tab 寬度由顯示環境決定；`\r` 是 carriage return，效果取決於終端機。 |
| `if-elif-else` 是連續三個 `if` | 錯誤 | 中間分支必須使用 `elif`，才能保證多選一。 |
| `for` 只能走字串 | 錯誤 | `for` 能走任何 iterable，例如字串、list、tuple、dict。 |
| Unicode 一律兩個位元組 | 錯誤 | Python `str` 是 Unicode 文字；編碼成 bytes 時才取決於 UTF-8 等編碼。 |
| 字串索引得到 byte | 錯誤 | 字串索引得到一個長度為 1 的 `str`。 |
| `print r"\n"` | Python 2 語法 | Python 3 寫成 `print(r"\n")`。 |

## 接下來怎麼讀

先完成「輸出、名稱與型別」，再讀「輸入、條件與迴圈」。字串與編碼應留到你已能清楚分辨 `str` 和 `bytes` 後再讀。這樣的順序保留了原筆記的優點，同時避免在前幾頁累積難以排查的錯誤。

> 好的複習筆記要讓你知道「為什麼這行能執行」；不只記得一段看起來像程式碼的文字。

## References

[1]: https://hackmd.io/@kukuku/Python_ "使用者提供的 Python 入門筆記"
[2]: https://docs.python.org/3/library/functions.html "Built-in Functions — Python Documentation"
[3]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
[4]: https://docs.python.org/3/tutorial/controlflow.html "More Control Flow Tools — Python Documentation"
[5]: https://docs.python.org/3/reference/lexical_analysis.html "Lexical analysis — Python Documentation"
