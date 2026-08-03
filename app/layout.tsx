import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "MapIA | Priorización vial auditable",
    template: "%s | MapIA",
  },
  description:
    "Apoyo a la decisión para identificar, revisar y publicar intervenciones viales prioritarias en el Perú.",
  applicationName: "MapIA",
  openGraph: {
    title: "MapIA · Priorización vial auditable",
    description: "Condición, conectividad, riesgos y evidencia por tramo para tomar mejores decisiones viales.",
    images: [{ url: "/mapia-social-preview.png", width: 1732, height: 909, alt: "Ilustración cartográfica de una red vial priorizada" }],
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/mapia-social-preview.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MapIA", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}` }} />
      </body>
    </html>
  );
}
