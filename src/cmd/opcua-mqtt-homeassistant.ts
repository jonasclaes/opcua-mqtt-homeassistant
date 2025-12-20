import { createApp } from "../app/app.ts";
import { createLogger } from "../logging/logger.ts";

const main = async () => {
  const logger = await createLogger();

  logger.info("starting opcua-mqtt-homeassistant");

  const app = await createApp(logger);
  await app.run();

  logger.info("opcua-mqtt-homeassistant stopped gracefully");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
