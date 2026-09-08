import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Locale, NavLinkGroup } from '../../../generated/prisma/enums';
import type { NavLink, Prisma } from '../../../generated/prisma/client';
import { NAV_ORDER, navTranslationKey, type PublicNavLink } from '../utils/nav-link.util';

@Injectable()
export class NavLinksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active links only, with just the columns the site renders. */
  findActive(): Promise<PublicNavLink[]> {
    return this.prisma.navLink.findMany({
      where: { isActive: true },
      orderBy: [...NAV_ORDER],
      select: { id: true, group: true, value: true, href: true, openInNewTab: true },
    });
  }

  findAll(): Promise<NavLink[]> {
    return this.prisma.navLink.findMany({ orderBy: [{ group: 'asc' }, ...NAV_ORDER] });
  }

  findById(id: string): Promise<NavLink | null> {
    return this.prisma.navLink.findUnique({ where: { id } });
  }

  findManyByIds(ids: string[]) {
    return this.prisma.navLink.findMany({
      where: { id: { in: ids } },
      select: { id: true, group: true },
    });
  }

  findTranslations(ids: string[]) {
    return this.prisma.translation.findMany({
      where: { key: { in: ids.map(navTranslationKey) } },
      select: { key: true, locale: true, value: true },
    });
  }

  /** New links land at the bottom of their column rather than sharing position 0. */
  async nextSortOrder(group: NavLinkGroup): Promise<number> {
    const last = await this.prisma.navLink.findFirst({
      where: { group },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  }

  create(data: Prisma.NavLinkUncheckedCreateInput): Promise<NavLink> {
    return this.prisma.navLink.create({ data });
  }

  update(id: string, data: Prisma.NavLinkUpdateInput): Promise<NavLink> {
    return this.prisma.navLink.update({ where: { id }, data });
  }

  /** Drops the label's translations too, or they linger as orphans forever. */
  async deleteWithTranslations(id: string) {
    await this.prisma.$transaction([
      this.prisma.translation.deleteMany({ where: { key: navTranslationKey(id) } }),
      this.prisma.navLink.delete({ where: { id } }),
    ]);
  }

  /** One transaction so the footer never renders half-reordered. */
  applyOrder(ids: string[]) {
    return this.prisma.$transaction(
      ids.map((id, index) => this.prisma.navLink.update({ where: { id }, data: { sortOrder: index } })),
    );
  }

  upsertTranslation(key: string, locale: Locale, value: string) {
    return this.prisma.translation.upsert({
      where: { key_locale: { key, locale } },
      create: { key, locale, value },
      update: { value },
    });
  }

  deleteTranslation(key: string, locale: Locale) {
    return this.prisma.translation.deleteMany({ where: { key, locale } });
  }
}
