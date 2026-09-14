import type { Metadata } from "next";
import { Fraunces, Archivo, Caveat } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "900"],
  style: ["normal", "italic"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: {
    default:
      "CasaKept — Home Concierge in Dallas–Fort Worth | Cleaning, Laundry, Groceries & Meals",
    template: "%s — CasaKept | DFW Home Concierge",
  },
  description:
    "CasaKept is your all-in-one home concierge in DFW: house cleaning, laundry with 48-hour turnaround, grocery delivery, home-cooked Mexican meals, and errands — one membership, one trusted local team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${archivo.variable} ${caveat.variable}`}
    >
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <ScrollReveal />
      </body>
    </html>
  );
}
