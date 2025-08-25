export const metadata = { title: 'One‑Line‑A‑Day' }
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="One‑Line‑A‑Day" />
        <meta name="theme-color" content="#111827" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  )
}