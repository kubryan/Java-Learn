---
title: 桌面工具起點：用 Swing 做第一個視窗
slug: swing-first-window
category: 桌面工具
order: 51
level: 基礎完成後
tags: Swing, JFrame, 事件, 桌面程式
summary: 先建立一個能關閉、能顯示內容的視窗，再逐步加入按鈕與檔案處理。
---

## 為什麼先從 Swing 開始

Swing 是 Java 的桌面 GUI 工具組，適合用來理解視窗、元件、版面與事件處理等觀念。[1] 這裡的目的不是立刻做出華麗介面，而是把你在命令列學到的程式邏輯，放進使用者可以操作的視窗。

## 最小視窗

```java
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingUtilities;

public class FirstWindow {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Java 學習工具");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.add(new JLabel("第一個桌面視窗", JLabel.CENTER));
            frame.setSize(420, 240);
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}
```

## 接下來的實作順序

1. 先加入輸入欄與按鈕，理解事件如何呼叫方法。
2. 再加入 `JFileChooser`，讓使用者選擇資料夾。
3. 最後才加入檔案整理、設定保存與錯誤提示。

## 常見錯誤

視窗顯示後無法正常關閉，通常是忘了設定 `setDefaultCloseOperation`。另一個常見問題是在事件裡做長時間檔案操作，導致視窗卡住；後續會學習如何把耗時工作和 UI 執行緒分開。

## References

[1]: https://docs.oracle.com/javase/tutorial/uiswing/ "The Swing Tutorial — Oracle"
