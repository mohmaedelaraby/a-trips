'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { AdminTopbar, Panel, Toggle, adminUi as ui } from '../../admin-dashboard/components/admin-ui';
import { cn } from '../../../shared/lib/utils';
import type { CreateHotelPayload } from '../interfaces/admin-hotel';
import type { HotelImage } from '../interfaces/hotel';
import styles from '../styles/hotel-editor.module.css';

const COUNTRIES = ['Egypt', 'Jordan', 'Morocco', 'United Arab Emirates', 'Saudi Arabia', 'Tunisia'];
const CITIES = [
  'Cairo',
  'Alexandria',
  'Giza',
  'Luxor',
  'Aswan',
  'Hurghada',
  'Sharm El Sheikh',
  'Dahab',
  'Marsa Alam',
];
const AMENITY_SUGGESTIONS = [
  'Gym',
  'Parking',
  'Bar',
  'Beach access',
  'Spa',
  'Airport shuttle',
  'Family rooms',
  'Nile view',
];
const DESCRIPTION_LIMIT = 1200;

export interface HotelEditorValues {
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  stars: number;
  latitude: string;
  longitude: string;
  amenities: string[];
  published: boolean;
}

const EMPTY: HotelEditorValues = {
  name: '',
  city: 'Cairo',
  country: 'Egypt',
  address: '',
  description: '',
  stars: 4,
  latitude: '',
  longitude: '',
  amenities: [],
  published: false,
};

export function HotelEditor({
  title,
  breadcrumb,
  initialValues,
  images = [],
  roomTypesWithoutPrice = 0,
  availabilityEndsOn,
  saving,
  submitLabel = 'Save hotel',
  onSubmit,
  onUploadImages,
  uploading = false,
  uploadProgress,
  onRemoveImage,
  onReorderImages,
}: {
  title: string;
  breadcrumb?: React.ReactNode;
  initialValues?: Partial<HotelEditorValues>;
  images?: HotelImage[];
  roomTypesWithoutPrice?: number;
  availabilityEndsOn?: string | null;
  saving?: boolean;
  submitLabel?: string;
  onSubmit: (payload: CreateHotelPayload) => void;
  onUploadImages?: (files: File[]) => void;
  uploading?: boolean;
  uploadProgress?: number | null;
  onRemoveImage?: (imageId: string) => void;
  onReorderImages?: (imageIds: string[]) => void;
}) {
  const [values, setValues] = React.useState<HotelEditorValues>({ ...EMPTY, ...initialValues });
  const [amenityDraft, setAmenityDraft] = React.useState('');
  const [errors, setErrors] = React.useState<Partial<Record<keyof HotelEditorValues, string>>>({});
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);
  const [fileDropActive, setFileDropActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const acceptFiles = (list: FileList | null) => {
    if (!list || !onUploadImages) return;
    // Ignore anything that is not an image so a stray drop cannot start an
    // upload the API would only reject.
    const files = Array.from(list).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) onUploadImages(files);
  };

  const set = <K extends keyof HotelEditorValues>(key: K, value: HotelEditorValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const addAmenity = (amenity: string) => {
    const clean = amenity.trim();
    if (!clean || values.amenities.includes(clean)) return;
    set('amenities', [...values.amenities, clean]);
    setAmenityDraft('');
  };

  const handleDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    onReorderImages?.(next.map((image) => image.id));
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof HotelEditorValues, string>> = {};
    if (values.name.trim().length < 2) nextErrors.name = 'Enter the hotel name';
    if (values.city.trim().length < 2) nextErrors.city = 'Choose a city';
    if (values.address.trim().length < 2) nextErrors.address = 'Enter the street address';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const latitude = values.latitude.trim() ? Number(values.latitude) : undefined;
    const longitude = values.longitude.trim() ? Number(values.longitude) : undefined;

    onSubmit({
      name: values.name.trim(),
      city: values.city.trim(),
      country: values.country.trim(),
      address: values.address.trim(),
      description: values.description.trim() || undefined,
      stars: values.stars,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      amenities: values.amenities,
      status: values.published ? 'PUBLISHED' : 'DRAFT',
    });
  };

  const checks = [
    { ok: images.length >= 4, label: 'At least 4 photos', warn: `${images.length} of 4 photos` },
    {
      ok: values.description.trim().length > 0,
      label: 'Description added',
      warn: 'Description is empty',
    },
    {
      ok: roomTypesWithoutPrice === 0,
      label: 'All room types priced',
      warn: `${roomTypesWithoutPrice} room type${roomTypesWithoutPrice === 1 ? '' : 's'} ha${
        roomTypesWithoutPrice === 1 ? 's' : 've'
      } no price`,
    },
    {
      ok: Boolean(availabilityEndsOn),
      label: `Availability set to ${availabilityEndsOn ?? ''}`,
      warn: 'No availability loaded',
    },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <AdminTopbar title={title} breadcrumb={breadcrumb}>
        <div className={styles.saveBar}>
          <span className={styles.publishToggle}>
            Published
            <Toggle
              checked={values.published}
              onChange={(next) => set('published', next)}
              label="Published"
            />
          </span>
          <Link href="/admin/hotels" className={cn(ui.btn, ui.btnGhost)}>
            Cancel
          </Link>
          <button type="submit" className={cn(ui.btn, ui.btnPrimary)} disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </AdminTopbar>

      <div className={ui.body}>
        <div className={styles.layout}>
          <div className={styles.column}>
            <Panel>
              <div className={styles.panelBody}>
                <h2 className={styles.panelTitle}>Basics</h2>

                <div className={styles.fields}>
                  <div>
                    <label htmlFor="hotel-name" className={ui.fieldLabel}>
                      Hotel name
                    </label>
                    <input
                      id="hotel-name"
                      className={ui.input}
                      value={values.name}
                      onChange={(event) => set('name', event.target.value)}
                    />
                    {errors.name ? <p className={ui.fieldError}>{errors.name}</p> : null}
                  </div>

                  <div className={styles.fieldRow}>
                    <div>
                      <label htmlFor="hotel-city" className={ui.fieldLabel}>
                        City
                      </label>
                      <select
                        id="hotel-city"
                        className={ui.input}
                        value={values.city}
                        onChange={(event) => set('city', event.target.value)}
                      >
                        {(CITIES.includes(values.city) ? CITIES : [values.city, ...CITIES]).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors.city ? <p className={ui.fieldError}>{errors.city}</p> : null}
                    </div>

                    <div>
                      <label htmlFor="hotel-country" className={ui.fieldLabel}>
                        Country
                      </label>
                      <select
                        id="hotel-country"
                        className={ui.input}
                        value={values.country}
                        onChange={(event) => set('country', event.target.value)}
                      >
                        {(COUNTRIES.includes(values.country)
                          ? COUNTRIES
                          : [values.country, ...COUNTRIES]
                        ).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className={ui.fieldLabel}>Stars</span>
                      <div className={styles.starsPicker}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`${star} stars`}
                            onClick={() => set('stars', star)}
                            className={cn(styles.starBtn, star <= values.stars && styles.starBtnOn)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="hotel-address" className={ui.fieldLabel}>
                      Street address
                    </label>
                    <input
                      id="hotel-address"
                      className={ui.input}
                      value={values.address}
                      onChange={(event) => set('address', event.target.value)}
                    />
                    {errors.address ? <p className={ui.fieldError}>{errors.address}</p> : null}
                  </div>

                  <div>
                    <label htmlFor="hotel-description" className={ui.fieldLabel}>
                      Description
                    </label>
                    <textarea
                      id="hotel-description"
                      className={ui.textarea}
                      maxLength={DESCRIPTION_LIMIT}
                      value={values.description}
                      onChange={(event) => set('description', event.target.value)}
                    />
                    <p className={styles.counter}>
                      {values.description.length} / {DESCRIPTION_LIMIT} characters
                    </p>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className={styles.panelBody}>
                <div className={styles.photosHead}>
                  <h2 className={styles.panelTitle}>Photos</h2>
                  <span className={styles.photosHint}>
                    Drag to reorder · first image is the card thumbnail
                  </span>
                </div>

                <div
                  className={cn(styles.photoGrid, fileDropActive && styles.photoGridDropping)}
                  onDragOver={(event) => {
                    // Only react to files; tile reordering is handled per-tile.
                    if (!onUploadImages || !event.dataTransfer.types.includes('Files')) return;
                    event.preventDefault();
                    setFileDropActive(true);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setFileDropActive(false);
                  }}
                  onDrop={(event) => {
                    if (!onUploadImages || !event.dataTransfer.types.includes('Files')) return;
                    event.preventDefault();
                    setFileDropActive(false);
                    acceptFiles(event.dataTransfer.files);
                  }}
                >
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      draggable={Boolean(onReorderImages)}
                      onDragStart={() => setDragIndex(index)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setOverIndex(index);
                      }}
                      onDrop={() => handleDrop(index)}
                      className={cn(
                        styles.photoTile,
                        index === 0 && styles.photoTileCover,
                        dragIndex === index && styles.photoTileDragging,
                        overIndex === index && dragIndex !== index && styles.photoTileOver,
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" className={styles.photoImage} />
                      {index === 0 ? <span className={styles.coverBadge}>Cover</span> : null}
                      {onRemoveImage ? (
                        <button
                          type="button"
                          className={styles.removePhoto}
                          onClick={() => onRemoveImage(image.id)}
                          aria-label="Remove photo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ))}

                  {onUploadImages ? (
                    <>
                      <button
                        type="button"
                        className={styles.uploadTile}
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <>
                            <span className={styles.uploadSpinner} aria-hidden />
                            {uploadProgress != null ? `${uploadProgress}%` : 'Uploading…'}
                          </>
                        ) : (
                          <>
                            <span aria-hidden>+</span>
                            Upload
                          </>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                        multiple
                        hidden
                        onChange={(event) => {
                          acceptFiles(event.target.files);
                          // Reset so picking the same file twice still fires.
                          event.target.value = '';
                        }}
                      />
                    </>
                  ) : null}
                </div>

                {onUploadImages ? (
                  <p className={styles.photosHint}>
                    Drop images here or click Upload · JPEG, PNG, WebP, AVIF or GIF up to 8MB
                  </p>
                ) : (
                  <p className={styles.photosHint}>Save the hotel first, then add photos.</p>
                )}
              </div>
            </Panel>
          </div>

          <div className={styles.column}>
            <Panel>
              <div className={styles.panelBody}>
                <h2 className={styles.panelTitle}>Amenities</h2>

                <div className={styles.amenityBox}>
                  <div className={styles.amenityChips}>
                    {values.amenities.map((amenity) => (
                      <span key={amenity} className={styles.amenityChip}>
                        {amenity}
                        <button
                          type="button"
                          className={styles.amenityRemove}
                          aria-label={`Remove ${amenity}`}
                          onClick={() =>
                            set(
                              'amenities',
                              values.amenities.filter((item) => item !== amenity),
                            )
                          }
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    className={styles.amenityInput}
                    placeholder="Add amenity…"
                    value={amenityDraft}
                    onChange={(event) => setAmenityDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addAmenity(amenityDraft);
                      }
                    }}
                    aria-label="Add amenity"
                  />
                </div>

                <div className={styles.suggestions}>
                  {AMENITY_SUGGESTIONS.filter((option) => !values.amenities.includes(option)).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={styles.suggestion}
                      onClick={() => addAmenity(option)}
                    >
                      + {option}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel>
              <div className={styles.panelBody}>
                <h2 className={styles.panelTitle}>Location pin</h2>
                <div className={styles.map}>
                  <div className={styles.mapWater} />
                  <span
                    className={styles.mapPin}
                    style={{
                      left: `${Math.min(92, Math.max(8, ((Number(values.longitude) || 31) % 1) * 100))}%`,
                      top: '46%',
                    }}
                  />
                </div>
                <div className={styles.coordGrid}>
                  <div>
                    <label htmlFor="hotel-lat" className={ui.fieldLabel}>
                      Latitude
                    </label>
                    <input
                      id="hotel-lat"
                      className={ui.input}
                      inputMode="decimal"
                      value={values.latitude}
                      onChange={(event) => set('latitude', event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="hotel-lng" className={ui.fieldLabel}>
                      Longitude
                    </label>
                    <input
                      id="hotel-lng"
                      className={ui.input}
                      inputMode="decimal"
                      value={values.longitude}
                      onChange={(event) => set('longitude', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className={styles.panelBody}>
                <h2 className={styles.panelTitle}>Before publishing</h2>
                <div className={styles.checklist}>
                  {checks.map((check) => (
                    <div key={check.label} className={styles.checkRow}>
                      <span
                        className={cn(
                          styles.checkIcon,
                          check.ok ? styles.checkIconOk : styles.checkIconWarn,
                        )}
                        aria-hidden
                      >
                        {check.ok ? '✓' : '!'}
                      </span>
                      <span className={check.ok ? undefined : styles.checkWarnText}>
                        {check.ok ? check.label : check.warn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </form>
  );
}
