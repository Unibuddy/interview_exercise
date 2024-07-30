import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy, AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigurationManager } from '../configuration/configuration-manager';

/**
 * Type composed from referencing HeaderAPIKeyStrategy types
 */
export type PassportStrategyVerified = (
  err: Error | null,
  user?: boolean,
  info?: unknown,
) => void;

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'ApiKeyStrategy',
) {
  constructor(private configurationManager: ConfigurationManager) {
    super(
      { header: 'x-api-key', prefix: '' },
      true,
      (apikey: string, done: PassportStrategyVerified) => {
        const configApiKey =
          this.configurationManager.getConfiguration().auth.apiKeyForClients;
        const checkKey = apikey === configApiKey;
        if (!checkKey) {
          return done(null, false);
        }
        return done(null, true);
      },
    );
  }
}

@Injectable()
export class XApiKeyGuard extends AuthGuard('ApiKeyStrategy') {}
