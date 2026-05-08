import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MassFlow - Masajes a Domicilio',
  description: 'Sistema de gestión de masajes a domicilio',
  manifest: '/manifest.json',
  themeColor: '#0d9488',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MassFlow',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
