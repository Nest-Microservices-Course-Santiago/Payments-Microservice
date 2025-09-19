import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Payments-ms')

  const app = await NestFactory.create(AppModule, {
    rawBody: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );
  app.connectMicroservice({
    transport: Transport.NATS,
    options: {
      servers: envs.natsServers
    }
  },{
    inheritAppConfig: true
  });
  await app.startAllMicroservices();
  await app.listen(envs.port);
  logger.log(`Payments Microservice running on port: ${envs.port}`);
}
bootstrap();
