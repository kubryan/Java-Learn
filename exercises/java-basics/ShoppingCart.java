/**
 * 變數、條件判斷與方法的基礎練習。
 */
public class ShoppingCart {
    public static void main(String[] args) {
        double unitPrice = 49.5;
        int quantity = 3;
        boolean isMember = true;

        double total = calculateTotal(unitPrice, quantity, isMember);
        System.out.printf("總價：%.1f%n", total);
    }

    public static double calculateTotal(double unitPrice, int quantity, boolean isMember) {
        double subtotal = unitPrice * quantity;
        return isMember ? subtotal * 0.9 : subtotal;
    }
}
