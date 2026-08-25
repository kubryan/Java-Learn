# Fabric 練習專案起點

請先完成 `../COMMON_FEATURE_SPEC.md`，再使用 [Fabric Template Mod Generator](https://fabricmc.net/develop/template/) 建立獨立專案。建立後將實際版本填入這份檔案，並依官方文件完成物品註冊、資源與測試。

## 必做驗證

1. `./gradlew build` 成功。
2. 以對應設定啟動 client。
3. 物品可取得、材質與語言正常載入。
4. 使用物品後，確認行為在單人與伺服器思維下都合理。

不要把 NeoForge 的 import、registry 或 event bus 寫法帶進這個資料夾。
