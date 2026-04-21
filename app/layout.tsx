import type { Metadata } from 'next'
import { Inter, Tajawal } from 'next/font/google'
import './globals.css'
import ClientShell from './shell'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: 'ORCA ERP — الوجهة الأولى لحيتان الموبايلات',
  description: 'نظام إدارة المبيعات والمخزون الأقوى لحيتان الموبايلات.',
  keywords: 'ORCA, موبايلات, ERP, جملة الموبايلات, مصر, الاستيراد والتوزيع',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${tajawal.variable}`}
    >
      <body style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100dvh',
        background: '#0B1120',
        color: '#F3F4F6'
      }}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
