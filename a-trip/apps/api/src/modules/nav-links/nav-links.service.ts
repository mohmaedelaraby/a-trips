import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NavLinkGroup } from '../../generated/prisma/enums';
import type {
  CreateNavLinkDto,
  ReorderNavLinksDto,
  UpdateNavLinkDto,
} from './dto/nav-link.dto';

type NavLinkRow = {
  id: string;
  group: NavLinkGroup;
  value: string;
  href: string | null;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
};

const ORDER = [{ sortOrder: 'asc' }, { value: 'asc' }] as const;

@Injectable()
export class NavLinksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everything the site footer needs, in one response.
   *
   * Grouped server-side so the client renders straight from the payload without
   * re-sorting or bucketing, and so adding a group later does not require a
   * matching change in the web app.
   */
  async publicNav() {
    const rows = await this.prisma.navLink.findMany({
      where: { isActive: true },
      orderBy: [...ORDER],
      select: {
        id: true,
        group: true,
        value: true,
        href: true,
        openInNewTab: true,
      },
    });

    const groups: Record<NavLinkGroup, typeof rows> = {
      HEADER: [],
      FOOTER_COMPANY: [],
      FOOTER_SUPPORT: [],
    };
    for (const row of rows) groups[row.group].push(row);

    return {
      groups: (Object.keys(groups) as NavLinkGroup[]).map((group) => ({
        group,
        links: groups[group].map(({ group: _g, ...link }) => link),
      })),
    };
  }

  // ----------------------------------------------------------------- admin

  /** Admin list includes inactive rows; the public feed does not. */
  list() {
    return this.prisma.navLink.findMany({ orderBy: [{ group: 'asc' }, ...ORDER] });
  }

  async create(dto: CreateNavLinkDto) {
    return this.prisma.navLink.create({
      data: {
        group: dto.group,
        value: dto.value.trim(),
        href: this.normalizeHref(dto.href),
        openInNewTab: dto.openInNewTab ?? false,
        // New links land at the bottom of their column rather than silently
        // sharing position 0 with whatever is already there.
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder(dto.group)),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateNavLinkDto) {
    await this.assertExists(id);
    return this.prisma.navLink.update({
      where: { id },
      data: {
        ...(dto.group !== undefined ? { group: dto.group } : {}),
        ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
        ...(dto.href !== undefined ? { href: this.normalizeHref(dto.href) } : {}),
        ...(dto.openInNewTab !== undefined ? { openInNewTab: dto.openInNewTab } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.navLink.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Writes the new order in one transaction so the footer never renders half-reordered. */
  async reorder(dto: ReorderNavLinksDto) {
    const rows = await this.prisma.navLink.findMany({
      where: { id: { in: dto.ids } },
      select: { id: true, group: true },
    });
    if (rows.length !== dto.ids.length) {
      throw new NotFoundException('One or more links no longer exist');
    }
    const foreign = rows.find((row) => row.group !== dto.group);
    if (foreign) throw new BadRequestException('All links must belong to the same group');

    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.navLink.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return this.list();
  }

  // --------------------------------------------------------------- helpers

  private async nextSortOrder(group: NavLinkGroup): Promise<number> {
    const last = await this.prisma.navLink.findFirst({
      where: { group },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  }

  /**
   * Blank means "no destination yet", stored as null so the site can route it
   * to /coming-soon. Anything else must be a site-relative path or an
   * http(s) URL — a bare "example.com" would resolve against our own origin,
   * and `javascript:` is an XSS vector once this string reaches an href.
   */
  private normalizeHref(href: string | null | undefined): string | null {
    if (href === undefined || href === null) return null;
    const trimmed = href.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('/')) return trimmed;
    if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;

    throw new BadRequestException(
      'Link must start with "/" for a page on this site, or with http:// or https:// for an external site',
    );
  }

  private async assertExists(id: string): Promise<NavLinkRow> {
    const row = await this.prisma.navLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Footer link not found');
    return row;
  }
}
