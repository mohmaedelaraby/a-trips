import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingsDto } from './dto/site-setting.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/site-settings')
export class AdminSiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Get()
  list() {
    return this.settings.list();
  }

  @Patch()
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.settings.update(dto);
  }

  /** Restores the shipped default for one setting. */
  @Delete(':key')
  reset(@Param('key') key: string) {
    return this.settings.reset(key);
  }
}
