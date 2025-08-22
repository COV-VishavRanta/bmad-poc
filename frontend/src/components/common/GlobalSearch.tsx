'use client';

import { Client } from '@/types/client';
import {
    Business as BusinessIcon,
    Person as PersonIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Autocomplete,
    Avatar,
    Box,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface SearchResult {
  id: string;
  type: 'client' | 'contact';
  title: string;
  subtitle: string;
  clientId?: number;
  contactId?: number;
}

interface ContactSearchResult {
  id: number;
  name: string;
  clientId: number;
  clientName: string;
  role?: string;
}

// Simple debounce implementation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  size?: 'small' | 'medium';
}

export default function GlobalSearch({ 
  onResultSelect, 
  placeholder = "Search clients and contacts...",
  size = 'medium'
}: GlobalSearchProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const debouncedSearchValue = useDebounce(searchValue, 300);

  const performSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];

    try {
      // Search clients
      const clientResponse = await fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=5`);
      const clientData = await clientResponse.json();
      
      // Search contacts across all clients
      const contactResponse = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}&limit=5`);
      const contactData = await contactResponse.json();
      
      const searchResults: SearchResult[] = [];
      
      // Add client results
      if (clientData.data) {
        clientData.data.forEach((client: Client) => {
          searchResults.push({
            id: `client-${client.id}`,
            type: 'client',
            title: client.name,
            subtitle: `${client.relationType} • ${client.status}`,
            clientId: client.id,
          });
        });
      }
      
      // Add contact results
      if (contactData.data) {
        contactData.data.forEach((contact: ContactSearchResult) => {
          searchResults.push({
            id: `contact-${contact.id}`,
            type: 'contact',
            title: contact.name,
            subtitle: `${contact.clientName} • ${contact.role || 'Contact'}`,
            clientId: contact.clientId,
            contactId: contact.id,
          });
        });
      }
      
      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const searchContacts = async () => {
      if (!debouncedSearchValue || debouncedSearchValue.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await performSearch(debouncedSearchValue);
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchContacts();
  }, [debouncedSearchValue, performSearch]);

  const handleResultSelect = (result: SearchResult | null) => {
    if (!result) return;
    
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // Default navigation behavior
      if (result.type === 'client') {
        router.push(`/clients/${result.clientId}`);
      } else if (result.type === 'contact' && result.clientId) {
        router.push(`/clients/${result.clientId}?tab=contacts&highlight=${result.contactId}`);
      }
    }
    
    setSearchValue('');
    setOpen(false);
  };

  const renderOption = (props: React.HTMLAttributes<HTMLLIElement>, option: SearchResult) => (
    <Box component="li" {...props}>
      <Avatar
        sx={{ 
          width: 32, 
          height: 32, 
          mr: 2,
          bgcolor: option.type === 'client' ? 'primary.light' : 'secondary.light'
        }}
      >
        {option.type === 'client' ? <BusinessIcon /> : <PersonIcon />}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight="medium">
          {option.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {option.subtitle}
        </Typography>
      </Box>
      <Chip
        label={option.type}
        size="small"
        variant="outlined"
        color={option.type === 'client' ? 'primary' : 'secondary'}
      />
    </Box>
  );

  const groupedOptions = [
    ...results.filter(r => r.type === 'client'),
    ...results.filter(r => r.type === 'contact'),
  ];

  return (
    <Autocomplete
      size={size}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={groupedOptions}
      loading={isLoading}
      getOptionLabel={(option) => option.title}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      PaperComponent={({ children, ...props }) => (
        <Paper {...props}>
          {results.length > 0 && (
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
                Search Results ({results.length})
              </Typography>
              <Divider sx={{ mt: 1 }} />
            </Box>
          )}
          {children}
          {results.length === 0 && searchValue.length >= 2 && !isLoading && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No clients or contacts found for &quot;{searchValue}&quot;
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      inputValue={searchValue}
      onInputChange={(_, newValue) => setSearchValue(newValue)}
      onChange={(_, newValue) => handleResultSelect(newValue)}
      noOptionsText="Start typing to search..."
      filterOptions={(x) => x} // Disable client-side filtering
      sx={{ minWidth: 300 }}
    />
  );
}