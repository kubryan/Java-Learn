# Minecraft 雙平台共通功能規格

這份規格是 Fabric 和 NeoForge 練習的共同起點。兩個專案都應各自實作與驗證，而不是互相複製程式碼。

## 第一個功能：校準石（Calibration Stone）

新增一個可在創造模式分類取得的物品。使用時只顯示目前玩家的座標與目前環境資訊；它不修改世界、不傳送自訂封包，也不需要 Mixin。這個範圍足以練習物品註冊、資源、語言檔與安全的 client/server 思考。

| 項目 | 驗收條件 |
|---|---|
| 模組 ID | 使用小寫、唯一且所有資源路徑一致 |
| 物品註冊 | 啟動後可被遊戲識別，不產生 registry 錯誤 |
| 資源 | 至少包含模型、材質、英文與繁體中文語言檔 |
| 創造模式 | 物品出現在指定分類，或有明確取得方式 |
| 行為 | 使用時不改變世界，只回饋查詢訊息 |
| 驗證 | build 成功、client 能啟動、物品可取得與使用 |

## 版本紀錄模板

每一個 loader 專案的 README 都需填寫以下欄位：

```text
minecraft_version:
java_version:
loader_or_mdk_version:
api_version:
build_tool_version:
last_verified_at:
```

遇到 API 錯誤時，先比對這些欄位與範例來源，再修改程式。
