import { Module } from '@nestjs/common';
import {
  Configuration,
} from './configuration';
import { ConfigurationManager } from './configuration-manager';
import { getLocalConfig } from './configuration-manager.utils';

export async function loadConfig(): Promise<Configuration> {
  // Local config
    return getLocalConfig();
}

const configProvider = {
  provide: 'CONFIG',
  useFactory: () => loadConfig(),
};

@Module({
  providers: [configProvider, ConfigurationManager],
  exports: [ConfigurationManager],
})
export class ConfigManagerModule {}
