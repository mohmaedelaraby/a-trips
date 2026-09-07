import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';
import { NavLinksService } from '../nav-links/nav-links.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Everything the site chrome needs — navigation and editable copy — in one
 * request, so the app fetches it once on first render rather than once per
 * region of the page.
 */
@ApiTags('site')
@Public()
@Controller('site-content')
export class SiteContentController {
  constructor(
    private readonly navLinks: NavLinksService,
    private readonly settings: SiteSettingsService,
  ) {}

  @Get()
  async siteContent() {
    const [nav, settings] = await Promise.all([
      this.navLinks.publicNav(),
      this.settings.publicMap(),
    ]);
    return { ...nav, settings };
  }
}
