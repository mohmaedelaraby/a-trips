import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { FooterLinkGroup } from '../../../generated/prisma/enums';

export class CreateFooterLinkDto {
  @IsEnum(FooterLinkGroup)
  group: FooterLinkGroup;

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
export class UpdateFooterLinkDto {
  @IsOptional()
  @IsEnum(FooterLinkGroup)
  group?: FooterLinkGroup;

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

export class ReorderFooterLinksDto {
  /** Link ids in their new display order, within one group. */
  @IsEnum(FooterLinkGroup)
  group: FooterLinkGroup;

  @IsString({ each: true })
  ids: string[];
}
