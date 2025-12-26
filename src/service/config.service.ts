import "dotenv/config";

export type ConfigService = Awaited<ReturnType<typeof createConfigService>>;

export const createConfigService = async () => {
    const getOpcuaUrl = () => {
        return process.env.OMH_OPCUA_URL ?? "opc.tcp://192.168.30.4:4840";
    };

    const getOpcuaRootPath = () => {
        return process.env.OMH_OPCUA_ROOT_PATH ?? `ns=3;s="SmartHome_Data"`;
    };

    const getMqttUrl = () => {
        return process.env.OMH_MQTT_URL ?? "mqtt://localhost:1883";
    };

    return {getOpcuaUrl, getOpcuaRootPath, getMqttUrl};
};
