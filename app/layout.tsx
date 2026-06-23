import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MalSight",
  description: "Daily security intelligence dashboard for defenders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
