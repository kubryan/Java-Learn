import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;

/**
 * 桌面工具的最小起點：建立視窗，並讓按鈕改變畫面上的狀態訊息。
 */
public class FirstWindow {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(FirstWindow::createAndShowWindow);
    }

    private static void createAndShowWindow() {
        JFrame frame = new JFrame("Java 檔案整理工具｜練習版");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        JLabel statusLabel = new JLabel("狀態：尚未選擇資料夾", JLabel.CENTER);
        JButton checkButton = new JButton("確認視窗事件");
        checkButton.addActionListener(event -> statusLabel.setText("狀態：按鈕事件已接收"));

        JPanel controls = new JPanel();
        controls.add(checkButton);
        frame.add(statusLabel, BorderLayout.CENTER);
        frame.add(controls, BorderLayout.SOUTH);
        frame.setSize(460, 260);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}
