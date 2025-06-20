import { z } from 'zod';

export const userProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: 'First name is required' })
    .max(50, { message: 'First name must be 50 characters or less' }),

  lastName: z
    .string()
    .min(1, { message: 'Last name is required' })
    .max(50, { message: 'Last name must be 50 characters or less' }),

  username: z
    .string()
    .max(30, { message: 'Username must be 30 characters or less' })
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
