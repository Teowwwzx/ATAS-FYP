// frontend/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast' // Import the Toaster

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ATAS - Event Booking',
  description: 'Book industry experts for your university courses.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {/* This provider component will render all our toasts */}
        <Toaster
          position="top-right"
          gutter={12}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#374151',
            },
            success: {
              duration: 2000,
              iconTheme: {
                primary: '#7c3aed', // Our new primary color
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444', // Red for errors
                secondary: '#fff',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}