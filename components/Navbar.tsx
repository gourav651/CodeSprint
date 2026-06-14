'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Code, Moon, Sun, Trophy, Activity, Medal, Flame, Swords, Menu } from 'lucide-react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';

export function Navbar() {
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Don't render until mounted to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: '/problems', label: 'Problems', icon: Code, match: '/problems' },
    { href: '/daily', label: 'Daily', icon: Flame, match: '/daily', iconClass: 'text-orange-500 dark:text-orange-400' },
    { href: '/contests', label: 'Contests', icon: Swords, match: '/contests' },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, match: '/leaderboard' },
  ];

  const userLinks = [
    { href: '/activity', label: 'Activity', icon: Activity, match: '/activity' },
    { href: '/achievements', label: 'Achievements', icon: Medal, match: '/achievements' },
  ];

  const renderNavLinks = (links: any[]) => (
    links.map((link) => {
      const isActive = (pathname.startsWith(link.match) && link.match !== '/') || pathname === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          className={`px-3 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
            isActive
              ? 'bg-blue-100/50 text-blue-700 dark:bg-white/10 dark:text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
          }`}
        >
          <link.icon className={`h-4 w-4 ${link.iconClass || ''} ${isActive && !link.iconClass ? 'text-blue-600 dark:text-white' : ''}`} />
          <span className="hidden xl:inline">{link.label}</span>
        </Link>
      );
    })
  );

  const renderMobileLinks = (links: any[]) => (
    links.map((link) => {
      const isActive = (pathname.startsWith(link.match) && link.match !== '/') || pathname === link.href;
      return (
        <SheetClose asChild key={link.href}>
          <Link
            href={link.href}
            className={`px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 flex items-center gap-3 ${
              isActive
                ? 'bg-blue-100/50 text-blue-700 dark:bg-white/10 dark:text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <link.icon className={`h-5 w-5 ${link.iconClass || ''} ${isActive && !link.iconClass ? 'text-blue-600 dark:text-white' : ''}`} />
            {link.label}
          </Link>
        </SheetClose>
      );
    })
  );

  const skeletonNav = (
    <nav className="sticky top-0 z-50 border-b border-neutral-300/50 dark:border-neutral-200/10 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#0A0A0A]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2 shrink-0 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
              <Image src="/logo.png" alt="CodeSprint Logo" fill className="object-cover" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              CodeSprint
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );

  if (!mounted) return skeletonNav;

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-300/50 dark:border-neutral-200/10 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#0A0A0A]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Logo & Primary Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 shrink-0 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
              <Image src="/logo.png" alt="CodeSprint Logo" fill className="object-cover group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              CodeSprint
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1.5">
            {renderNavLinks(navLinks)}
          </div>
        </div>

        {/* Right: Secondary Nav & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 border-r border-gray-200 dark:border-gray-800 pr-3">
            {renderNavLinks(userLinks)}
          </div>

          {/* <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="p-2 flex-shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-300"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button> */}

          {isSignedIn ? (
            <div className="hidden lg:flex items-center gap-3 pl-1">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 font-semibold">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <UserButton appearance={{ elements: { avatarBox: "h-8 w-8 ring-2 ring-white dark:ring-gray-900 rounded-full" } }} />
            </div>
          ) : (
            <div className="hidden lg:flex items-center">
              <Link href="/sign-in">
                <Button size="sm" className="rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-sm font-semibold px-5">
                  Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* User profile on smaller screens without text */}
          {isSignedIn && (
            <div className="lg:hidden flex items-center">
              <UserButton appearance={{ elements: { avatarBox: "h-8 w-8 ring-2 ring-white dark:ring-gray-900 rounded-full" } }} />
            </div>
          )}

          {/* Mobile Hamburger Menu */}
          <div className="lg:hidden flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-gray-800 flex flex-col p-0">
                <SheetHeader className="p-6 border-b border-gray-100 dark:border-gray-800 text-left shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="relative h-6 w-6 overflow-hidden rounded-md">
                      <Image src="/logo.png" alt="Logo" fill className="object-cover" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                      CodeSprint
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">Menu</p>
                    {renderMobileLinks(navLinks)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">Your Activity</p>
                    {renderMobileLinks(userLinks)}
                    {isSignedIn && (
                      <SheetClose asChild>
                        <Link
                          href="/profile"
                          className={`px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 flex items-center gap-3 ${
                            pathname === '/profile'
                              ? 'bg-blue-100/50 text-blue-700 dark:bg-white/10 dark:text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                          }`}
                        >
                          <User className="h-5 w-5" />
                          Profile
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                  {!isSignedIn && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                      <SheetClose asChild>
                        <Link href="/sign-in" className="block">
                          <Button className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-black dark:hover:bg-gray-200 py-6 text-base font-semibold shadow-sm">
                            Sign In
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}