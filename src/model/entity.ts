import type { Capability } from "./capability.ts";

export class Entity {
  #systemName: string;
  #manufacturer: string;
  #model: string;
  #version: string;
  #type: string;
  #capabilities: Capability[];
  #name: string;

  constructor(
    systemName: string,
    manufacturer: string,
    model: string,
    version: string,
    type: string,
    capabilities: Capability[],
    name: string
  ) {
    this.#systemName = systemName;
    this.#manufacturer = manufacturer;
    this.#model = model;
    this.#version = version;
    this.#type = type;
    this.#capabilities = capabilities;
    this.#name = name;
  }
}
