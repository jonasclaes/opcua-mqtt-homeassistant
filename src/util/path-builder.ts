export const createPathBuilder = (rootPath: string) => {
  let path = rootPath;

  const entity = (entitySystemName: string) => {
    path += `."${entitySystemName}"`;
    return { device: entityDevice };
  };

  const entityDevice = () => {
    path += `."device"`;

    return {
      manufacturer: entityDeviceManufacturer,
      model: entityDeviceModel,
      version: entityDeviceVersion,
      type: entityDeviceType,
      capabilities: entityDeviceCapabilities,
      name: entityDeviceName,
    };
  };

  const entityDeviceManufacturer = () => {
    path += `."manufacturer"`;
    return path;
  };

  const entityDeviceModel = () => {
    path += `."model"`;
    return path;
  };

  const entityDeviceVersion = () => {
    path += `."version"`;
    return path;
  };

  const entityDeviceType = () => {
    path += `."type"`;
    return path;
  };

  const entityDeviceCapabilities = () => {
    path += `."capabilities"`;
    return {
      onOff: entityDeviceCapabilitiesOnOff,
      brightness: entityDeviceCapabilitiesBrightness,
    };
  };

  const entityDeviceName = () => {
    path += `."name"`;
    return path;
  };

  const entityDeviceCapabilitiesOnOff = () => {
    path += `."on_off"`;
    return path;
  };

  const entityDeviceCapabilitiesBrightness = () => {
    path += `."brightness"`;
    return path;
  };

  return {
    entity,
  };
};
