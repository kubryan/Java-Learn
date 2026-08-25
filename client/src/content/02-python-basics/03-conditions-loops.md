---
title: 條件與迴圈：靠縮排定義程式的層級
slug: python-conditions-loops
category: Python 基礎
order: 103
level: 入門
tags: if, elif, else, while, for, range, break, continue
summary: 用正確縮排寫 if、elif、while、for，並避免 continue 造成無限迴圈。
---

## `if`、`elif`、`else` 是多選一的分支

一串 `if`／`elif`／`else` 最多只會執行第一個成立的分支。原筆記的基本格式將中間分支寫成重複的 `if`，那會改成多個獨立判斷，行為不同。[1]

```python
score = 85

if 90 <= score <= 100:
    print("優秀")
elif 60 <= score < 90:
    print("及格")
elif 0 <= score < 60:
    print("需要複習")
else:
    print("分數無效")
```

`and`、`or`、`not` 都可以用在條件中。它們有短路行為，且 `and`／`or` 在一般運算式中會回傳其中一個運算元；初學時先將它們放在清楚的比較式中即可。[2]

```python
fruit = "蘋果"
if fruit == "蘋果" or fruit == "水蜜桃":
    print("帶來了水果")
```

## `while`：條件成立就重複

```python
count = 1
while count <= 3:
    print(f"第 {count} 次")
    count += 1
```

縮排表示哪些敘述屬於迴圈。若條件永遠不變，迴圈就不會停止。使用 `continue` 時更要確認計數器還會被更新；以下寫法把更新放在前面，避免 `count == 3` 時反覆卡住：

```python
count = 1
while count <= 5:
    if count == 3:
        count += 1
        continue
    print(count)
    count += 1
```

## `for` 與 `range()`

`for` 可以走任何 iterable，不只字串。`range()` 回傳可迭代的數字範圍，結束值不包含在內。[1]

```python
for number in range(1, 6):
    print(number)  # 1 到 5

for letter in "你好":
    print(letter)
```

`break` 結束最內層迴圈；`continue` 跳過這一次，直接進入下一次。不要在迴圈外使用它們。

## References

[1]: https://docs.python.org/3/tutorial/controlflow.html "More Control Flow Tools — Python Documentation"
[2]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
