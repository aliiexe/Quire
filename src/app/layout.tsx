import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quire",
  description: "A modern, local-first workspace for LaTeX.",
  icons: {
    icon: [
      { url: '/brand/quire-mark-dark.png', media: '(prefers-color-scheme: light)' },
      { url: '/brand/quire-mark-light.png', media: '(prefers-color-scheme: dark)' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('quire:theme');
                if (theme === 'dark' || theme === 'light') {
                  document.documentElement.setAttribute('data-theme', theme);
                } else {
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                }
              } catch (e) {}
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
