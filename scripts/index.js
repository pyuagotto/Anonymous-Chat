//@ts-check

import { CommandPermissionLevel, CustomCommandOrigin, CustomCommandStatus, EntityComponentTypes, EquipmentSlot, Player, system, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import config from "./config.js";
import { getConfigValues } from "./utils.js";

const ANONYMOUS_NAME = "???";

world.beforeEvents.chatSend.subscribe((ev) => {
    const { sender, message } = ev;
    const { defaultValue, itemId, itemName } = getConfigValues();

    if (typeof defaultValue !== "boolean" || typeof itemId !== "string" || typeof itemName !== "string") {
        return;
    }

    const mainhandItem = sender.getComponent(EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Mainhand);

    //匿名
    if (!defaultValue) {
        //アイテムIDが一致する場合
        if(mainhandItem?.typeId === itemId) {

            //名前が指定されている場合に、アイテムの名前が指定された名前と一致する場合は公開チャットにする
            if(itemName !== "") {
                if(mainhandItem?.nameTag === itemName) return;
            }

            //名前が指定されていない場合は公開チャットにする
            else return;
        }
    } 

    //公開
    else {
        //アイテムIDが一致しない場合は公開のまま
        if(mainhandItem?.typeId !== itemId) return; 

        //名前が指定されている場合に、アイテムの名前が指定された名前と一致しない場合は公開のまま
        else if(itemName !== "" && (mainhandItem?.nameTag === undefined || mainhandItem?.nameTag !== itemName)) return; 
    }

    ev.cancel = true;
    for (const player of world.getPlayers()) {
        if(player.name !== sender.name) player.sendMessage(`<${ANONYMOUS_NAME}> ${message}`);
        else player.sendMessage(`<${sender.name}> ${message}`);
    }
});

system.beforeEvents.startup.subscribe((ev) => {
    /**
     * @param {string} name 
     * @param {string} description 
     * @param {(origin: CustomCommandOrigin, ...args: any[]) => { status: CustomCommandStatus, message?: string } | undefined} callback 
     */
    const registerCommand = function (name, description, callback) {
        ev.customCommandRegistry.registerCommand(
            {
                name,
                description,
                permissionLevel: CommandPermissionLevel.GameDirectors,
            },
            callback
        );
    };

    registerCommand(
        "anonymous:config",
        "Anonymous Chatの設定フォームを開きます",
        openForm
    );
});

world.afterEvents.worldLoad.subscribe(() => {
    if (world.getDynamicProperty("anonymous:defaultValue") === undefined) {
        world.setDynamicProperty("anonymous:defaultValue", config.defaultValue);
    }

    if (world.getDynamicProperty("anonymous:itemId") === undefined) {
        world.setDynamicProperty("anonymous:itemId", config.itemId);
    }

    if (world.getDynamicProperty("anonymous:itemName") === undefined) {
        world.setDynamicProperty("anonymous:itemName", config.itemName);
    }
});

/**
 * 
 * @param {CustomCommandOrigin} origin 
 * @returns { { status: CustomCommandStatus, message?: string} | undefined}
 */
const openForm = function(origin) {
    if (origin.sourceEntity instanceof Player) {
        if (config.config) return { status: CustomCommandStatus.Failure, message: "config.jsからconfigをfalseにしてください" };

        const player = origin.sourceEntity;
        const { defaultValue, itemId, itemName } = getConfigValues();

        if (typeof defaultValue !== "boolean" || typeof itemId !== "string" || typeof itemName !== "string") {
            return { status: CustomCommandStatus.Failure, message: "§6[§rAnonymous Chat§6]§c 設定値が無効です。config.jsを確認してください" };
        }

        const modalForm = new ModalFormData();
        modalForm.title("Anonymous Chat Setting");
        modalForm.label("Default");

        if(defaultValue){
            modalForm.toggle("§7Anonymous§r | §bPublic§r", { defaultValue: defaultValue });
        }else{
            modalForm.toggle("§bAnonymous§r | §7Public§r", { defaultValue: defaultValue });
        }
        
        modalForm.textField("\nItemId", "namespace:name", { defaultValue: itemId });
        modalForm.textField("\nItemName", "名前", { defaultValue: itemName });

        system.run(() => {
            //@ts-ignore
            modalForm.show(player).then((response) => {
                if (response.formValues) {
                    world.setDynamicProperty("anonymous:defaultValue", response.formValues[1]);
                    if(response.formValues[2] !== "") world.setDynamicProperty("anonymous:itemId", response.formValues[2]);
                    else world.setDynamicProperty("anonymous:itemId", config.itemId);
                    world.setDynamicProperty("anonymous:itemName", response.formValues[3]);
                    player.sendMessage(`§6[§rAnonymous Chat§6]§r 設定を保存しました。`);
                }
            });
        });

        return { status: CustomCommandStatus.Success };
    }

    return { status: CustomCommandStatus.Failure, message: "このコマンドはプレイヤーから実行する必要があります" };
}

