import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadUbEnv } from './configuration/configuration';

async function bootstrap() {
  loadUbEnv('UB_CHAT_ENV_INJECT');
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Chat service')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key For External calls',
      },
      'X-API-KEY',
    )
    .setDescription('The chat REST API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  writeFileSync(
    join(process.cwd(), './openapi.json'),
    JSON.stringify(document, null, 4),
  );

  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}
bootstrap();
