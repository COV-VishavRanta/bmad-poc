import { UserRole } from '@/types/auth';
import { z } from 'zod';

export const userRoles: UserRole[] = ['HR', 'PC', 'RM'];

export const userCreateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  role: z.enum(['HR', 'PC', 'RM'] as const, {
    message: 'Please select a valid role',
  }),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^[\+]?[1-9][\d]{0,15}$/.test(value),
      'Please enter a valid phone number'
    ),
  department: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length <= 50,
      'Department must be less than 50 characters'
    ),
  hire_date: z
    .string()
    .optional()
    .refine(
      (value) => !value || !isNaN(Date.parse(value)),
      'Please enter a valid date'
    )
    .refine(
      (value) => !value || new Date(value) <= new Date(),
      'Hire date cannot be in the future'
    ),
});

export const userUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^[\+]?[1-9][\d]{0,15}$/.test(value),
      'Please enter a valid phone number'
    ),
  department: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length <= 50,
      'Department must be less than 50 characters'
    ),
  hire_date: z
    .string()
    .optional()
    .refine(
      (value) => !value || !isNaN(Date.parse(value)),
      'Please enter a valid date'
    )
    .refine(
      (value) => !value || new Date(value) <= new Date(),
      'Hire date cannot be in the future'
    ),
});

export const userSearchSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['HR', 'PC', 'RM', 'all']).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).max(100).optional(),
  sortBy: z.enum(['full_name', 'email', 'role', 'created_at', 'last_login']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const bulkOperationSchema = z.object({
  operation: z.enum(['activate', 'deactivate', 'change_role', 'delete']),
  user_ids: z.array(z.number()).min(1, 'Please select at least one user'),
  role: z.enum(['HR', 'PC', 'RM']).optional(),
}).refine(
  (data) => {
    if (data.operation === 'change_role' && !data.role) {
      return false;
    }
    return true;
  },
  {
    message: 'Role is required for role change operation',
    path: ['role'],
  }
);

export const userInvitationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  role: z.enum(['HR', 'PC', 'RM'] as const, {
    message: 'Please select a valid role',
  }),
  department: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length <= 50,
      'Department must be less than 50 characters'
    ),
});

export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
export type UserSearchFormData = z.infer<typeof userSearchSchema>;
export type BulkOperationFormData = z.infer<typeof bulkOperationSchema>;
export type UserInvitationFormData = z.infer<typeof userInvitationSchema>;