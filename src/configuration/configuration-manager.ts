import { Inject } from '@nestjs/common';
import { Configuration } from './configuration';
import { getLocalConfig } from './configuration-manager.utils';

export interface IConfigurationManager {
  getConfiguration(): Configuration;
}

export class ConfigurationManager implements IConfigurationManager {
  private configuration: Configuration;

  constructor(@Inject('CONFIG') private config: Configuration) {
    this.configuration = this.config;
  }

  getConfiguration(): Configuration {
    return this.configuration;
  }
}

export class MockedConfigurationManager implements IConfigurationManager {
  private configuration: Configuration;

  constructor(private configOverrides?: Partial<Configuration>) {
    this.configuration = { ...getLocalConfig(), ...configOverrides };
  }

  getConfiguration(): Configuration {
    return this.configuration;
  }
}
