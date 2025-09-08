# General Coding Standards

## Universal Principles

### Code Readability
- **Self-Documenting Code**: Write code that explains itself through clear naming
- **Consistent Formatting**: Follow project-specific formatting rules
- **Logical Organization**: Group related functionality together
- **Meaningful Names**: Use descriptive names for variables, functions, and classes

### Error Handling
- **Graceful Degradation**: Handle errors without breaking user experience
- **Specific Error Messages**: Provide clear, actionable error messages
- **Logging**: Log errors with sufficient context for debugging
- **Recovery**: Implement recovery mechanisms where possible

### Performance Considerations
- **Efficiency**: Write efficient algorithms and data structures
- **Resource Management**: Properly manage memory, connections, and resources
- **Lazy Loading**: Load resources only when needed
- **Caching**: Cache expensive operations appropriately

## Naming Conventions

### Variables and Functions
```javascript
// ✅ Good - Descriptive and clear
const userAccountBalance = 1000;
const calculateTotalPrice = (items, taxRate) => { };
const isUserAuthenticated = true;

// ❌ Bad - Vague or misleading
const data = 1000;
const calc = (x, y) => { };
const flag = true;
```

### Constants
```javascript
// ✅ Good - SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT_MS = 5000;
```

### Boolean Variables
```javascript
// ✅ Good - Use is/has/can/should prefixes
const isLoading = false;
const hasPermission = true;
const canEdit = false;
const shouldRefresh = true;

// ❌ Bad - Unclear boolean purpose
const loading = false;
const permission = true;
```

## Function Design

### Single Responsibility
```javascript
// ✅ Good - Single, clear purpose
const calculateTax = (amount, taxRate) => {
  return amount * taxRate;
};

const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// ❌ Bad - Multiple responsibilities
const calculateAndFormatPrice = (amount, taxRate, currency) => {
  const tax = amount * taxRate;
  const total = amount + tax;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(total);
};
```

### Pure Functions (When Possible)
```javascript
// ✅ Good - Pure function
const addTax = (price, taxRate) => {
  return price * (1 + taxRate);
};

// ❌ Bad - Function with side effects
let globalTaxRate = 0.08;
const addTax = (price) => {
  globalTaxRate += 0.01; // Modifying global state
  return price * (1 + globalTaxRate);
};
```

### Parameter Validation
```javascript
// ✅ Good - Input validation
const calculateDiscount = (price, discountRate) => {
  if (typeof price !== 'number' || price < 0) {
    throw new Error('Price must be a non-negative number');
  }
  
  if (typeof discountRate !== 'number' || discountRate < 0 || discountRate > 1) {
    throw new Error('Discount rate must be between 0 and 1');
  }
  
  return price * discountRate;
};
```

## Error Handling Patterns

### Try-Catch Usage
```javascript
// ✅ Good - Specific error handling
const fetchUserData = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`User with ID ${userId} not found`);
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error occurred. Please try again later.');
    }
    throw new Error('Failed to fetch user data');
  }
};
```

### Defensive Programming
```javascript
// ✅ Good - Defensive checks
const getUserName = (user) => {
  if (!user) {
    return 'Unknown User';
  }
  
  if (!user.name) {
    return user.email || user.id || 'Unknown User';
  }
  
  return user.name.trim();
};
```

## Code Organization

### File Structure
```
project/
├── src/
│   ├── components/      # UI components
│   ├── services/        # Business logic and API calls
│   ├── utils/           # Pure utility functions
│   ├── constants/       # Application constants
│   ├── types/           # Type definitions
│   └── tests/           # Test files
├── docs/                # Documentation
└── config/              # Configuration files
```

### Import Organization
```javascript
// ✅ Good - Organized imports
// Third-party libraries
import React from 'react';
import axios from 'axios';

// Internal modules
import { UserService } from '../services/UserService';
import { validateEmail } from '../utils/validation';
import { API_ENDPOINTS } from '../constants/api';

// Types
import type { User, ApiResponse } from '../types/api';
```

## Documentation Standards

### Function Documentation
```javascript
/**
 * Calculates the total price including tax and discounts
 * 
 * @param {number} basePrice - The original price before calculations
 * @param {number} taxRate - Tax rate as decimal (0.08 for 8%)
 * @param {number} discountRate - Discount rate as decimal (0.10 for 10% off)
 * @returns {number} The final price after tax and discount
 * @throws {Error} When parameters are invalid
 * 
 * @example
 * const total = calculateTotalPrice(100, 0.08, 0.10);
 * // Returns 97.2 (100 - 10% discount = 90, then + 8% tax = 97.2)
 */
const calculateTotalPrice = (basePrice, taxRate, discountRate) => {
  // Implementation
};
```

### Code Comments
```javascript
// ✅ Good - Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the server during retries
const delay = Math.pow(2, attemptNumber) * 1000;

// Cache the result for 5 minutes to reduce API calls
const cacheExpiry = Date.now() + (5 * 60 * 1000);

// ❌ Bad - Stating the obvious
// Increment the counter by 1
counter++;

// Set loading to true
setLoading(true);
```

## Testing Standards

### Test Structure
```javascript
// ✅ Good - Clear test structure
describe('calculateTotalPrice', () => {
  it('should calculate total price with tax and discount', () => {
    const result = calculateTotalPrice(100, 0.08, 0.10);
    expect(result).toBe(97.2);
  });
  
  it('should throw error for negative base price', () => {
    expect(() => {
      calculateTotalPrice(-50, 0.08, 0.10);
    }).toThrow('Base price cannot be negative');
  });
  
  it('should handle zero discount rate', () => {
    const result = calculateTotalPrice(100, 0.08, 0);
    expect(result).toBe(108);
  });
});
```

### Test Naming
```javascript
// ✅ Good - Descriptive test names
it('should return empty array when no items match filter criteria')
it('should throw ValidationError when email format is invalid')
it('should update user profile successfully with valid data')

// ❌ Bad - Vague test names
it('should work correctly')
it('should handle error')
it('should return result')
```

## Security Best Practices

### Input Sanitization
```javascript
// ✅ Good - Sanitize user input
const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000);   // Limit length
};
```

### Sensitive Data Handling
```javascript
// ✅ Good - Don't log sensitive data
const loginUser = async (credentials) => {
  try {
    console.log('Attempting login for user:', credentials.email);
    // Don't log the password
    const result = await authService.login(credentials);
    console.log('Login successful');
    return result;
  } catch (error) {
    console.error('Login failed:', error.message);
    // Don't log the full error which might contain sensitive data
    throw new Error('Login failed');
  }
};
```

## Performance Guidelines

### Efficient Data Structures
```javascript
// ✅ Good - Use appropriate data structures
const userMap = new Map(); // O(1) lookup time
const uniqueIds = new Set(); // O(1) for uniqueness check

// ❌ Bad - Inefficient for frequent lookups
const users = []; // O(n) lookup time
const uniqueIds = []; // O(n) for uniqueness check
```

### Avoid Premature Optimization
```javascript
// ✅ Good - Clear, readable code first
const findUserByEmail = (users, email) => {
  return users.find(user => user.email === email);
};

// Only optimize if performance testing shows this is a bottleneck
```

These standards provide a foundation for writing maintainable, secure, and performant code across any programming language or framework.
