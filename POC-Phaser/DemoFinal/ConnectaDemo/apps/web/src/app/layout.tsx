import { AppProvider } from "@/features/session/provider";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const jakarta = localFont({
  src: [
    { path: "../../public/assets/fonts/font-4.ttf", weight: "400" },
    { path: "../../public/assets/fonts/font-5.ttf", weight: "500" },
    { path: "../../public/assets/fonts/font-6.ttf", weight: "600" },
    { path: "../../public/assets/fonts/font-7.ttf", weight: "700" },
    { path: "../../public/assets/fonts/font-8.ttf", weight: "800" },
  ],
  variable: "--font-jakarta",
  display: "swap",
});
const thai = localFont({
  src: [
    { path: "../../public/assets/fonts/font-0.ttf", weight: "400" },
    { path: "../../public/assets/fonts/font-3.ttf", weight: "700" },
  ],
  variable: "--font-thai",
  display: "swap",
});
export const metadata: Metadata = {
  title: { default: "Connecta — Ideas meet people", template: "%s · Connecta" },
  description:
    "Walk into a world of student ideas. Discover projects, meet their makers, and create what comes next.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${thai.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
