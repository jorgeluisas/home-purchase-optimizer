export const metadata = {
  title: 'Home Purchase Optimizer',
  description: 'AI-powered home purchase strategy optimization for SF homebuyers',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>{children}</body>
    </html>
  )
}
