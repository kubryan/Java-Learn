# NeoForge 練習專案起點

請先完成 `../COMMON_FEATURE_SPEC.md`，再依 [NeoForge 官方文件](https://docs.neoforged.net/) 與目標 Minecraft 版本的 MDK 建立獨立專案。建立後將實際版本填入這份檔案，並依官方流程完成物品、資源與驗證。

## 必做驗證

1. 使用目標版本相容的 JDK 與建置工具。
2. build 成功且沒有 registry 或資源載入錯誤。
3. client 啟動後可取得並使用物品。
4. 將實作結果與 Fabric 的「功能規格」比較，而不是比較是否使用相同 API。

不要把 Fabric 的 entrypoint、事件或依賴設定直接帶進這個資料夾。
