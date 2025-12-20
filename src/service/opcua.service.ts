import {
  AttributeIds,
  ClientMonitoredItem,
  ClientSubscription,
  MessageSecurityMode,
  OPCUAClient,
  ReadValueId,
  SecurityPolicy,
  TimestampsToReturn,
  type ClientSession,
  type MonitoringParametersOptions,
  type ReadValueIdOptions,
} from "node-opcua";
import type { Logger } from "../logging/logger.ts";
import type { ConfigService } from "./config.service.ts";

export type OpcuaService = Awaited<ReturnType<typeof createOpcuaService>>;

export const createOpcuaService = async (
  logger: Logger,
  configService: ConfigService
) => {
  const client = OPCUAClient.create({
    applicationName: "opcua-mqtt-homeassistant",
    connectionStrategy: {
      initialDelay: 1000,
      maxRetry: 1,
    },
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpointMustExist: false,
  });

  const connect = async () => {
    const opcuaUrl = configService.getOpcuaUrl();

    logger.info(`connecting to OPC UA server at ${opcuaUrl}`);
    await client.connect(opcuaUrl);
    logger.info("connected to OPC UA server");

    await getSession();
    await setupSubscription();
  };

  const disconnect = async () => {
    await client.disconnect();
    logger.info("disconnected from OPC UA server");
  };

  let _session: ClientSession | null = null;
  const getSession = async (): Promise<ClientSession> => {
    if (_session) {
      return _session;
    }

    logger.info("creating OPC UA session");
    const session = await client.createSession();
    logger.info("OPC UA session created");
    _session = session;
    return _session;
  };

  const readValue = async <T>(nodeId: string): Promise<T | null> => {
    const session = await getSession();
    const dataValue = await session.read(
      {
        nodeId,
        attributeId: AttributeIds.Value,
      },
      0
    );

    if (dataValue.statusCode.isNotGood()) {
      logger.warn(
        `failed to read value at nodeId ${nodeId}: ${dataValue.statusCode.toString()}`
      );
      return null;
    }

    return dataValue.value.value;
  };

  const writeValue = async (nodeId: string, value: unknown) => {
    const session = await getSession();
    const result = await session.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value,
    });

    if (result.isNotGood()) {
      logger.warn(
        `failed to write value at nodeId ${nodeId}: ${result.toString()}`
      );
      return false;
    }

    return true;
  };

  let subscription: ClientSubscription;
  const setupSubscription = async () => {
    const session = await getSession();

    subscription = ClientSubscription.create(session, {
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 10000,
      publishingEnabled: true,
      priority: 10,
    });

    subscription.on("started", () => {
      logger.debug(
        `opcua subscription started with id ${subscription.subscriptionId}`
      );
    });

    subscription.on("keepalive", () => {
      logger.debug(
        `opcua subscription with id ${subscription.subscriptionId} keepalive`
      );
    });

    subscription.on("terminated", () => {
      logger.debug(
        `opcua subscription with id ${subscription.subscriptionId} terminated`
      );
    });
  };

  const subscribeToValueChanges = async <T>(
    nodeId: string,
    callback: (value: T) => void
  ) => {
    const itemToMonitor: ReadValueIdOptions = {
      nodeId,
      attributeId: AttributeIds.Value,
    };

    const parameters: MonitoringParametersOptions = {
      samplingInterval: 100,
      discardOldest: true,
      queueSize: 10,
    };

    const monitoredItem = ClientMonitoredItem.create(
      subscription,
      itemToMonitor,
      parameters,
      TimestampsToReturn.Both
    );

    logger.debug(`monitoring OPC UA nodeId ${nodeId} for value changes`);

    monitoredItem.on("changed", (dataValue) => {
      callback(dataValue.value.value);
    });
  };

  return {
    connect,
    disconnect,
    readValue,
    writeValue,
    getSession,
    subscribeToValueChanges,
  };
};
