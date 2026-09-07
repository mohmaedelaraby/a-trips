import { Module } from '@nestjs/common';
import { NavLinksService } from './nav-links.service';
import {
  AdminNavLinksController,
  NavLinksController,
} from './nav-links.controller';

@Module({
  providers: [NavLinksService],
  controllers: [NavLinksController, AdminNavLinksController],
  exports: [NavLinksService],
})
export class NavLinksModule {}
