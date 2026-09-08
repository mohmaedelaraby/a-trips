import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TranslationsService, LOCALES, RTL_LOCALES } from './translations.service';
import { ListTranslationsDto, UpdateTranslationsDto } from './dto/translation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('site')
@Public()
@Controller('locales')
export class LocalesController {
  /** What the site can render in, and which of those read right to left. */
  @Get()
  locales() {
    return {
      locales: LOCALES.map((code) => ({
        code,
        dir: RTL_LOCALES.includes(code) ? 'rtl' : 'ltr',
      })),
      fallback: 'EN',
    };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/translations')
export class AdminTranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  /**
   * POST rather than GET because the caller sends its key catalogue in the
   * body — the list of UI strings lives in the web app's JSON files, not here.
   */
  @Post('list')
  list(@Body() dto: ListTranslationsDto) {
    return this.translations.listForEditor(dto.knownKeys ?? []);
  }

  @Post()
  update(@Body() dto: UpdateTranslationsDto) {
    return this.translations.update(dto);
  }
}
