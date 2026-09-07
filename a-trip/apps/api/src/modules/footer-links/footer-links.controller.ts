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
import { FooterLinksService } from './footer-links.service';
import {
  CreateFooterLinkDto,
  ReorderFooterLinksDto,
  UpdateFooterLinkDto,
} from './dto/footer-link.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

/**
 * The whole footer in one public request, so the site fetches it once on first
 * render instead of once per column.
 */
@ApiTags('footer')
@Public()
@Controller('footer-links')
export class FooterLinksController {
  constructor(private readonly footerLinks: FooterLinksService) {}

  @Get()
  publicFooter() {
    return this.footerLinks.publicFooter();
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/footer-links')
export class AdminFooterLinksController {
  constructor(private readonly footerLinks: FooterLinksService) {}

  @Get()
  list() {
    return this.footerLinks.list();
  }

  @Post()
  create(@Body() dto: CreateFooterLinkDto) {
    return this.footerLinks.create(dto);
  }

  /** Reorder is declared before ":id" so "reorder" is not read as an id. */
  @Patch('reorder')
  reorder(@Body() dto: ReorderFooterLinksDto) {
    return this.footerLinks.reorder(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFooterLinkDto) {
    return this.footerLinks.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.footerLinks.remove(id);
  }
}
