'use client';

import { UserRole } from '@/types/auth';
import { UserFilterState } from '@/types/users';
import {
    Clear as ClearIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';

interface UserSearchFiltersProps {
  filters: UserFilterState;
  onFilterChange: (filters: Partial<UserFilterState>) => void;
  loading?: boolean;
}

export function UserSearchFilters({
  filters,
  onFilterChange,
  loading = false,
}: UserSearchFiltersProps) {
  const handleClearFilters = () => {
    onFilterChange({
      search: '',
      role: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.role !== 'all' || 
    filters.status !== 'all' || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Search & Filters</Typography>
        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={loading}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-start">
        {/* Search Input */}
        <Box sx={{ minWidth: 250, flex: 1 }}>
          <TextField
            fullWidth
            label="Search Users"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            disabled={loading}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
        </Box>

        {/* Role Filter */}
        <Box sx={{ minWidth: 120 }}>
          <FormControl fullWidth disabled={loading}>
            <InputLabel>Role</InputLabel>
            <Select
              value={filters.role}
              label="Role"
              onChange={(e) => onFilterChange({ role: e.target.value as UserRole | 'all' })}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="PC">PC</MenuItem>
              <MenuItem value="RM">RM</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Status Filter */}
        <Box sx={{ minWidth: 120 }}>
          <FormControl fullWidth disabled={loading}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => onFilterChange({ status: e.target.value as 'active' | 'inactive' | 'all' })}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Date From */}
        <Box sx={{ minWidth: 140 }}>
          <TextField
            fullWidth
            label="Created From"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            disabled={loading}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>

        {/* Date To */}
        <Box sx={{ minWidth: 140 }}>
          <TextField
            fullWidth
            label="Created To"
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            disabled={loading}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
      </Box>

      {/* Filter Summary */}
      {hasActiveFilters && (
        <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
          <Typography variant="body2" color="textSecondary">
            Active filters: {' '}
            {filters.search && <span>Search: &quot;{filters.search}&quot; </span>}
            {filters.role !== 'all' && <span>Role: {filters.role} </span>}
            {filters.status !== 'all' && <span>Status: {filters.status} </span>}
            {filters.dateFrom && <span>From: {filters.dateFrom} </span>}
            {filters.dateTo && <span>To: {filters.dateTo} </span>}
          </Typography>
        </Box>
      )}
    </Box>
  );
}