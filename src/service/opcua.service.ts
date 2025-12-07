import {
  AttributeIds,
  BrowseDirection,
  MessageSecurityMode,
  NodeClassMask,
  OPCUAClient,
  ResultMask,
  SecurityPolicy,
  type ClientSession,
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
  };

  const disconnect = async () => {
    await client.disconnect();
    logger.info("disconnected from OPC UA server");
  };

  const getDeviceTypePath = (rootPath: string, entitySystemName: string) =>
    `${rootPath}."${entitySystemName}"."device"."type"`;

  const getDeviceModelPath = (rootPath: string, entitySystemName: string) =>
    `${rootPath}."${entitySystemName}"."device"."model"`;

  const getDeviceManufacturerPath = (
    rootPath: string,
    entitySystemName: string
  ) => `${rootPath}."${entitySystemName}"."device"."manufacturer"`;

  const getDeviceNamePath = (rootPath: string, entitySystemName: string) =>
    `${rootPath}."${entitySystemName}"."device"."name"`;

  const readValue = async <T>(
    session: ClientSession,
    nodeId: string
  ): Promise<T | null> => {
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

  const supportedDeviceTypes = ["LIGHT"];
  const supportedDeviceModels = ["LIGHT-UA"];
  const supportedDeviceManufacturers = ["jonasclaes.be"];

  const isSupportedEntity = async (
    session: ClientSession,
    rootPath: string,
    entitySystemName: string
  ) => {
    const deviceType = await readValue<string>(
      session,
      getDeviceTypePath(rootPath, entitySystemName)
    );
    if (!deviceType || !supportedDeviceTypes.includes(deviceType)) return false;

    const deviceModel = await readValue<string>(
      session,
      getDeviceModelPath(rootPath, entitySystemName)
    );
    if (!deviceModel || !supportedDeviceModels.includes(deviceModel))
      return false;

    const deviceManufacturer = await readValue<string>(
      session,
      getDeviceManufacturerPath(rootPath, entitySystemName)
    );
    if (
      !deviceManufacturer ||
      !supportedDeviceManufacturers.includes(deviceManufacturer)
    )
      return false;

    const deviceName = await readValue<string>(
      session,
      getDeviceNamePath(rootPath, entitySystemName)
    );
    if (!deviceName) return false;

    return true;
  };

  const discoverEntities = async () => {
    logger.info("discovering entities");

    const rootPath = configService.getOpcuaRootPath();
    const session = await client.createSession();

    const browseResult = await session.browse({
      nodeId: rootPath,
      includeSubtypes: true,
      nodeClassMask: NodeClassMask.Object | NodeClassMask.Variable,
      browseDirection: BrowseDirection.Forward,
      resultMask:
        ResultMask.BrowseName |
        ResultMask.DisplayName |
        ResultMask.NodeClass |
        ResultMask.TypeDefinition,
    });

    const entitySystemNames = browseResult.references.map((reference) =>
      reference.browseName.name.toString()
    );

    const supportedEntitySystemNames: string[] = [];

    // check if the entity is supported
    for (const entitySystemName of entitySystemNames) {
      const supported = await isSupportedEntity(
        session,
        rootPath,
        entitySystemName
      );

      if (!supported) {
        logger.info(`skipping unsupported entity: ${entitySystemName}`);
        continue;
      }

      supportedEntitySystemNames.push(entitySystemName);
      logger.info(`discovered entity ${entitySystemName}`);
    }

    logger.info(
      `discovered ${entitySystemNames.length} entities of which ${supportedEntitySystemNames.length} are supported`
    );

    await session.close();
  };

  return {
    connect,
    disconnect,
    discoverEntities,
  };
};
