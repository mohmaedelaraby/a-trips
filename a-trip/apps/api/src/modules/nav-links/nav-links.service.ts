import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '../../generated/prisma/enums';
import { NavLinksRepository } from './repositories/nav-links.repository';
import {
  groupNavLinks,
  groupTranslationsById,
  navTranslationKey,
  normalizeHref,
} from './utils/nav-link.util';
import type {
  CreateNavLinkDto,
  ReorderNavLinksDto,
  UpdateNavLinkDto,
} from './dto/nav-link.dto';

@Injectable()
export class NavLinksService {
  constructor(private readonly repository: NavLinksRepository) {}

  /** Everything the site header and footer need, in one response. */
  async publicNav() {
    return groupNavLinks(await this.repository.findActive());
  }

  // ----------------------------------------------------------------- admin

  /**
   * Admin list, each row carrying its translations.
   *
   * Without these the portal could create a link but never translate it: the
   * label lives on the row while its Arabic lives in the Translation table under
   * `nav.<id>`, and nothing joined the two for the editor.
   */
  async list() {
    const rows = await this.repository.findAll();
    if (rows.length === 0) return [];

    const translations = await this.repository.findTranslations(rows.map((row) => row.id));
    const byId = groupTranslationsById(translations);

    return rows.map((row) => ({ ...row, translations: byId.get(row.id) ?? {} }));
  }

  async create(dto: CreateNavLinkDto) {
    const created = await this.repository.create({
      group: dto.group,
      value: dto.value.trim(),
      href: normalizeHref(dto.href),
      openInNewTab: dto.openInNewTab ?? false,
      sortOrder: dto.sortOrder ?? (await this.repository.nextSortOrder(dto.group)),
      isActive: dto.isActive ?? true,
    });
    await this.saveTranslations(created.id, dto.translations);
    return created;
  }

  async update(id: string, dto: UpdateNavLinkDto) {
    await this.assertExists(id);
    await this.saveTranslations(id, dto.translations);
    return this.repository.update(id, {
      ...(dto.group !== undefined ? { group: dto.group } : {}),
      ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
      ...(dto.href !== undefined ? { href: normalizeHref(dto.href) } : {}),
      ...(dto.openInNewTab !== undefined ? { openInNewTab: dto.openInNewTab } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.repository.deleteWithTranslations(id);
    return { id, deleted: true };
  }

  async reorder(dto: ReorderNavLinksDto) {
    const rows = await this.repository.findManyByIds(dto.ids);
    if (rows.length !== dto.ids.length) {
      throw new NotFoundException('One or more links no longer exist');
    }
    const foreign = rows.find((row) => row.group !== dto.group);
    if (foreign) throw new BadRequestException('All links must belong to the same group');

    await this.repository.applyOrder(dto.ids);
    return this.list();
  }

  /** Writes one link's per-locale labels; a blank value clears the override. */
  private async saveTranslations(id: string, translations?: Record<string, string>) {
    if (!translations) return;
    const key = navTranslationKey(id);
    for (const [locale, raw] of Object.entries(translations)) {
      const value = (raw ?? '').trim();
      if (!value) {
        await this.repository.deleteTranslation(key, locale as Locale);
        continue;
      }
      await this.repository.upsertTranslation(key, locale as Locale, value);
    }
  }

  private async assertExists(id: string) {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException('Footer link not found');
    return row;
  }
}
