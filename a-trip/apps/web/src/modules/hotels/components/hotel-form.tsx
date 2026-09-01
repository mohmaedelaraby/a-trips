'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, Input, Textarea } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import { cn } from '../../../shared/lib/utils';
import type { CreateHotelPayload } from '../interfaces/admin-hotel';

const AMENITY_OPTIONS = [
  'Free Wi-Fi', 'Swimming pool', 'Breakfast included', 'Spa', 'Fitness centre',
  'Free parking', 'Restaurant', 'Bar', 'Air conditioning', 'Family rooms',
  'Airport shuttle', 'Nile view', 'Pyramid view', 'Private beach', 'Tour desk',
];

const schema = z.object({
  name: z.string().min(2, 'Enter the hotel name'),
  city: z.string().min(2, 'Enter the city'),
  address: z.string().min(2, 'Enter the address'),
  country: z.string().min(2, 'Enter the country'),
  description: z.string().optional(),
  stars: z.coerce.number().int().min(1).max(5),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  imageUrl: z.string().url('Enter a valid image URL').or(z.literal('')).optional(),
});

export type HotelFormValues = z.output<typeof schema>;
type HotelFormInput = z.input<typeof schema>;

export function HotelForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = 'Save hotel',
}: {
  defaultValues?: Partial<HotelFormValues> & {
    amenities?: string[];
    status?: 'DRAFT' | 'PUBLISHED';
    imageUrl?: string;
  };
  onSubmit: (payload: CreateHotelPayload) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [amenities, setAmenities] = React.useState<string[]>(defaultValues?.amenities ?? []);
  const [published, setPublished] = React.useState(defaultValues?.status === 'PUBLISHED');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HotelFormInput, unknown, HotelFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      city: defaultValues?.city ?? '',
      address: defaultValues?.address ?? '',
      country: defaultValues?.country ?? 'Egypt',
      description: defaultValues?.description ?? '',
      stars: defaultValues?.stars ?? 4,
      latitude: defaultValues?.latitude,
      longitude: defaultValues?.longitude,
      imageUrl: defaultValues?.imageUrl ?? '',
    },
  });

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]));
  };

  const submit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      city: values.city,
      address: values.address,
      country: values.country,
      description: values.description || undefined,
      stars: values.stars,
      latitude: values.latitude,
      longitude: values.longitude,
      status: published ? 'PUBLISHED' : 'DRAFT',
      amenities,
      images: values.imageUrl ? [{ url: values.imageUrl, isPrimary: true }] : undefined,
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 bg-canvas px-1 py-1">
        <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-muted">
          <span>{published ? 'Published' : 'Draft'}</span>
          <button
            type="button"
            onClick={() => setPublished((p) => !p)}
            className={cn(
              'flex h-[22px] w-10 items-center rounded-full px-[3px] transition-colors',
              published ? 'justify-end bg-primary' : 'justify-start bg-line',
            )}
            aria-label="Toggle published status"
          >
            <span className="h-4 w-4 rounded-full bg-white" />
          </button>
        </div>
        <Button type="submit" loading={submitting} size="sm">
          {submitLabel}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-display mb-4 font-semibold text-ink">Basics</h3>
            <div className="flex flex-col gap-4">
              <Field label="Hotel name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" {...register('name')} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="City" htmlFor="city" required error={errors.city?.message}>
                  <Input id="city" {...register('city')} />
                </Field>
                <Field label="Country" htmlFor="country" required error={errors.country?.message}>
                  <Input id="country" {...register('country')} />
                </Field>
                <Field label="Stars" htmlFor="stars" required error={errors.stars?.message}>
                  <div className="flex h-10 items-center justify-center gap-0.5 rounded-lg border border-line text-sm text-accent">
                    <select
                      id="stars"
                      className="w-full appearance-none bg-transparent text-center font-semibold"
                      {...register('stars')}
                    >
                      {[1, 2, 3, 4, 5].map((s) => (
                        <option key={s} value={s}>
                          {'★'.repeat(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>
              <Field label="Street address" htmlFor="address" required error={errors.address?.message}>
                <Input id="address" {...register('address')} />
              </Field>
              <Field label="Description" htmlFor="description">
                <Textarea id="description" rows={4} {...register('description')} />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-display font-semibold text-ink">Cover photo</h3>
              <span className="text-xs text-ink-muted">First image is the card thumbnail</span>
            </div>
            <Field
              label="Image URL"
              htmlFor="imageUrl"
              hint="A public image URL — used as the hotel's cover photo"
              error={errors.imageUrl?.message}
            >
              <Input id="imageUrl" placeholder="https://…" {...register('imageUrl')} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-display mb-3 font-semibold text-ink">Amenities</h3>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-line p-2">
              {amenities.length === 0 ? (
                <span className="px-1 py-1 text-xs text-ink-muted">No amenities selected yet.</span>
              ) : null}
              {amenities.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700"
                >
                  {a} ×
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AMENITY_OPTIONS.filter((a) => !amenities.includes(a)).map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-canvas"
                >
                  + {amenity}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-display mb-3 font-semibold text-ink">Coordinates</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" htmlFor="latitude">
                <Input id="latitude" type="number" step="0.0001" {...register('latitude')} />
              </Field>
              <Field label="Longitude" htmlFor="longitude">
                <Input id="longitude" type="number" step="0.0001" {...register('longitude')} />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
