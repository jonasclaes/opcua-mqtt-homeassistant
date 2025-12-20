import {
  BrowseDirection,
  DataType,
  DataValue,
  NodeClassMask,
  ResultMask,
} from "node-opcua";
import { supportedDevices } from "../data/supported-devices.ts";
import type { Logger } from "../logging/logger.ts";
import type { Capability } from "../model/capability.ts";
import { Entity } from "../model/entity.ts";
import { createPathBuilder } from "../util/path-builder.ts";
import type { ConfigService } from "./config.service.ts";
import type { OpcuaService } from "./opcua.service.ts";
import type { MqttService } from "./mqtt.service.ts";
import { createHomeAssistantDiscoveryPayloadFromEntity } from "../model/homeassistant/config.ts";
import {
  buildHomeAssistantCommandTopicName,
  buildHomeAssistantConfigTopicName,
  buildHomeAssistantStateTopicName,
} from "../util/topic-builder.ts";

export type EntityService = Awaited<ReturnType<typeof createEntityService>>;

export const createEntityService = async (
  logger: Logger,
  configService: ConfigService,
  opcuaService: OpcuaService,
  mqttService: MqttService
) => {
  const rootPath = configService.getOpcuaRootPath();

  const retrieveDeviceManufacturer = async (entitySystemName: string) => {
    return await opcuaService.readValue<string>(
      createPathBuilder(rootPath)
        .entity(entitySystemName)
        .device()
        .manufacturer()
    );
  };

  const retrieveDeviceModel = async (entitySystemName: string) => {
    return await opcuaService.readValue<string>(
      createPathBuilder(rootPath).entity(entitySystemName).device().model()
    );
  };

  const retrieveDeviceVersion = async (entitySystemName: string) => {
    return await opcuaService.readValue<string>(
      createPathBuilder(rootPath).entity(entitySystemName).device().version()
    );
  };

  const retrieveDeviceType = async (entitySystemName: string) => {
    return await opcuaService.readValue<string>(
      createPathBuilder(rootPath).entity(entitySystemName).device().type()
    );
  };

  const retrieveDeviceCapabilities = async (entitySystemName: string) => {
    return {
      onOff: await opcuaService.readValue<boolean>(
        createPathBuilder(rootPath)
          .entity(entitySystemName)
          .device()
          .capabilities()
          .onOff()
      ),
      brightness: await opcuaService.readValue<boolean>(
        createPathBuilder(rootPath)
          .entity(entitySystemName)
          .device()
          .capabilities()
          .brightness()
      ),
    };
  };

  const retrieveDeviceName = async (entitySystemName: string) => {
    return await opcuaService.readValue<string>(
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
    entitySystemName: string
  ): Promise<Entity | null> => {
    const deviceManufacturer = await retrieveDeviceManufacturer(
      entitySystemName
    );
    const deviceModel = await retrieveDeviceModel(entitySystemName);
    const deviceVersion = await retrieveDeviceVersion(entitySystemName);
    const deviceType = await retrieveDeviceType(entitySystemName);
    const deviceCapabilities = await retrieveDeviceCapabilities(
      entitySystemName
    );
    const deviceName = await retrieveDeviceName(entitySystemName);

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
    const session = await opcuaService.getSession();

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

    const opcuaEntities = await Promise.all(
      entitySystemNames.map(async (entitySystemName) => {
        const opcuaEntity = await retrieveEntity(entitySystemName);
        return { entitySystemName, opcuaEntity };
      })
    );

    const entities: Entity[] = [];

    for (const { entitySystemName, opcuaEntity } of opcuaEntities) {
      if (!opcuaEntity) {
        logger.info(`skipping unsupported entity: ${entitySystemName}`);
        continue;
      }

      entities.push(opcuaEntity);
      logger.info(`discovered entity ${entitySystemName}`);
    }

    logger.info(
      `discovered ${entitySystemNames.length} entities of which ${
        Object.keys(entities).length
      } are supported`
    );

    return entities;
  };

  const turnOn = async (entity: Entity) => {
    const statePath = createPathBuilder(rootPath)
      .entity(entity.systemName)
      .status()
      .onOff();
    const controlPath = createPathBuilder(rootPath)
      .entity(entity.systemName)
      .control()
      .onOff();

    const state = await opcuaService.readValue<boolean>(statePath);
    if (state === null) return;
    if (state) {
      logger.warn(`light ${entity.systemName} is already on`);
      return;
    }

    const controlState = await opcuaService.readValue<boolean>(controlPath);
    if (controlState === null) return;

    const success = await opcuaService.writeValue(
      controlPath,
      new DataValue({
        value: { value: !controlState, dataType: DataType.Boolean },
      })
    );
    if (!success) {
      logger.warn(`failed to turn on light ${entity.systemName}`);
      return;
    }
  };

  const turnOff = async (entity: Entity) => {
    const statePath = createPathBuilder(rootPath)
      .entity(entity.systemName)
      .status()
      .onOff();
    const controlPath = createPathBuilder(rootPath)
      .entity(entity.systemName)
      .control()
      .onOff();

    const state = await opcuaService.readValue<boolean>(statePath);
    if (state === null) return;
    if (!state) {
      logger.warn(`light ${entity.systemName} is already off`);
      return;
    }

    const controlState = await opcuaService.readValue<boolean>(controlPath);
    if (controlState === null) return;

    const success = await opcuaService.writeValue(
      controlPath,
      new DataValue({
        value: { value: !controlState, dataType: DataType.Boolean },
      })
    );
    if (!success) {
      logger.warn(`failed to turn off light ${entity.systemName}`);
      return;
    }
  };

  const setBrightness = async (entity: Entity, brightness: number) => {
    const controlPath = createPathBuilder(rootPath)
      .entity(entity.systemName)
      .control()
      .brightness();

    const success = await opcuaService.writeValue(
      controlPath,
      new DataValue({
        value: { value: brightness, dataType: DataType.Int16 },
      })
    );

    if (!success) {
      logger.warn(
        `failed to set brightness of light ${entity.systemName} to ${brightness}`
      );
      return;
    }
  };

  const registerMqttMessageHandlers = async (entity: Entity) => {
    if (entity.type === "LIGHT") {
      const commandTopic = buildHomeAssistantCommandTopicName(entity);

      await mqttService.subscribe(commandTopic);
      mqttService.registerMessageHandler(
        commandTopic,
        async (_topic: string, message: Buffer) => {
          const payload = JSON.parse(message.toString());
          logger.debug(
            `received MQTT command for entity ${
              entity.systemName
            }: ${JSON.stringify(payload)}`
          );

          if (payload.state === "ON") {
            await turnOn(entity);
          }

          if (payload.state === "OFF") {
            await turnOff(entity);
          }

          if (payload.brightness !== undefined) {
            const brightnessValue = parseInt(payload.brightness, 10);
            if (isNaN(brightnessValue)) {
              logger.warn(
                `invalid brightness value received for entity ${
                  entity.systemName
                }: ${JSON.stringify(payload)}`
              );
              return;
            }

            await setBrightness(entity, brightnessValue);
          }
        }
      );
    }
  };

  const registerOpcuaMessageHandlers = async (entity: Entity) => {
    if (entity.type === "LIGHT") {
      const statePath = createPathBuilder(rootPath)
        .entity(entity.systemName)
        .status().path;

      await opcuaService.subscribeToValueChanges<object>(
        statePath,
        async (value) => {
          const stateTopic = buildHomeAssistantStateTopicName(entity);

          if (entity.capabilities.includes("brightness")) {
            if (!("on" in value)) return;
            if (!("brightness" in value)) return;

            const msg = {
              state: value.on ? "ON" : "OFF",
              brightness: value.brightness,
            };

            logger.debug(
              `publishing MQTT state for entity ${
                entity.systemName
              }: ${JSON.stringify(msg)}`
            );

            await mqttService.publish(stateTopic, JSON.stringify(msg));
            return;
          }

          if (entity.capabilities.includes("on_off")) {
            if (!("on" in value)) return;

            const msg = {
              state: value.on ? "ON" : "OFF",
            };

            logger.debug(
              `publishing MQTT state for entity ${
                entity.systemName
              }: ${JSON.stringify(msg)}`
            );

            await mqttService.publish(stateTopic, JSON.stringify(msg));
          }
        }
      );
    }
  };

  const registerEntity = async (entity: Entity) => {
    const configTopic = buildHomeAssistantConfigTopicName(entity);
    const configPayload = createHomeAssistantDiscoveryPayloadFromEntity(entity);

    await registerMqttMessageHandlers(entity);
    await registerOpcuaMessageHandlers(entity);

    logger.info(
      `registering entity ${entity.systemName} with Home Assistant via MQTT`
    );
    await mqttService.publish(configTopic, JSON.stringify(configPayload));
  };

  const registerEntities = async (entities: Entity[]) => {
    await Promise.all(entities.map((entity) => registerEntity(entity)));
    logger.info(`registered ${entities.length} entities with Home Assistant`);
  };

  return {
    discoverEntities,
    registerEntity,
    registerEntities,
  };
};
