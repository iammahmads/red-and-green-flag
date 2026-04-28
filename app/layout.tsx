import type {Metadata} from 'next';
import { Bangers, Comic_Neue } from 'next/font/google';
import './globals.css';

const bangers = Bangers({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bangers',
});

const comic = Comic_Neue({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-comic',
});

export const metadata: Metadata = {
  title: 'Red Green Flag',
  description: 'AI Person Analyzer - Meme Style',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${bangers.variable} ${comic.variable}`}>
      <body className="font-comic bg-gradient-to-br from-red-500 via-yellow-400 to-green-500 min-h-screen text-black suppressHydrationWarning">
        {children}
      </body>
    </html>
  );
}
