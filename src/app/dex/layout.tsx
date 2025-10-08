'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DexLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <div className="bg-black/20 backdrop-blur-sm border-b border-cyan-500/30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center space-x-2">
          <Link
            href="/dex"
            className={`px-4 py-2 rounded ${pathname === '/dex' ? 'bg-cyan-500 text-black' : 'text-cyan-300 hover:bg-white/10'}`}
          >
            DEX
          </Link>
          <Link
            href="/dex/tokens"
            className={`px-4 py-2 rounded ${pathname === '/dex/tokens' ? 'bg-cyan-500 text-black' : 'text-cyan-300 hover:bg-white/10'}`}
          >
            Your Tokens
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}



