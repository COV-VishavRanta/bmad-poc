'use client';

import { useContacts } from '@/hooks/useContacts';
import { ClientContact } from '@/types/client';
import {
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    Upload as UploadIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Input,
    InputLabel,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import { useState } from 'react';

interface BulkContactOperationsProps {
  clientId: number;
  selectedContacts: ClientContact[];
  onOperationComplete: () => void;
  onClearSelection: () => void;
}

interface ImportProgressProps {
  isImporting: boolean;
  progress?: number;
  imported?: number;
  errors?: string[];
}

function ImportProgress({ isImporting, progress = 0, imported = 0, errors = [] }: ImportProgressProps) {
  if (!isImporting && imported === 0 && errors.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      {isImporting && (
        <>
          <Typography variant="body2" gutterBottom>
            Importing contacts...
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </>
      )}
      
      {imported > 0 && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Successfully imported {imported} contacts
        </Alert>
      )}
      
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <Typography variant="body2" gutterBottom>
            Import errors ({errors.length}):
          </Typography>
          <List dense>
            {errors.slice(0, 5).map((error, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemText primary={error} />
              </ListItem>
            ))}
            {errors.length > 5 && (
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary={`... and ${errors.length - 5} more errors`} />
              </ListItem>
            )}
          </List>
        </Alert>
      )}
    </Box>
  );
}

export default function BulkContactOperations({
  clientId,
  selectedContacts,
  onOperationComplete,
  onClearSelection,
}: BulkContactOperationsProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressProps>({
    isImporting: false,
  });
  const [bulkEditData, setBulkEditData] = useState({
    status: '',
    department: '',
  });

  const {
    bulkUpdateContacts,
    bulkDeleteContacts,
    importContacts,
    exportContacts,
    isImporting,
    isExporting,
  } = useContacts({ clientId });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setImportProgress({ isImporting: true, progress: 0 });
      
      const result = await importContacts(selectedFile);
      
      setImportProgress({
        isImporting: false,
        imported: result.imported,
        errors: result.errors,
      });
      
      if (result.imported > 0) {
        onOperationComplete();
        setTimeout(() => {
          setImportDialogOpen(false);
          setSelectedFile(null);
          setImportProgress({ isImporting: false });
        }, 2000);
      }
    } catch (error) {
      setImportProgress({
        isImporting: false,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      });
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      await exportContacts(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedContacts.length === 0) return;

    try {
      const updateData: Record<string, unknown> = {};
      if (bulkEditData.status) updateData.status = bulkEditData.status;
      if (bulkEditData.department) updateData.department = bulkEditData.department;

      await bulkUpdateContacts(
        selectedContacts.map(c => c.id),
        updateData
      );

      setBulkEditDialogOpen(false);
      setBulkEditData({ status: '', department: '' });
      onOperationComplete();
      onClearSelection();
    } catch (error) {
      console.error('Bulk edit failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;

    try {
      await bulkDeleteContacts(selectedContacts.map(c => c.id));
      setDeleteConfirmOpen(false);
      onOperationComplete();
      onClearSelection();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['name', 'email', 'phone', 'role', 'department', 'notes'].join(','),
      ['John Doe', 'john@example.com', '+1234567890', 'Manager', 'Sales', 'Primary contact'].join(','),
      ['Jane Smith', 'jane@example.com', '', 'Developer', 'Engineering', ''].join(','),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Bulk Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button
          startIcon={<UploadIcon />}
          onClick={() => setImportDialogOpen(true)}
          variant="outlined"
          size="small"
        >
          Import Contacts
        </Button>
        
        <Button
          startIcon={<DownloadIcon />}
          onClick={() => handleExport('csv')}
          variant="outlined"
          size="small"
          disabled={isExporting}
        >
          Export CSV
        </Button>
        
        <Button
          startIcon={<DownloadIcon />}
          onClick={() => handleExport('excel')}
          variant="outlined"
          size="small"
          disabled={isExporting}
        >
          Export Excel
        </Button>

        {selectedContacts.length > 0 && (
          <>
            <Button
              startIcon={<EditIcon />}
              onClick={() => setBulkEditDialogOpen(true)}
              variant="contained"
              size="small"
            >
              Bulk Edit ({selectedContacts.length})
            </Button>
            
            <Button
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
              variant="contained"
              color="error"
              size="small"
            >
              Delete ({selectedContacts.length})
            </Button>
          </>
        )}
      </Box>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Contacts</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a CSV or Excel file to import contacts. Make sure your file includes the required columns.
          </Typography>
          
          <Button
            variant="outlined"
            size="small"
            onClick={downloadTemplate}
            sx={{ mb: 2 }}
          >
            Download Template
          </Button>

          <Input
            type="file"
            onChange={handleFileSelect}
            inputProps={{
              accept: '.csv,.xlsx,.xls',
            }}
            fullWidth
          />

          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={`Selected: ${selectedFile.name}`}
                onDelete={() => setSelectedFile(null)}
              />
            </Box>
          )}

          <ImportProgress {...importProgress} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            variant="contained"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onClose={() => setBulkEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Edit Contacts ({selectedContacts.length})</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Update multiple contacts at once. Only filled fields will be updated.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={bulkEditData.status}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">No change</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={bulkEditData.department}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, department: e.target.value }))}
              >
                <MenuItem value="">No change</MenuItem>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Support">Support</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="HR">HR</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkEdit} variant="contained">
            Update Contacts
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Contacts</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to delete {selectedContacts.length} contact(s)? This action cannot be undone.
          </Typography>
          
          <List dense>
            {selectedContacts.slice(0, 5).map((contact) => (
              <ListItem key={contact.id}>
                <ListItemText primary={contact.name} secondary={contact.email} />
              </ListItem>
            ))}
            {selectedContacts.length > 5 && (
              <ListItem>
                <ListItemText primary={`... and ${selectedContacts.length - 5} more contacts`} />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}