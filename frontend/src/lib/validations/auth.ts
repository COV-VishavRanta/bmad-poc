import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['HR', 'PC', 'RM']),
  status: z.string(),
  last_login: z.date().optional(),
  // Legacy fields for backward compatibility
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  sessionExpiry: z.date(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type UserData = z.infer<typeof userSchema>;
export type AuthResponseData = z.infer<typeof authResponseSchema>;