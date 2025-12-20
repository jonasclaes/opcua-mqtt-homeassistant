import mqtt, {
  type IClientOptions,
  type IClientPublishOptions,
  type IClientSubscribeOptions,
  type IClientSubscribeProperties,
  type ISubscriptionMap,
} from "mqtt";
import type { Logger } from "../logging/logger.ts";
import type { ConfigService } from "./config.service.ts";
import * as uuid from "uuid";

export type MqttService = Awaited<ReturnType<typeof createMqttService>>;

export type MessageHandlerFunc = (
  topic: string,
  message: Buffer<ArrayBufferLike>
) => Promise<void> | void;

export const createMqttService = async (
  logger: Logger,
  configService: ConfigService
) => {
  let client: mqtt.MqttClient | null = null;
  let messageHandlers: Record<string, MessageHandlerFunc[]> = {};

  const connect = async () => {
    const mqttUrl = configService.getMqttUrl();
    const options: IClientOptions = {
      reconnectPeriod: 1000,
      clientId: `opcua-mqtt-homeassistant-${uuid.v4()}`,
    };

    logger.info(`connecting to MQTT broker at ${configService.getMqttUrl()}`);
    client = await mqtt.connectAsync(mqttUrl, options);
    logger.info("connected to MQTT broker");

    setupMessageListener();
  };

  const disconnect = async () => {
    if (!client) {
      logger.warn("mqtt client is not initialized, skipping disconnect");
      return;
    }

    logger.info("disconnecting from MQTT broker");
    await client.endAsync();
    logger.info("disconnected from MQTT broker");
  };

  const publish = async (
    topic: string,
    message: string | Buffer<ArrayBufferLike>,
    opts?: IClientPublishOptions
  ) => {
    if (!client) {
      logger.warn("mqtt client is not initialized, skipping publish");
      return;
    }

    logger.debug(`publishing message to topic ${topic}`);
    await client.publishAsync(topic, message, opts);
  };

  const subscribe = async (
    topicObject: string | string[] | ISubscriptionMap,
    opts?: IClientSubscribeOptions | IClientSubscribeProperties
  ) => {
    if (!client) {
      logger.warn("mqtt client is not initialized, skipping subscribe");
      return;
    }

    await client.subscribeAsync(topicObject, opts);
  };

  const setupMessageListener = () => {
    if (!client) {
      logger.warn("mqtt client is not initialized, skipping message listener");
      return;
    }

    client.on("message", (_topic: string, _message: Buffer) => {
      if (!messageHandlers[_topic]) return;

      logger.debug(
        `received message on topic ${_topic}, firing ${messageHandlers[_topic].length} handlers`
      );
      for (const handler of messageHandlers[_topic]) {
        handler(_topic, _message);
      }
    });
  };

  const registerMessageHandler = (
    topic: string,
    handler: (topic: string, message: Buffer<ArrayBufferLike>) => void
  ) => {
    if (!messageHandlers[topic]) {
      messageHandlers[topic] = [];
    }

    messageHandlers[topic].push(handler);
  };

  return {
    connect,
    disconnect,
    publish,
    subscribe,
    registerMessageHandler,
  };
};
