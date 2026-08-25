# 學習進度 API

這是一個可執行的 Spring Boot 第一版練習，先使用記憶體中的 `List<LearningNote>`，專注練習 model、service、controller、validation 與 HTTP 錯誤處理。資料庫、登入與部署保留到 API 基本流程完成後再加入。

## 第一版功能

| Endpoint | 行為 | 成功回應 | 失敗回應 |
|---|---|---|---|
| `GET /api/notes` | 回傳筆記清單 | `200` + JSON array | — |
| `GET /api/notes/{id}` | 回傳單篇筆記 | `200` + JSON object | 不存在時 `404` |
| `PATCH /api/notes/{id}/completion` | 設定完成狀態 | `200` + 更新後筆記 | 無效 body 時 `400`，不存在時 `404` |

PATCH request 範例：

```json
{
  "completed": true
}
```

## 執行

需求是 Java 21。專案內含 Maven Wrapper，不需要另外安裝 Maven。進入本資料夾後執行測試：

```bash
# macOS／Linux
./mvnw test

# Windows PowerShell
.\mvnw.cmd test
```

啟動本機 API：

```bash
# macOS／Linux
./mvnw spring-boot:run

# Windows PowerShell
.\mvnw.cmd spring-boot:run
```

服務預設位於 `http://localhost:8080`。例如：

```bash
curl http://localhost:8080/api/notes
curl http://localhost:8080/api/notes/1
curl -X PATCH http://localhost:8080/api/notes/1/completion \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'
```

Windows PowerShell 可將最後一段寫成：

```powershell
Invoke-RestMethod -Method Patch `
  -Uri http://localhost:8080/api/notes/1/completion `
  -ContentType 'application/json' `
  -Body '{"completed":true}'
```

## 專案結構

`LearningNote` 是 record model；`LearningNoteService` 保存記憶體資料並集中處理查詢／更新規則；`LearningNoteController` 只負責 HTTP 路由；`ApiExceptionHandler` 將找不到資料與 validation 錯誤轉成清楚的 JSON 錯誤回應。`LearningNoteControllerTest` 使用 MockMvc 覆蓋清單、單筆查詢、404、成功更新與無效輸入。

這個練習仍是單機記憶體版本；重新啟動服務後，完成狀態會回到初始資料。下一階段才適合加入 repository、資料庫與持久化測試。
