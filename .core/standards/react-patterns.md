# React Development Standards

## Component Organization

### File Structure
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── hooks/                # Custom React hooks
├── utils/                # Utility functions
├── services/             # API services
├── stores/               # State management
└── types/                # TypeScript type definitions
```

### Component Naming
- **Components**: PascalCase (`LoginForm.tsx`, `UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useLocalStorage.ts`)
- **Utils**: camelCase (`formatDate.ts`, `validateEmail.ts`)
- **Types**: PascalCase (`User.ts`, `ApiResponse.ts`)

## Component Patterns

### Functional Components (Preferred)
```tsx
// ✅ Good - Functional component with proper typing
interface LoginFormProps {
  onSubmit: (data: LoginData) => void;
  loading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Component content */}
    </form>
  );
};
```

### Component Structure Order
1. Interfaces/Types
2. Component definition
3. State declarations
4. Effect hooks
5. Custom hooks
6. Event handlers
7. Render helpers
8. Return statement

### Props Interface
```tsx
// ✅ Good - Clear prop interface
interface IComponentProps {
  // Required props first
  title: string;
  onSubmit: (data: FormData) => void;
  
  // Optional props after
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}
```

## State Management

### Local State (useState)
```tsx
// ✅ Good - Simple state management
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Custom Hooks for Complex State
```tsx
// ✅ Good - Extract complex state logic
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const user = await authService.login(credentials);
      setUser(user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, login };
};
```

## Event Handling

### Event Handler Naming
```tsx
// ✅ Good - Clear event handler naming
const handleSubmit = (e: React.FormEvent) => { };
const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => { };
const handleUserSelect = (user: User) => { };
```

### Prevent Default Pattern
```tsx
// ✅ Good - Proper event handling
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Handle form submission
};
```

## Error Handling

### Error Boundaries
```tsx
// ✅ Good - Error boundary component
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}
```

### Async Error Handling
```tsx
// ✅ Good - Proper async error handling
const [error, setError] = useState<string | null>(null);

const handleAsyncAction = async () => {
  try {
    setError(null);
    await someAsyncOperation();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  }
};
```

## Performance Optimization

### useCallback for Event Handlers
```tsx
// ✅ Good - Memoized event handlers
const handleSubmit = useCallback((data: FormData) => {
  onSubmit(data);
}, [onSubmit]);
```

### useMemo for Expensive Calculations
```tsx
// ✅ Good - Memoized expensive calculations
const expensiveValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### React.memo for Component Memoization
```tsx
// ✅ Good - Memoized component
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  // Component implementation
});
```

## Testing Patterns

### Component Testing Structure
```tsx
// ✅ Good - Test structure
describe('LoginForm', () => {
  it('should render login form elements', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should call onSubmit with form data when submitted', () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
```

## Import/Export Patterns

### Import Order
```tsx
// ✅ Good - Import order
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import axios from 'axios';
import { toast } from 'react-toastify';

// 3. Internal components
import { Button } from '../common/Button';
import { Input } from '../common/Input';

// 4. Utilities and services
import { validateEmail } from '../../utils/validation';
import { authService } from '../../services/auth';

// 5. Types
import type { User, LoginCredentials } from '../../types/auth';
```

### Export Patterns
```tsx
// ✅ Good - Named exports (preferred)
export const LoginForm: React.FC<Props> = () => { };

// ✅ Good - Default export for main component
const LoginForm: React.FC<Props> = () => { };
export default LoginForm;
```

## Accessibility Standards

### Semantic HTML
```tsx
// ✅ Good - Semantic HTML usage
<form onSubmit={handleSubmit}>
  <fieldset>
    <legend>Login Information</legend>
    
    <label htmlFor="email">Email Address</label>
    <input
      id="email"
      type="email"
      value={email}
      onChange={handleEmailChange}
      required
      aria-describedby="email-error"
    />
    {emailError && <div id="email-error" role="alert">{emailError}</div>}
  </fieldset>
</form>
```

### ARIA Attributes
```tsx
// ✅ Good - Proper ARIA usage
<button
  onClick={handleSubmit}
  disabled={loading}
  aria-label={loading ? 'Logging in...' : 'Log in'}
  aria-busy={loading}
>
  {loading ? 'Logging in...' : 'Log in'}
</button>
```

## Code Comments

### Component Documentation
```tsx
/**
 * LoginForm component handles user authentication
 * 
 * @param onSubmit - Callback function called when form is submitted
 * @param loading - Whether the form is in a loading state
 * @param error - Error message to display
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading, error }) => {
  // Implementation
};
```

### Complex Logic Comments
```tsx
// ✅ Good - Comment complex business logic
// Calculate the total price including tax and discounts
// Tax rate is applied after discounts are subtracted
const totalPrice = useMemo(() => {
  const discountedPrice = basePrice * (1 - discountRate);
  return discountedPrice * (1 + taxRate);
}, [basePrice, discountRate, taxRate]);
```

This standard ensures consistent, maintainable, and accessible React code across all projects.
