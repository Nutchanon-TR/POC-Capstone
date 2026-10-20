import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // Load .env values for the whole application.
    ConfigModule.forRoot({ isGlobal: true }),
    TasksModule,
  ],
})
export class AppModule {}
