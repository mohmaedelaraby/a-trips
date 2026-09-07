import { Module } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { AdminSiteSettingsController } from './site-settings.controller';
import { SiteContentController } from './site-content.controller';
import { NavLinksModule } from '../nav-links/nav-links.module';

@Module({
  imports: [NavLinksModule],
  providers: [SiteSettingsService],
  controllers: [SiteContentController, AdminSiteSettingsController],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
