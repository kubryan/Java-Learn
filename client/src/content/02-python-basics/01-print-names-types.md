---
title: 輸出、名稱與基本型別：寫出第一段可解釋的 Python
slug: python-print-names-types
category: Python 基礎
order: 101
level: 零基礎
tags: print, 變數, identifier, int, float, bool, complex, str
summary: 學會 print 的 sep 與 end，並分清 Python 名稱、字串、數字與布林值。
---

## `print()` 印的是值，不是固定某種型別

數字能不能加引號，取決於它要不要被當成文字。`123` 是整數；`"123"` 是字串。`print()` 能印出兩者，但後續可做的事情不同。

```python
print(123)
print("123")
print("Hello", "Python", sep=" / ", end="!\n")
```

`sep` 是多個位置參數之間的分隔字串；`end` 是輸出最後接上的字串。若只傳入一個要印的物件，設定 `sep` 不會改變那個字串內原本的逗號。[1]

## Python 的變數比較像「名字」

先把 `score = 95` 理解成：「把名字 `score` 綁定到值 `95`。」這個說法比「開一格固定記憶體」更接近 Python 的日常使用方式。

```python
score = 95
player_name = "Kai"
print(type(score))
print(type(player_name))
```

名稱不能以數字開頭，也不能使用保留字。雖然 Python 支援 Unicode 名稱，實務上仍建議以清楚的英文與底線命名，例如 `player_name`、`total_price`。[2]

## 入門最常用的基本型別

| 型別 | 例子 | 用途 |
|---|---|---|
| `int` | `14` | 任意精度的整數 |
| `float` | `2.6` | 一般小數；要留意二進位浮點的精度限制 |
| `bool` | `True`、`False` | 條件判斷 |
| `complex` | `3 + 2j` | 複數；虛部字面量用 `j` 或 `J` |
| `str` | `"Hello"` | Unicode 文字 |

`bool` 的兩個值拼字必須正確：`True` 和 `False`。它確實是 `int` 的子類別，但初學條件判斷時，請把它當成「真／假」而非一般數字使用。[3]

## 練習

建立 `name`、`age` 和 `is_student` 三個名稱，用一個 f-string 印出完整自我介紹。下一頁會說明 f-string 與使用者輸入。

## References

[1]: https://docs.python.org/3/library/functions.html "Built-in Functions — Python Documentation"
[2]: https://docs.python.org/3/reference/lexical_analysis.html "Lexical analysis — Python Documentation"
[3]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
