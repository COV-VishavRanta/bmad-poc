import { usePermissions } from '@/hooks/usePermissions';
import { useProjectStore } from '@/store/projects';
import { ProjectSearchParams } from '@/types/project';
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

const mockGroups = [
  { id: 1, name: 'Development Team' },
  { id: 2, name: 'Support Team' },
  { id: 3, name: 'Consulting Team' },
];

export const ProjectFilters: React.FC = () => {
  const { searchParams, setSearchParams, resetSearchParams } = useProjectStore();
  const { isRM, isHR, isPC } = usePermissions();
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

  const handleFilterChange = (key: keyof ProjectSearchParams, value: string | number | undefined) => {
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
    if (searchParams.projectType && searchParams.projectType !== 'all') count++;
    if (searchParams.clientId) count++;
    if (searchParams.groupId) count++;
    if (searchParams.startDateFrom || searchParams.startDateTo) count++;
    if (searchParams.endDateFrom || searchParams.endDateTo) count++;
    return count;
  }, [searchParams]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FilterIcon sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="h6" component="h2">
          Filters
        </Typography>
        {activeFiltersCount > 0 && (
          <Chip
            label={`${activeFiltersCount} active`}
            size="small"
            color="primary"
            sx={{ ml: 2 }}
          />
        )}
        {activeFiltersCount > 0 && (
          <Box sx={{ ml: 'auto' }}>
            <IconButton onClick={handleClearAllFilters} size="small">
              <ClearIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Search */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search projects..."
          value={localSearch}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: localSearch && (
              <InputAdornment position="end">
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Status Filter */}
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={searchParams.status || 'all'}
            label="Status"
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="planned">Planned</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="on_hold">On Hold</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        {/* Project Type Filter */}
        <FormControl fullWidth>
          <InputLabel>Project Type</InputLabel>
          <Select
            value={searchParams.projectType || 'all'}
            label="Project Type"
            onChange={(e) => handleFilterChange('projectType', e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Development">Development</MenuItem>
            <MenuItem value="Maintenance">Maintenance</MenuItem>
            <MenuItem value="Consulting">Consulting</MenuItem>
            <MenuItem value="Support">Support</MenuItem>
          </Select>
        </FormControl>

        {/* Client Filter */}
        <Autocomplete
          options={mockClients}
          getOptionLabel={(option) => option.name}
          value={mockClients.find(c => c.id === searchParams.clientId) || null}
          onChange={(_, newValue) => handleFilterChange('clientId', newValue?.id)}
          renderInput={(params) => (
            <TextField {...params} label="Client" fullWidth />
          )}
        />
      </Box>

      {/* Advanced Filters Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
        {/* Group Filter - Available for RM, HR, and PC users */}
        {(isRM || isHR || isPC) && (
          <Autocomplete
            options={mockGroups}
            getOptionLabel={(option) => option.name}
            value={mockGroups.find(g => g.id === searchParams.groupId) || null}
            onChange={(_, newValue) => handleFilterChange('groupId', newValue?.id)}
            renderInput={(params) => (
              <TextField {...params} label="Team/Group" fullWidth />
            )}
          />
        )}

        {/* Date Filters - Available for all users */}
        <TextField
          fullWidth
          type="date"
          label="Start Date From"
          value={searchParams.startDateFrom || ''}
          onChange={(e) => handleFilterChange('startDateFrom', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        {/* Start Date To */}
        <TextField
          fullWidth
          type="date"
          label="Start Date To"
          value={searchParams.startDateTo || ''}
          onChange={(e) => handleFilterChange('startDateTo', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        {/* Sort By */}
        <FormControl fullWidth>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={searchParams.sortBy || 'name'}
            label="Sort By"
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <MenuItem value="name">Project Name</MenuItem>
            <MenuItem value="start_date">Start Date</MenuItem>
            <MenuItem value="end_date">End Date</MenuItem>
            <MenuItem value="status">Status</MenuItem>
            <MenuItem value="client_name">Client Name</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {searchParams.search && (
            <Chip
              label={`Search: "${searchParams.search}"`}
              onDelete={() => handleFilterChange('search', '')}
              variant="outlined"
              size="small"
            />
          )}
          {searchParams.status && searchParams.status !== 'all' && (
            <Chip
              label={`Status: ${searchParams.status}`}
              onDelete={() => handleFilterChange('status', 'all')}
              variant="outlined"
              size="small"
            />
          )}
          {searchParams.projectType && searchParams.projectType !== 'all' && (
            <Chip
              label={`Type: ${searchParams.projectType}`}
              onDelete={() => handleFilterChange('projectType', 'all')}
              variant="outlined"
              size="small"
            />
          )}
          {searchParams.clientId && (
            <Chip
              label={`Client: ${mockClients.find(c => c.id === searchParams.clientId)?.name}`}
              onDelete={() => handleFilterChange('clientId', undefined)}
              variant="outlined"
              size="small"
            />
          )}
          {searchParams.groupId && (
            <Chip
              label={`Group: ${mockGroups.find(g => g.id === searchParams.groupId)?.name}`}
              onDelete={() => handleFilterChange('groupId', undefined)}
              variant="outlined"
              size="small"
            />
          )}
          {(searchParams.startDateFrom || searchParams.startDateTo) && (
            <Chip
              label={`Start Date: ${searchParams.startDateFrom || '∞'} - ${searchParams.startDateTo || '∞'}`}
              onDelete={() => {
                handleFilterChange('startDateFrom', '');
                handleFilterChange('startDateTo', '');
              }}
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      )}
    </Box>
  );
};