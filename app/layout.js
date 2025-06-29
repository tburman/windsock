// ===== app/layout.js =====
import './globals.css'

export const metadata = {
  title: 'Windsock',
  description: 'Analyze sentiment across multiple URLs to see which way the wind is blowing.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}