import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LILA BLACK — Level Designer Telemetry Tool',
  description: 'Interactive spatial telemetry and level design visualization tool for LILA BLACK',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen overflow-hidden bg-background text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
