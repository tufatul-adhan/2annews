import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTrending } from '../hooks/useContent';
import { api } from '../api/client';
import { ArticleCard } from '../components/ArticleCard';
import { LiveChat } from '../components/LiveChat';
import type { ApiResponse, Article } from '../types';

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const search = params.get('search') ?? '';
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const trending = location.pathname === '/trending';
  const category = location.pathname.startsWith('/category/') ? location.pathname.split('/')[2] : '';
  const query = new URLSearchParams({ limit: '24', page: String(page) });
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  const articles = useQuery({
    queryKey: ['articles', 'archive', search, category, page],
    queryFn: () => api.get<ApiResponse<Article[]>>(`/articles?${query.toString()}`).then(response => response.data),
    enabled: !trending,
  });
  const trendingArticles = useTrending();
  const items = trending ? trendingArticles.data ?? [] : articles.data?.data ?? [];
  const isLoading = trending ? trendingArticles.isLoading : articles.isLoading;
  const isError = trending ? trendingArticles.isError : articles.isError;
  const refetch = () => trending ? trendingArticles.refetch() : articles.refetch();
  const pagination = trending ? undefined : articles.data?.pagination;
  const categoryName = items[0]?.category.name;

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(nextPage));
    setParams(next);
  };

  return <><section className="shell newsroom-page news-archive py-8 sm:py-12"><div className="archive-heading"><div><p className="section-overline">{trending ? 'Pilihan pembaca' : category ? 'Jelajahi kategori' : search ? 'Hasil pencarian' : 'Arsip redaksi'}</p><h1>{trending ? 'Paling banyak dibicarakan' : category ? categoryName ?? 'Berita pilihan' : search ? `Cari: ${search}` : 'Berita sepak bola'}</h1><p>{trending ? 'Cerita yang paling banyak menarik perhatian pembaca 2anNews.' : category ? `Liputan terbaru dalam kategori ${categoryName ?? 'ini'}.` : 'Laporan terbaru dari lapangan dan perkembangan sepak bola.'}</p></div>{!trending && <form className="archive-search" onSubmit={event => { event.preventDefault(); const value = new FormData(event.currentTarget).get('search')?.toString() ?? ''; setParams(value ? { search: value } : {}); }}><label className="sr-only" htmlFor="search">Cari berita</label><Search className="shrink-0 text-pitch" size={18}/><input key={search} id="search" name="search" defaultValue={search} placeholder="Cari berita, klub, atau tag"/><button aria-label="Cari berita"><Search size={17}/><span>Cari</span></button></form>}</div>
    <div className="mt-8 flex min-h-6 items-center justify-between"><p aria-live="polite" className="text-sm font-semibold text-slate-500">{isLoading ? 'Memuat liputan…' : `${pagination?.total ?? items.length} artikel`}</p>{trending && <span className="chip">Terpopuler</span>}</div>
    {isLoading ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Memuat artikel" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div className="card overflow-hidden" key={index}><div className="aspect-[16/9] animate-pulse bg-emerald-50"/><div className="space-y-3 p-5"><div className="h-3 w-24 animate-pulse rounded bg-slate-100"/><div className="h-6 w-4/5 animate-pulse rounded bg-slate-100"/><div className="h-4 w-full animate-pulse rounded bg-slate-100"/></div></div>)}</div> : isError ? <div role="alert" className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><p className="font-semibold text-slate-600">Liputan belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={refetch}>Coba lagi</button></div> : items.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(article => <ArticleCard key={article.id} article={article}/>)}</div> : <div className="card mt-5 flex flex-col items-center p-8 text-center sm:p-10"><SlidersHorizontal className="text-pitch" aria-hidden="true"/><p className="mt-3 font-bold text-ink">{search ? `Tidak ada artikel untuk “${search}”.` : trending ? 'Belum ada artikel populer.' : 'Belum ada artikel yang sesuai.'}</p><p className="mt-1 text-sm text-slate-500">{search ? 'Coba gunakan kata kunci lain.' : 'Artikel baru akan muncul di sini.'}</p>{search && <Link className="mt-4 text-sm font-bold text-pitch hover:underline" to="/news">Hapus pencarian</Link>}</div>}
    {!isLoading && !isError && pagination && pagination.totalPages > 1 && <nav aria-label="Halaman berita" className="archive-pagination"><button type="button" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>Sebelumnya</button><span>Halaman {pagination.page} dari {pagination.totalPages}</span><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>Berikutnya</button></nav>}
  </section><LiveChat /></>;
}
