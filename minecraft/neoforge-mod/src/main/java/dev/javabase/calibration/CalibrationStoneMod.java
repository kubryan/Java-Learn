package dev.javabase.calibration;

import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

@Mod(CalibrationStoneMod.MOD_ID)
public final class CalibrationStoneMod {
    public static final String MOD_ID = "calibrationstone";
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(MOD_ID);
    public static final DeferredItem<CalibrationStoneItem> CALIBRATION_STONE = ITEMS.registerItem(
            "calibration_stone",
            CalibrationStoneItem::new,
            properties -> properties.stacksTo(1)
    );

    public CalibrationStoneMod(IEventBus modEventBus) {
        ITEMS.register(modEventBus);
        modEventBus.addListener(CalibrationStoneMod::addCreative);
    }

    private static void addCreative(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
            event.accept(CALIBRATION_STONE);
        }
    }
}
