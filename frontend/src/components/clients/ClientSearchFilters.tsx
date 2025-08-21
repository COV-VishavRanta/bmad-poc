import { ClientRelationType, ClientSearchParams, ClientStatus } from '@/types/client';
import {
    Bookmark as BookmarkIcon,
    Clear as ClearIcon,
    Delete as DeleteIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Save as SaveIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    ListItemSecondaryAction,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

// Saved search types
interface SavedSearch {
  id: string;
  name: string;
  params: ClientSearchParams;
  createdAt: Date;
}

interface ClientSearchFiltersProps {
  searchParams: ClientSearchParams;
  onSearchChange: (search: string) => void;
  onFilterChange: (filters: Partial<ClientSearchParams>) => void;
  onResetFilters: () => void;
  totalCount: number;
}

const ClientSearchFilters: React.FC<ClientSearchFiltersProps> = ({
  searchParams,
  onSearchChange,
  onFilterChange,
  onResetFilters,
  totalCount,
}) => {
  const [searchInput, setSearchInput] = useState(searchParams.search || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchDialog, setSaveSearchDialog] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [savedSearchMenu, setSavedSearchMenu] = useState<null | HTMLElement>(null);
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  
  // Load saved searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('client-saved-searches');
    if (saved) {
      try {
        const searches = JSON.parse(saved).map((s: SavedSearch) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
        setSavedSearches(searches);
      } catch (error) {
        console.error('Failed to load saved searches:', error);
      }
    }
  }, []);

  // Update highlight terms when search changes
  useEffect(() => {
    if (searchInput.trim()) {
      const terms = searchInput.split(' ').filter(term => term.length > 2);
      setHighlightTerms(terms);
    } else {
      setHighlightTerms([]);
    }
  }, [searchInput]);
  
  // Simple debounce implementation with useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  const handleStatusChange = (status: string) => {
    onFilterChange({ status: status as ClientStatus | 'all' });
  };

  const handleRelationTypeChange = (relationType: string) => {
    onFilterChange({ relationType: relationType as ClientRelationType | 'all' });
  };

  const handleDateFromChange = (dateFrom: string) => {
    onFilterChange({ dateFrom });
  };

  const handleDateToChange = (dateTo: string) => {
    onFilterChange({ dateTo });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchParams.search) count++;
    if (searchParams.status && searchParams.status !== 'all') count++;
    if (searchParams.relationType && searchParams.relationType !== 'all') count++;
    if (searchParams.dateFrom) count++;
    if (searchParams.dateTo) count++;
    return count;
  };

  // Saved search handlers
  const saveSavedSearches = (searches: SavedSearch[]) => {
    try {
      localStorage.setItem('client-saved-searches', JSON.stringify(searches));
      setSavedSearches(searches);
    } catch (error) {
      console.error('Failed to save searches:', error);
    }
  };

  const handleSaveSearch = () => {
    if (!newSearchName.trim()) return;
    
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: newSearchName.trim(),
      params: { ...searchParams },
      createdAt: new Date()
    };
    
    const updatedSearches = [...savedSearches, newSearch];
    saveSavedSearches(updatedSearches);
    setNewSearchName('');
    setSaveSearchDialog(false);
  };

  const handleLoadSearch = (search: SavedSearch) => {
    onFilterChange(search.params);
    setSearchInput(search.params.search || '');
    setSavedSearchMenu(null);
  };

  const handleDeleteSearch = (searchId: string) => {
    const updatedSearches = savedSearches.filter(s => s.id !== searchId);
    saveSavedSearches(updatedSearches);
    setSavedSearchMenu(null);
  };

  const canSaveCurrentSearch = () => {
    return getActiveFiltersCount() > 0;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Search & Filter Clients
            {totalCount > 0 && (
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                ({totalCount} clients)
              </Typography>
            )}
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              startIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              variant="outlined"
              size="small"
            >
              Advanced Filters
              {activeFiltersCount > 0 && (
                <Chip
                  label={activeFiltersCount}
                  size="small"
                  color="primary"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button
                startIcon={<ClearIcon />}
                onClick={onResetFilters}
                variant="outlined"
                size="small"
                color="secondary"
              >
                Clear All
              </Button>
            )}
          </Stack>
        </Box>

        {/* Search Bar with Saved Searches */}
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box flex={1}>
            <TextField
              fullWidth
              placeholder="Search clients by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                endAdornment: searchInput && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchInput('')}
                    sx={{ ml: 1 }}
                  >
                    <ClearIcon />
                  </IconButton>
                ),
              }}
              variant="outlined"
              size="medium"
            />
            {/* Search highlights indicator */}
            {highlightTerms.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="primary">
                  Highlighting: {highlightTerms.join(', ')}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Saved Searches Menu */}
          <Tooltip title="Saved Searches">
            <IconButton 
              onClick={(e) => setSavedSearchMenu(e.currentTarget)}
              color={savedSearches.length > 0 ? 'primary' : 'default'}
            >
              <BookmarkIcon />
            </IconButton>
          </Tooltip>
          
          {/* Save Current Search */}
          {canSaveCurrentSearch() && (
            <Tooltip title="Save Current Search">
              <IconButton 
                onClick={() => setSaveSearchDialog(true)}
                color="secondary"
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* Quick Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={searchParams.status || 'all'}
              label="Status"
              onChange={(e) => handleStatusChange(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Relation Type</InputLabel>
            <Select
              value={searchParams.relationType || 'all'}
              label="Relation Type"
              onChange={(e) => handleRelationTypeChange(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="Customer">Customer</MenuItem>
              <MenuItem value="Partner">Partner</MenuItem>
              <MenuItem value="Internal">Internal</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Advanced Filters */}
        <Collapse in={showAdvancedFilters}>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Filters
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Created From"
                type="date"
                value={searchParams.dateFrom || ''}
                onChange={(e) => handleDateFromChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              
              <TextField
                fullWidth
                label="Created To"
                type="date"
                value={searchParams.dateTo || ''}
                onChange={(e) => handleDateToChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Stack>
          </Box>
        </Collapse>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {searchParams.search && (
                <Chip
                  label={`Search: "${searchParams.search}"`}
                  onDelete={() => onSearchChange('')}
                  size="small"
                  variant="outlined"
                />
              )}
              {searchParams.status && searchParams.status !== 'all' && (
                <Chip
                  label={`Status: ${searchParams.status}`}
                  onDelete={() => handleStatusChange('all')}
                  size="small"
                  variant="outlined"
                />
              )}
              {searchParams.relationType && searchParams.relationType !== 'all' && (
                <Chip
                  label={`Type: ${searchParams.relationType}`}
                  onDelete={() => handleRelationTypeChange('all')}
                  size="small"
                  variant="outlined"
                />
              )}
              {searchParams.dateFrom && (
                <Chip
                  label={`From: ${searchParams.dateFrom}`}
                  onDelete={() => handleDateFromChange('')}
                  size="small"
                  variant="outlined"
                />
              )}
              {searchParams.dateTo && (
                <Chip
                  label={`To: ${searchParams.dateTo}`}
                  onDelete={() => handleDateToChange('')}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}
      </Stack>

      {/* Saved Searches Menu */}
      <Menu
        anchorEl={savedSearchMenu}
        open={Boolean(savedSearchMenu)}
        onClose={() => setSavedSearchMenu(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {savedSearches.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No saved searches
            </Typography>
          </MenuItem>
        ) : (
          savedSearches.map((search) => (
            <MenuItem key={search.id} sx={{ minWidth: 250 }}>
              <ListItemText
                primary={search.name}
                secondary={`${search.params.search || 'No search term'} • ${search.createdAt.toLocaleDateString()}`}
                onClick={() => handleLoadSearch(search)}
              />
              <ListItemSecondaryAction>
                <Tooltip title="Delete saved search">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSearch(search.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </MenuItem>
          ))
        )}
        
        {savedSearches.length > 0 && (
          <>
            <Divider />
            <MenuItem onClick={() => setSavedSearchMenu(null)}>
              <Typography variant="caption" color="text.secondary">
                Click a search to apply it
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Save Search Dialog */}
      <Dialog 
        open={saveSearchDialog} 
        onClose={() => setSaveSearchDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Search</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Save your current search and filters for quick access later.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Search Name"
            fullWidth
            variant="outlined"
            value={newSearchName}
            onChange={(e) => setNewSearchName(e.target.value)}
            placeholder="e.g., Active Enterprise Clients"
          />
          
          {/* Preview of current filters */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Current Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {searchParams.search && (
                <Chip label={`Search: "${searchParams.search}"`} size="small" />
              )}
              {searchParams.status && searchParams.status !== 'all' && (
                <Chip label={`Status: ${searchParams.status}`} size="small" />
              )}
              {searchParams.relationType && searchParams.relationType !== 'all' && (
                <Chip label={`Type: ${searchParams.relationType}`} size="small" />
              )}
              {searchParams.dateFrom && (
                <Chip label={`From: ${searchParams.dateFrom}`} size="small" />
              )}
              {searchParams.dateTo && (
                <Chip label={`To: ${searchParams.dateTo}`} size="small" />
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveSearchDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSearch}
            variant="contained"
            disabled={!newSearchName.trim()}
          >
            Save Search
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientSearchFilters;