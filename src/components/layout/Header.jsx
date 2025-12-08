
import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, LayoutDashboard, Wrench, ChevronDown, Download, TerminalSquare, ShieldCheck, ShoppingCart as ShoppingCartIcon, Home, Store, MessageSquare, Rss, Briefcase, Calendar, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCart } from '@/hooks/useCart';
import ShoppingCart from '@/components/ShoppingCart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const navLinks = [
  { name: 'Start', path: '/', icon: Home },
  { name: 'Cennik', path: '/cennik', icon: Wrench },
  { name: 'Sklep', path: '/sklep', icon: Store },
  { name: 'Opinie', path: '/opinie', icon: MessageSquare },
  { name: 'Blog', path: '/blog', icon: Rss },
  { name: 'Rezerwacja', path: '/rezerwacja', icon: Calendar },
  { name: 'Śledzenie', path: '/sledzenie', icon: Search },
  { name: 'Kontakt', path: '/kontakt', icon: MessageSquare },
  { 
    name: 'Lab', 
    path: '/lab',
    icon: TerminalSquare,
    subLinks: [
      { name: 'Projekty', path: '/projekty', icon: Briefcase },
      { name: 'Downloads', path: '/lab/downloads', icon: Download },
  // { name: 'Skrypty', path: '/lab/skrypty', icon: TerminalSquare },
    ]
  },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user, signOut, profile } = useAuth();
  const { cartItems } = useCart();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleBodyScroll = () => {
      if (isOpen || isCartOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isOpen) setIsOpen(false);
        if (isCartOpen) setIsCartOpen(false);
      }
    };
    
    handleBodyScroll();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isCartOpen]);

  const activeLinkStyle = {
    color: 'hsl(var(--primary))',
    textShadow: '0 0 8px hsl(var(--primary))',
  };

  const mobileMenuVariants = {
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.1, ease: "easeOut" }
      },
    },
    open: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.15, ease: "easeIn", delay: 0.05 }
      },
    },
  };

  const mobileLinkContainerVariants = {
    closed: {
      transition: { staggerChildren: 0.02, staggerDirection: -1 }
    },
    open: {
      transition: { staggerChildren: 0.03, delayChildren: 0.05 }
    }
  };

  const mobileLinkVariants = {
    closed: { opacity: 0, y: -10 },
    open: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  };
  
  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Użytkownik';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const MobileNavLink = ({ link, onLinkClick }) => (
    <motion.div variants={mobileLinkVariants} className="w-full">
      {link.subLinks ? (
        <Accordion type="single" collapsible className="w-full" key={link.name}>
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="font-mono text-xl uppercase transition-colors text-foreground hover:text-primary hover:drop-shadow-[0_0_8px_hsl(var(--primary))] py-3 !justify-center [&>span]:!flex-none [&>span]:flex [&>span]:items-center [&>span]:justify-center">
              <link.icon className="mr-3 h-6 w-6" /> {link.name}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 pb-2 max-h-[50vh] overflow-y-auto">
              {/* Przeglądaj as first entry */}
              <NavLink
                to={link.path}
                onClick={onLinkClick}
                style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                className="font-mono text-lg uppercase transition-colors text-muted-foreground hover:text-primary hover:drop-shadow-[0_0_8px_hsl(var(--primary))] py-2 flex items-center justify-center w-full"
              >
                <link.icon className="mr-2 h-5 w-5" />
                Przeglądaj
              </NavLink>
              {link.subLinks.map(subLink => (
                <NavLink
                  key={subLink.name}
                  to={subLink.path}
                  onClick={onLinkClick}
                  style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                  className="font-mono text-lg uppercase transition-colors text-muted-foreground hover:text-primary hover:drop-shadow-[0_0_8px_hsl(var(--primary))] py-2 flex items-center justify-center w-full"
                >
                  <subLink.icon className="mr-2 h-5 w-5" />
                  {subLink.name}
                </NavLink>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <NavLink
          to={link.path}
          onClick={onLinkClick}
          style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
          className="font-mono text-xl uppercase transition-colors text-foreground hover:text-primary hover:drop-shadow-[0_0_8px_hsl(var(--primary))] py-3 w-full flex items-center justify-center"
        >
          <link.icon className="mr-3 h-6 w-6" /> {link.name}
        </NavLink>
      )}
    </motion.div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/75 backdrop-blur-md border-b border-primary/10 supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center group h-full">
              <img src="/logo.png" className="h-full w-auto origin-left scale-[1.03] md:scale-[1.43] logo-heartbeat" alt="ByteClinic" />
            </Link>

            <nav className="hidden md:flex items-center gap-1 font-mono text-sm uppercase">
              {navLinks.map((link) => (
                link.subLinks ? (
                  <DropdownMenu key={link.name}>
                    <DropdownMenuTrigger asChild>
                      <NavLink 
                        to={link.path} 
                        className="flex items-center gap-1 rounded-md px-3 py-2 transition-colors hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                        onClick={(e) => {
                           if (window.innerWidth > 768) {
                             e.preventDefault();
                           }
                        }}
                      >
                        {link.name}
                        <ChevronDown className="h-4 w-4" />
                      </NavLink>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link to={link.path}>
                          <link.icon className="mr-2 h-4 w-4" />
                          Przeglądaj
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {link.subLinks.map(subLink => (
                        <DropdownMenuItem key={subLink.name} asChild>
                          <Link to={subLink.path}>
                            <subLink.icon className="mr-2 h-4 w-4" />
                            {subLink.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                    className="rounded-md px-3 py-2 transition-colors hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {link.name}
                  </NavLink>
                )
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <Button onClick={() => setIsCartOpen(true)} variant="ghost" size="icon" className="relative text-primary hover:bg-primary/10">
                <ShoppingCartIcon />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </Button>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center justify-center gap-2 px-2">
                       <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                         {getInitials(getDisplayName())}
                       </div>
                       <span className="hidden sm:inline font-mono text-sm normal-case">{getDisplayName()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Witaj, {getDisplayName()}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/panel"><LayoutDashboard className="mr-2 h-4 w-4" /> Mój panel</Link>
                    </DropdownMenuItem>
                    {profile?.role === 'admin' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/moderacja"><ShieldCheck className="mr-2 h-4 w-4" /> Moderacja</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/uzytkownicy"><Users className="mr-2 h-4 w-4" /> Użytkownicy</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" /> Wyloguj
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild className="hidden md:inline-flex" variant="outline" size="sm">
                  <Link to="/auth">Zaloguj</Link>
                </Button>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden z-50 text-primary"
                aria-label="Toggle menu"
                aria-expanded={isOpen}
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={isOpen ? 'x' : 'menu'}
                    initial={{ rotate: 45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -45, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
             <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={mobileMenuVariants}
              className="md:hidden bg-background/90 backdrop-blur-sm absolute w-full"
              style={{ maxHeight: 'calc(100vh - 5rem)', overflowY: 'auto' }}
            >
              <motion.div
                variants={mobileLinkContainerVariants}
                className="container mx-auto px-4 py-8"
              >
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <MobileNavLink key={link.name} link={link} onLinkClick={() => setIsOpen(false)} />
                  ))}
                  <motion.div variants={mobileLinkVariants} className="mt-6 flex flex-col gap-4 w-full max-w-xs mx-auto">
                    {user ? (
                      <>
                        <Button asChild size="lg" className="w-full" onClick={() => setIsOpen(false)}>
                          <Link to="/panel">Mój Panel</Link>
                        </Button>
                        <Button variant="secondary" size="lg" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>Wyloguj</Button>
                      </>
                    ) : (
                      <Button asChild size="lg" className="w-full" onClick={() => setIsOpen(false)}>
                        <Link to="/auth">Zaloguj</Link>
                      </Button>
                    )}
                  </motion.div>
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <ShoppingCart isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
    </>
  );
};

export default Header;
  