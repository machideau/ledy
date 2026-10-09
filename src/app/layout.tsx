import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "LEED Togo · Investissez & Doublez votre argent au Togo",
  description: "Plateforme d'investissement communautaire LEED au Togo. Doublez votre mise en 1 mois. Plans de 2 000 à 30 000 FCFA. Remboursement 50% immédiat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
