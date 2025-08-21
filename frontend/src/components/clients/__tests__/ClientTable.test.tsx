import { Client, ClientSearchParams } from '@/types/client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import ClientTable from '../ClientTable';

const theme = createTheme();

// Mock RoleGuard component
jest.mock('@/components/auth/RoleGuard', () => {
  return function MockRoleGuard({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

const mockClients: Client[] = [
  {
    id: 1,
    name: 'Test Client 1',
    status: 'active',
    relationType: 'Customer',
    projectManagementTool: 'Jira',
    comments: 'Test comments',
    projectCount: 3,
    createdAt: '2023-01-15T10:30:00Z',
    updatedAt: '2023-01-20T14:45:00Z',
    lastActivity: '2023-01-20T14:45:00Z',
  },
  {
    id: 2,
    name: 'Test Client 2',
    status: 'inactive',
    relationType: 'Partner',
    projectCount: 1,
    createdAt: '2023-01-10T09:15:00Z',
    updatedAt: '2023-01-18T16:20:00Z',
    lastActivity: '2023-01-18T16:20:00Z',
  },
];

const mockSearchParams: ClientSearchParams = {
  search: '',
  status: 'all',
  relationType: 'all',
  page: 1,
  pageSize: 10,
  sortBy: 'name',
  sortOrder: 'asc',
};

const mockProps = {
  clients: mockClients,
  searchParams: mockSearchParams,
  totalPages: 1,
  onPageChange: jest.fn(),
  onSortChange: jest.fn(),
  onRefresh: jest.fn(),
  onViewClient: jest.fn(),
  onEditClient: jest.fn(),
  onDeactivateClient: jest.fn(),
  onActivateClient: jest.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ClientTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders client data correctly', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    expect(screen.getByText('Test Client 1')).toBeInTheDocument();
    expect(screen.getByText('Test Client 2')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Partner')).toBeInTheDocument();
  });

  it('displays project counts correctly', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Project count for client 1
    expect(screen.getByText('1')).toBeInTheDocument(); // Project count for client 2
  });

  it('shows project management tool when available', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    expect(screen.getByText('Jira')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // For client without tool
  });

  it('calls onSortChange when column headers are clicked', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    const nameHeader = screen.getByText('Client Name');
    fireEvent.click(nameHeader);
    
    expect(mockProps.onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(mockProps.onRefresh).toHaveBeenCalled();
  });

  it('opens action menu when more actions button is clicked', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    const actionButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(actionButtons[0]);
    
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Edit Client')).toBeInTheDocument();
  });

  it('shows deactivate option for active clients', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    const actionButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(actionButtons[0]); // Click on first client (active)
    
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('shows reactivate option for inactive clients', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    const actionButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(actionButtons[1]); // Click on second client (inactive)
    
    expect(screen.getByText('Reactivate')).toBeInTheDocument();
  });

  it('displays empty state when no clients', () => {
    const emptyProps = { ...mockProps, clients: [] };
    renderWithTheme(<ClientTable {...emptyProps} />);
    
    expect(screen.getByText('No clients found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument();
  });

  it('shows pagination when there are multiple pages', () => {
    const paginatedProps = { ...mockProps, totalPages: 3 };
    renderWithTheme(<ClientTable {...paginatedProps} />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('calls onPageChange when pagination is used', () => {
    const paginatedProps = { ...mockProps, totalPages: 3 };
    renderWithTheme(<ClientTable {...paginatedProps} />);
    
    const nextPageButton = screen.getByLabelText('Go to page 2');
    fireEvent.click(nextPageButton);
    
    expect(mockProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('formats dates correctly', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    // Check if dates are formatted (exact format may vary based on locale)
    expect(screen.getByText(/Jan 15, 2023|1\/15\/2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 20, 2023|1\/20\/2023/)).toBeInTheDocument();
  });

  it('displays client count in header', () => {
    renderWithTheme(<ClientTable {...mockProps} />);
    
    expect(screen.getByText('Clients (2)')).toBeInTheDocument();
  });
});