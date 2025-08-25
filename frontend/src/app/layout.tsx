import type { Metadata } from 'next'
import { AuthProvider } from '../hooks/useAuth'
import './globals.css'

export const metadata: Metadata = {
  title: 'B-MAD Client Ops',
  description: 'Resource and project management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <div className="min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}