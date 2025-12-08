import type { Logger } from "../logging/logger.ts";
import { createConfigService } from "../service/config.service.ts";
import { createOpcuaService } from "../service/opcua.service.ts";
import { waitForTerminationSignal } from "../util/termination-signal.ts";

export const createApp = async (logger: Logger) => {
  const configService = await createConfigService();
  const opcuaService = await createOpcuaService(logger, configService);

  const run = async () => {
    await opcuaService.connect();

    const entities = await opcuaService.discoverEntities();

    logger.info("app is running");
    await waitForTerminationSignal();

    await opcuaService.disconnect();
  };

  return { run };
};
