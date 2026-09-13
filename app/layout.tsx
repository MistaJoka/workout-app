import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'

export const metadata: Metadata = {
  title: 'Workout App',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  )
}
