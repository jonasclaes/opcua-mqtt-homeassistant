import type { Logger } from "../logging/logger.ts";
import { createConfigService } from "../service/config.service.ts";
import { createEntityService } from "../service/entity.service.ts";
import { createMqttService } from "../service/mqtt.service.ts";
import { createOpcuaService } from "../service/opcua.service.ts";
import { waitForTerminationSignal } from "../util/termination-signal.ts";

export const createApp = async (logger: Logger) => {
  const configService = await createConfigService();
  const opcuaService = await createOpcuaService(logger, configService);
  const mqttService = await createMqttService(logger, configService);
  const entityService = await createEntityService(
    logger,
    configService,
    opcuaService,
    mqttService
  );

  const run = async () => {
    await opcuaService.connect();
    await mqttService.connect();

    logger.info("app is running");

    const entities = await entityService.discoverEntities();
    await entityService.registerEntities(entities);

    await waitForTerminationSignal();

    await opcuaService.disconnect();
    await mqttService.disconnect();
  };

  return { run };
};
