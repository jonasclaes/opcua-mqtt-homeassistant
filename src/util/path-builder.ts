export const createPathBuilder = (rootPath: string) => {
  let path = rootPath;

  const entity = (entitySystemName: string) => {
    path += `."${entitySystemName}"`;
    return {
      device: entityDevice,
      status: entityStatus,
      control: entityControl,
    };
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

  const entityStatus = () => {
    path += `."status"`;
    return {
      path,
      onOff: entityStatusOn,
      brightness: entityStatusBrightness,
    };
  };

  const entityStatusOn = () => {
    path += `."on"`;
    return path;
  };

  const entityStatusBrightness = () => {
    path += `."brightness"`;
    return path;
  };

  const entityControl = () => {
    path += `."control"`;
    return {
      onOff: entityControlOn,
      brightness: entityControlBrightness,
    };
  };

  const entityControlOn = () => {
    path += `."on"`;
    return path;
  };

  const entityControlBrightness = () => {
    path += `."brightness"`;
    return path;
  };

  return {
    entity,
  };
};
