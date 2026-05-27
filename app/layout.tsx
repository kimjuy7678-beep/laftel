import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import ThemeProvider from "@/components/ThemeProvider";
import QuickMenu from "@/components/QuickMenu";

export const metadata: Metadata = {
  title: "LAFTEL",
  description: "라프텔 애니메이션 OTT",
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-full flex flex-col transition-colors">
        {/* <ThemeProvider> */}
        <Header />
        <main>{children}</main>
        <Footer />
        {/* <QuickMenu /> */}
        {/* </ThemeProvider> */}
      </body>
    </html>
  );
}