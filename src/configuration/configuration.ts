function parseIntOrDefault(
  value: string | null | undefined,
  defaultValue: number,
): number {
  return value !== undefined && value !== null ? parseInt(value) : defaultValue;
}

// Overloading signature to let the compiler know it's fine to pass a string
export function getEnv(name: string, defaultValue: string): string;
export function getEnv(name: string, defaultValue?: string): string | undefined;
// Remember, the implementation doesn't count as one of the overloads.
// We could put "any" here but i don't want to confuse anymore that this
export function getEnv(
  name: string,
  defaultValue?: string,
): string | undefined {
  const processValue = process.env[name];
  if (typeof processValue === 'undefined') {
    return defaultValue;
  }
  return processValue;
}

export function parseBooleanFromString(
  name: string,
  defaultValue: boolean,
): boolean {
  const value = getEnv(name);

  if (typeof value === 'undefined') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return value.toLowerCase() === 'true';
}

function getEnvInt(name: string, defaultValue: number): number {
  const value = getEnv(name);

  if (value === undefined) {

    return defaultValue;
  }
  if (typeof value === 'number') {
    return value;
  } else {
    return parseInt(value);
  }
}

export interface IDatabaseConfig {
  connectionString: string;
}

export interface IServerConfig {
  port: number;
  env: string;
  serviceName: string;
}

export interface IAuthConfig {
  jwtSecret: string;
  apiKeyForClients: string;
}

export interface IPusherConfig {
  secretKey: string;
  appId: string;
  key: string;
  sendPusherMessages: boolean;
}

export interface IUserServiceConfig {
  url: string;
  token: string;
}

export interface ICacheManagerConfig {
  url: string;
  port: number;
  ttl: number;
  name: string;
  maxItems: number;
}

export interface IMigrationsConfig {
  allowMigrations: boolean;
}

export interface Configuration {
  auth: IAuthConfig;
  database: IDatabaseConfig;
  userService: IUserServiceConfig;
  pusher: IPusherConfig;
}

export default (): {
  server: IServerConfig;
  cache: ICacheManagerConfig;
  migrations: IMigrationsConfig;
} => ({
  server: {
    port: parseIntOrDefault(process.env.PORT, 3000),
    env: getEnv('UB_INSTANCE', 'local').toLowerCase(),
    serviceName: 'ub-chat-service',
  },
  cache: {
    url: getEnv('REDIS_URL', 'localhost'),
    port: getEnvInt('REDIS_PORT', 6379),
    ttl: getEnvInt('CACHE_TTL', 300), // seconds
    name: getEnv('CACHE_NAME', 'chat-service'),
    maxItems: getEnvInt('CACHE_MAX_ITEMS', 20000),
  },
  migrations: {
    allowMigrations: parseBooleanFromString('ALLOW_MIGRATIONS', true),
  },
});

export const loadUbEnv = (variableName: string) => {
  const ubEnv = process.env[variableName] || '{}';

  const envVars = JSON.parse(ubEnv);

  for (const [key, value] of Object.entries(envVars)) {
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = `${value}`;
    }
  }
};

export interface TestConfiguration {
  database: IDatabaseConfig;
}
