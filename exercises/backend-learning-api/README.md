# 學習進度 API：專案規格

這個專案安排在 Java 類別、集合、例外處理與 HTTP 概念都較穩定後再開始。第一版以 Spring Boot 建立，不直接加入資料庫。

## 第一版功能

| Endpoint | 行為 | 第一版資料來源 |
|---|---|---|
| `GET /api/notes` | 回傳筆記清單 | 記憶體中的 `List<LearningNote>` |
| `GET /api/notes/{id}` | 回傳單篇筆記 | 記憶體中的 `List<LearningNote>` |
| `PATCH /api/notes/{id}/completion` | 切換完成狀態 | 記憶體中的 `List<LearningNote>` |

## 建立順序

1. 以 [Spring Initializr](https://start.spring.io/) 建立 Java 專案，選擇與當前 JDK 相容的 Spring Boot 版本。
2. 建立 `LearningNote` 類別，先只包含 `id`、`title` 與 `completed`。
3. 建立 service，將資料規則放在 service，而非 controller。
4. 建立 controller，把 HTTP request 轉為 service 呼叫。
5. 用 API 工具測試成功、找不到資料與無效輸入三種情況。

資料庫、登入與部署都保留到 API 基本流程完成之後再加入。
