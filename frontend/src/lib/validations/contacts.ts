import { z } from 'zod';

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z.string()
    .min(1, 'Contact name is required')
    .max(255, 'Contact name must be less than 255 characters')
    .trim(),
  
  email: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email format',
    }),
  
  phone: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val === '' || /^[\+]?[1-9][\d]{0,15}$/.test(val), {
      message: 'Invalid phone format',
    }),
  
  role: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length <= 100, {
      message: 'Role must be less than 100 characters',
    }),
  
  department: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length <= 100, {
      message: 'Department must be less than 100 characters',
    }),
  
  isPrimary: z.boolean(),
  
  notes: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length <= 500, {
      message: 'Notes must be less than 500 characters',
    }),
});

// Contact update validation schema (all fields optional except ID validation)
export const contactUpdateSchema = contactFormSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

// Contact search validation schema
export const contactSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  role: z.string().optional(),
  department: z.string().optional(),
});

// Bulk contact operations validation
export const bulkContactSchema = z.object({
  contactIds: z.array(z.number().positive()),
  action: z.enum(['delete', 'activate', 'deactivate', 'export']),
  updateData: contactUpdateSchema.optional(),
});

// Contact import validation
export const contactImportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
}).array();

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type ContactUpdateData = z.infer<typeof contactUpdateSchema>;
export type ContactSearchData = z.infer<typeof contactSearchSchema>;
export type BulkContactData = z.infer<typeof bulkContactSchema>;
export type ContactImportData = z.infer<typeof contactImportSchema>;

// Force type regeneration - ContactFormData should have isPrimary: boolean
export interface ContactFormDataInterface {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  isPrimary: boolean;
  notes?: string;
}