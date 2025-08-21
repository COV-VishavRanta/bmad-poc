import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ErrorBoundary from '../components/ErrorBoundary'
import { ToastProvider } from '../components/ui/ToastProvider'
import { AuthProvider } from '../lib/auth'
import { ThemeProvider } from '../theme/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ClientOps - Team Management Platform',
  description: 'Streamline your team assignments and project management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
