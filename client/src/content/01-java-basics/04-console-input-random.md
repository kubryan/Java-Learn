---
title: 鍵盤輸入與隨機數：Scanner、Random 的安全起點
slug: console-input-random
category: Java 基礎
order: 14
level: 入門
tags: Scanner, Random, 輸入, 例外處理
summary: 先檢查輸入格式，再讀取資料；用 Random 做練習遊戲，但知道它不是安全用途的亂數。
---

## 從鍵盤讀取整數

`Scanner` 能將輸入拆成 token，再使用 `nextInt()`、`next()` 等方法轉換。直接呼叫 `nextInt()` 遇到非數字可能拋出 `InputMismatchException`，所以初學練習先以 `hasNextInt()` 檢查格式。[1]

```java
import java.util.Scanner;

public class ReadAge {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("請輸入年齡：");

        if (scanner.hasNextInt()) {
            int age = scanner.nextInt();
            System.out.println("明年你會是 " + (age + 1) + " 歲。");
        } else {
            System.out.println("請輸入整數，不要輸入文字。");
        }
    }
}
```

當程式很小且 `Scanner` 綁定 `System.in` 時，初學範例通常不在中途關閉它，避免連同標準輸入一起關閉。日後讀取檔案或網路資源時，再依資源生命週期使用 try-with-resources。

## 用 Random 做猜數字練習

```java
import java.util.Random;

Random random = new Random();
int answer = random.nextInt(100) + 1; // 1 到 100
```

`nextInt(100)` 的結果為 `0` 到 `99`；加上 `1` 後才會是 `1` 到 `100`。`Random` 產生的是偽隨機數，適合遊戲、抽題與練習；密碼、token 或安全碼必須使用 `SecureRandom`，不能沿用這個類別。[2]

## 練習

把 `ReadAge` 改成猜數字遊戲：先產生 1 到 10 的答案，再重複讀取輸入。每次輸入後只回答「太大」、「太小」或「猜中了」。當輸入不是整數時，顯示提示並讓迴圈繼續，而不是讓程式直接結束。

## References

[1]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Scanner.html "Scanner (Java SE 21 API)"
[2]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Random.html "Random (Java SE 21 API)"
