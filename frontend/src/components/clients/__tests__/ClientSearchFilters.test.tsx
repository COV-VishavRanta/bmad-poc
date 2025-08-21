import { ClientSearchParams } from '@/types/client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ClientSearchFilters from '../ClientSearchFilters';

const theme = createTheme();

const mockProps = {
  searchParams: {
    search: '',
    status: 'all' as const,
    relationType: 'all' as const,
    page: 1,
    pageSize: 10,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
  } as ClientSearchParams,
  onSearchChange: jest.fn(),
  onFilterChange: jest.fn(),
  onResetFilters: jest.fn(),
  totalCount: 25,
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ClientSearchFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input correctly', () => {
    renderWithTheme(<ClientSearchFilters {...mockProps} />);
    
    expect(screen.getByPlaceholderText('Search clients by name...')).toBeInTheDocument();
  });

  it('displays total count correctly', () => {
    renderWithTheme(<ClientSearchFilters {...mockProps} />);
    
    expect(screen.getByText('(25 clients)')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    renderWithTheme(<ClientSearchFilters {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search clients by name...');
    fireEvent.change(searchInput, { target: { value: 'test client' } });
    
    // Wait for debounce
    await waitFor(() => {
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('test client');
    }, { timeout: 400 });
  });

  it('calls onFilterChange when changing status filter', () => {
    renderWithTheme(<ClientSearchFilters {...mockProps} />);
    
    // Find the first select (status) by getting all comboboxes
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0]; // First select is status
    fireEvent.mouseDown(statusSelect);
    
    const activeOption = screen.getByText('Active');
    fireEvent.click(activeOption);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith({ status: 'active' });
  });

  it('calls onFilterChange when changing relation type filter', () => {
    renderWithTheme(<ClientSearchFilters {...mockProps} />);
    
    // Find the relation type select by looking for the second combobox
    const selects = screen.getAllByRole('combobox');
    const relationTypeSelect = selects[1]; // Second select is relation type
    fireEvent.mouseDown(relationTypeSelect);
    
    const customerOption = screen.getByText('Customer');
    fireEvent.click(customerOption);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith({ relationType: 'Customer' });
  });

  it('shows advanced filters when button is clicked', () => {
    renderWithTheme(<ClientSearchFilters {...mockProps} />);
    
    // Use getAllByText and select the button (first occurrence)
    const advancedButtons = screen.getAllByText('Advanced Filters');
    fireEvent.click(advancedButtons[0]); // Click the button, not the heading
    
    expect(screen.getByLabelText('Created From')).toBeInTheDocument();
    expect(screen.getByLabelText('Created To')).toBeInTheDocument();
  });

  it('displays active filters correctly', () => {
    const propsWithFilters = {
      ...mockProps,
      searchParams: {
        ...mockProps.searchParams,
        search: 'test',
        status: 'active' as const,
      },
    };
    
    renderWithTheme(<ClientSearchFilters {...propsWithFilters} />);
    
    expect(screen.getByText('Active Filters:')).toBeInTheDocument();
    expect(screen.getByText('Search: "test"')).toBeInTheDocument();
    expect(screen.getByText('Status: active')).toBeInTheDocument();
  });

  it('calls onResetFilters when clear all button is clicked', () => {
    const propsWithFilters = {
      ...mockProps,
      searchParams: {
        ...mockProps.searchParams,
        search: 'test',
      },
    };
    
    renderWithTheme(<ClientSearchFilters {...propsWithFilters} />);
    
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);
    
    expect(mockProps.onResetFilters).toHaveBeenCalled();
  });

  it('removes individual filters when delete buttons are clicked', () => {
    const propsWithFilters = {
      ...mockProps,
      searchParams: {
        ...mockProps.searchParams,
        status: 'active' as const,
      },
    };
    
    renderWithTheme(<ClientSearchFilters {...propsWithFilters} />);
    
    // Find the chip with status filter and click its delete button
    const statusChip = screen.getByText('Status: active').closest('.MuiChip-root');
    const deleteButton = statusChip?.querySelector('.MuiChip-deleteIcon');
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockProps.onFilterChange).toHaveBeenCalledWith({ status: 'all' });
    }
  });
});