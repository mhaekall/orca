import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/ui/overlays/InstallPrompt";
import { Navigation } from "@/ui/layout/Navigation";
import { Toaster } from "@/ui/overlays/Toaster";
import { CapacitorRouter } from "@/ui/layout/CapacitorRouter";
import "./globals.css";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

export const metadata: Metadata = {
  title: "Orca",
  description: "Platform streaming anime premium minimalis — cepat, elegan, gratis.",
  icons: {
    // Capacitor tidak bisa serve /api/icon karena API routes di-hide saat build
    icon: isCapacitorBuild ? "/icons/icon-32.png" : "/api/icon?size=32&dark=true",
    apple: isCapacitorBuild ? "/icons/icon-192.png" : "/api/icon?size=192&dark=true",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orca",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full bg-black text-white flex flex-col">
        <div className="flex-1 relative">
          <Navigation>
            <CapacitorRouter>{children}</CapacitorRouter>
          </Navigation>
        </div>
        <Toaster />
        <InstallPrompt />
      </body>
    </html>
  );
}

