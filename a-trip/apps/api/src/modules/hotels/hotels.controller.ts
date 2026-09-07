import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { HotelDetailQueryDto, HotelSearchDto } from './dto/hotel-search.dto';
import { AvailabilityService } from '../availability/availability.service';
import {
  AvailabilityRangeQueryDto,
  CalendarQueryDto,
} from '../availability/dto/availability-query.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('hotels')
@Public()
@Controller('hotels')
export class HotelsController {
  constructor(
    private readonly hotels: HotelsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Get()
  search(@Query() query: HotelSearchDto) {
    return this.hotels.search(query);
  }

  @Get('cities')
  cities() {
    return this.hotels.listCities();
  }

  /** Accepts either a hotel id or its public slug. */
  @Get(':idOrSlug')
  detail(@Param('idOrSlug') idOrSlug: string, @Query() query: HotelDetailQueryDto) {
    return this.hotels.findPublicByIdOrSlug(idOrSlug, query);
  }

  /**
   * Per-night sellability for the whole hotel, so the public date picker can
   * grey out dates instead of letting a guest pick a stay that cannot be sold.
   */
  @Get(':idOrSlug/availability')
  async availabilityCalendar(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: CalendarQueryDto,
  ) {
    const hotelId = await this.hotels.resolvePublishedId(idOrSlug);
    return this.availability.hotelNightlyAvailability(hotelId, query.from, query.to);
  }

  @Get(':idOrSlug/room-types/:roomTypeId/availability')
  roomTypeAvailability(
    @Param('roomTypeId') roomTypeId: string,
    @Query() query: AvailabilityRangeQueryDto,
  ) {
    return this.availability.assessRangePublic(roomTypeId, query.checkIn, query.checkOut);
  }
}
