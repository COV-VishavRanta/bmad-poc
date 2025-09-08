---
applyTo: '**'
---
# B-MAD Project Coding Standards & Patterns

A comprehensive guide for consistent, maintainable code in the B-MAD Next.js application with TypeScript, Tailwind CSS, and Shadcn/ui components.

## Project Overview

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4.17 with CSS variables
- **Components**: Shadcn/ui with Radix UI primitives
- **Package Manager**: npm
- **Build System**: Next.js with Turbopack

## File Structure & Organization

### Project Structure with Colocation Principle
```
bmad-poc/
├── app/                    # Next.js App Router pages
│   ├── home/
│   │   ├── (components)/   # Components used only in home page
│   │   │   ├── HomeHeader.tsx
│   │   │   ├── HomeStats.tsx
│   │   │   └── HomeBanner.tsx
│   │   ├── (hooks)/        # Hooks used only in home page
│   │   │   └── useHomeData.ts
│   │   ├── (types)/        # Types used only in home page
│   │   │   └── home.types.ts
│   │   └── page.tsx
│   ├── posts/
│   │   ├── (components)/
│   │   │   ├── PostList.tsx
│   │   │   └── PostFilter.tsx
│   │   ├── (types)/
│   │   │   └── posts.types.ts
│   │   ├── [slug]/
│   │   │   ├── (components)/
│   │   │   │   ├── PostContent.tsx
│   │   │   │   └── PostComments.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── common/            # Reusable UI components (used in 2+ places)
│   ├── layout/            # Layout components (Navigation, Footer, etc.)
│   └── ui/                # Shadcn/ui components
├── hooks/                 # Global/shared custom React hooks
├── lib/                   # Utility functions and configurations
├── services/              # API services and external integrations
├── stores/                # Global state management
├── types/                 # Global/shared TypeScript type definitions
├── utils/                 # Global/shared helper utilities
└── public/               # Static assets
```

### Colocation Rules

#### When to Colocate (Keep Near Usage)
- **Components** used in only ONE page/route → Place in `(components)` folder within that page
- **Hooks** used in only ONE page/route → Place in `(hooks)` folder within that page
- **Types** used in only ONE page/route → Place in `(types)` folder within that page
- **Utils** used in only ONE page/route → Place in `(utils)` folder within that page

#### When to Keep in Global Folders
- **Components** used in 2+ different pages → Keep in `/components/common/`
- **Hooks** used in 2+ different pages → Keep in `/hooks/`
- **Types** used in 2+ different pages → Keep in `/types/`
- **Utils** used in 2+ different pages → Keep in `/utils/`
- **Services** (usually global by nature) → Keep in `/services/`
- **Layout components** → Keep in `/components/layout/`

### File Naming Conventions
- **Components**: PascalCase (`LoginForm.tsx`, `UserDashboard.tsx`)
- **Pages**: kebab-case (`user-profile.tsx`, `create-post.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useLocalStorage.ts`)
- **Utils/Services**: camelCase (`authService.ts`, `formatDate.ts`)
- **Types**: PascalCase (`User.ts`, `ApiResponse.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`, `APP_CONFIG.ts`)

## TypeScript Standards

### Strict Configuration
```typescript
// tsconfig.json already configured with:
{
  "strict": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "noUncheckedIndexedAccess": true
}
```

### Interface Conventions
```typescript
// ✅ Preferred - Use 'I' prefix for interfaces
interface IUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface IUserService {
  getUser(id: string): Promise<IUser>;
  updateUser(id: string, data: Partial<IUser>): Promise<IUser>;
}

// ✅ Props interfaces
interface ILoginFormProps {
  onSubmit: (credentials: ILoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string;
}
```

### Type Safety Patterns
```typescript
// ✅ Use discriminated unions for state
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: IUser }
  | { status: 'error'; error: string };

// ✅ Use generic constraints
interface IRepository<T extends { id: string }> {
  findById(id: string): Promise<T>;
  create(data: Omit<T, 'id'>): Promise<T>;
}

// ✅ Utility types for API responses
type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

## Next.js App Router Patterns

### Server Components vs Client Components
```typescript
// ✅ Server Component (default)
// components/features/PostList.tsx
export async function PostList() {
  const posts = await getPosts();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// ✅ Client Component (when needed)
// components/features/SearchForm.tsx
'use client';

import { useState } from 'react';

interface ISearchFormProps {
  onSearch: (query: string) => void;
}

export function SearchForm({ onSearch }: ISearchFormProps) {
  const [query, setQuery] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts..."
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
```

## React Component Patterns

### Component Creation Decision Matrix

Components should be created when ANY of the following conditions are met:

#### ✅ Always Create Components When:
1. **Reusability** - Used in 2+ different places
2. **File Size** - Single UI file exceeds 200 lines
3. **Loop/Iteration** - UI element is rendered in loops or maps
4. **Complex Logic** - Component has 3+ state variables or complex business logic
5. **Event Handling** - Multiple event handlers (3+ handlers)
6. **Conditional Rendering** - Complex conditional UI logic (3+ conditions)
7. **Form Elements** - Any form with 3+ input fields
8. **Testing Isolation** - Logic needs separate unit testing
9. **Performance** - Component needs memoization (`React.memo`)
10. **Accessibility** - Complex ARIA patterns or keyboard interactions

#### ✅ Component Creation Examples:
```typescript
// ✅ Create component - Used in loop
{users.map(user => (
  <UserCard key={user.id} user={user} /> // Extract to UserCard component
))}

// ✅ Create component - Large file getting bigger
// If UserDashboard.tsx is 150+ lines, extract:
<UserProfile user={user} />        // UserProfile.tsx
<UserSettings settings={settings} /> // UserSettings.tsx
<UserActivity activity={activity} /> // UserActivity.tsx

// ✅ Create component - Complex conditional rendering
// Extract to StatusBadge.tsx
<StatusBadge status={user.status} priority={user.priority} />

// ✅ Create component - Form with multiple fields
// Extract to ContactForm.tsx
<ContactForm onSubmit={handleSubmit} />

// ✅ Create component - Performance optimization
const ExpensiveUserList = React.memo(({ users, filters }) => {
  // Heavy computation component
});
```

#### ❌ Don't Create Components When:
- Simple JSX with no logic (< 10 lines)
- Used only once with no complexity
- Just wrapping a single HTML element
- No state, props, or event handlers

### Custom Hooks Logic Separation Standard

#### ✅ Logic Separation Rule: "All Business Logic in Custom Hooks"

**MANDATORY**: All business logic, state management, and side effects must be extracted into custom hooks. Components should only handle UI rendering and user interactions.

#### Hook Placement Rules:
1. **Single Usage** → Keep hook next to component/page (`(hooks)` folder)
2. **Multiple Usage** → Move to global `/hooks/` folder
3. **Domain-Specific** → Group by feature (`usePostData`, `useUserAuth`)

#### ✅ What Goes in Custom Hooks:
- State management
- API calls and data fetching
- Business logic calculations
- Side effects (localStorage, timers, subscriptions)
- Form validation logic
- Complex computations
- Error handling logic
- Async operations

#### ✅ Custom Hook Examples:

```typescript
// ✅ Single-use hook - Keep colocated
// app/users/profile/(hooks)/useUserProfile.ts
export function useUserProfile(userId: string) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userData = await userService.getById(userId);
      setUser(userData);
    } catch (err) {
      setError('Failed to load user');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<IUser>) => {
    try {
      const updatedUser = await userService.update(userId, updates);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError('Failed to update user');
      throw err;
    }
  };

  useEffect(() => {
    if (userId) loadUser();
  }, [userId]);

  return {
    user,
    isLoading,
    error,
    loadUser,
    updateUser,
  };
}

// ✅ Reusable hook - Move to /hooks/
// hooks/useAsync.ts
export function useAsync<T>() {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await asyncFunction();
      setState({ data: result, error: null, isLoading: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, error: errorMessage, isLoading: false });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return { ...state, execute, reset };
}
```

#### ✅ Component Using Custom Hooks (Clean UI-Only):
```typescript
// ✅ Clean component - Only UI and user interactions
interface IUserProfileProps {
  userId: string;
  onUpdate?: (user: IUser) => void;
}

export function UserProfile({ userId, onUpdate }: IUserProfileProps) {
  // All logic extracted to custom hook
  const { user, isLoading, error, updateUser } = useUserProfile(userId);
  const { toast } = useToast();
  
  // Only UI event handlers remain
  const handleSave = async (userData: Partial<IUser>) => {
    try {
      const updatedUser = await updateUser(userData);
      onUpdate?.(updatedUser);
      toast({ title: 'Profile updated successfully' });
    } catch {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    }
  };
  
  // Clean early returns
  if (error) return <ErrorMessage message={error} />;
  if (isLoading) return <UserProfileSkeleton />;
  if (!user) return <EmptyState message="User not found" />;
  
  // Pure UI rendering
  return (
    <Card>
      <CardContent>
        <UserEditForm user={user} onSave={handleSave} />
      </CardContent>
    </Card>
  );
}
```

#### ✅ Hook Organization Structure:
```
app/users/profile/
├── (components)/
│   ├── UserProfile.tsx        # UI only
│   ├── UserEditForm.tsx       # UI only
│   └── UserAvatar.tsx         # UI only
├── (hooks)/
│   ├── useUserProfile.ts      # Single-use business logic
│   ├── useUserValidation.ts   # Single-use validation
│   └── useUserPreferences.ts  # Single-use preferences
└── page.tsx

hooks/ (global)
├── useAsync.ts                # Reusable async logic
├── useLocalStorage.ts         # Reusable storage logic
├── useDebounce.ts            # Reusable debounce logic
└── useAuth.ts                # Reusable auth logic
```

### Component Structure
```typescript
// ✅ Standard component structure
interface IUserProfileProps {
  userId: string;
  onUpdate?: (user: IUser) => void;
  className?: string;
}

export function UserProfile({ userId, onUpdate, className }: IUserProfileProps) {
  // 1. State declarations
  const [user, setUser] = useState<IUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2. Custom hooks
  const { toast } = useToast();
  const { isLoading, execute } = useAsync();
  
  // 3. Event handlers
  const handleSave = useCallback(async (userData: Partial<IUser>) => {
    try {
      const updatedUser = await execute(() => userService.update(userId, userData));
      setUser(updatedUser);
      setIsEditing(false);
      onUpdate?.(updatedUser);
      toast({ title: 'Profile updated successfully' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  }, [userId, execute, onUpdate, toast]);
  
  // 4. Helper functions
  const loadUser = async () => {
    try {
      setError(null);
      const userData = await userService.getById(userId);
      setUser(userData);
    } catch (err) {
      setError('Failed to load user profile');
    }
  };

  // 5. Effects
  useEffect(() => {
    loadUser();
  }, [userId]);
  
  // 6. Early returns
  if (error) {
    return <ErrorMessage message={error} onRetry={loadUser} />;
  }
  
  if (!user) {
    return <UserProfileSkeleton />;
  }
  
  // 7. Main render
  return (
    <Card className={cn("p-6", className)}>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <UserEditForm user={user} onSave={handleSave} onCancel={() => setIsEditing(false)} />
        ) : (
          <UserDisplayView user={user} onEdit={() => setIsEditing(true)} />
        )}
      </CardContent>
    </Card>
  );
}
```

### Custom Hooks Pattern
```typescript
// hooks/useAuth.ts
interface IAuthState {
  user: IUser | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): IAuthState & {
  login: (credentials: ILoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: IRegisterData) => Promise<void>;
} {
  const [state, setState] = useState<IAuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  
  const login = useCallback(async (credentials: ILoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const user = await authService.login(credentials);
      setState({ user, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState({ user: null, isLoading: false, error: message });
      throw error;
    }
  }, []);
  
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);
  
  // Check authentication on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  const checkAuthStatus = async () => {
    try {
      const user = await authService.getCurrentUser();
      setState({ user, isLoading: false, error: null });
    } catch {
      setState({ user: null, isLoading: false, error: null });
    }
  };
  
  return {
    ...state,
    login,
    logout,
    register,
  };
}
```

## Tailwind CSS & Styling Standards

### CSS Variable System
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... other CSS variables ... */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables ... */
  }
}
```

## Validation

### Form Validation with Zod
```typescript
// lib/validations.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ILoginFormData = z.infer<typeof loginSchema>;

// components/forms/LoginForm.tsx
export function LoginForm({ onSubmit }: ILoginFormProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof ILoginFormData, string>>>({});
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };
    
    try {
      const validatedData = loginSchema.parse(data);
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ILoginFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ILoginFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        )}
      </div>
      
      <Button type="submit" className="w-full">
        Sign In
      </Button>
    </form>
  );
}
```

## Security Best Practices

### Input Sanitization & Validation
```typescript
// utils/sanitization.ts
export function sanitizeHtml(input: string): string {
  // Use a library like DOMPurify in production
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000);
}

export function validateAndSanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  return sanitizeHtml(input);
}

// ✅ Secure API route
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = createUserSchema.parse(body);
    
    // Check authentication/authorization
    const user = await getCurrentUser(request);
    if (!user || !hasPermission(user, 'create_user')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Sanitize data before processing
    const sanitizedData = {
      name: validateAndSanitizeInput(validatedData.name),
      email: validatedData.email.toLowerCase(),
    };
    
    const newUser = await userService.create(sanitizedData);
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Import/Export Patterns

### Path Mapping (Already Configured)
```typescript
// tsconfig.json paths are already set up:
{
  "@/*": ["./*"],
  "@/components/*": ["./components/*"],
  "@/hooks/*": ["./hooks/*"],
  "@/utils/*": ["./utils/*"],
  "@/services/*": ["./services/*"],
  "@/stores/*": ["./stores/*"],
  "@/types/*": ["./types/*"]
}
```

### Import Order Standards
```typescript
// ✅ Consistent import order with proper spacing

// 1. LIBRARIES GROUP (React, Next.js, Third-party libraries)
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';

// 2. INTERNAL GROUP (Components, Hooks, Services, Utils, Types)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/components/features/UserProfile';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { userService } from '@/services/user.service';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/date';
import type { IUser, IUserPreferences } from '@/types/user';
import type { ApiResponse } from '@/types/api';

// 3. STYLES GROUP (CSS imports - if any)
import './component.module.css';
import 'some-library/styles.css';
```

#### Import Order Rules:
1. **Libraries Group** (with line gap after):
   - React imports
   - Next.js imports  
   - Third-party libraries (npm packages)

2. **Internal Group** (with line gap after):
   - UI components (Shadcn/ui)
   - Internal components
   - Custom hooks
   - Services and utilities
   - Type imports

3. **Styles Group** (if any):
   - CSS modules
   - External CSS files
   - Component-specific styles

## Documentation Standards

### Component Documentation
```typescript
/**
 * UserDashboard component displays user information and allows profile management
 * 
 * @param userId - The unique identifier for the user
 * @param onProfileUpdate - Callback function called when profile is updated
 * @param showActions - Whether to display action buttons (default: true)
 * @param className - Additional CSS classes to apply
 * 
 * @example
 * ```tsx
 * <UserDashboard 
 *   userId="user-123" 
 *   onProfileUpdate={(user) => console.log('Updated:', user)}
 *   showActions={true}
 * />
 * ```
 * 
 * @throws {Error} When userId is invalid or user data cannot be loaded
 */
export function UserDashboard({
  userId,
  onProfileUpdate,
  showActions = true,
  className,
}: IUserDashboardProps) {
  // Component implementation
}
```

### README Structure
```markdown
# B-MAD Project

## Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm or yarn

### Installation
```bash
npm install
npm run dev
```

### Project Structure
- `app/` - Next.js App Router pages and layouts
- `components/` - React components organized by feature
- `hooks/` - Custom React hooks
- `services/` - API services and external integrations
- `utils/` - Utility functions
- `types/` - TypeScript type definitions

### Key Features
- **Authentication**: User login and registration
- **Posts Management**: Create, edit, and manage posts
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: Built-in theme switching
- **Type Safety**: Full TypeScript coverage

### Development Guidelines
- Follow the coding standards in `.github/instructions/`
- Use TypeScript strict mode
- Implement proper error handling
- Write tests for components and utilities
- Follow accessibility best practices
```

This comprehensive guide ensures consistent, maintainable, and scalable code across the entire B-MAD project. All team members should follow these patterns to maintain code quality and developer experience.
