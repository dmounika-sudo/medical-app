export const metadata = {
  title: 'Medication Safety Assistant',
  description: 'Manage medications safely',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>{children}</body>
    </html>
  );
}
