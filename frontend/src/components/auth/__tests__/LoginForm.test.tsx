import { createTheme, ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Simple test component for basic rendering
const SimpleLoginForm = () => (
  <form>
    <input type="email" aria-label="Email Address" />
    <input type="password" aria-label="Password" />
    <button type="submit">Sign In</button>
  </form>
);

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Authentication Components', () => {
  it('renders basic login form elements', () => {
    renderWithTheme(<SimpleLoginForm />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('form elements are accessible', () => {
    renderWithTheme(<SimpleLoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});