import type { Metadata } from 'next';
import './globals.css'
export const metadata: Metadata = {
  title: 'Competitive Math Quiz',
  description: 'Real-time competitive math quiz game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}