import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NavLinksService } from './nav-links.service';
import {
  CreateNavLinkDto,
  ReorderNavLinksDto,
  UpdateNavLinkDto,
} from './dto/nav-link.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

/**
 * The whole footer in one public request, so the site fetches it once on first
 * render instead of once per column.
 */
@ApiTags('footer')
@Public()
@Controller('nav-links')
export class NavLinksController {
  constructor(private readonly navLinks: NavLinksService) {}

  @Get()
  publicNav() {
    return this.navLinks.publicNav();
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/nav-links')
export class AdminNavLinksController {
  constructor(private readonly navLinks: NavLinksService) {}

  @Get()
  list() {
    return this.navLinks.list();
  }

  @Post()
  create(@Body() dto: CreateNavLinkDto) {
    return this.navLinks.create(dto);
  }

  /** Reorder is declared before ":id" so "reorder" is not read as an id. */
  @Patch('reorder')
  reorder(@Body() dto: ReorderNavLinksDto) {
    return this.navLinks.reorder(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNavLinkDto) {
    return this.navLinks.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.navLinks.remove(id);
  }
}
