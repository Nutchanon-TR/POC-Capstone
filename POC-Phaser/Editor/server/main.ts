import 'reflect-metadata';
import './env';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Database } from './database';
import { CatalogService } from './catalog';
import { MapsController, MapsService } from './maps';
import { HallGateway } from './realtime/hall.gateway';
import { VoiceService } from './realtime/voice.service';
import { AssetsController, AssetsService } from './assets';
@Module({
  controllers: [MapsController, AssetsController],
  providers: [Database, AssetsService, CatalogService, MapsService, HallGateway, VoiceService],
})
class AppModule {}
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '4mb' });
  app.enableShutdownHooks();
  await app.get(Database).migrate();
  await app.get(MapsService).seed();
  await app.listen(Number(process.env.API_PORT || 3102), '127.0.0.1');
}
void main();
