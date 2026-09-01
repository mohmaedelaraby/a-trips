import { create } from 'zustand';
import type { GuestValue } from '../../../shared/components/guest-stepper';
import type { DateRangeValue } from '../../../shared/components/date-range-picker';
import type { HotelSortKey } from '../interfaces/hotel';

interface SearchFiltersState {
  city: string;
  dates: DateRangeValue;
  guests: GuestValue;
  minPrice: number | null;
  maxPrice: number | null;
  stars: number[];
  amenities: string[];
  sort: HotelSortKey;
  setCity: (city: string) => void;
  setDates: (dates: DateRangeValue) => void;
  setGuests: (guests: GuestValue) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  toggleStar: (star: number) => void;
  toggleAmenity: (amenity: string) => void;
  setSort: (sort: HotelSortKey) => void;
  reset: () => void;
}

const initial = {
  city: '',
  dates: { checkIn: null, checkOut: null } as DateRangeValue,
  guests: { adults: 2, children: 0 } as GuestValue,
  minPrice: null as number | null,
  maxPrice: null as number | null,
  stars: [] as number[],
  amenities: [] as string[],
  sort: 'recommended' as HotelSortKey,
};

export const useSearchFiltersStore = create<SearchFiltersState>((set) => ({
  ...initial,
  setCity: (city) => set({ city }),
  setDates: (dates) => set({ dates }),
  setGuests: (guests) => set({ guests }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  toggleStar: (star) =>
    set((state) => ({
      stars: state.stars.includes(star)
        ? state.stars.filter((s) => s !== star)
        : [...state.stars, star],
    })),
  toggleAmenity: (amenity) =>
    set((state) => ({
      amenities: state.amenities.includes(amenity)
        ? state.amenities.filter((a) => a !== amenity)
        : [...state.amenities, amenity],
    })),
  setSort: (sort) => set({ sort }),
  reset: () => set(initial),
}));
