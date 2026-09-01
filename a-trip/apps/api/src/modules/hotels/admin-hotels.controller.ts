import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { MAX_UPLOAD_BYTES, StorageService } from '../storage/storage.service';
import {
  AddHotelImagesDto,
  AdminHotelListDto,
  CreateHotelDto,
  ReorderHotelImagesDto,
  UpdateHotelDto,
} from './dto/hotel.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('admin/hotels')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/hotels')
export class AdminHotelsController {
  constructor(
    private readonly hotels: HotelsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  list(@Query() query: AdminHotelListDto) {
    return this.hotels.adminList(query);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.hotels.adminFindOne(id);
  }

  @Post()
  create(@Body() dto: CreateHotelDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.hotels.create(dto, admin.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHotelDto) {
    return this.hotels.update(id, dto);
  }

  @Post(':id/images')
  addImages(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddHotelImagesDto) {
    return this.hotels.addImages(id, dto);
  }

  /**
   * Multipart upload straight from the admin portal. Files are streamed into
   * object storage and the resulting URLs are attached to the hotel, so the
   * client never needs storage credentials.
   */
  @Post(':id/images/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
    }),
  )
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const urls = await Promise.all(
      (files ?? []).map((file) => this.storage.uploadImage(file, `hotels/${id}`)),
    );
    return this.hotels.addImages(id, { images: urls.map((url) => ({ url })) });
  }

  @Patch(':id/images/order')
  reorderImages(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderHotelImagesDto) {
    return this.hotels.reorderImages(id, dto.imageIds);
  }

  @Delete(':id/images/:imageId')
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    // Read the URL first: once the row is gone the object key is unrecoverable.
    const url = await this.hotels.findImageUrl(id, imageId);
    const result = await this.hotels.removeImage(id, imageId);
    // Only objects we own are touched; externally hosted URLs are ignored.
    if (url) await this.storage.deleteByUrl(url);
    return result;
  }
}
