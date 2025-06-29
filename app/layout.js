// ===== app/layout.js =====
import './globals.css'

export const metadata = {
  title: 'Login',
  description: 'Login to access the dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}