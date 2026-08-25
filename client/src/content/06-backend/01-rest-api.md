---
title: 後端 API 起點：資料如何走進又走出程式
slug: rest-api-start
category: 後端 API
order: 61
level: 基礎完成後
tags: HTTP, REST, JSON, Spring Boot
summary: 先理解請求、回應和 JSON，再用 Spring Boot 建立第一個可測試的 API。
---

## API 是什麼

後端 API 可以先理解為：其他程式透過 HTTP 傳送請求，你的 Java 程式檢查資料、執行規則，再傳回回應。常見回應內容使用 JSON，HTTP 狀態碼則描述請求是否成功。

| 動作 | 常見方法 | 例子 |
|---|---|---|
| 讀取資料 | `GET` | 取得課程清單 |
| 新增資料 | `POST` | 新增一筆學習紀錄 |
| 修改資料 | `PUT` 或 `PATCH` | 標記章節已完成 |
| 刪除資料 | `DELETE` | 移除一筆錯誤紀錄 |

## 第一個目標

使用 Spring Boot 建立一個學習進度 API，第一版只要能回應一個固定的課程清單即可。官方指南提供從建立專案到建立 HTTP endpoint 的最小流程；請先照著完成，再把固定資料抽成自己的類別。[1]

## 不要急著加資料庫

第一版先用記憶體中的 `List` 保存資料。這樣你可以專心看懂 controller、service、請求與回應；當 CRUD 與驗證都清楚後，再加入資料庫比較不會同時卡在四種不同錯誤。

## 複習速查

- HTTP 請求有方法、路徑、標頭與可能的內容。
- API 回應至少要有狀態碼與內容。
- 先寫小 endpoint 並用工具測試，勝過直接複製完整專案。

## References

[1]: https://spring.io/guides/gs/rest-service/ "Building a RESTful Web Service — Spring"
