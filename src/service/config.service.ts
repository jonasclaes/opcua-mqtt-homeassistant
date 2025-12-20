export type ConfigService = Awaited<ReturnType<typeof createConfigService>>;

export const createConfigService = async () => {
  const getOpcuaUrl = () => {
    return "opc.tcp://192.168.30.4:4840";
  };
  const getOpcuaRootPath = () => {
    return `ns=3;s="SmartHome_Data"`;
  };

  const getMqttUrl = () => {
    return "mqtt://localhost:1883";
  };

  return { getOpcuaUrl, getOpcuaRootPath, getMqttUrl };
};
