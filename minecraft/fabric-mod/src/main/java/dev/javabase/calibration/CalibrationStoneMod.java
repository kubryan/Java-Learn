package dev.javabase.calibration;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.creativetab.v1.CreativeModeTabEvents;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.core.Registry;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;

public final class CalibrationStoneMod implements ModInitializer {
    public static final String MOD_ID = "calibrationstone";
    private static final ResourceKey<Item> CALIBRATION_STONE_KEY = ResourceKey.create(
            Registries.ITEM,
            Identifier.fromNamespaceAndPath(MOD_ID, "calibration_stone")
    );
    public static final Item CALIBRATION_STONE = Registry.register(
            BuiltInRegistries.ITEM,
            CALIBRATION_STONE_KEY,
            new CalibrationStoneItem(new Item.Properties().setId(CALIBRATION_STONE_KEY).stacksTo(1))
    );

    @Override
    public void onInitialize() {
        CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.INGREDIENTS)
                .register(entries -> entries.accept(CALIBRATION_STONE));
    }
}
