/**
 * 對應「HackMD 既有筆記審核」後的可編譯範例。
 * 先執行，再逐段修改並觀察結果。
 */
public class CorrectedBasics {
    public static void main(String[] args) {
        int amount = 123;
        long exactAmount = amount;
        double average = 12.8;
        int roundedDown = (int) average;

        int[] scores = {80, 91, 76};
        int total = 0;
        for (int index = 0; index < scores.length; index++) {
            total += scores[index];
        }

        int day = 2;
        String dayName = switch (day) {
            case 1 -> "星期一";
            case 2 -> "星期二";
            default -> "其他日期";
        };

        System.out.println("long 值：" + exactAmount);
        System.out.println("轉成 int 後的小數結果：" + roundedDown);
        System.out.println("總分：" + total);
        System.out.println(dayName);
        System.out.println("12 和 8 較大者：" + findLarger(12, 8));
        System.out.println("7 是偶數嗎？" + isEven(7));
    }

    public static int findLarger(int left, int right) {
        return left >= right ? left : right;
    }

    public static boolean isEven(int number) {
        return number % 2 == 0;
    }
}
