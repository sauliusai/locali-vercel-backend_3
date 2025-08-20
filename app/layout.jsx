export const metadata = { title: 'Locali Backend' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
