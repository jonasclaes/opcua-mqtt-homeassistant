export type SupportedDevice = {
  manufacturer: string;
  model: string;
  version: string;
  type: string;
};

export const supportedDevices: SupportedDevice[] = [
  {
    manufacturer: "jonasclaes.be",
    model: "LIGHT-UA",
    version: "v2.0.0",
    type: "LIGHT",
  },
];
