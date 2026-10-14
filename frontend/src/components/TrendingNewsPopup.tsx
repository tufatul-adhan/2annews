import { useEffect, useState } from 'react';
import { ArrowUpRight, Flame, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrending } from '../hooks/useContent';
import { ArticleImage } from './ArticleImage';

const dismissalKey = '2annews-trending-popup-dismissed-at';
const dismissalPeriod = 24 * 60 * 60 * 1000;

export function TrendingNewsPopup() {
  const trending = useTrending();
  const article = trending.data?.[0];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!article) return;
    try {
      const dismissedAt = Number(localStorage.getItem(dismissalKey));
      if (dismissedAt && Date.now() - dismissedAt < dismissalPeriod) return;
    } catch {
      // Keep the popup available for this visit when browser storage is blocked.
    }
    const timeout = window.setTimeout(() => setVisible(true), 5000);
    return () => window.clearTimeout(timeout);
  }, [article?.id]);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(dismissalKey, String(Date.now())); } catch { /* Dismiss for this visit if storage is blocked. */ }
  };

  if (!article || !visible) return null;

  return <aside aria-label="Rekomendasi berita populer" aria-live="polite" className="trending-news-popup fixed bottom-20 left-4 z-30 w-[min(27rem,calc(100vw-2rem))] sm:bottom-6 sm:left-6">
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-3 shadow-2xl shadow-slate-950/20 dark:border-emerald-900 dark:bg-slate-900 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-amber-800 dark:bg-amber-950 dark:text-amber-300"><Flame size={13} fill="currentColor"/>Rekomendasi terpopuler</span>
        <button type="button" onClick={dismiss} aria-label="Tutup rekomendasi berita" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><X size={17}/></button>
      </div>
      <Link to={`/news/${article.slug}`} onClick={dismiss} className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pitch sm:gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-950 sm:h-24 sm:w-24">
          <ArticleImage article={article} className="h-full w-full object-cover"/>
          <span className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-lg bg-white/95 text-[11px] font-black text-pitch shadow">1</span>
        </div>
        <div className="min-w-0 flex-1 py-1">
          <p className="line-clamp-2 text-sm font-extrabold leading-5 text-ink group-hover:text-pitch dark:text-white sm:text-base">{article.title}</p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-slate-500 dark:text-slate-400">{article.excerpt}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-pitch dark:text-lime">Baca berita <ArrowUpRight size={14}/></span>
        </div>
      </Link>
    </div>
  </aside>;
}
