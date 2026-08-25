---
title: 字串索引、切片與常用方法：讀取會得到字元，不是 byte
slug: python-strings-slices-methods
category: Python 基礎
order: 105
level: 入門
tags: string, index, slice, find, index, replace, split, in
summary: 正確使用字串索引、切片、find、index、replace 與 split，並理解不可變字串的特性。
---

## 索引與切片

字串是不可變的 Unicode 文字序列。`text[0]` 取得一個長度為 1 的 `str`，不是某個位元組。負索引從尾端開始，`-1` 代表最後一個字元。[1]

```python
text = "abcdefghijk"
print(text[1])        # b
print(text[1:4])      # bcd：起點包含、終點不包含
print(text[:7])       # abcdefg
print(text[::-1])     # kjihgfedcba
print(text[-1:-5:-1]) # kjih
```

若步長是預設的正數，`text[-1:-5]` 會得到空字串，因為起點在右、終點在左；要往左切取必須指定負的 step。

## 搜尋與替換

```python
name = "kaikai"
print(name.find("kai"))       # 0；找不到時回傳 -1
print(name.find("k", 2))       # 3
print(name.replace("kai", "Kai"))  # KaiKai
print(name.split("a"))         # ['k', 'ik', 'i']
```

`find()` 找不到時回傳 `-1`；`index()` 找不到時會丟出 `ValueError`。`replace()` 不會修改原字串，而是回傳新的字串；若要保留結果，必須重新指定給名稱。[1]

```python
message = "hello world"
if "world" in message:
    print("找到了")

message = message.replace("world", "Python")
print(message)
```

## References

[1]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
[2]: https://docs.python.org/3/tutorial/introduction.html "An Informal Introduction to Python — Python Documentation"
