'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, Input, Select, Textarea } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import type { CreateRoomTypePayload } from '../interfaces/admin-room-type';
import type { RoomType } from '../interfaces/hotel';

const schema = z.object({
  name: z.string().min(2, 'Enter a name'),
  description: z.string().optional(),
  capacityAdults: z.coerce.number().int().min(1).max(20),
  capacityChildren: z.coerce.number().int().min(0).max(20),
  numOfBeds: z.coerce.number().int().min(1).max(20),
  sizeSqm: z.coerce.number().min(0).optional(),
  basePrice: z.coerce.number().min(0),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

export function RoomTypeForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = 'Save room type',
}: {
  defaultValues?: RoomType;
  onSubmit: (payload: CreateRoomTypePayload) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      capacityAdults: defaultValues?.capacityAdults ?? 2,
      capacityChildren: defaultValues?.capacityChildren ?? 0,
      numOfBeds: defaultValues?.numOfBeds ?? 1,
      sizeSqm: defaultValues?.sizeSqm ?? undefined,
      basePrice: defaultValues?.basePrice ?? 0,
      status: defaultValues?.status ?? 'ACTIVE',
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({ ...values, description: values.description || undefined }),
      )}
      className="flex flex-col gap-4"
    >
      <Field label="Name" htmlFor="rt-name" required error={errors.name?.message}>
        <Input id="rt-name" {...register('name')} />
      </Field>
      <Field label="Description" htmlFor="rt-description">
        <Textarea id="rt-description" rows={3} {...register('description')} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Adults capacity" htmlFor="rt-adults" required error={errors.capacityAdults?.message}>
          <Input id="rt-adults" type="number" min={1} {...register('capacityAdults')} />
        </Field>
        <Field label="Children capacity" htmlFor="rt-children" error={errors.capacityChildren?.message}>
          <Input id="rt-children" type="number" min={0} {...register('capacityChildren')} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Number of beds" htmlFor="rt-beds" required error={errors.numOfBeds?.message}>
          <Input id="rt-beds" type="number" min={1} {...register('numOfBeds')} />
        </Field>
        <Field label="Size (m²)" htmlFor="rt-size">
          <Input id="rt-size" type="number" min={0} step="0.1" {...register('sizeSqm')} />
        </Field>
      </div>

      <Field label="Base price / night" htmlFor="rt-price" required error={errors.basePrice?.message}>
        <Input id="rt-price" type="number" min={0} step="0.01" {...register('basePrice')} />
      </Field>

      <Field label="Status" htmlFor="rt-status" required>
        <Select id="rt-status" {...register('status')}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </Field>

      <Button type="submit" loading={submitting} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
