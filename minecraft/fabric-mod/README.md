# Fabric Calibration Stone

這是一個 Minecraft Java Edition 26.2 的 Fabric 練習模組，實作 `COMMON_FEATURE_SPEC.md` 定義的校準石（Calibration Stone）。它會出現在 Ingredients 創造模式分類；使用時只回報玩家座標與目前維度，不修改世界、不傳送自訂封包，也不使用 Mixin。

## Build

本資料夾是獨立 Gradle 專案，需使用 Java 25。Windows 執行：

```powershell
cd minecraft\fabric-mod
.\gradlew.bat build
```

Linux 或 macOS 執行：

```bash
cd minecraft/fabric-mod
./gradlew build
```

產物會出現在 `build/libs/`。若要啟動開發 client，可執行 `./gradlew runClient` 或 Windows 的 `.\gradlew.bat runClient`。

## Version record

```text
minecraft_version: 26.2
java_version: 25
loader_or_mdk_version: Fabric Loader 0.19.3
api_version: Fabric API 0.158.0+26.2
build_tool_version: Fabric Loom 1.17-SNAPSHOT / Gradle wrapper
last_verified_at: 2026-08-25
```

## Resources

物品註冊位於 `src/main/java/dev/javabase/calibration/CalibrationStoneMod.java`，使用行為位於 `CalibrationStoneItem.java`。模型、item definition、PNG 貼圖與 `en_us`／`zh_tw` 語言檔都位於 `src/main/resources/assets/calibrationstone/`。

## References

- [Fabric 26.2 porting guide](https://docs.fabricmc.net/develop/porting/)
- [Fabric 26.2 example mod](https://github.com/FabricMC/fabric-example-mod/tree/26.2)
- [Fabric creating your first item](https://docs.fabricmc.net/develop/items/first-item)
