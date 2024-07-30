import {
  Configuration,
  getEnv,
  parseBooleanFromString,
  TestConfiguration,
} from './configuration';

export function getLocalConfig(): Configuration {
  return {
    auth: {
      jwtSecret: getEnv(
        'JWT_SECRET_KEY',
        'ssssh',
      ),
      apiKeyForClients: getEnv(
        'API_KEY_FOR_CLIENT',
        'ssssh',
      ),
    },
    database: {
      connectionString: getEnv(
        'MONGO_CONNECTION_STRING',
        'mongodb://localadmin:localadmin@127.0.0.1:27017/unibuddy-chat-local?authSource=admin',
      ),
    },
    userService: {
      url: getEnv('USER_SERVICE_URL', 'http://localhost:1080'),
      // Ensure that you have added this to your local env
      token: getEnv('UB_INTERNAL_API_KEY', 'ub_internal_api_key'),
    },
    pusher: {
      secretKey: getEnv('PUSHER_APP_SECRET', '1'),
      appId: getEnv('PUSHER_APP_ID', '1'),
      key: getEnv('PUSHER_APP_KEY', '1'),
      sendPusherMessages: parseBooleanFromString('PUSHER_APP_ENABLED', false),
    },
  };
}

export function getTestConfiguration(): TestConfiguration {
  return {
    database: {
      connectionString:
        'mongodb://localadmin:localadmin@127.0.0.1:27017/unibuddy-chat-local?authSource=admin',
    },
  };
}
