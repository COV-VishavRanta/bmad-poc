'use client';

import { userApi } from '@/lib/api/users';
import { AccessEvent, UserAccessHistoryResponse } from '@/types/users';
import {
    Close as CloseIcon,
    History as HistoryIcon,
    Login as LoginIcon,
    Refresh as RefreshIcon,
    Security as SecurityIcon,
    AccountCircle as UserIcon,
} from '@mui/icons-material';
import {
    Timeline,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineItem,
    TimelineOppositeContent,
    TimelineSeparator,
} from '@mui/lab';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Pagination,
    Select,
    SelectChangeEvent,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

interface UserAccessHistoryDialogProps {
    open: boolean;
    userId: number | null;
    userName: string;
    onClose: () => void;
}

export function UserAccessHistoryDialog({
    open,
    userId,
    userName,
    onClose,
}: UserAccessHistoryDialogProps) {
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState<UserAccessHistoryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [days, setDays] = useState(30);

    const loadAccessHistory = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await userApi.getUserAccessHistory(userId, { days, page, pageSize });
            setHistoryData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load access history');
        } finally {
            setLoading(false);
        }
    }, [userId, days, page, pageSize]);

    useEffect(() => {
        if (open && userId) {
            loadAccessHistory();
        }
    }, [open, userId, loadAccessHistory]);

    const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
        setPage(newPage);
    };

    const handleDaysChange = (event: SelectChangeEvent<number>) => {
        setDays(event.target.value as number);
        setPage(1); // Reset to first page when changing filter
    };

    const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
        setPageSize(event.target.value as number);
        setPage(1); // Reset to first page when changing page size
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getEventIcon = (event: AccessEvent) => {
        switch (event.type) {
            case 'session':
                return <LoginIcon />;
            case 'audit':
                if (event.event.includes('role')) return <SecurityIcon />;
                if (event.event.includes('password')) return <SecurityIcon />;
                return <UserIcon />;
            default:
                return <HistoryIcon />;
        }
    };

    const getEventColor = (event: AccessEvent): 'primary' | 'secondary' | 'warning' | 'error' => {
        switch (event.type) {
            case 'session':
                return 'primary';
            case 'audit':
                if (event.event.includes('deactivated') || event.event.includes('deleted')) {
                    return 'error';
                }
                if (event.event.includes('role') || event.event.includes('password')) {
                    return 'warning';
                }
                return 'secondary';
            default:
                return 'secondary';
        }
    };

    const getEventDescription = (event: AccessEvent) => {
        switch (event.type) {
            case 'session':
                return `User logged in from ${event.ip_address || 'unknown IP'}`;
            case 'audit':
                let description = `${event.event.replace('_', ' ')}`;
                if (event.changed_fields && event.changed_fields.length > 0) {
                    description += ` (${event.changed_fields.join(', ')})`;
                }
                return description;
            default:
                return event.event;
        }
    };

    const totalPages = historyData ? Math.ceil(historyData.pagination.total_events / pageSize) : 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Access History - {userName}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Filters */}
                <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Period</InputLabel>
                        <Select
                            value={days}
                            label="Time Period"
                            onChange={handleDaysChange}
                        >
                            <MenuItem value={7}>Last 7 days</MenuItem>
                            <MenuItem value={30}>Last 30 days</MenuItem>
                            <MenuItem value={90}>Last 90 days</MenuItem>
                            <MenuItem value={365}>Last year</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Page Size</InputLabel>
                        <Select
                            value={pageSize}
                            label="Page Size"
                            onChange={handlePageSizeChange}
                        >
                            <MenuItem value={25}>25 events</MenuItem>
                            <MenuItem value={50}>50 events</MenuItem>
                            <MenuItem value={100}>100 events</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAccessHistory}
                        disabled={loading}
                        size="small"
                    >
                        Refresh
                    </Button>
                </Box>

                {/* Summary Cards */}
                {historyData && (
                    <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography color="textSecondary" variant="body2">
                                    Total Sessions
                                </Typography>
                                <Typography variant="h6">
                                    {historyData.pagination.total_sessions}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography color="textSecondary" variant="body2">
                                    Audit Records
                                </Typography>
                                <Typography variant="h6">
                                    {historyData.pagination.total_audit_records}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography color="textSecondary" variant="body2">
                                    Time Period
                                </Typography>
                                <Typography variant="h6">
                                    {historyData.date_range.days} days
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* Content */}
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : historyData && historyData.events.length > 0 ? (
                    <>
                        <Timeline>
                            {historyData.events.map((event: AccessEvent, index: number) => (
                                <TimelineItem key={index}>
                                    <TimelineOppositeContent
                                        sx={{ m: 'auto 0', maxWidth: '200px' }}
                                        align="right"
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {formatDate(event.timestamp)}
                                    </TimelineOppositeContent>
                                    <TimelineSeparator>
                                        <TimelineDot color={getEventColor(event)}>
                                            {getEventIcon(event)}
                                        </TimelineDot>
                                        {index < historyData.events.length - 1 && <TimelineConnector />}
                                    </TimelineSeparator>
                                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                                        <Typography variant="h6" component="span">
                                            {getEventDescription(event)}
                                        </Typography>
                                        <Box mt={1}>
                                            <Chip
                                                label={event.event}
                                                size="small"
                                                color={getEventColor(event)}
                                                variant="outlined"
                                                sx={{ mr: 1 }}
                                            />
                                            {event.type === 'session' && event.is_active && (
                                                <Chip
                                                    label="Active Session"
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                    sx={{ mr: 1 }}
                                                />
                                            )}
                                        </Box>
                                        {(event.ip_address || event.user_agent) && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                {event.ip_address && (
                                                    <>IP: {event.ip_address}</>
                                                )}
                                                {event.ip_address && event.user_agent && ' • '}
                                                {event.user_agent && (
                                                    <>Browser: {event.user_agent.split(' ')[0]}</>
                                                )}
                                            </Typography>
                                        )}
                                        {event.session_id && (
                                            <Typography variant="body2" color="text.secondary">
                                                Session: {event.session_id}
                                            </Typography>
                                        )}
                                        {event.expires_at && (
                                            <Typography variant="body2" color="text.secondary">
                                                Expires: {formatDate(event.expires_at)}
                                            </Typography>
                                        )}
                                    </TimelineContent>
                                </TimelineItem>
                            ))}
                        </Timeline>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <Box display="flex" justifyContent="center" mt={3}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={handlePageChange}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </>
                ) : (
                    <Alert severity="info">
                        No access history found for the selected time period.
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}