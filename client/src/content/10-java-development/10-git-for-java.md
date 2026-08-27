---
title: Git for Java｜Java 專案版控
titleEn: Git for Java
topic: Java Source Control
terms: Git, repository, working tree, status, diff, stage, commit, branch, merge, rebase, revert, restore, bisect, tag, .gitignore, lockfile
slug: java-git-for-java
category: Java 開發
order: 11
level: 入門到中階
tags: Java, Git, Version Control, Branch, Commit, Diff, Merge, Rebase, .gitignore, Maven, Gradle, Minecraft Java
aliases: Java Git, Git for Java, Java 版控, Git workflow
summary: 用 Git 管理 Java、Maven、Gradle、Minecraft mod／plugin 專案，學會看 status／diff、精準 stage、寫可追溯 commit、處理 branch／merge／rebase、使用 revert／restore／bisect，並正確忽略 build output 與敏感本機檔案。
---

# Git for Java｜Java 專案版控

> **Git 的價值不是把檔案丟到 GitHub，而是保存「哪一次修改、為什麼修改、如何驗證、失敗時怎麼回到安全狀態」。**

Java 專案的 Git diff 不只有 `.java`：還包含 `pom.xml`、`build.gradle`、`settings.gradle`、`gradle.properties`、resource、mapping、mod metadata、JUnit test、CI workflow 與 lockfile。Minecraft mod／plugin 若只 commit source code，卻漏掉 build script、resource 或 mapping，別人通常無法重現同一個 jar。

## 學習完成標準

| 能力 | 完成後你應該能做到 |
|---|---|
| 狀態 | 用 `git status` 分辨 untracked、modified、staged 與 ahead／behind |
| Diff | 在 commit 前檢查實際 patch，而不是只相信 IDE 的檔案樹 |
| Stage | 只提交同一個原因的檔案，避免把暫存 log、密碼或 build output 一起 commit |
| Commit | 用清楚訊息描述 why／what，保留可追溯 checkpoint |
| Branch | 為 feature、bug fix、dependency upgrade 與 release 分開工作 |
| Recovery | 分清 `restore`、`revert`、reset、stash 與 reflog 的責任 |
| History | 用 `log`、`blame`、`bisect` 找到引入 regression 的 commit |
| Java hygiene | 忽略 `build/`、`out/`、`target/`、`.gradle/`、IDE cache 與 private local files |

## 1. Java 專案的第一個檢查

```bash
git status --short
git branch --show-current
git log -1 --oneline
git remote -v
```

常見 status：

| 標記 | 意義 |
|---|---|
| `??` | untracked，尚未納入 Git |
| ` M` | working tree modified，尚未 stage |
| `M ` | staged modified，已在 index 等待 commit |
| `A ` | staged new file |
| `D ` | staged deleted |
| `MM` | 同一檔案既有 staged 修改，又有新的 unstaged 修改 |

看到 `MM` 時要特別小心：`git diff` 與 `git diff --cached` 是兩個不同 patch。提交前至少檢查：

```bash
git diff
git diff --cached
git diff --check
git diff --cached --check
```

Windows 可能出現 LF／CRLF line-ending warning；那不一定是 whitespace error。真正的 trailing whitespace 仍應由 `git diff --check` 排除。

## 2. Java 專案該提交什麼？

| 應提交 | 通常應忽略 |
|---|---|
| `.java`、resource、test | `target/`、`build/`、`out/` |
| `pom.xml`、`build.gradle`、`settings.gradle` | `.gradle/`、Gradle cache |
| `gradlew`、`gradlew.bat`、`gradle/wrapper/` | IDE workspace、`.idea/`、`.classpath`、`.project` |
| `gradle.properties` 中不敏感的 project version | secret、token、private password、local absolute path |
| `src/main/resources`、mod metadata、plugin descriptor | generated jar、crash dump、server log |
| JUnit tests、CI workflow、dependency lock policy | 本機 player data、world save、runtime database |
| `package-lock`／`pnpm-lock`（依 project policy） | `.env`、local backup、private credentials |

Minecraft 專案還要判斷 mappings、generated resources、data generation output 與 local runtime data 是否是 source 或 build artifact。不要以「副檔名看起來像設定」判斷是否能公開；先檢查是否含 credential、private repository token 或本機絕對路徑。

## 3. 精準 stage 與 commit

```bash
git add src/main/java/com/example/mod/registry/ModItems.java
git add src/test/java/com/example/mod/registry/ModItemsTest.java
git diff --cached --check
git diff --cached --stat
git commit -m "Add calibration stone registry"
```

一個 commit 最好對應一個可說明、可驗證的原因。例如「新增 Workspace Assets 與 File Relations」可以包含 API、UI、index test 與 integration test；不要同一個 commit 同時混入無關的 IDE formatting、暫時 log、另一個 feature 與 personal config。

Commit message 要說明變更的目的：

```text
Add Object contract handbook
Clarify exception hierarchy
Fix Fabric registry mapping
Add regression test for invalid resource id
Upgrade Gradle wrapper to 8.x
```

提交前檢查 source、test、build：

```bash
mvn test
# 或
./gradlew test
./gradlew build
```

## 4. Branch、merge 與 rebase

```bash
git switch -c fix/registry-key-equality
# 修改、測試、commit
git fetch origin
git rebase origin/main
git push -u origin fix/registry-key-equality
```

Branch 名稱應讓人知道工作類型，例如 `feature/command-parser`、`fix/null-resource`、`chore/gradle-wrapper`。rebase 會重寫尚未公開的 commit identity；已被其他人使用的 branch 不要任意 rebase，依團隊 policy 決定。

發生 conflict 時，不要盲目選「ours」或「theirs」。先理解 Java source、resource、build script 與 test 哪一方的 intent，再檢查：

```bash
git status
git diff
git add <resolved-file>
git rebase --continue
# 或 merge 時：
git commit
```

解完 dependency、mapping 或 Gradle conflict 後，重新跑完整 build；能 merge 不代表 classpath、resource、runtime loader 或 remap 正確。

## 5. `restore`、`revert`、reset 與 stash

| 指令 | 主要用途 | 風險 |
|---|---|---|
| `git restore file` | 丟棄 working tree 尚未 stage 的修改 | 修改會消失，先確認 diff |
| `git restore --staged file` | 把檔案從 stage 拿回 working tree | 不會丟掉 working tree 修改 |
| `git revert <commit>` | 產生一個反向 commit，適合已公開歷史 | 可能產生新的 conflict |
| `git reset` | 移動 branch／index，依 mode 影響不同 | `--hard` 可能丟失未保存修改 |
| `git stash push` | 暫時收起未完成修改 | stash 若無命名，之後很難辨識 |
| `git reflog` | 找回本機曾指向過的 commit | 不是遠端備份，保留期有限 |

公開到 `main` 的錯誤修復通常優先使用 `git revert`，不要為了讓歷史看起來乾淨就 force push。任何 destructive command 前先保存 patch 或 branch：

```bash
git diff > before-reset.patch
git switch -c rescue/before-reset
```

## 6. Git 與 Java build files

`pom.xml`、`build.gradle` 與 `settings.gradle` 是 source，不是可隨意重新產生的 output。Dependency 或 plugin 版本修改要在同一個 review 中說明：

```text
version changed
    ↓
why this version?
    ↓
JDK／Gradle／Maven compatibility
    ↓
lockfile／wrapper／mapping impact
    ↓
test + build + runtime verification
```

Gradle Wrapper 的 `gradle-wrapper.properties`、wrapper jar／scripts 是否提交，以目前專案 policy 為準；對已使用 Wrapper 的 Java／Minecraft 專案，通常要讓 CI 與其他開發者使用相同 Gradle version。Maven 專案則應 review POM、parent／BOM、dependency tree 與 plugin。

## 7. 用 history 找 Java regression

```bash
git log --oneline --decorate --graph -20
git log -- pom.xml build.gradle
git blame src/main/java/com/example/mod/registry/ModItems.java
git show <commit>
```

當 bug 明確是「以前正常、某次修改後壞掉」，`git bisect` 可以用測試或 build 判斷 commit：

```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# 每輪執行測試後：
git bisect good
# 或
git bisect bad
git bisect reset
```

`bisect` 的 command 必須 deterministic。若 Minecraft runtime 需要網路、隨機 world、真實 server 或不穩定 external dependency，先把最小純 Java regression test 抽出來，否則 bisect 結果可能不可信。

## 8. Java／Minecraft `.gitignore` 邊界

典型的 build output：

```gitignore
**/target/
**/build/
**/out/
**/.gradle/
*.class
*.jar
```

但不要不加思考地忽略所有 `.jar`：有些專案會把必要的 local test fixture 或發行 artifact 放在明確的資料夾；依專案 policy 使用更窄的規則。使用者本機 Workspace Assets、private world、server logs、`.env` 與 local backup 應在明確的 local-only boundary 中被忽略，避免把個人資料與二進位檔推上 GitHub。

## 9. JavaBase 的可重現 workflow

```text
1. git status --short
2. git diff／git diff --cached
3. edit source + Markdown + test
4. pnpm check／test／build
5. git diff --check
6. git add only related files
7. git diff --cached --check
8. git commit
9. git push origin main or feature branch
10. git status + HEAD／origin comparison
```

對 JavaBase 本身，Markdown knowledge source、Vite source、Workspace middleware、IndexedDB derived index code 與 tests 應在 diff 中分層 review。`client/src/content/assets/` 與 `client/src/content/.javabase/` 是使用者本機 Workspace boundary，不應因一次 E2E 測試就變成 Git source。

## 10. 常見錯誤

| 錯誤 | 為什麼有問題 | 改法 |
|---|---|---|
| `git add .` 不看 diff | 可能加入 token、log、world save 或 build output | 精準 stage，先看 cached diff |
| 只看 IDE modified 標記 | 不知道 stage 與 working tree 的差異 | `git status --short`、兩種 `git diff` 都看 |
| 把 `target/`、`build/` commit | repository 變大且 output 不可重現 | `.gitignore`，保留 source／wrapper／resource |
| 漏掉 `pom.xml` 或 `build.gradle` | 別人無法重建相同 classpath | 將 build script 視為 source |
| 漏掉 Gradle Wrapper | 每台機器可能使用不同 Gradle | 依 policy 提交 wrapper |
| 只 commit source 不 commit test | bug 容易回歸 | 同一行為加入 regression test |
| force push main | 破壞其他人的 history | 用 revert 或團隊核准流程 |
| `git reset --hard` 當清理指令 | 可能永久丟失未保存修改 | 先 patch／rescue branch，再 reset |
| conflict 只選一邊 | 可能丟掉 mapping、dependency 或 runtime fix | 理解兩邊 intent，重跑 build |
| 把 local asset 推上 GitHub | 侵犯本地資料邊界 | local-only path + `.gitignore` |

## 11. 練習

1. 在一個 Java feature 中同時修改 source、JUnit test 與 build file，使用精準 `git add`，讓另一個無關修改保持 unstaged。
2. 故意在 `build/`、`target/` 與 server log 產生檔案，確認 `.gitignore` 不會讓它們出現在 clean status。
3. 找一個已修正的 exception bug，用 `git log`、`git show` 與 regression test 說明它的原因與修復。
4. 在沒有公開 branch 的安全環境中練習 `restore`、`revert`、stash 與 reflog，記錄每個指令改變的是 working tree、index 還是 commit history。
5. 對 Fabric、NeoForge 或 Paper 專案 review 一次 dependency／mapping upgrade，列出必須一起檢查的 Wrapper、JDK、resource、test 與 runtime command。

## References

[1]: https://git-scm.com/book/en/v2 "Pro Git — Git documentation"
[2]: https://git-scm.com/docs/git-status "git-status Documentation"
[3]: https://git-scm.com/docs/git-diff "git-diff Documentation"
[4]: https://git-scm.com/docs/git-restore "git-restore Documentation"
[5]: https://git-scm.com/docs/git-revert "git-revert Documentation"
[6]: https://git-scm.com/docs/git-bisect "git-bisect Documentation"
[7]: https://git-scm.com/docs/gitignore "gitignore Documentation"
