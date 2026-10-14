import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Search, Sun, Radio } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const links = [['Berita', '/news'], ['Pertandingan', '/matches'], ['Transfer', '/transfer'], ['Klub', '/clubs'], ['Terpopuler', '/trending']];

function navigationClass(isActive: boolean) {
  return `rounded-sm px-3.5 py-2 text-sm font-bold transition-colors ${isActive ? 'bg-white text-pitch' : 'text-slate-600 hover:bg-white/70 hover:text-pitch'}`;
}

export function PublicLayout() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const isCmsPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    if (window.location.hash) return;
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, left: 0, behavior });
  }, [pathname, search]);
  const closeMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
  };
  const toggleTheme = () => {
    const nextDark = !isDark;
    document.documentElement.classList.toggle('dark', nextDark);
    document.documentElement.style.colorScheme = nextDark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextDark ? '#101916' : '#f7f7f3');
    try { localStorage.setItem('2annews-theme', nextDark ? 'dark' : 'light'); } catch { /* The theme still works for this session when storage is unavailable. */ }
    setIsDark(nextDark);
  };

  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return <>
    <a href="#main-content" className="sr-only fixed left-4 top-4 z-50 rounded-xl bg-lime px-4 py-3 font-bold text-ink focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-white">Lewati ke konten</a>
    <header className={`site-header sticky top-0 z-30 ${isCmsPage ? 'cms-site-header' : ''}`}>
      {!isCmsPage && <div className="masthead-top"><div className="shell masthead-top-inner"><span>{dateLabel}</span><span className="masthead-edition"><Radio size={12}/> Meja redaksi 2anNews</span><Link to="/about">Tentang kami</Link></div></div>}
      <div className="shell masthead-main">
        <Link to="/" className="brand-lockup group" aria-label="2anNews, beranda">
          <img src="/logo.png" alt="" className="brand-mark" />
          <span className="brand-wordmark">2an<span>News</span></span>
        </Link>

        {!isCmsPage && <nav aria-label="Navigasi utama" className="primary-nav order-3 hidden items-center gap-1 md:order-none md:flex">
          {links.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => navigationClass(isActive)}>{label}</NavLink>)}
        </nav>}

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? <>
            <Link className="header-cms-link" to="/admin">CMS</Link>
            <button onClick={logout} className="rounded-lg px-2.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Keluar</button>
          </> : <Link className="button min-h-10 px-3.5 py-2 text-sm" to="/login">Masuk</Link>}
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'} aria-pressed={isDark} title={isDark ? 'Tema terang' : 'Tema gelap'} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-pitch dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950 dark:hover:text-emerald-300">
            {isDark ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}
          </button>
          {!isCmsPage && <Link to="/search" aria-label="Cari berita" className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-pitch"><Search size={19}/></Link>}
          {!isCmsPage && <details className="relative md:hidden">
            <summary aria-label="Buka menu" className="grid h-11 w-11 list-none place-items-center rounded-xl text-slate-700 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"><Menu size={21}/></summary>
            <nav aria-label="Navigasi seluler" className="mobile-menu absolute right-0 top-12 z-40 w-56 border border-slate-200 bg-white p-2">
              {user && <NavLink to="/admin" onClick={closeMenu} className={({ isActive }) => `mb-1 block rounded-xl px-3.5 py-3 text-sm font-bold ${isActive ? 'bg-emerald-50 text-pitch' : 'text-slate-700 hover:bg-slate-50 hover:text-pitch'}`}>CMS</NavLink>}
              {links.map(([label, to]) => <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => `mb-1 block rounded-xl px-3.5 py-3 text-sm font-bold last:mb-0 ${isActive ? 'bg-emerald-50 text-pitch' : 'text-slate-700 hover:bg-slate-50 hover:text-pitch'}`}>{label}</NavLink>)}
            </nav>
          </details>}
        </div>
      </div>
    </header>
    <main id="main-content" tabIndex={-1}><Outlet/></main>
    {!isCmsPage && <footer className="site-footer relative mx-auto mt-12 w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-xl bg-ink py-7 text-slate-300 sm:mt-16 sm:py-8">
      <div className="shell relative grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-end">
        <div><img src="/logo.png" alt="2anNews" className="h-16 w-16 rounded-xl bg-white object-contain p-1"/><p className="mt-2 max-w-md leading-6 text-slate-400">Rumah berita sepak bola: laporan, jadwal, dan data pertandingan.</p></div>
        <nav aria-label="Navigasi footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-300 md:justify-end"><Link className="hover:text-lime" to="/news">Berita</Link><Link className="hover:text-lime" to="/matches">Pertandingan</Link><Link className="hover:text-lime" to="/transfer">Transfer</Link><Link className="hover:text-lime" to="/clubs">Klub</Link><Link className="hover:text-lime" to="/about">Tentang</Link></nav>
      </div>
    </footer>}
  </>;
}
