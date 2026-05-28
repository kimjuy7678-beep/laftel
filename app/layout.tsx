// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAFTEL",
  description: "라프텔 애니메이션 OTT",
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-full flex flex-col transition-colors">
        {children}
      </body>
    </html>
  );
}
