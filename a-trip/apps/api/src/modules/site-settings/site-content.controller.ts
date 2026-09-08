import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';
import { NavLinksService } from '../nav-links/nav-links.service';
import {
  FALLBACK_LOCALE,
  RTL_LOCALES,
  TranslationsService,
} from '../translations/translations.service';
import { Public } from '../../common/decorators/public.decorator';
import { Locale } from '../../generated/prisma/enums';
import { SiteContentQueryDto } from './dto/site-setting.dto';

/**
 * Everything the site chrome needs — navigation, editable copy and the
 * translation overrides — in one request, for one locale.
 *
 * Localisation happens here rather than in the client so a page can be
 * server-rendered in Arabic: the nav labels and settings arrive already
 * translated, and `translations` carries the ui.* overrides the web app layers
 * over its shipped JSON.
 */
@ApiTags('site')
@Public()
@Controller('site-content')
export class SiteContentController {
  constructor(
    private readonly navLinks: NavLinksService,
    private readonly settings: SiteSettingsService,
    private readonly translations: TranslationsService,
  ) {}

  @Get()
  async siteContent(@Query() query: SiteContentQueryDto) {
    const locale = query.locale ?? FALLBACK_LOCALE;

    const [nav, settings, overrides] = await Promise.all([
      this.navLinks.publicNav(),
      this.settings.publicMap(),
      this.translations.mapFor(locale),
    ]);

    // A link's stored `value` is its default wording; nav.<id> overrides it.
    const groups = nav.groups.map((group) => ({
      ...group,
      links: group.links.map((link) => ({
        ...link,
        value: this.translations.localize(overrides, `nav.${link.id}`, link.value),
      })),
    }));

    const localizedSettings: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      localizedSettings[key] = this.translations.localize(overrides, `setting.${key}`, value);
    }

    // Only ui.* reaches the client: nav and setting overrides are already
    // applied above, and shipping them again would just bloat the payload.
    const uiTranslations: Record<string, string> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (key.startsWith('ui.')) uiTranslations[key] = value;
    }

    return {
      locale,
      dir: RTL_LOCALES.includes(locale as Locale) ? 'rtl' : 'ltr',
      groups,
      settings: localizedSettings,
      translations: uiTranslations,
    };
  }
}
