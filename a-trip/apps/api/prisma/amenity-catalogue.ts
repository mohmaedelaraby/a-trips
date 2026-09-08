/**
 * The one amenity catalogue, shared by both seeds.
 *
 * `name` is load-bearing in three places at once: it is what `Hotel.amenities`
 * stores, what `?amenities=` filters on, and the key an amenity's translations
 * are stored under (`amenity.<name>`). So the guest seed and the admin seed must
 * agree on it exactly — they previously did not, and the catalogue ended up
 * offering "Gym" while every seeded hotel listed "Fitness centre": two rows for
 * one idea, one of them permanently showing zero hotels and neither filtering
 * the other's results.
 *
 * Add an amenity here and both seeds pick it up. Do not re-introduce a second
 * list in either of them.
 */
export interface CatalogueAmenity {
  name: string;
  category: string;
  /** Arabic display text, stored as `amenity.<name>` in the Translation table. */
  ar: string;
}

export const AMENITY_CATALOGUE: CatalogueAmenity[] = [
  { name: 'Free Wi-Fi', category: 'Connectivity', ar: 'واي فاي مجاني' },
  { name: 'Swimming pool', category: 'Leisure', ar: 'حمام سباحة' },
  { name: 'Spa', category: 'Leisure', ar: 'سبا' },
  { name: 'Private beach', category: 'Leisure', ar: 'شاطئ خاص' },
  { name: 'Gym', category: 'Leisure', ar: 'صالة رياضية' },
  { name: 'Breakfast included', category: 'Food & drink', ar: 'إفطار مجاني' },
  { name: 'Restaurant', category: 'Food & drink', ar: 'مطعم' },
  { name: 'Bar', category: 'Food & drink', ar: 'بار' },
  { name: 'Room service', category: 'Food & drink', ar: 'خدمة الغرف' },
  { name: 'Free parking', category: 'Transport', ar: 'موقف سيارات مجاني' },
  { name: 'Airport shuttle', category: 'Transport', ar: 'خدمة نقل من المطار' },
  { name: 'Tour desk', category: 'Services', ar: 'مكتب سياحي' },
  { name: 'Laundry service', category: 'Services', ar: 'خدمة غسيل الملابس' },
  { name: '24h front desk', category: 'Services', ar: 'استقبال على مدار الساعة' },
  { name: 'Air conditioning', category: 'Room features', ar: 'تكييف' },
  { name: 'Family rooms', category: 'Room features', ar: 'غرف عائلية' },
  { name: 'Nile view', category: 'Views', ar: 'إطلالة على النيل' },
  { name: 'Pyramid view', category: 'Views', ar: 'إطلالة على الأهرامات' },
  { name: 'Sea view', category: 'Views', ar: 'إطلالة على البحر' },
];

/**
 * Named handles for the amenities the hotel fixtures reference.
 *
 * Indirection on purpose: a hotel says `AMENITIES.gym` rather than the string,
 * so renaming an amenity in the catalogue is a compile error here instead of a
 * hotel silently listing a name that no longer exists.
 */
function pick(name: string): string {
  const found = AMENITY_CATALOGUE.find((a) => a.name === name);
  if (!found) throw new Error(`Amenity "${name}" is not in the catalogue`);
  return found.name;
}

export const AMENITIES = {
  pool: pick('Swimming pool'),
  wifi: pick('Free Wi-Fi'),
  breakfast: pick('Breakfast included'),
  spa: pick('Spa'),
  gym: pick('Gym'),
  parking: pick('Free parking'),
  restaurant: pick('Restaurant'),
  bar: pick('Bar'),
  ac: pick('Air conditioning'),
  familyRooms: pick('Family rooms'),
  airport: pick('Airport shuttle'),
  nileView: pick('Nile view'),
  pyramidView: pick('Pyramid view'),
  beach: pick('Private beach'),
  desk: pick('Tour desk'),
} as const;

/** Upserts the catalogue and its Arabic. Safe to re-run; used by both seeds. */
export async function seedAmenityCatalogue(prisma: {
  amenity: {
    upsert(args: {
      where: { name: string };
      create: { name: string; category: string };
      update: { category: string };
    }): Promise<unknown>;
  };
  translation: {
    upsert(args: {
      where: { key_locale: { key: string; locale: 'AR' } };
      create: { key: string; locale: 'AR'; value: string };
      update: { value: string };
    }): Promise<unknown>;
  };
}): Promise<number> {
  for (const item of AMENITY_CATALOGUE) {
    await prisma.amenity.upsert({
      where: { name: item.name },
      create: { name: item.name, category: item.category },
      update: { category: item.category },
    });
    await prisma.translation.upsert({
      where: { key_locale: { key: `amenity.${item.name}`, locale: 'AR' } },
      create: { key: `amenity.${item.name}`, locale: 'AR', value: item.ar },
      update: { value: item.ar },
    });
  }
  return AMENITY_CATALOGUE.length;
}
