import { Module } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { AdminSiteSettingsController } from './site-settings.controller';
import { SiteContentController } from './site-content.controller';
import { NavLinksModule } from '../nav-links/nav-links.module';
import { TranslationsModule } from '../translations/translations.module';
import { SiteSettingsRepository } from './repositories/site-settings.repository';

@Module({
  imports: [NavLinksModule, TranslationsModule],
  providers: [SiteSettingsService, SiteSettingsRepository],
  controllers: [SiteContentController, AdminSiteSettingsController],
  exports: [SiteSettingsService, SiteSettingsRepository],
})
export class SiteSettingsModule {}
