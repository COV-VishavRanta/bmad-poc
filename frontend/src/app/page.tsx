'use client'

import { CheckCircle, Error, Refresh } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface HealthStatus {
  status: string
  timestamp: string
  service: string
}

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/health`
        )
        if (!response.ok) {
          const errorMsg = `HTTP error! status: ${response.status}`
          throw new globalThis.Error(errorMsg)
        }
        const data = await response.json() as HealthStatus
        setHealthStatus(data)
      } catch (err: unknown) {
        const errorMessage = err instanceof globalThis.Error ? err.message : 'Failed to connect to backend'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    checkBackendHealth()
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    setHealthStatus(null)
    // Re-check health after a short delay to see loading state
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4} alignItems="center">
        <Box sx={{ textAlign: 'center' }}>
          <Image
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
            style={{ filter: 'invert(1)' }}
          />
          <Typography variant="h3" component="h1" sx={{ mt: 2, mb: 1 }}>
            ClientOps Platform
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Team Management & Project Assignment System
          </Typography>
        </Box>

        <Card sx={{ width: '100%', maxWidth: 600 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Backend Health Check
            </Typography>

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography>Checking backend connection...</Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" icon={<Error />}>
                Backend connection failed: {error}
              </Alert>
            )}

            {healthStatus && (
              <Alert severity="success" icon={<CheckCircle />}>
                <Typography variant="body2">
                  <strong>Backend is {healthStatus.status}</strong>
                </Typography>
                <Typography variant="body2">
                  Service: {healthStatus.service}
                </Typography>
                <Typography variant="body2">
                  Timestamp: {new Date(healthStatus.timestamp).toLocaleString()}
                </Typography>
              </Alert>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh Health Check
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Development Environment Status
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              ✅ ClientOps monorepo with Docker setup completed
            </Typography>
            <Typography variant="body2">
              ✅ Frontend (Next.js) ↔ Backend (FastAPI) ↔ MySQL integration
              working
            </Typography>
            <Typography variant="body2">
              ✅ Material-UI theme and components configured
            </Typography>
            <Typography variant="body2">
              ✅ ESLint, Prettier, and code quality tools setup
            </Typography>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="primary">
            Primary Button
          </Button>
          <Button variant="contained" color="secondary">
            Secondary Button
          </Button>
          <Button variant="contained" sx={{ 
            background: 'linear-gradient(45deg, #3b82f6 30%, #ec4899 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #2563eb 30%, #db2777 90%)',
            }
          }}>
            Gradient Button
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}
