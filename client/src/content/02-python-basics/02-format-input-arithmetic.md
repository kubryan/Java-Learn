---
title: 格式化、輸入與運算：先知道資料是什麼型別
slug: python-format-input-arithmetic
category: Python 基礎
order: 102
level: 入門
tags: f-string, input, int, float, arithmetic, assignment
summary: 用 f-string 顯示資料，理解 input 回傳字串，並修正 // 與複合指定運算的常見誤解。
---

## 優先使用 f-string

Python 3 的 f-string 能直接在 `{}` 放入變數或運算式；原筆記的 `%s`、`%d` 屬於舊式格式化，現在仍可用，但不必把它當成主要寫法。[1]

```python
name = "Kai"
age = 18
average = 92.375

print(f"{name} 今年 {age} 歲")
print(f"平均分數：{average:.2f}")
```

格式規格 `.2f` 用於輸出時顯示兩位小數。它是格式化結果，不代表原本的 `float` 已經變成精確的十進位數；金融金額等需要十進位精確性的情境，日後要學 `decimal`。

## `input()` 回傳的是字串

無論使用者輸入 `18` 還是 `3.5`，`input()` 都回傳 `str`。要做數學運算時，請明確轉換並處理不合法輸入。[2]

```python
raw_age = input("請輸入年齡：")
age = int(raw_age)
print(f"明年你會是 {age + 1} 歲")
```

若輸入不是可轉換的整數，`int(raw_age)` 會丟出 `ValueError`。先理解這個規則，下一步才會學用 `try`／`except` 來處理它。

## 運算與複合指定

| 寫法 | 意義 | 範例結果 |
|---|---|---|
| `/` | 一般除法 | `9 / 2` 是 `4.5` |
| `//` | 向負無限大取整的除法 | `9 // 2` 是 `4`，`-1 // 2` 是 `-1` |
| `%` | 餘數 | `9 % 2` 是 `1` |
| `**` | 次方 | `2 ** 3` 是 `8` |
| `+=` | 加後存回原名稱 | `count += 1` |
| `-=` | 減後存回原名稱 | `balance -= price` |

```python
balance = 99
price = 66
balance -= price  # 等同於 balance = balance - price
print(balance)    # 33
```

`//` 的「向下」是朝負無限大，而不是只把小數尾端拿掉；這是它和 `int(-0.5)` 不同的地方。[3]

## References

[1]: https://docs.python.org/3/tutorial/inputoutput.html "Input and Output — Python Documentation"
[2]: https://docs.python.org/3/library/functions.html "Built-in Functions — Python Documentation"
[3]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
