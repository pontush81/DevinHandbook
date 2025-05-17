export default function CorsFixLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <head>
        <title>CORS Fix | Handbok</title>
        <meta name="description" content="Löser CORS-problem på Handbok sidan" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
} 