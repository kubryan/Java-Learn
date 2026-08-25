---
title: 字串、bytes 與編碼：不要把 Unicode 背成固定位元組數
slug: python-strings-encoding
category: Python 基礎
order: 104
level: 入門
tags: str, bytes, UTF-8, encode, decode, escape, raw string
summary: 分清 Python 的文字 str 與位元組 bytes，正確理解 UTF-8、跳脫字元與原始字串。
---

## `str` 是文字，`bytes` 是資料的位元組表示

Python 3 原始碼預設採 UTF-8；程式中的 `str` 處理 Unicode 文字。字元在檔案、網路或磁碟傳輸時才需要選擇編碼，例如 UTF-8，不存在「所有 Unicode 字元固定兩個位元組」的規則。[1]

```python
text = "你好"
payload = text.encode("utf-8")  # str -> bytes
restored = payload.decode("utf-8")  # bytes -> str

print(payload)
print(restored)
```

`encode()` 不是把「其他編碼轉成 Unicode」；它是依指定編碼將 `str` 轉為 `bytes`。`decode()` 方向相反。編碼與解碼必須使用相同規則，否則可能產生 `UnicodeDecodeError` 或亂碼。

## 常用跳脫字元

| 寫法 | 代表 | 注意事項 |
|---|---|---|
| `\n` | 換行 | `print()` 的 `end` 預設就是換行 |
| `\t` | tab | 寬度取決於終端機或編輯器，不保證四格空白 |
| `\\` | 一個反斜線 | 用於 Windows 路徑等文字 |
| `\r` | carriage return | 顯示效果依終端機而異，不是刪除鍵 |

原始字串會盡量將反斜線視為字面文字：

```python
print(r"C:\\new_folder\\notes")
print(r"\n")
```

Python 3 的 `print` 是函式，所以不可寫成 Python 2 風格的 `print r"\n"`。另外，raw string 不能用單一反斜線作為結尾，因為它仍會和結尾引號產生語法歧義。[1]

## References

[1]: https://docs.python.org/3/reference/lexical_analysis.html "Lexical analysis — Python Documentation"
[2]: https://docs.python.org/3/library/stdtypes.html "Built-in Types — Python Documentation"
