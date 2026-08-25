import java.util.Scanner;

/**
 * Scanner 練習：先確認輸入可否轉成 int，再讀取資料。
 */
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
