'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MainNavigation from '@/components/navigation/MainNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={['HR', 'PC', 'RM']}>
      <MainNavigation>
        {children}
      </MainNavigation>
    </ProtectedRoute>
  );
}