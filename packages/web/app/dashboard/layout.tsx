import { AuthGuard } from '../../components/layout/AuthGuard';
import { AppShell } from '../../components/layout/AppShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
