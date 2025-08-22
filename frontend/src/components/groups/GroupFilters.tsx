import { useGroupStore } from '@/store/groups';
import { GroupSearchParams, GroupStatus } from '@/types/group';
import {
    Clear as ClearIcon,
    FilterList as FilterIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Chip,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import React from 'react';

// Mock data - in real app this would come from API
const mockClients = [
  { id: 1, name: 'Acme Corp' },
  { id: 2, name: 'TechStart Inc' },
  { id: 3, name: 'Global Solutions' },
];

const mockSOWs = [
  { id: 1, name: 'Q1 Development SOW' },
  { id: 2, name: 'Q2 Support SOW' },
  { id: 3, name: 'Annual Maintenance SOW' },
];

const groupStatusOptions: { value: GroupStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
];

export const GroupFilters: React.FC = () => {
  const { searchParams, setSearchParams, resetSearchParams } = useGroupStore();
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || '');
  
  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchParams.search) {
        setSearchParams({ search: localSearch });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, searchParams.search, setSearchParams]);

  const handleFilterChange = (key: keyof GroupSearchParams, value: string | number | undefined) => {
    setSearchParams({ [key]: value });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(event.target.value);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearchParams({ search: '' });
  };

  const handleClearAllFilters = () => {
    setLocalSearch('');
    resetSearchParams();
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchParams.search) count++;
    if (searchParams.status && searchParams.status !== 'all') count++;
    if (searchParams.clientId) count++;
    if (searchParams.sowId) count++;
    if (searchParams.startDateFrom || searchParams.startDateTo) count++;
    if (searchParams.endDateFrom || searchParams.endDateTo) count++;
    if (searchParams.projectCountMin || searchParams.projectCountMax) count++;
    return count;
  }, [searchParams]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          <Typography variant="h6">Filters</Typography>
          {activeFiltersCount > 0 && (
            <Chip 
              label={`${activeFiltersCount} active`} 
              size="small" 
              color="primary" 
            />
          )}
        </Box>
        {activeFiltersCount > 0 && (
          <IconButton
            onClick={handleClearAllFilters}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon />
          </IconButton>
        )}
      </Box>

      {/* Filter Controls */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
        {/* Search */}
        <TextField
          label="Search groups"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder="Search by group name or description..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: localSearch && (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClearSearch}
                  size="small"
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
          fullWidth
        />

        {/* Status Filter */}
        <FormControl variant="outlined" size="small" fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={searchParams.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value as GroupStatus | 'all')}
            label="Status"
          >
            {groupStatusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Client Filter */}
        <Autocomplete
          options={mockClients}
          getOptionLabel={(option) => option.name}
          value={mockClients.find(c => c.id === searchParams.clientId) || null}
          onChange={(_, value) => handleFilterChange('clientId', value?.id)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Client"
              variant="outlined"
              size="small"
              placeholder="Select client..."
            />
          )}
        />

        {/* SOW Filter */}
        <Autocomplete
          options={mockSOWs}
          getOptionLabel={(option) => option.name}
          value={mockSOWs.find(s => s.id === searchParams.sowId) || null}
          onChange={(_, value) => handleFilterChange('sowId', value?.id)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="SOW"
              variant="outlined"
              size="small"
              placeholder="Select SOW..."
            />
          )}
        />

        {/* Start Date Range */}
        <TextField
          label="Start Date From"
          type="date"
          value={searchParams.startDateFrom || ''}
          onChange={(e) => handleFilterChange('startDateFrom', e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
          fullWidth
        />

        <TextField
          label="Start Date To"
          type="date"
          value={searchParams.startDateTo || ''}
          onChange={(e) => handleFilterChange('startDateTo', e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
          fullWidth
        />

        {/* End Date Range */}
        <TextField
          label="End Date From"
          type="date"
          value={searchParams.endDateFrom || ''}
          onChange={(e) => handleFilterChange('endDateFrom', e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
          fullWidth
        />

        <TextField
          label="End Date To"
          type="date"
          value={searchParams.endDateTo || ''}
          onChange={(e) => handleFilterChange('endDateTo', e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
          fullWidth
        />

        {/* Project Count Range */}
        <TextField
          label="Min Projects"
          type="number"
          value={searchParams.projectCountMin || ''}
          onChange={(e) => handleFilterChange('projectCountMin', e.target.value ? parseInt(e.target.value) : undefined)}
          variant="outlined"
          size="small"
          fullWidth
          inputProps={{ min: 0 }}
        />

        <TextField
          label="Max Projects"
          type="number"
          value={searchParams.projectCountMax || ''}
          onChange={(e) => handleFilterChange('projectCountMax', e.target.value ? parseInt(e.target.value) : undefined)}
          variant="outlined"
          size="small"
          fullWidth
          inputProps={{ min: 0 }}
        />
      </Box>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Filters:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {searchParams.search && (
              <Chip
                label={`Search: "${searchParams.search}"`}
                onDelete={() => handleFilterChange('search', '')}
                size="small"
              />
            )}
            {searchParams.status && searchParams.status !== 'all' && (
              <Chip
                label={`Status: ${groupStatusOptions.find(s => s.value === searchParams.status)?.label}`}
                onDelete={() => handleFilterChange('status', 'all')}
                size="small"
              />
            )}
            {searchParams.clientId && (
              <Chip
                label={`Client: ${mockClients.find(c => c.id === searchParams.clientId)?.name}`}
                onDelete={() => handleFilterChange('clientId', undefined)}
                size="small"
              />
            )}
            {searchParams.sowId && (
              <Chip
                label={`SOW: ${mockSOWs.find(s => s.id === searchParams.sowId)?.name}`}
                onDelete={() => handleFilterChange('sowId', undefined)}
                size="small"
              />
            )}
            {(searchParams.startDateFrom || searchParams.startDateTo) && (
              <Chip
                label={`Start Date: ${searchParams.startDateFrom || '...'} - ${searchParams.startDateTo || '...'}`}
                onDelete={() => {
                  handleFilterChange('startDateFrom', undefined);
                  handleFilterChange('startDateTo', undefined);
                }}
                size="small"
              />
            )}
            {(searchParams.endDateFrom || searchParams.endDateTo) && (
              <Chip
                label={`End Date: ${searchParams.endDateFrom || '...'} - ${searchParams.endDateTo || '...'}`}
                onDelete={() => {
                  handleFilterChange('endDateFrom', undefined);
                  handleFilterChange('endDateTo', undefined);
                }}
                size="small"
              />
            )}
            {(searchParams.projectCountMin || searchParams.projectCountMax) && (
              <Chip
                label={`Projects: ${searchParams.projectCountMin || 0} - ${searchParams.projectCountMax || '∞'}`}
                onDelete={() => {
                  handleFilterChange('projectCountMin', undefined);
                  handleFilterChange('projectCountMax', undefined);
                }}
                size="small"
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};