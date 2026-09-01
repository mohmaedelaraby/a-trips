import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const DAYS_OF_INVENTORY = 180;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dateOnly(offsetDays: number): Date {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + offsetDays * 86_400_000);
}

interface RoomSeed {
  name: string;
  description: string;
  capacityAdults: number;
  capacityChildren: number;
  numOfBeds: number;
  sizeSqm: number;
  basePrice: number;
  units: number;
  /** Weekend (Fri/Sat) uplift applied on top of basePrice. */
  weekendUplift?: number;
}

interface HotelSeed {
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  stars: number;
  latitude: number;
  longitude: number;
  amenities: string[];
  images: string[];
  rooms: RoomSeed[];
}

const AMENITIES = {
  pool: 'Swimming pool',
  wifi: 'Free Wi-Fi',
  breakfast: 'Breakfast included',
  spa: 'Spa',
  gym: 'Fitness centre',
  parking: 'Free parking',
  restaurant: 'Restaurant',
  bar: 'Bar',
  ac: 'Air conditioning',
  familyRooms: 'Family rooms',
  airport: 'Airport shuttle',
  nileView: 'Nile view',
  pyramidView: 'Pyramid view',
  beach: 'Private beach',
  desk: 'Tour desk',
};

const HOTELS: HotelSeed[] = [
  {
    name: 'Nile Grand Cairo',
    city: 'Cairo',
    country: 'Egypt',
    address: '12 Corniche El Nil, Garden City',
    description:
      'A riverside five-star on the Garden City corniche, ten minutes from the Egyptian Museum. Rooms look straight out over the Nile, and the rooftop pool is open year round.',
    stars: 5,
    latitude: 30.0361,
    longitude: 31.2297,
    amenities: [
      AMENITIES.pool,
      AMENITIES.wifi,
      AMENITIES.breakfast,
      AMENITIES.spa,
      AMENITIES.gym,
      AMENITIES.restaurant,
      AMENITIES.bar,
      AMENITIES.ac,
      AMENITIES.nileView,
      AMENITIES.desk,
    ],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80',
    ],
    rooms: [
      {
        name: 'Deluxe Nile View King',
        description: 'Floor-to-ceiling windows over the river, king bed, marble bathroom.',
        capacityAdults: 2,
        capacityChildren: 1,
        numOfBeds: 1,
        sizeSqm: 38,
        basePrice: 165,
        units: 12,
        weekendUplift: 25,
      },
      {
        name: 'Executive Suite',
        description: 'Separate living room, lounge access, and a wraparound balcony.',
        capacityAdults: 3,
        capacityChildren: 2,
        numOfBeds: 2,
        sizeSqm: 62,
        basePrice: 295,
        units: 4,
        weekendUplift: 40,
      },
      {
        name: 'Classic Twin',
        description: 'Two single beds, city outlook, ideal for friends travelling together.',
        capacityAdults: 2,
        capacityChildren: 0,
        numOfBeds: 2,
        sizeSqm: 30,
        basePrice: 120,
        units: 10,
      },
    ],
  },
  {
    name: 'Pyramids View Boutique',
    city: 'Giza',
    country: 'Egypt',
    address: '3 Abu El Hol Street, Nazlet El Semman',
    description:
      'A small owner-run boutique hotel a five-minute walk from the Sphinx entrance. Every upper-floor room faces the plateau, and the terrace is the best seat in Giza for the evening sound and light show.',
    stars: 4,
    latitude: 29.9773,
    longitude: 31.1325,
    amenities: [
      AMENITIES.wifi,
      AMENITIES.breakfast,
      AMENITIES.restaurant,
      AMENITIES.ac,
      AMENITIES.pyramidView,
      AMENITIES.familyRooms,
      AMENITIES.desk,
      AMENITIES.airport,
    ],
    images: [
      'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
    ],
    rooms: [
      {
        name: 'Pyramid View Double',
        description: 'Queen bed with a private balcony facing the Great Pyramid.',
        capacityAdults: 2,
        capacityChildren: 1,
        numOfBeds: 1,
        sizeSqm: 26,
        basePrice: 95,
        units: 8,
        weekendUplift: 15,
      },
      {
        name: 'Family Room',
        description: 'Two rooms connected, sleeping four, with a kitchenette.',
        capacityAdults: 4,
        capacityChildren: 2,
        numOfBeds: 3,
        sizeSqm: 45,
        basePrice: 140,
        units: 3,
        weekendUplift: 20,
      },
    ],
  },
  {
    name: 'Luxor Palace Resort',
    city: 'Luxor',
    country: 'Egypt',
    address: 'Khaled Ibn El Waleed Street, East Bank',
    description:
      'Colonial-era resort on the East Bank with gardens running down to the water, opposite the Valley of the Kings ferry. Balloon pickups leave from reception at dawn.',
    stars: 5,
    latitude: 25.6989,
    longitude: 32.6421,
    amenities: [
      AMENITIES.pool,
      AMENITIES.wifi,
      AMENITIES.breakfast,
      AMENITIES.spa,
      AMENITIES.restaurant,
      AMENITIES.bar,
      AMENITIES.ac,
      AMENITIES.parking,
      AMENITIES.nileView,
      AMENITIES.desk,
    ],
    images: [
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80',
    ],
    rooms: [
      {
        name: 'Garden Room',
        description: 'Ground-floor room opening onto the palm gardens.',
        capacityAdults: 2,
        capacityChildren: 1,
        numOfBeds: 1,
        sizeSqm: 32,
        basePrice: 110,
        units: 14,
      },
      {
        name: 'Nile Suite',
        description: 'Corner suite with a terrace over the river and the West Bank beyond.',
        capacityAdults: 2,
        capacityChildren: 2,
        numOfBeds: 2,
        sizeSqm: 55,
        basePrice: 210,
        units: 5,
        weekendUplift: 30,
      },
    ],
  },
  {
    name: 'Red Sea Reef Hotel',
    city: 'Hurghada',
    country: 'Egypt',
    address: 'Village Road, Sakkala',
    description:
      'Dive-focused beach hotel with its own house reef, a PADI centre on site, and boats leaving from the hotel jetty every morning.',
    stars: 4,
    latitude: 27.2579,
    longitude: 33.8116,
    amenities: [
      AMENITIES.pool,
      AMENITIES.wifi,
      AMENITIES.breakfast,
      AMENITIES.restaurant,
      AMENITIES.bar,
      AMENITIES.ac,
      AMENITIES.beach,
      AMENITIES.gym,
      AMENITIES.familyRooms,
    ],
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
    ],
    rooms: [
      {
        name: 'Sea View Double',
        description: 'Balcony over the bay, king or twin on request.',
        capacityAdults: 2,
        capacityChildren: 2,
        numOfBeds: 1,
        sizeSqm: 28,
        basePrice: 85,
        units: 20,
        weekendUplift: 12,
      },
      {
        name: 'Beach Bungalow',
        description: 'Standalone bungalow steps from the sand, with an outdoor shower.',
        capacityAdults: 3,
        capacityChildren: 1,
        numOfBeds: 2,
        sizeSqm: 40,
        basePrice: 130,
        units: 6,
        weekendUplift: 20,
      },
    ],
  },
  {
    name: 'Aswan Nubian House',
    city: 'Aswan',
    country: 'Egypt',
    address: 'Gharb Soheil, West Bank',
    description:
      'A hand-painted Nubian guesthouse on the west bank, reachable only by boat. Twelve rooms, a rooftop for dinner, and felucca trips arranged by the family who run it.',
    stars: 3,
    latitude: 24.0525,
    longitude: 32.8797,
    amenities: [
      AMENITIES.wifi,
      AMENITIES.breakfast,
      AMENITIES.restaurant,
      AMENITIES.ac,
      AMENITIES.nileView,
      AMENITIES.desk,
    ],
    images: [
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1200&q=80',
      'https://images.unsplash.com/photo-1587985064135-0366536eab42?w=1200&q=80',
    ],
    rooms: [
      {
        name: 'Nubian Double',
        description: 'Domed ceiling, hand-painted walls, and a river-facing window.',
        capacityAdults: 2,
        capacityChildren: 1,
        numOfBeds: 1,
        sizeSqm: 22,
        basePrice: 55,
        units: 8,
      },
      {
        name: 'Rooftop Triple',
        description: 'Top-floor room with private roof access over the dunes.',
        capacityAdults: 3,
        capacityChildren: 1,
        numOfBeds: 3,
        sizeSqm: 30,
        basePrice: 78,
        units: 4,
      },
    ],
  },
  {
    name: 'Alexandria Corniche Suites',
    city: 'Alexandria',
    country: 'Egypt',
    address: '45 El Geish Road, Stanley',
    description:
      'Apartment-style suites on the Stanley seafront, a short walk from the Bibliotheca Alexandrina. Still being prepared for sale.',
    stars: 4,
    latitude: 31.2445,
    longitude: 29.9601,
    amenities: [AMENITIES.wifi, AMENITIES.ac, AMENITIES.parking, AMENITIES.gym, AMENITIES.beach],
    images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80'],
    rooms: [
      {
        name: 'One Bedroom Sea Suite',
        description: 'Kitchen, living room, and a balcony over the Mediterranean.',
        capacityAdults: 2,
        capacityChildren: 2,
        numOfBeds: 1,
        sizeSqm: 48,
        basePrice: 105,
        units: 10,
      },
    ],
  },
];

async function main(): Promise<void> {
  console.log('Seeding A Trip database...');

  // Idempotent: wipe the seeded domain, keep nothing stale behind.
  await prisma.booking.deleteMany();
  await prisma.roomAvailability.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hotelImage.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'A Trip Admin',
      email: 'admin@atrip.test',
      passwordHash,
      phone: '+20 100 000 0000',
      role: 'ADMIN',
    },
  });

  const traveller = await prisma.user.create({
    data: {
      name: 'Sara Mahmoud',
      email: 'sara@example.test',
      passwordHash,
      phone: '+20 100 111 2222',
      dateOfBirth: new Date('1994-04-18T00:00:00.000Z'),
    },
  });

  await prisma.user.create({
    data: { name: 'James Okoro', email: 'james@example.test', passwordHash },
  });

  let roomTypeCount = 0;
  let availabilityRows = 0;
  const createdRoomTypes: Array<{ id: string; hotelId: string; name: string }> = [];

  for (const [index, seed] of HOTELS.entries()) {
    // The last hotel stays in DRAFT so the admin list has both states to show.
    const status = index === HOTELS.length - 1 ? 'DRAFT' : 'PUBLISHED';

    const hotel = await prisma.hotel.create({
      data: {
        slug: slugify(`${seed.name} ${seed.city}`),
        name: seed.name,
        city: seed.city,
        country: seed.country,
        address: seed.address,
        description: seed.description,
        stars: seed.stars,
        latitude: seed.latitude,
        longitude: seed.longitude,
        amenities: seed.amenities,
        status,
        createdBy: admin.id,
        images: {
          create: seed.images.map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 })),
        },
      },
    });

    for (const room of seed.rooms) {
      const roomType = await prisma.roomType.create({
        data: {
          hotelId: hotel.id,
          name: room.name,
          description: room.description,
          capacityAdults: room.capacityAdults,
          capacityChildren: room.capacityChildren,
          numOfBeds: room.numOfBeds,
          sizeSqm: room.sizeSqm,
          basePrice: new Prisma.Decimal(room.basePrice),
        },
      });
      roomTypeCount += 1;
      createdRoomTypes.push({ id: roomType.id, hotelId: hotel.id, name: roomType.name });

      // Published hotels get a rolling window of open inventory.
      if (status !== 'PUBLISHED') continue;

      const rows: Prisma.RoomAvailabilityCreateManyInput[] = [];
      for (let offset = 0; offset < DAYS_OF_INVENTORY; offset += 1) {
        const date = dateOnly(offset);
        const weekday = date.getUTCDay();
        const isWeekend = weekday === 5 || weekday === 6;
        const priceOverride =
          isWeekend && room.weekendUplift
            ? new Prisma.Decimal(room.basePrice + room.weekendUplift)
            : null;

        rows.push({
          roomTypeId: roomType.id,
          date,
          totalUnits: room.units,
          priceOverride,
          // A short maintenance close-out two weeks out, so stop-sell is visible in the UI.
          stopSell: offset >= 14 && offset <= 16 && room.name === 'Executive Suite',
        });
      }
      await prisma.roomAvailability.createMany({ data: rows });
      availabilityRows += rows.length;
    }
  }

  // A couple of bookings so the admin queue and account area are not empty.
  const nileDeluxe = createdRoomTypes.find((rt) => rt.name === 'Deluxe Nile View King');
  const luxorGarden = createdRoomTypes.find((rt) => rt.name === 'Garden Room');

  if (nileDeluxe) {
    await prisma.booking.create({
      data: {
        bookingReference: 'AT-SEED0001',
        userId: traveller.id,
        hotelId: nileDeluxe.hotelId,
        roomTypeId: nileDeluxe.id,
        checkInDate: dateOnly(21),
        checkOutDate: dateOnly(24),
        numAdults: 2,
        numChildren: 0,
        totalPrice: new Prisma.Decimal(495),
        status: 'PENDING_CONFIRMATION',
      },
    });
  }

  if (luxorGarden) {
    await prisma.booking.create({
      data: {
        bookingReference: 'AT-SEED0002',
        userId: traveller.id,
        hotelId: luxorGarden.hotelId,
        roomTypeId: luxorGarden.id,
        checkInDate: dateOnly(40),
        checkOutDate: dateOnly(44),
        numAdults: 2,
        numChildren: 1,
        totalPrice: new Prisma.Decimal(440),
        status: 'CONFIRMED',
        adminNote: 'Confirmed with the hotel by phone.',
      },
    });
  }

  console.log(
    [
      `  hotels:       ${HOTELS.length} (${HOTELS.length - 1} published, 1 draft)`,
      `  room types:   ${roomTypeCount}`,
      `  availability: ${availabilityRows} nightly rows`,
      `  bookings:     2`,
      '',
      '  Admin login:  admin@atrip.test / Password123!',
      '  Guest login:  sara@example.test / Password123!',
    ].join('\n'),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
