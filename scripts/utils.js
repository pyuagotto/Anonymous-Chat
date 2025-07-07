//@ts-check
import { world } from "@minecraft/server";
import config from "./config.js";

export const getConfigValues = function() {
    if (config.config) {
        return {
            defaultValue: config.defaultValue,
            itemId: config.itemId,
            itemName: config.itemName
        };
    }
    return {
        defaultValue: world.getDynamicProperty("anonymous:defaultValue"),
        itemId: world.getDynamicProperty("anonymous:itemId"),
        itemName: world.getDynamicProperty("anonymous:itemName")
    };
}