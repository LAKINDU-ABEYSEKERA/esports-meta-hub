// File: frontend/app/layout.tsx
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

// Initialize the futuristic, round font
const outfit = Outfit({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Esports Meta & Loadout Hub',
  description: 'Community-driven weapon loadouts and tactical analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      {/* 
        Applying outfit.className forces this font globally. 
        'antialiased' ensures smooth, crisp rendering on modern screens. 
      */}
      <body className={`${outfit.className} antialiased bg-slate-950 text-slate-100 min-h-screen`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}