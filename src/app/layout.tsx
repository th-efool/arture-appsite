import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arture | AI Spatial OS for Industrial Workflows",
  description: "Arture turns industrial knowledge into AI-powered spatial workflows for training, guidance, remote assistance, and digital-twin operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
