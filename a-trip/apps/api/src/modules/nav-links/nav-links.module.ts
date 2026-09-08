import { Module } from '@nestjs/common';
import { NavLinksService } from './nav-links.service';
import {
  AdminNavLinksController,
  NavLinksController,
} from './nav-links.controller';
import { NavLinksRepository } from './repositories/nav-links.repository';

@Module({
  providers: [NavLinksService, NavLinksRepository],
  controllers: [NavLinksController, AdminNavLinksController],
  exports: [NavLinksService, NavLinksRepository],
})
export class NavLinksModule {}
