import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { NavLinkGroup } from '../../../generated/prisma/enums';

export class CreateNavLinkDto {
  /** Per-locale labels, e.g. { AR: 'الفنادق' }. Blank clears the override. */
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @IsEnum(NavLinkGroup)
  group: NavLinkGroup;

  /** The text a visitor reads. */
  @IsString()
  @Length(1, 60)
  value: string;

  /**
   * Where the click goes. Null or omitted means "not built yet" — the site
   * routes those to /coming-soon rather than rendering a dead label.
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Length(1, 300)
  href?: string | null;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Every field optional: the admin UI patches one thing at a time. */
export class UpdateNavLinkDto {
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @IsOptional()
  @IsEnum(NavLinkGroup)
  group?: NavLinkGroup;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  value?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Length(1, 300)
  href?: string | null;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderNavLinksDto {
  /** Link ids in their new display order, within one group. */
  @IsEnum(NavLinkGroup)
  group: NavLinkGroup;

  @IsString({ each: true })
  ids: string[];
}
