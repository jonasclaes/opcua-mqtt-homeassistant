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
import { createPathBuilder } from "../util/path-builder.ts";
import { supportedDevices } from "../data/supported-devices.ts";
import { Entity } from "../model/entity.ts";
import type { Capability } from "../model/capability.ts";

export type OpcuaService = Awaited<ReturnType<typeof createOpcuaService>>;

export const createOpcuaService = async (
  logger: Logger,
  configService: ConfigService
) => {
  const rootPath = configService.getOpcuaRootPath();

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

  const retrieveDeviceManufacturer = async (
    session: ClientSession,
    entitySystemName: string
  ) => {
    return await readValue<string>(
      session,
      createPathBuilder(rootPath)
        .entity(entitySystemName)
        .device()
        .manufacturer()
    );
  };

  const retrieveDeviceModel = async (
    session: ClientSession,
    entitySystemName: string
  ) => {
    return await readValue<string>(
      session,
      createPathBuilder(rootPath).entity(entitySystemName).device().model()
    );
  };

  const retrieveDeviceVersion = async (
    session: ClientSession,
    entitySystemName: string
  ) => {
    return await readValue<string>(
      session,
      createPathBuilder(rootPath).entity(entitySystemName).device().version()
    );
  };

  const retrieveDeviceType = async (
    session: ClientSession,
    entitySystemName: string
  ) => {
    return await readValue<string>(
      session,
      createPathBuilder(rootPath).entity(entitySystemName).device().type()
    );
  };

  const retrieveDeviceCapabilities = async (
    session: ClientSession,
    entitySystemName: string
  ) => {
    return {
      onOff: await readValue<boolean>(
        session,
        createPathBuilder(rootPath)
          .entity(entitySystemName)
          .device()
          .capabilities()
          .onOff()
      ),
      brightness: await readValue<boolean>(
        session,
        createPathBuilder(rootPath)
          .entity(entitySystemName)
          .device()
          .capabilities()
          .brightness()
      ),
    };
  };

  const retrieveDeviceName = async (
    session: ClientSession,
    entitySystemName: string
  ) => {
    return await readValue<string>(
      session,
      createPathBuilder(rootPath).entity(entitySystemName).device().name()
    );
  };

  const mapDeviceCapabilitiesToEntityCapabilities = (deviceCapabilities: {
    onOff: boolean | null;
    brightness: boolean | null;
  }): Capability[] => {
    const capabilities: Capability[] = [];
    if (deviceCapabilities.onOff) {
      capabilities.push("on_off");
    }

    if (deviceCapabilities.brightness) {
      capabilities.push("brightness");
    }
    return capabilities;
  };

  const retrieveEntity = async (
    session: ClientSession,
    entitySystemName: string
  ): Promise<Entity | null> => {
    const deviceManufacturer = await retrieveDeviceManufacturer(
      session,
      entitySystemName
    );
    const deviceModel = await retrieveDeviceModel(session, entitySystemName);
    const deviceVersion = await retrieveDeviceVersion(
      session,
      entitySystemName
    );
    const deviceType = await retrieveDeviceType(session, entitySystemName);
    const deviceCapabilities = await retrieveDeviceCapabilities(
      session,
      entitySystemName
    );
    const deviceName = await retrieveDeviceName(session, entitySystemName);

    if (
      supportedDevices
        .filter((device) => device.manufacturer === deviceManufacturer)
        .filter((device) => device.model === deviceModel)
        .filter((device) => device.version === deviceVersion)
        .filter((device) => device.type === deviceType).length > 0 &&
      deviceName
    ) {
      return new Entity(
        entitySystemName,
        deviceManufacturer,
        deviceModel,
        deviceVersion,
        deviceType,
        mapDeviceCapabilitiesToEntityCapabilities(deviceCapabilities),
        deviceName
      );
    }

    return null;
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

    const entities: Entity[] = [];
    for (const entitySystemName of entitySystemNames) {
      const entity = await retrieveEntity(session, entitySystemName);

      if (!entity) {
        logger.info(`skipping unsupported entity: ${entitySystemName}`);
        continue;
      }

      entities.push(entity);
      logger.info(`discovered entity ${entitySystemName}`);
    }

    logger.info(
      `discovered ${entitySystemNames.length} entities of which ${
        Object.keys(entities).length
      } are supported`
    );

    await session.close();

    return entities;
  };

  return {
    connect,
    disconnect,
    discoverEntities,
  };
};
