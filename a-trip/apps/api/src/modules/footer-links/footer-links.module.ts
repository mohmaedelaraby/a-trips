import { Module } from '@nestjs/common';
import { FooterLinksService } from './footer-links.service';
import {
  AdminFooterLinksController,
  FooterLinksController,
} from './footer-links.controller';

@Module({
  providers: [FooterLinksService],
  controllers: [FooterLinksController, AdminFooterLinksController],
  exports: [FooterLinksService],
})
export class FooterLinksModule {}
