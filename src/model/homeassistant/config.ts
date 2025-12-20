import {
  buildHomeAssistantCommandTopicName,
  buildHomeAssistantStateTopicName,
} from "../../util/topic-builder.ts";
import type { Entity } from "../entity.ts";

export type HomeAssistantDiscoveryPayloadDevice = {
  configuration_url?: string;
  identifiers?: string | string[];
  name?: string;
  manufacturer?: string;
  model?: string;
  model_id?: string;
  sw_version?: string;
  hw_version?: string;
  serial_number?: string;
  suggested_area?: string;
  via_device?: string;
};

export type HomeAssistantDiscoveryPayloadAvailability = {
  availability_topic?: string;
  availability_mode?: string;
  availability_template?: string;
  payload_available?: string;
  payload_not_available?: string;
};

export type HomeAssistantDiscoveryPayloadOrigin = {
  name?: string;
  sw_version?: string;
  url?: string;
};

export type HomeAssistantDiscoveryPayloadBase = {
  device: HomeAssistantDiscoveryPayloadDevice;
  availability?: HomeAssistantDiscoveryPayloadAvailability;
  origin: HomeAssistantDiscoveryPayloadOrigin;
  qos?: number;
};

export type HomeAssistantDiscoveryPayloadLight =
  HomeAssistantDiscoveryPayloadBase & {
    platform: "light";

    brightness?: boolean;
    brightness_scale?: number;

    command_topic: string;
    state_topic?: string;
    schema?: string;

    supported_color_modes?: string[];

    name?: string;
    unique_id?: string;
    default_entity_id?: string;

    optimistic?: boolean;
  };

export type HomeAssistantDiscoveryPayload = HomeAssistantDiscoveryPayloadLight;

export const createHomeAssistantDiscoveryPayloadFromEntity = (
  entity: Entity
): HomeAssistantDiscoveryPayload => {
  const name = entity.name.split(/(?=[A-Z0-9])/).join(" ");
  const systemName = entity.systemName
    .split(/(?=[A-Z0-9])/)
    .join("_")
    .toLowerCase();

  const basePayload: HomeAssistantDiscoveryPayloadBase = {
    device: {
      identifiers: [entity.systemName],
      name,
      manufacturer: entity.manufacturer,
      model: entity.model,
      sw_version: entity.version,
    },
    origin: {
      name: "opcua-mqtt-homeassistant",
      sw_version: "0.1.0",
      url: "https://github.com/jonasclaes/opcua-mqtt-homeassistant",
    },
    qos: 2,
  };

  if (entity.type === "LIGHT") {
    const payload: HomeAssistantDiscoveryPayloadLight = {
      ...basePayload,
      platform: "light",

      command_topic: buildHomeAssistantCommandTopicName(entity),
      state_topic: buildHomeAssistantStateTopicName(entity),
      schema: "json",

      name: `Light`,
      unique_id: entity.systemName,

      supported_color_modes: ["onoff"],

      optimistic: false,
    };

    if (entity.capabilities.includes("brightness")) {
      payload.supported_color_modes = ["brightness"];
      payload.brightness = true;
      payload.brightness_scale = 100;
    }

    return payload;
  }
};
