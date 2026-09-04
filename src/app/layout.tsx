import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quire",
  description: "A modern, local-first workspace for LaTeX.",
  icons: {
    icon: { url: "/icon.png", type: "image/png", sizes: "631x631" },
    shortcut: "/favicon.ico",
    apple: "/brand/quire-mark-light.png",
  },
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
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                const hasSeenIntro = sessionStorage.getItem('quire:intro-seen') === 'true';
                document.documentElement.dataset.quireIntro = reduceMotion || hasSeenIntro ? 'done' : 'playing';
              } catch (e) {}
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
