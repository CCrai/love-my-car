import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Love My Car',
  description: 'Sistema de gestión de negocios automotrices',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
