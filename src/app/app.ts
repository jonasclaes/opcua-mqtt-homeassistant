import type { Logger } from "../logging/logger.ts";
import { createConfigService } from "../service/config.service.ts";
import { createOpcuaService } from "../service/opcua.service.ts";

export const createApp = async (logger: Logger) => {
  const waitForTerminiationSignal = () =>
    new Promise<void>((resolve) => {
      process.on("SIGINT", () => {
        resolve();
      });
    });

  const configService = await createConfigService();
  const opcuaService = await createOpcuaService(logger, configService);

  const run = async () => {
    await opcuaService.connect();

    await opcuaService.discoverEntities();

    logger.info("app is running");
    await waitForTerminiationSignal();

    await opcuaService.disconnect();
  };

  return { run };
};
