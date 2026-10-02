import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
@Module({ controllers: [ApiController], providers: [Database, PlatformService] })
export class AppModule {}
