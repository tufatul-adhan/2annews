import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Clock3, Newspaper, Radio } from 'lucide-react';
import { useArticles, useCategories, useClubs, useMatches, useTransfers } from '../hooks/useContent';
import { ClubLogo } from '../components/ClubLogo';
import { ArticleCard } from '../components/ArticleCard';
import { MatchCard } from '../components/MatchCard';
import { ArticleImage } from '../components/ArticleImage';
import { LiveChat } from '../components/LiveChat';
import { TrendingNewsPopup } from '../components/TrendingNewsPopup';

const transferStatusLabels: Record<string, string> = {
  RUMOUR: 'Rumor', NEGOTIATION: 'Negosiasi', CONFIRMED: 'Dikonfirmasi',
  COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan',
};
const continentOrder = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];

export function HomePage() {
  const articles = useArticles('?limit=9');
  const matches = useMatches();
  const clubs = useClubs();
  const transfers = useTransfers();
  const categories = useCategories();
  const data = articles.data ?? [];
  const lead = data[0];
  const continentCategories = [...(categories.data ?? [])]
    .filter(category => continentOrder.includes(category.name))
    .sort((a, b) => continentOrder.indexOf(a.name) - continentOrder.indexOf(b.name));

  return <>
    <div className="newsroom-page">
      <section className="newsroom-front shell">
        <div className="frontline"><span className="frontline-label"><Radio size={13}/> Meja redaksi</span><span className="frontline-rule"/><span className="frontline-note">Laporan, hasil, dan cerita sepak bola</span><Link to="/trending" className="frontline-link">Paling dibaca <ArrowUpRight size={14}/></Link></div>
        <div className="front-grid">
          <article className="lead-story">
            <Link to={lead ? `/news/${lead.slug}` : '/news'} className={`lead-image ${lead ? '' : 'lead-image-empty'}`} aria-label={lead ? `Baca: ${lead.title}` : 'Jelajahi berita'}>
              {lead && <ArticleImage article={lead} className="absolute inset-0 h-full w-full object-cover"/>}
              {lead && <span className="lead-image-label"><Newspaper size={14}/> Sorotan redaksi</span>}
              {!lead && <span className="lead-empty-state"><span className="lead-empty-mark"><Newspaper size={22}/></span><span className="lead-placeholder">{articles.isLoading ? 'Memuat liputan terbaru…' : articles.isError ? 'Liputan sedang sulit dijangkau.' : 'Berita terbaru segera hadir.'}</span></span>}
            </Link>
            <div className="lead-copy">
              <p className="story-kicker">{lead?.category.name ?? '2anNews · Sepak bola'}</p>
              <h1>{lead ? <Link to={`/news/${lead.slug}`}>{lead.title}</Link> : 'Cerita sepak bola, ditulis dengan konteks.'}</h1>
              {lead && <p className="lead-excerpt">{lead.excerpt}</p>}
              <div className="story-byline"><span>{lead?.author?.name ?? 'Redaksi 2anNews'}</span>{lead?.publishedAt && <><i/> <time dateTime={lead.publishedAt}>{new Date(lead.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</time></>}<i/><span>{lead?.viewsCount ?? 0} tayangan</span></div>
              <Link className="read-link" to={lead ? `/news/${lead.slug}` : '/news'}>Baca laporan <ArrowRight size={16}/></Link>
            </div>
          </article>
          <aside className="front-briefing" aria-label="Berita pilihan">
            <div className="briefing-heading"><span>Dalam sorotan</span><Link to="/news">Semua berita <ArrowUpRight size={14}/></Link></div>
            {articles.isLoading ? <div className="briefing-loading">Mengumpulkan laporan terbaru…</div> : articles.isError ? <div className="briefing-loading">Berita belum bisa dimuat. <button onClick={() => articles.refetch()}>Coba lagi</button></div> : data.slice(1, 5).map((article, index) => <article className="briefing-item" key={article.id}>
              <span className="briefing-number">0{index + 1}</span><div><p className="story-kicker">{article.category.name}</p><h2><Link to={`/news/${article.slug}`}>{article.title}</Link></h2><p className="briefing-meta"><Clock3 size={13}/>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Terbaru'}</p></div>
            </article>)}
            {!articles.isLoading && !articles.isError && data.length <= 1 && <p className="briefing-loading">Belum ada berita lain untuk ditampilkan.</p>}
            <Link className="briefing-footer" to="/matches">Jadwal pertandingan <ArrowRight size={15}/></Link>
          </aside>
        </div>
      </section>

      {continentCategories.length ? <div className="shell"><nav aria-label="Jelajahi berita per benua" className="category-ribbon"><span>Jelajahi benua</span>{continentCategories.map(category => <Link key={category.id} to={`/category/${category.slug}`}>{category.name}</Link>)}</nav><p className="mt-2 text-xs text-slate-500">Antarktika: belum ada berita sepak bola terverifikasi dalam 7 hari terakhir.</p></div> : null}

      <section className="shell newsroom-section">
        <div className="editorial-section-heading"><div><p className="section-overline">Dari ruang redaksi</p><h2>Berita terbaru</h2></div><Link to="/news">Buka arsip berita <ArrowRight size={16}/></Link></div>
        {articles.isLoading ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Memuat berita" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div key={index} className="card overflow-hidden"><div className="h-48 animate-pulse bg-slate-200"/><div className="space-y-3 p-5"><div className="h-3 w-24 animate-pulse rounded bg-slate-100"/><div className="h-6 w-4/5 animate-pulse rounded bg-slate-100"/><div className="h-4 w-full animate-pulse rounded bg-slate-100"/></div></div>)}</div> : articles.isError ? <div role="alert" className="card flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="font-bold text-ink">Berita belum bisa dimuat.</p><p className="mt-1 text-sm text-slate-500">Periksa koneksi, lalu coba lagi.</p></div><button className="button" onClick={() => articles.refetch()}>Coba lagi</button></div> : data.length > 1 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.slice(1, 7).map((article, index) => <ArticleCard article={article} featured={index === 0} key={article.id}/>)}</div> : <div className="card p-8 text-center"><p className="font-bold text-ink">Belum ada berita untuk ditampilkan.</p><p className="mt-1 text-sm text-slate-500">Silakan kembali lagi nanti untuk membaca liputan terbaru.</p></div>}
      </section>

      <section className="scoreboard-band"><div className="shell newsroom-section"><div className="editorial-section-heading"><div><p className="section-overline">Jadwal & hasil</p><h2>Di lapangan</h2></div><Link to="/matches">Semua pertandingan <ArrowRight size={16}/></Link></div>{matches.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Memuat pertandingan" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div className="card h-48 animate-pulse bg-white" key={index}/>)}</div> : matches.isError ? <div role="alert" className="card flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm font-semibold text-slate-600">Jadwal pertandingan belum bisa dimuat.</p><button className="button" onClick={() => matches.refetch()}>Coba lagi</button></div> : (matches.data ?? []).length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(matches.data ?? []).slice(0, 8).map(match => <Link key={match.id} to={`/matches/${match.id}`}><MatchCard match={match}/></Link>)}</div> : <div className="card p-6 text-sm text-slate-500">Belum ada jadwal pertandingan.</div>}</div></section>

      <section className="shell grid gap-8 py-12 sm:py-16 lg:grid-cols-3">
        <div className="transfer-desk lg:col-span-2"><div className="editorial-section-heading"><div><p className="section-overline">Pasar pemain</p><h2>Catatan transfer</h2></div><Link to="/transfer">Semua kabar <ArrowRight size={16}/></Link></div><div className="transfer-list">{(transfers.data ?? []).slice(0, 5).map((transfer: unknown, index) => { const item = transfer as { player: { name: string }; fromClub?: { name: string; slug?: string; shortName: string } | null; toClub?: { name: string; slug?: string; shortName: string } | null; status: string }; return <div className="transfer-row" key={index}><span className="transfer-player">{item.player.name}</span><span className="transfer-route">{item.fromClub ? <><ClubLogo name={item.fromClub.name} slug={item.fromClub.slug} size="sm"/>{item.fromClub.shortName}</> : 'Bebas'} <ArrowRight size={14}/> {item.toClub ? <><ClubLogo name={item.toClub.name} slug={item.toClub.slug} size="sm"/>{item.toClub.shortName}</> : 'Menunggu'}</span><span className="transfer-status">{transferStatusLabels[item.status] ?? item.status}</span></div>; })}{!transfers.isLoading && !transfers.data?.length && <p className="p-5 text-sm text-slate-500">Belum ada informasi transfer.</p>}</div></div>
        <div className="club-desk"><div className="editorial-section-heading"><div><p className="section-overline">Peta kompetisi</p><h2>Klub</h2></div><Link to="/clubs" aria-label="Semua klub"><ArrowRight size={16}/></Link></div><div className="club-grid">{(clubs.data ?? []).slice(0, 6).map(club => <Link className="club-entry" key={club.id} to={`/club/${club.slug}`}><ClubLogo name={club.name} slug={club.slug} size="sm"/><span>{club.name}<small>{club.country}</small></span></Link>)}</div>{!clubs.isLoading && !clubs.data?.length && <p className="mt-3 text-sm text-slate-500">Klub belum tersedia.</p>}</div>
      </section>
    </div>
    <LiveChat /><TrendingNewsPopup />
  </>;
}
