import type { Metadata } from "next";
import { Montserrat, Roboto_Mono, Oswald, Anton } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: ["400"], // Anton only has 400
  display: "swap",
});

export const metadata: Metadata = {
  title: "Exotype",
  description: "Transform your body, elevate your mind. Join Exotype for personalized training programs and a supportive fitness community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${robotoMono.variable} ${oswald.variable} ${anton.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}