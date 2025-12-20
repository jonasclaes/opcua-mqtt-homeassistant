import type { Entity } from "../model/entity.ts";

const convertEntityTypeToHomeAssistantEntityType = (entity: Entity) => {
  if (entity.type === "LIGHT") {
    return "light";
  }
};

export const buildHomeAssistantConfigTopicName = (entity: Entity): string => {
  const entityType = convertEntityTypeToHomeAssistantEntityType(entity);
  const systemName = entity.systemName;

  return `homeassistant/${entityType}/opcua-mqtt-homeassistant/${systemName}/config`;
};

export const buildHomeAssistantStateTopicName = (entity: Entity): string => {
  const entityType = convertEntityTypeToHomeAssistantEntityType(entity);
  const systemName = entity.systemName;

  return `opcua-mqtt-homeassistant/${entityType}/${systemName}/state`;
};

export const buildHomeAssistantCommandTopicName = (entity: Entity): string => {
  const entityType = convertEntityTypeToHomeAssistantEntityType(entity);
  const systemName = entity.systemName;

  return `opcua-mqtt-homeassistant/${entityType}/${systemName}/command`;
};
