# NeoForge Calibration Stone

這是一個 Minecraft Java Edition 26.2 的 NeoForge 練習模組，實作 `COMMON_FEATURE_SPEC.md` 定義的校準石（Calibration Stone）。它會出現在 Ingredients 創造模式分類；使用時只回報玩家座標與目前維度，不修改世界、不傳送自訂封包，也不使用 Fabric entrypoint、Mixin 或自訂網路封包。

## Build

本資料夾是獨立的 NeoForge ModDevGradle 專案，需使用 Java 25。Windows 執行：

```powershell
cd minecraft\neoforge-mod
.\gradlew.bat build
```

Linux 或 macOS 執行：

```bash
cd minecraft/neoforge-mod
./gradlew build
```

產物會出現在 `build/libs/`。若要啟動開發 client，可執行 `./gradlew runClient` 或 Windows 的 `.\gradlew.bat runClient`。

## Version record

```text
minecraft_version: 26.2
java_version: 25
loader_or_mdk_version: NeoForge 26.2.0.66
api_version: NeoForge 26.2.0.66
build_tool_version: ModDevGradle 2.0.144 / Gradle wrapper
last_verified_at: 2026-08-25
```

## Resources

物品註冊與創造模式分類位於 `src/main/java/dev/javabase/calibration/CalibrationStoneMod.java`，使用行為位於 `CalibrationStoneItem.java`。模型、item definition、PNG 貼圖與 `en_us`／`zh_tw` 語言檔都位於 `src/main/resources/assets/calibrationstone/`。

## References

- [NeoForge 26.2 ModDevGradle MDK](https://github.com/NeoForgeMDKs/MDK-26.2-ModDevGradle)
- [NeoForge Items documentation](https://docs.neoforged.net/docs/items/)
- [NeoForge documentation](https://docs.neoforged.net/)
