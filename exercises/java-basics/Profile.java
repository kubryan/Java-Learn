/**
 * 封裝練習：getter 無參數；setter 接收新值並檢查規則。
 */
public class Profile {
    private String name;

    public Profile(String name) {
        setName(name);
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("名稱不能是空白");
        }
        this.name = name;
    }
}
