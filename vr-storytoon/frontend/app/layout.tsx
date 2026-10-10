import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VR StoryToon AI",
  description: "Turn your stories into animated videos with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}