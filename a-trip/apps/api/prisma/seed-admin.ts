/**
 * Seeds the data the admin portal screens need on top of the guest-facing seed:
 * the staff roster, the amenity catalogue, per-room-type unit counts and a
 * rolling 90-day availability calendar.
 *
 * Safe to re-run: everything is upserted or recomputed.
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { SITE_SETTING_DEFAULTS } from '../src/modules/site-settings/utils/site-setting.util';
import { BCRYPT_ROUNDS } from '../src/modules/users/utils/password.util';
import { seedAmenityCatalogue } from './amenity-catalogue';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const STAFF = [
  {
    name: 'Omar Khalil',
    email: 'admin@test.com',
    password: 'admin#test123',
    adminRole: 'SUPER_ADMIN' as const,
    status: 'ACTIVE' as const,
    lastActiveMinutesAgo: 0,
  },
  {
    name: 'Mona Hassan',
    email: 'mona@atrips.com',
    password: 'mona#test123',
    adminRole: 'RESERVATIONS' as const,
    status: 'ACTIVE' as const,
    lastActiveMinutesAgo: 12,
  },
  {
    name: 'Youssef Sami',
    email: 'youssef@atrips.com',
    password: 'youssef#test123',
    adminRole: 'CONTENT_EDITOR' as const,
    status: 'ACTIVE' as const,
    lastActiveMinutesAgo: 60 * 20,
  },
  {
    name: 'Dina Aziz',
    email: 'dina@atrips.com',
    password: null,
    adminRole: 'RESERVATIONS' as const,
    status: 'INVITED' as const,
    invitedDaysAgo: 4,
  },
  {
    name: 'Ahmed Rashad',
    email: 'ahmed@atrips.com',
    password: null,
    adminRole: 'CONTENT_EDITOR' as const,
    status: 'DISABLED' as const,
    lastActiveMinutesAgo: 60 * 24 * 58,
  },
];

function isoDay(offsetDays: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

async function seedStaff() {
  for (const person of STAFF) {
    // Same cost factor as UsersService.hashPassword, so seeded accounts are
    // indistinguishable from ones created through the API.
    const passwordHash = await bcrypt.hash(
      person.password ?? randomBytes(24).toString('hex'),
      BCRYPT_ROUNDS,
    );
    const lastActiveAt =
      person.lastActiveMinutesAgo === undefined
        ? null
        : new Date(Date.now() - person.lastActiveMinutesAgo * 60_000);
    const invitedAt =
      person.invitedDaysAgo === undefined
        ? null
        : new Date(Date.now() - person.invitedDaysAgo * 86_400_000);

    await prisma.user.upsert({
      where: { email: person.email },
      create: {
        name: person.name,
        email: person.email,
        passwordHash,
        role: 'ADMIN',
        adminRole: person.adminRole,
        status: person.status,
        lastActiveAt,
        invitedAt,
      },
      update: {
        name: person.name,
        role: 'ADMIN',
        adminRole: person.adminRole,
        status: person.status,
        lastActiveAt,
        invitedAt,
        // Keep the password of accounts that have one so logins stay stable.
        ...(person.password ? { passwordHash } : {}),
      },
    });
  }
  console.log(`✔ ${STAFF.length} staff accounts`);
}

async function seedAmenities() {
  // Catalogue and Arabic both come from the shared file, so this seed and the
  // guest seed can never disagree on an amenity name.
  const count = await seedAmenityCatalogue(prisma);
  console.log(`✔ ${count} amenities (English + Arabic)`);
}

/**
 * The navigation links that used to be hardcoded in the web app. Seeded so a fresh
 * install renders the same footer it always did, with every row now editable
 * from the admin portal. A null href routes to /coming-soon.
 */
const NAV_LINKS: Array<{
  group: 'HEADER' | 'FOOTER_COMPANY' | 'FOOTER_SUPPORT';
  value: string;
  href: string | null;
  /**
   * Arabic label, stored as `nav.<id>` in the Translation table.
   *
   * Nav links are admin-managed content, so unlike the static UI strings their
   * wording cannot live in the web app's JSON — it has to be seeded here.
   * Without it the header stayed English on the Arabic site while everything
   * around it translated, which reads as the language switch being broken.
   */
  ar: string;
}> = [
  { group: 'HEADER', value: 'Home', href: '/', ar: 'الرئيسية' },
  { group: 'HEADER', value: 'Hotels', href: '/hotels', ar: 'الفنادق' },
  { group: 'HEADER', value: 'About', href: null, ar: 'من نحن' },
  { group: 'HEADER', value: 'Contact', href: null, ar: 'اتصل بنا' },
  { group: 'HEADER', value: 'Tours', href: null, ar: 'الرحلات' },
  { group: 'HEADER', value: 'Flights', href: null, ar: 'الطيران' },
  { group: 'FOOTER_COMPANY', value: 'About ATrips', href: null, ar: 'عن أتريبس' },
  { group: 'FOOTER_COMPANY', value: 'Contact us', href: null, ar: 'تواصل معنا' },
  { group: 'FOOTER_COMPANY', value: 'Careers', href: null, ar: 'الوظائف' },
  { group: 'FOOTER_COMPANY', value: 'Partner with us', href: null, ar: 'كن شريكًا معنا' },
  { group: 'FOOTER_SUPPORT', value: 'Help centre', href: null, ar: 'مركز المساعدة' },
  { group: 'FOOTER_SUPPORT', value: 'Booking policy', href: null, ar: 'سياسة الحجز' },
  { group: 'FOOTER_SUPPORT', value: 'Cancellation', href: null, ar: 'الإلغاء' },
  { group: 'FOOTER_SUPPORT', value: 'Terms & privacy', href: null, ar: 'الشروط والخصوصية' },
];

async function seedNavLinks() {
  // Keyed on group+value rather than id so re-running never duplicates a row,
  // and so an admin's edits to href/order survive a re-seed.
  const nextOrder = new Map<string, number>();
  for (const link of NAV_LINKS) {
    // Order runs per group, since each group is its own list on screen.
    const order = nextOrder.get(link.group) ?? 0;
    nextOrder.set(link.group, order + 1);

    const existing = await prisma.navLink.findFirst({
      where: { group: link.group, value: link.value },
      select: { id: true },
    });

    const { ar, ...row } = link;
    const id =
      existing?.id ??
      (
        await prisma.navLink.create({
          data: { ...row, sortOrder: order, isActive: true },
          select: { id: true },
        })
      ).id;

    // Upserted even for links that already exist: the row may predate this
    // Arabic, and the label is useless to an Arabic reader without it.
    await prisma.translation.upsert({
      where: { key_locale: { key: `nav.${id}`, locale: 'AR' } },
      create: { key: `nav.${id}`, locale: 'AR', value: ar },
      update: { value: ar },
    });
  }
  console.log(`✔ ${NAV_LINKS.length} navigation links (English + Arabic)`);
}

async function seedSiteSettings() {
  // Defaults live in the service and apply when no row exists, so this only
  // materialises them for the admin screen to edit.
  for (const setting of SITE_SETTING_DEFAULTS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { group: setting.group, label: setting.label },
    });
  }
  console.log(`✔ ${SITE_SETTING_DEFAULTS.length} site settings`);
}

async function seedRoomTypeUnits() {
  const roomTypes = await prisma.roomType.findMany({ select: { id: true, name: true } });
  for (const [index, roomType] of roomTypes.entries()) {
    // A spread of 4–8 physical rooms so the availability grids look realistic.
    await prisma.roomType.update({
      where: { id: roomType.id },
      data: { totalUnits: 4 + (index % 5) },
    });
  }
  console.log(`✔ units set on ${roomTypes.length} room types`);
}

async function seedAvailability() {
  const roomTypes = await prisma.roomType.findMany({
    select: { id: true, totalUnits: true, basePrice: true },
  });

  let written = 0;
  for (const roomType of roomTypes) {
    const base = Number(roomType.basePrice);
    const rows = [];

    for (let offset = 0; offset < 90; offset += 1) {
      const date = isoDay(offset);
      const weekday = date.getUTCDay();
      const isWeekend = weekday === 5 || weekday === 6;

      // A couple of deliberate gaps so "Not set" and "Stop sell" states show up.
      if (offset === 88 || offset === 89) continue;
      const stopSell = offset === 16 || offset === 17;

      // Sell down a few near dates so the "Low availability" panel has content.
      const sold = offset < 6 ? Math.max(0, roomType.totalUnits - 2 - (offset % 2)) : 0;

      rows.push({
        roomTypeId: roomType.id,
        date,
        totalUnits: Math.max(0, roomType.totalUnits - sold),
        priceOverride: isWeekend ? Math.round(base * 1.12) : null,
        stopSell,
      });
    }

    await prisma.roomAvailability.deleteMany({ where: { roomTypeId: roomType.id } });
    await prisma.roomAvailability.createMany({ data: rows });
    written += rows.length;
  }
  console.log(`✔ ${written} availability rows across ${roomTypes.length} room types`);
}

async function main() {
  await seedStaff();
  await seedAmenities();
  await seedNavLinks();
  await seedSiteSettings();
  await seedRoomTypeUnits();
  await seedAvailability();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
