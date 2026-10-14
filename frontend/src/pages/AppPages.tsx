// This page composes dynamic API resources whose shapes vary by CMS module.
// Individual network payloads are validated by the backend before rendering.
// @ts-nocheck
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeftRight, ArrowUpRight, BarChart3, BookOpen, Building2, CalendarDays, ChevronRight, ClipboardList, FileText, Image, LayoutDashboard, LogIn, MessageSquareText, Newspaper, Plus, Settings2, ShieldAlert, Trash2, Trophy, Users } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useArticle, useArticles, useCategories, useClubs, useMatches, useTransfers } from '../hooks/useContent';
import { ArticleCard } from '../components/ArticleCard';
import { MatchCard } from '../components/MatchCard';
import { ClubLogo } from '../components/ClubLogo';
import { CmsNotifications } from '../components/CmsNotifications';
import { recentMatchResults } from '../data/recentMatches';
import type { ApiResponse, Article } from '../types';

const read = <T,>(url: string) => api.get<ApiResponse<T>>(url).then(response => response.data.data);
const titleFor: Record<string, string> = { clubs: 'Klub sepak bola', players: 'Pemain', leagues: 'Liga', transfers: 'Pusat transfer' };
const endpointFor: Record<string, string> = { clubs: '/clubs', players: '/players', leagues: '/leagues', transfers: '/transfers' };
const labels: Record<string, string> = { ACTIVE: 'Aktif', INACTIVE: 'Tidak aktif', BANNED: 'Diblokir', DRAFT: 'Draf', SUBMITTED: 'Dikirim', UNDER_REVIEW: 'Sedang ditinjau', REVISION: 'Perlu revisi', APPROVED: 'Disetujui', SCHEDULED: 'Terjadwal', PUBLISHED: 'Dipublikasikan', REJECTED: 'Ditolak', ARCHIVED: 'Diarsipkan', RUMOUR: 'Rumor', NEGOTIATION: 'Negosiasi', CONFIRMED: 'Dikonfirmasi', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan', GOALKEEPER: 'Penjaga gawang', DEFENDER: 'Bek', MIDFIELDER: 'Gelandang', FORWARD: 'Penyerang' };
const label = (value: string) => labels[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());

type AdminField = { name: string; label: string; type?: 'text' | 'url' | 'email' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea' | 'password'; required?: boolean; minLength?: number; maxLength?: number; placeholder?: string; options?: string[] };
type AdminSection = { title: string; endpoint: string; fields: AdminField[]; columns: { label: string; value: (row: Record<string, any>) => string }[] };
const choices = {
  continent: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'],
  position: ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'],
  matchStatus: ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'],
  transferType: ['PERMANENT', 'LOAN', 'FREE_TRANSFER', 'RETURN_FROM_LOAN'],
  transferStatus: ['RUMOUR', 'NEGOTIATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
  userStatus: ['ACTIVE', 'INACTIVE', 'BANNED'],
} as const;
const adminSections: Record<string, AdminSection> = {
  clubs: { title: 'Klub', endpoint: '/clubs', fields: [{ name: 'name', label: 'Nama klub', required: true, minLength: 2 }, { name: 'shortName', label: 'Singkatan (min. 2 karakter)', required: true, minLength: 2, maxLength: 20 }, { name: 'country', label: 'Negara', required: true, minLength: 2 }, { name: 'continent', label: 'Benua', type: 'select', required: true, options: [...choices.continent] }, { name: 'city', label: 'Kota' }, { name: 'stadium', label: 'Stadion' }, { name: 'foundedYear', label: 'Tahun berdiri', type: 'number' }, { name: 'website', label: 'Situs web (URL lengkap)', type: 'url', placeholder: 'https://contoh.com' }, { name: 'description', label: 'Deskripsi', type: 'textarea' }], columns: [{ label: 'Klub', value: row => row.name }, { label: 'Negara', value: row => row.country }, { label: 'Benua', value: row => row.continent ?? '—' }] },
  players: { title: 'Pemain', endpoint: '/players', fields: [{ name: 'name', label: 'Nama pemain', required: true, minLength: 2 }, { name: 'nationality', label: 'Kewarganegaraan', required: true, minLength: 2 }, { name: 'position', label: 'Posisi', type: 'select', required: true, options: [...choices.position] }, { name: 'clubId', label: 'ID klub', type: 'number' }, { name: 'shirtNumber', label: 'Nomor punggung', type: 'number' }, { name: 'dateOfBirth', label: 'Tanggal lahir', type: 'date' }, { name: 'bio', label: 'Bio', type: 'textarea' }], columns: [{ label: 'Pemain', value: row => row.name }, { label: 'Posisi', value: row => label(row.position) }, { label: 'Klub', value: row => row.club?.name ?? '—' }] },
  leagues: { title: 'Liga', endpoint: '/leagues', fields: [{ name: 'name', label: 'Nama liga', required: true, minLength: 2 }, { name: 'country', label: 'Negara', required: true, minLength: 2 }, { name: 'season', label: 'Musim (min. 4 karakter)', required: true, minLength: 4, maxLength: 20 }, { name: 'description', label: 'Deskripsi', type: 'textarea' }], columns: [{ label: 'Liga', value: row => row.name }, { label: 'Negara', value: row => row.country }, { label: 'Musim', value: row => row.season }] },
  matches: { title: 'Pertandingan', endpoint: '/matches', fields: [{ name: 'leagueId', label: 'ID liga', type: 'number', required: true }, { name: 'homeClubId', label: 'ID klub kandang', type: 'number', required: true }, { name: 'awayClubId', label: 'ID klub tandang', type: 'number', required: true }, { name: 'matchDate', label: 'Waktu pertandingan', type: 'datetime-local', required: true }, { name: 'season', label: 'Musim (min. 4 karakter)', required: true, minLength: 4, maxLength: 20 }, { name: 'status', label: 'Status', type: 'select', required: true, options: [...choices.matchStatus] }, { name: 'venue', label: 'Lokasi' }, { name: 'homeScore', label: 'Skor kandang', type: 'number' }, { name: 'awayScore', label: 'Skor tandang', type: 'number' }], columns: [{ label: 'Pertandingan', value: row => `${row.homeClub?.name ?? row.homeClubId} vs ${row.awayClub?.name ?? row.awayClubId}` }, { label: 'Liga', value: row => row.league?.name ?? String(row.leagueId) }, { label: 'Waktu', value: row => new Date(row.matchDate).toLocaleString() }, { label: 'Status', value: row => label(row.status) }] },
  transfers: { title: 'Transfer', endpoint: '/transfers', fields: [{ name: 'playerId', label: 'ID pemain', type: 'number', required: true }, { name: 'fromClubId', label: 'ID klub asal', type: 'number' }, { name: 'toClubId', label: 'ID klub tujuan', type: 'number' }, { name: 'transferDate', label: 'Tanggal transfer', type: 'date', required: true }, { name: 'transferType', label: 'Jenis transfer', type: 'select', required: true, options: [...choices.transferType] }, { name: 'status', label: 'Status', type: 'select', required: true, options: [...choices.transferStatus] }, { name: 'transferFee', label: 'Nilai transfer', type: 'number' }, { name: 'currency', label: 'Mata uang (3 karakter, mis. EUR)', required: true, minLength: 3, maxLength: 3 }, { name: 'description', label: 'Keterangan', type: 'textarea' }], columns: [{ label: 'Pemain', value: row => row.player?.name ?? String(row.playerId) }, { label: 'Dari', value: row => row.fromClub?.name ?? 'Pemain bebas' }, { label: 'Ke', value: row => row.toClub?.name ?? '—' }, { label: 'Benua', value: row => row.fromClub?.continent && row.toClub?.continent && row.fromClub.continent !== row.toClub.continent ? `${row.fromClub.continent} → ${row.toClub.continent}` : row.fromClub?.continent ?? row.toClub?.continent ?? row.player?.club?.continent ?? '—' }, { label: 'Status', value: row => label(row.status) }] },
  users: { title: 'Pengguna', endpoint: '/users', fields: [{ name: 'name', label: 'Nama', required: true, minLength: 2 }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'password', label: 'Kata sandi', type: 'password', required: true, minLength: 8 }, { name: 'roleId', label: 'Peran', type: 'number', required: true }, { name: 'status', label: 'Status', type: 'select', required: true, options: [...choices.userStatus] }], columns: [{ label: 'Nama', value: row => row.name }, { label: 'Email', value: row => row.email }, { label: 'Peran', value: row => label(row.role?.name ?? '—') }, { label: 'Status', value: row => label(row.status) }] },
};
const translateValidationMessage = (message: string) => message
  .replace(/^String must contain at least (\d+) character\(s\)$/i, 'Isi minimal $1 karakter.')
  .replace(/^String must contain at most (\d+) character\(s\)$/i, 'Isi maksimal $1 karakter.')
  .replace(/^String must contain exactly (\d+) character\(s\)$/i, 'Isi tepat $1 karakter.')
  .replace(/^Invalid url$/i, 'Masukkan URL lengkap, misalnya https://contoh.com.')
  .replace(/^Invalid email$/i, 'Masukkan alamat email yang valid.')
  .replace(/^Expected number, received nan$/i, 'Masukkan angka yang valid.')
  .replace(/^Invalid date$/i, 'Masukkan tanggal yang valid.')
  .replace(/^Number must be greater than or equal to (.+)$/i, 'Nilai minimal $1.')
  .replace(/^Number must be less than or equal to (.+)$/i, 'Nilai maksimal $1.')
  .replace(/^Invalid enum value.*$/i, 'Pilih salah satu opsi yang tersedia.');
const fieldLabels: Record<string, string> = { title: 'Judul', slug: 'Slug', excerpt: 'Ringkasan', content: 'Konten', categoryId: 'Kategori', shortName: 'Singkatan', website: 'Situs web', name: 'Nama', country: 'Negara', season: 'Musim', leagueId: 'Liga', homeClubId: 'Klub kandang', awayClubId: 'Klub tandang', matchDate: 'Waktu pertandingan', playerId: 'Pemain', roleId: 'Peran', email: 'Email', password: 'Kata sandi', position: 'Posisi', nationality: 'Kewarganegaraan', status: 'Status', currency: 'Mata uang', transferDate: 'Tanggal transfer' };
const messageFrom = (error: any) => {
  const response = error?.response?.data;
  const details = Object.entries(response?.errors?.fieldErrors ?? {}).flatMap(([field, messages]: [string, any]) =>
    (messages ?? []).filter(Boolean).map((message: string) => `${fieldLabels[field] ?? field}: ${translateValidationMessage(message)}`));
  const message = response?.message ?? error?.message ?? 'Terjadi kesalahan. Silakan coba lagi.';
  return details.length ? `${message}: ${details.join('; ')}` : message;
};
const valueForForm = (value: unknown, type?: AdminField['type']) => {
  if (value == null) return '';
  if (type === 'date') return new Date(String(value)).toISOString().slice(0, 10);
  if (type === 'datetime-local') return new Date(String(value)).toISOString().slice(0, 16);
  return String(value);
};
const validateAdminFields = (form: HTMLFormElement, fields: AdminField[]) => {
  const errors: Record<string, string[]> = {};
  for (const field of fields) {
    const control = form.elements.namedItem(field.name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!control) continue;
    const validity = control.validity;
    const message = validity.valueMissing ? 'Kolom ini wajib diisi.'
      : validity.tooShort ? `Isi minimal ${field.minLength} karakter.`
        : validity.tooLong ? `Isi maksimal ${field.maxLength} karakter.`
          : validity.typeMismatch && field.type === 'url' ? 'Masukkan URL lengkap, misalnya https://contoh.com.'
            : validity.typeMismatch && field.type === 'email' ? 'Masukkan alamat email yang valid.'
              : validity.badInput ? 'Masukkan nilai yang valid.' : '';
    if (message) errors[field.name] = [message];
  }
  return errors;
};

export function LoginPage() { const { user, login } = useAuth(); const navigate = useNavigate(); const [error, setError] = useState(''); if (user) return <Navigate to="/admin" replace />; const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); try { setError(''); await login(String(values.get('email')), String(values.get('password'))); navigate('/admin'); } catch { setError('Email atau kata sandi tidak valid.'); } }; return <section className="shell mx-auto max-w-md py-10 sm:py-16"><div className="card p-5 sm:p-7"><p className="eyebrow">2anNews CMS</p><h1 className="mt-2 text-3xl font-black">Masuk</h1><form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-semibold">Email<input required name="email" type="email" className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-semibold">Kata sandi<input required name="password" type="password" className="mt-1 w-full rounded-lg border p-2.5" /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="button w-full"><LogIn size={17} className="mr-2" />Masuk ke CMS</button></form></div></section>; }

export function FootballListPage({ type }: { type: 'clubs' | 'players' | 'leagues' | 'transfers' }) {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const continent = params.get('continent') ?? (type === 'transfers' ? 'Europe' : '');
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const result = useQuery({
    queryKey: [type, search, continent, page],
    queryFn: () => {
      const query = new URLSearchParams({ limit: '50', page: String(page) });
      if (search) query.set('search', search);
      if ((type === 'clubs' || type === 'transfers') && continent) query.set('continent', continent);
      return api.get<ApiResponse<Record<string, unknown>[]>>(`${endpointFor[type]}?${query}`).then(response => response.data);
    },
  });
  const transferNews = useQuery({
    queryKey: ['transfer-news', continent],
    enabled: type === 'transfers' && Boolean(continent),
    queryFn: () => api.get<ApiResponse<Article[]>>(`/articles?category=transfer-${continent.toLowerCase().replaceAll(' ', '-')}&limit=50`).then(response => response.data.data),
  });
  const items = result.data?.data ?? [];
  const pagination = result.data?.pagination;
  const updateParams = (next: { search?: string; continent?: string; page?: number }) => {
    const values = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextContinent = next.continent ?? continent;
    if (nextSearch) values.set('search', nextSearch);
    if ((type === 'clubs' || type === 'transfers') && nextContinent) values.set('continent', nextContinent);
    if ((next.page ?? 1) > 1) values.set('page', String(next.page));
    setParams(values);
  };

  return <section className="shell py-8 sm:py-10">
    <p className="eyebrow">Data sepak bola</p>
    <h1 className="page-heading mt-2">{titleFor[type]}</h1>
    {type === 'transfers' && <section className="mt-7" aria-labelledby="transfer-news-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">7–14 Oktober 2026</p><h2 id="transfer-news-heading" className="mt-1 text-2xl font-black">Berita transfer sepekan</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Pembaruan transfer klub dari sumber resmi dan media sepak bola, dikelompokkan menurut benua.</p></div>
        <label htmlFor="transfer-continent" className="w-full text-sm font-semibold sm:max-w-xs">Benua<select id="transfer-continent" value={continent} onChange={event => updateParams({ continent: event.target.value, page: 1 })} className="mt-1 w-full rounded-lg border bg-white p-2">{['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      {continent === 'Antarctica' ? <p className="card mt-5 p-5 text-sm text-slate-600">Belum ada berita transfer klub dari Antarktika karena tidak ada klub sepak bola terdaftar di benua tersebut.</p>
        : transferNews.isLoading ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div className="card h-72 animate-pulse bg-white" key={index} />)}</div>
            : transferNews.isError ? <div role="alert" className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm font-semibold text-slate-600">Berita transfer belum bisa dimuat.</p><button className="button" onClick={() => transferNews.refetch()}>Coba lagi</button></div>
              : transferNews.data?.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{transferNews.data.map(article => <article className="card flex flex-col p-5" key={article.id}><div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500"><span className="text-pitch">{article.category.name}</span>{article.publishedAt && <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</time>}</div><h3 className="mt-3 text-lg font-black"><Link to={`/news/${article.slug}`} className="hover:text-pitch">{article.title}</Link></h3><p className="mt-2 text-sm leading-6 text-slate-600">{article.excerpt}</p><Link to={`/news/${article.slug}`} className="mt-auto pt-5 text-sm font-bold text-pitch hover:underline">Baca berita <ArrowUpRight className="ml-1 inline" size={15} /></Link></article>)}</div>
                : <p className="card mt-5 p-5 text-sm text-slate-600">Belum ada berita transfer terverifikasi untuk benua ini pada 7–14 Oktober 2026.</p>}
    </section>}
    {type === 'transfers' && <h2 className="mt-10 text-2xl font-black">Data transfer pemain</h2>}
    {type !== 'transfers' && <form className="mt-5 flex w-full max-w-lg gap-2 sm:mt-6" onSubmit={event => {
      event.preventDefault();
      updateParams({ search: String(new FormData(event.currentTarget).get('search') ?? '') });
    }}>
      <input name="search" defaultValue={search} className="min-w-0 flex-1 rounded-lg border p-2" placeholder={`Cari ${type}`} />
      <button className="button shrink-0">Cari</button>
    </form>}
    {type === 'clubs' && <div className="mt-4 max-w-lg">
      <label htmlFor="club-continent" className="mb-1 block text-sm font-semibold">Benua</label>
      <select id="club-continent" value={continent} onChange={event => updateParams({ continent: event.target.value })} className="w-full rounded-lg border bg-white p-2">
        <option value="">Semua benua</option>
        {['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'].map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>}
    {type === 'clubs' && <p className="mt-3 max-w-3xl text-sm text-slate-500">Direktori ini mengumpulkan klub dari berbagai negara. Jumlah klub amatir dan akademi di dunia tidak memiliki registri global yang lengkap; status aktif dan klasifikasi akademi pada setiap entri belum diverifikasi. Antarktika tidak memiliki klub sepak bola terdaftar.</p>}
    {pagination && <p className="mt-4 text-sm text-slate-500">Menampilkan {items.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–{(pagination.page - 1) * pagination.limit + items.length} dari {pagination.total} data</p>}
    <div className="mt-6 grid gap-4 sm:mt-7 sm:grid-cols-2 lg:grid-cols-3">
      {result.isLoading ? Array.from({ length: 6 }, (_, index) => <div className="card h-28 animate-pulse bg-white" key={index} />)
        : result.isError ? <div role="alert" className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:col-span-2 sm:p-6 lg:col-span-3"><p className="font-semibold text-slate-600">Data belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => result.refetch()}>Coba lagi</button></div>
          : items.map(item => <FootballCard key={Number(item.id)} item={item} type={type} />)}
    </div>
    {!result.isLoading && !result.isError && !items.length && <p className="card mt-4 p-5 text-sm text-slate-500 sm:p-6">{type === 'transfers' && continent === 'Antarctica' ? 'Belum ada transfer pemain dari Antarktika karena tidak ada klub sepak bola terdaftar di benua tersebut.' : `Tidak ada hasil${search ? ` untuk “${search}”` : ''}.`}</p>}
    {(type === 'clubs' || type === 'transfers') && pagination && pagination.totalPages > 1 && <nav aria-label={type === 'clubs' ? 'Halaman klub' : 'Halaman transfer'} className="mt-6 flex items-center justify-center gap-4">
      <button className="button" disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>Sebelumnya</button>
      <span className="text-sm text-slate-600">Halaman {pagination.page} dari {pagination.totalPages}</span>
      <button className="button" disabled={page >= pagination.totalPages} onClick={() => updateParams({ page: page + 1 })}>Berikutnya</button>
    </nav>}
  </section>;
}function FootballCard({ item, type }: { item: Record<string, unknown>; type: string }) { const slug = String(item.slug ?? ''); const target = type === 'clubs' ? `/club/${slug}` : type === 'players' ? `/player/${slug}` : type === 'leagues' ? `/league/${slug}` : ''; if (type === 'transfers') { const player = item.player as { name: string }; const from = item.fromClub as { name: string; slug?: string } | null; const to = item.toClub as { name: string; slug?: string } | null; return <div className="card p-5"><p className="font-bold">{player?.name}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-sm muted">{from ? <span className="inline-flex items-center gap-2"><ClubLogo name={from.name} slug={from.slug} size="sm"/>{from.name}</span> : 'Pemain bebas'}<span aria-hidden="true">→</span>{to ? <span className="inline-flex items-center gap-2"><ClubLogo name={to.name} slug={to.slug} size="sm"/>{to.name}</span> : 'Belum ditentukan'}</div><p className="mt-3 text-xs font-bold text-pitch">{label(String(item.status))} · {String(item.currency)} {item.transferFee ? String(item.transferFee) : 'Tidak diumumkan'}</p></div>; } return <Link to={target} className="card flex items-center gap-4 p-5 hover:border-pitch">{type === 'clubs' && <ClubLogo name={String(item.name)} slug={slug} size="md" />}<div className="min-w-0 flex-1"><p className="text-xl font-black">{String(item.name)}</p><p className="mt-2 text-sm muted">{String(item.country ?? item.nationality ?? '')}{type === 'clubs' && item.continent ? ` · ${String(item.continent)}` : ''}</p><p className="mt-3 text-sm">{String(item.stadium ?? item.position ?? item.season ?? '')}</p></div><ChevronRight className="text-pitch" size={18} /></Link>; }

export function FootballDetailPage({ type }: { type: 'clubs' | 'players' | 'leagues' }) { const { slug = '' } = useParams(); const result = useQuery({ queryKey: [type, slug], queryFn: () => read<Record<string, unknown>>(`${endpointFor[type]}/${slug}`) }); if (result.isLoading) return <div className="shell py-10"><div className="card h-64 animate-pulse bg-white" aria-busy="true" /></div>; if (result.isError) return <section className="shell py-10"><div role="alert" className="card flex flex-wrap items-center justify-between gap-4 p-5"><p className="font-semibold text-slate-600">Profil belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => result.refetch()}>Coba lagi</button></div></section>; if (!result.data) return <NotFoundPage />; const item = result.data; const articles = (item.articleLinks ?? item.articles ?? []) as { id: number; title: string; slug: string; category: { name: string } }[]; const matches = (item.matches ?? []) as { id: number; matchDate: string; homeClub: { name: string; slug?: string; shortName: string }; awayClub: { name: string; slug?: string; shortName: string }; homeScore?: number; awayScore?: number }[]; const standings = (item.standings ?? []) as { id: number; position: number; club: { name: string; slug?: string }; points: number; played: number }[]; return <section className="shell py-10"><p className="eyebrow">{titleFor[type]}</p><div className="flex items-center gap-4">{type === 'clubs' && <ClubLogo name={String(item.name)} slug={String(item.slug ?? '')} size="lg" />}<h1 className="text-4xl font-black">{String(item.name)}</h1></div><p className="mt-3 max-w-2xl text-slate-600">{String(item.description ?? item.bio ?? 'Profil sepak bola dan liputan terkait dari 2anNews.')}</p><div className="mt-7 grid gap-4 md:grid-cols-3"><Info label="Negara" value={String(item.country ?? item.nationality ?? '—')} /><Info label={type === 'clubs' ? 'Stadion' : type === 'players' ? 'Posisi' : 'Musim'} value={String(item.stadium ?? item.position ?? item.season ?? '—')} /><Info label="Status" value={label(String(item.status ?? 'ACTIVE'))} /></div>{standings.length > 0 && <div className="mt-10"><h2 className="text-2xl font-black">Klasemen</h2><StandingTable rows={standings} /></div>}{matches.length > 0 && <div className="mt-10"><h2 className="text-2xl font-black">Pertandingan</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{matches.map(match => <div className="card p-4" key={match.id}><span className="inline-flex items-center gap-2"><ClubLogo name={match.homeClub.name} slug={match.homeClub.slug} size="sm" />{match.homeClub.shortName}</span> {match.homeScore ?? '–'} · {match.awayScore ?? '–'} <span className="inline-flex items-center gap-2"><ClubLogo name={match.awayClub.name} slug={match.awayClub.slug} size="sm" />{match.awayClub.shortName}</span></div>)}</div></div>}{articles.length > 0 && <div className="mt-10"><h2 className="text-2xl font-black">Berita terkait</h2><div className="mt-3 grid gap-3">{articles.map(article => <Link className="card p-4 font-bold hover:border-pitch" key={article.id} to={`/news/${article.slug}`}>{article.title}<span className="ml-2 text-xs text-pitch">{article.category.name}</span></Link>)}</div></div>}</section>; }
function Info({ label: name, value }: { label: string; value: string }) { return <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wide muted">{name}</p><p className="mt-1 font-bold">{value}</p></div>; }

export function MatchesPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const continent = params.get('continent') ?? 'Europe';
  const matches = useMatches();
  const one = useQuery({ queryKey: ['match', id], queryFn: () => read<Record<string, unknown>>(`/matches/${id}`), enabled: Boolean(id) });
  if (id) {
    const match = one.data;
    if (one.isLoading) return <div className="shell py-14"><div className="card h-72 animate-pulse bg-white" aria-label="Memuat pertandingan" aria-busy="true" /></div>;
    if (one.isError) return <section className="shell py-14"><div role="alert" className="card flex flex-wrap items-center justify-between gap-4 p-5"><p className="font-semibold text-slate-600">Pertandingan belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => one.refetch()}>Coba lagi</button></div></section>;
    if (!match) return <NotFoundPage />;
    const home = match.homeClub as { name: string; slug?: string };
    const away = match.awayClub as { name: string; slug?: string };
    return <section className="shell py-10 text-center sm:py-14"><p className="eyebrow">{(match.league as { name: string }).name}</p><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6"><span className="flex min-w-0 flex-col items-center gap-2 text-sm font-black sm:flex-row sm:justify-center sm:text-xl"><ClubLogo name={home.name} slug={home.slug} size="lg" /><span>{home.name}</span></span><span className="text-2xl font-black sm:text-3xl">{match.homeScore ?? '–'} : {match.awayScore ?? '–'}</span><span className="flex min-w-0 flex-col items-center gap-2 text-sm font-black sm:flex-row sm:justify-center sm:text-xl"><ClubLogo name={away.name} slug={away.slug} size="lg" /><span>{away.name}</span></span></div><p className="mt-4 text-sm text-slate-500 sm:mt-3">{new Date(String(match.matchDate)).toLocaleString()} · {String(match.venue ?? 'Lokasi belum tersedia')}</p></section>;
  }

  const recentResults = recentMatchResults.filter(result => result.continent === continent);
  return <section className="shell py-8 sm:py-10">
    <p className="eyebrow">Jadwal & hasil</p><h1 className="page-heading mt-2">Pertandingan</h1>
    <section className="mt-7" aria-labelledby="recent-matches-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">7–14 Oktober 2026</p><h2 id="recent-matches-heading" className="mt-1 text-2xl font-black">Hasil pertandingan sepekan</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Pilihan hasil pertandingan terbaru dari sumber liga, konfederasi, dan klub.</p></div>
        <label htmlFor="match-continent" className="w-full text-sm font-semibold sm:max-w-xs">Benua<select id="match-continent" value={continent} onChange={event => setParams(event.target.value ? { continent: event.target.value } : {})} className="mt-1 w-full rounded-lg border bg-white p-2">{['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      {continent === 'Antarctica' ? <p className="card mt-5 p-5 text-sm text-slate-600">Belum ada pertandingan klub di Antarktika karena tidak ada klub sepak bola terdaftar di benua tersebut.</p>
        : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recentResults.map((result, index) => <article className="card p-5" key={`${result.home}-${result.away}-${index}`}><div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500"><span className="truncate uppercase tracking-wide">{result.competition}</span><time dateTime={result.date}>{new Date(result.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</time></div><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-black"><div className="flex min-w-0 flex-col items-center gap-2 text-center"><ClubLogo name={result.home} slug={result.homeLogo} size="sm"/><span className="max-w-full text-xs leading-tight">{result.home}</span></div><span className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-ink">{result.homeScore}–{result.awayScore}</span><div className="flex min-w-0 flex-col items-center gap-2 text-center"><ClubLogo name={result.away} slug={result.awayLogo} size="sm"/><span className="max-w-full text-xs leading-tight">{result.away}</span></div></div>{result.note && <p className="mt-3 text-center text-xs font-semibold text-pitch">{result.note}</p>}<a href={result.source} target="_blank" rel="noreferrer" className="mt-4 block text-center text-xs font-bold text-pitch hover:underline">Lihat sumber</a></article>)}</div>}
    </section>
    <h2 className="mt-10 text-2xl font-black">Jadwal dan hasil lainnya</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matches.isLoading ? Array.from({ length: 6 }, (_, index) => <div className="card h-52 animate-pulse bg-white" key={index} />) : matches.isError ? <div role="alert" className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:col-span-2 sm:p-6 lg:col-span-3"><p className="font-semibold text-slate-600">Jadwal belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => matches.refetch()}>Coba lagi</button></div> : matches.data?.length ? matches.data.map(match => <Link key={match.id} to={`/matches/${match.id}`}><MatchCard match={match} /></Link>) : <p className="card p-5 text-sm text-slate-500 sm:col-span-2 sm:p-6 lg:col-span-3">Belum ada jadwal pertandingan lain.</p>}</div>
  </section>;
}

export function StandingsPage() { const { league: selected } = useParams(); const leagues = useQuery({ queryKey: ['leagues-all'], queryFn: () => read<{ id: number; slug: string; name: string }[]>('/leagues?limit=50') }); const league = (leagues.data ?? []).find(row => row.slug === selected) ?? leagues.data?.[0]; const standings = useQuery({ queryKey: ['standings', league?.id], queryFn: () => read<Standing[]>(`/standings/${league!.id}`), enabled: Boolean(league) }); return <section className="shell py-8 sm:py-10"><p className="eyebrow">Klasemen</p>{league && <h1 className="page-heading mt-2">{league.name}</h1>}{leagues.isLoading ? <div className="card mt-6 h-16 animate-pulse bg-white" aria-busy="true"/> : leagues.isError ? <div role="alert" className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5"><p className="font-semibold text-slate-600">Daftar liga belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => leagues.refetch()}>Coba lagi</button></div> : !league ? <p className="card mt-5 p-5 text-sm text-slate-500">Belum ada liga untuk ditampilkan.</p> : <><nav aria-label="Pilih liga" className="mt-5 flex gap-2 overflow-x-auto pb-2">{(leagues.data ?? []).map(row => <Link className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold ${row.slug === league.slug ? 'bg-pitch text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`} to={`/standings/${row.slug}`} key={row.id}>{row.name}</Link>)}</nav>{standings.isLoading ? <div className="card mt-5 h-64 animate-pulse bg-white" aria-label="Memuat klasemen" aria-busy="true"/> : standings.isError ? <div role="alert" className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5"><p className="font-semibold text-slate-600">Klasemen belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => standings.refetch()}>Coba lagi</button></div> : <StandingTable rows={standings.data ?? []} />}</>}</section>; }
type Standing = { id: number; position: number; club: { name: string; slug?: string; shortName?: string }; played: number; won?: number; drawn?: number; lost?: number; goalDifference?: number; points: number };
function StandingTable({ rows }: { rows: Standing[] }) { return <div className="mt-5 overflow-x-auto card"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs"><tr><th className="p-3">#</th><th>Klub</th><th>Dimainkan</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>Selisih gol</th><th>Poin</th></tr></thead><tbody>{rows.map(row => <tr className="border-b last:border-0" key={row.id}><td className="p-3 font-bold">{row.position}</td><td><span className="inline-flex items-center gap-2 font-semibold"><ClubLogo name={row.club.name} slug={row.club.slug} size="sm" />{row.club.name}</span></td><td>{row.played}</td><td>{row.won ?? 0}</td><td>{row.drawn ?? 0}</td><td>{row.lost ?? 0}</td><td>{row.goalDifference ?? 0}</td><td className="font-black">{row.points}</td></tr>)}</tbody></table>{!rows.length && <p className="p-5 text-sm text-slate-500">Klasemen belum tersedia.</p>}</div>; }

export function BookmarksPage() { const { user } = useAuth(); const data = useQuery({ queryKey: ['bookmarks'], queryFn: () => read<{ article: Article }[]>('/bookmarks'), enabled: Boolean(user) }); if (!user) return <Navigate to="/login" replace />; return <section className="shell py-8 sm:py-10"><p className="eyebrow">Daftar bacaan</p><h1 className="page-heading mt-2">Artikel tersimpan</h1>{data.isLoading ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Memuat artikel tersimpan" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="card h-72 animate-pulse bg-white" key={index}/>)}</div> : data.isError ? <div role="alert" className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5"><p className="font-semibold text-slate-600">Artikel tersimpan belum bisa dimuat.</p><button className="button w-full sm:w-auto" onClick={() => data.refetch()}>Coba lagi</button></div> : data.data?.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.data.map(row => <ArticleCard key={row.article.id} article={row.article} />)}</div> : <div className="card mt-6 p-6"><p className="font-bold text-ink">Belum ada artikel tersimpan.</p><Link className="mt-3 inline-flex font-bold text-pitch hover:underline" to="/news">Jelajahi berita</Link></div>}</section>; }

export function AdminPage() {
  const { user, loading } = useAuth();
  const { section = 'dashboard' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [successNotice, setSuccessNotice] = useState('');
  useEffect(() => {
    const message = location.state?.successMessage;
    if (message) {
      setSuccessNotice(message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);
  useEffect(() => {
    if (!successNotice) return;
    const timeout = window.setTimeout(() => setSuccessNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [successNotice]);
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => read<Record<string, number>>('/analytics/overview'), enabled: Boolean(user) });
  const articles = useArticles(user ? '?limit=50' : '');
  const navGroups = [
    { title: 'Redaksi', items: [['dashboard', 'Dasbor', LayoutDashboard], ['articles', 'Artikel', Newspaper], ['comments', 'Komentar', MessageSquareText]] },
    { title: 'Data sepak bola', items: [['clubs', 'Klub', Building2], ['players', 'Pemain', Users], ['leagues', 'Liga', Trophy], ['matches', 'Pertandingan', CalendarDays], ['transfers', 'Transfer', ArrowLeftRight]] },
    { title: 'Administrasi', items: [['users', 'Pengguna', Users], ['media', 'Media', Image], ['settings', 'Pengaturan', Settings2]] },
  ] as const;
  const currentTitle = navGroups.flatMap(group => group.items).find(([key]) => key === section)?.[1] ?? 'Dasbor';
  if (loading) return <div className="shell py-14 muted">Memeriksa sesi…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <section className="cms-page min-h-[calc(100vh-4.5rem)] px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
    <div className="mx-auto flex min-w-0 max-w-[1600px] flex-col gap-5 lg:flex-row lg:gap-7">
      <aside className="cms-sidebar w-full min-w-0 shrink-0 lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-7rem)] lg:w-60 lg:flex-col lg:self-start lg:overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 px-1">
          <img src="/logo.png" alt="2anNews" className="h-12 w-12 shrink-0 object-contain" />
          <div className="min-w-0"><p className="text-lg font-black tracking-tight text-ink">2an<span className="text-pitch">News</span></p><p className="text-xs font-semibold text-slate-500">Content management</p></div>
        </div>
        <div className="cms-account mt-5 flex shrink-0 items-center gap-3 rounded-2xl bg-mist px-3 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-black text-pitch">{user.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{user.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{label(user.role)}</p></div>
        </div>
        <nav aria-label="Navigasi CMS" className="cms-nav mt-5 min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {navGroups.map(group => <div className="cms-nav-group" key={group.title}>
            <p className="cms-nav-label px-3 text-[.62rem] font-extrabold uppercase tracking-[.14em] text-slate-400">{group.title}</p>
            <div className="cms-nav-items mt-1 flex gap-1 overflow-x-auto pb-1 lg:block lg:overflow-visible lg:pb-0">
              {group.items.map(([key, text, Icon]) => <Link key={key} aria-current={section === key ? 'page' : undefined} className={`cms-nav-link flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${section === key ? 'is-active bg-pitch text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-pitch'}`} to={key === 'dashboard' ? '/admin' : `/admin/${key}`}><Icon size={17} strokeWidth={2} aria-hidden="true"/><span>{text}</span>{section === key && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-lime lg:block"/>}</Link>)}
            </div>
          </div>)}
        </nav>
        <div className="cms-sidebar-bottom mt-auto hidden shrink-0 border-t border-slate-100 pt-4 lg:block"><Link to="/" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-emerald-50 hover:text-pitch"><span>Kembali ke situs</span><ArrowUpRight size={16}/></Link></div>
      </aside>
      <div className="cms-workspace min-w-0 flex-1">
        <div className="cms-topbar mb-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm sm:px-5">
          <div className="min-w-0"><p className="truncate text-xs"><span className="font-semibold text-slate-400">2anNews</span><span className="mx-2 text-slate-300">/</span><span className="font-semibold text-slate-500">CMS</span><span className="mx-2 text-slate-300">/</span><span className="font-bold text-ink">{currentTitle}</span></p><p className="mt-1 hidden text-xs text-slate-500 sm:block">Ruang kerja redaksi</p></div>
          <div className="flex shrink-0 items-center gap-1.5"><CmsNotifications/><span aria-hidden="true" className="mx-1 h-6 w-px bg-slate-200"/><Link to="/" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-pitch transition hover:bg-emerald-50 sm:text-sm"><span className="hidden sm:inline">Lihat situs</span><ArrowUpRight size={16}/></Link></div>
        </div>
        {successNotice && <p role="status" aria-live="polite" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{successNotice}</p>}
        {section === 'dashboard' ? <Dashboard data={overview.data} userName={user.name} articles={articles.data ?? []} /> : section === 'articles' ? <AdminArticles /> : <AdminResource section={section} />}
      </div>
    </div>
  </section>;
}

function Dashboard({ data, userName, articles }: { data?: Record<string, number>; userName: string; articles: Article[] }) {
  const cards = [
    { name: 'Total berita', key: 'articles', detail: 'Artikel dalam sistem', Icon: BookOpen, tone: 'green' },
    { name: 'Dipublikasikan', key: 'published', detail: 'Tayang untuk pembaca', Icon: ClipboardList, tone: 'green' },
    { name: 'Menunggu ulasan', key: 'review', detail: 'Perlu tindakan editor', Icon: ShieldAlert, tone: 'amber' },
    { name: 'Pengguna', key: 'users', detail: 'Akun terdaftar', Icon: Users, tone: 'blue' },
    { name: 'Tayangan', key: 'views', detail: 'Total pembacaan berita', Icon: BarChart3, tone: 'blue' },
    { name: 'Transfer', key: 'transfers', detail: 'Data perpindahan pemain', Icon: Trophy, tone: 'green' },
  ] as const;
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const recentArticles = articles.slice(0, 5);

  return <div className="cms-dashboard space-y-6 sm:space-y-7">
    <section className="cms-dashboard-hero relative overflow-hidden border border-emerald-100 p-5 sm:p-7 lg:p-8">
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
        <div>
          <p className="eyebrow">Ringkasan CMS</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">Selamat datang, {userName}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Pantau konten dan lanjutkan pekerjaan editorial 2anNews dari satu tempat.</p>
          <p className="mt-4 text-xs font-semibold capitalize text-slate-500">{today}</p>
        </div>
        <div className="cms-create-card w-full border border-slate-200 bg-white p-4 sm:p-5 lg:w-64">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-pitch"><FileText size={19}/></span>
          <p className="mt-3 text-sm font-extrabold text-ink">Punya kabar terbaru?</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Tulis dan siapkan berita untuk pembaca.</p>
          <Link className="button mt-4 w-full gap-2" to="/admin/articles/create"><Plus size={16}/>Tulis artikel</Link>
        </div>
      </div>
    </section>

    <section aria-labelledby="cms-stats-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><h2 id="cms-stats-title" className="text-lg font-black text-ink">Performa situs</h2><p className="mt-1 text-xs text-slate-500">Ringkasan aktivitas konten dan pembaca.</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
        {cards.map(({ name, key, detail, Icon, tone }) => <article className="cms-stat-card card flex min-h-36 items-start justify-between gap-4 p-4 sm:min-h-40 sm:p-5" key={key}>
          <div className="flex min-w-0 flex-1 flex-col self-stretch">
            <p className="text-sm font-bold text-slate-600">{name}</p>
            <p className="mt-auto pt-5 text-3xl font-black tracking-tight text-ink sm:text-4xl">{data?.[key] ?? '—'}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
          <span className={`cms-stat-icon tone-${tone} grid h-11 w-11 shrink-0 place-items-center rounded-2xl`}><Icon size={19} strokeWidth={2}/></span>
        </article>)}
      </div>
    </section>

    <div className="grid items-start gap-4 xl:grid-cols-[1.35fr_.8fr]">
      <section className="cms-dashboard-panel card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div><p className="eyebrow">Aktivitas terbaru</p><h2 className="mt-2 text-lg font-black">Artikel terkini</h2></div>
          <Link to="/admin/articles" className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-pitch hover:gap-2 sm:text-sm">Semua artikel <ArrowUpRight size={15}/></Link>
        </div>
        {recentArticles.length ? <ul className="divide-y divide-slate-100">
          {recentArticles.map(article => <li key={article.id}>
            <Link to={`/admin/articles/${article.id}/edit`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-emerald-50/50 sm:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-pitch"><Newspaper size={17}/></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink">{article.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{article.category.name} · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Belum dipublikasikan'}</span></span>
              <span className={`cms-status hidden shrink-0 sm:inline-flex ${article.status === 'PUBLISHED' ? 'is-success' : article.status === 'REJECTED' ? 'is-danger' : 'is-neutral'}`}>{label(article.status)}</span>
              <ChevronRight className="shrink-0 text-slate-400" size={17}/>
            </Link>
          </li>)}
        </ul> : <div className="px-5 py-8 text-center"><p className="text-sm font-bold text-ink">Belum ada artikel.</p><Link to="/admin/articles/create" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-pitch">Buat artikel pertama <ArrowUpRight size={15}/></Link></div>}
      </section>

      <section className="cms-dashboard-panel card p-4 sm:p-5">
        <div><p className="eyebrow">Akses cepat</p><h2 className="mt-2 text-lg font-black">Kelola ruang redaksi</h2><p className="mt-1 text-sm text-slate-500">Buka bagian yang sering digunakan.</p></div>
        <div className="mt-4 grid gap-2">
          <Link to="/admin/comments" className="cms-shortcut-link"><MessageSquareText size={17}/><span>Moderasi komentar</span><ChevronRight size={16}/></Link>
          <Link to="/admin/media" className="cms-shortcut-link"><Image size={17}/><span>Pustaka media</span><ChevronRight size={16}/></Link>
          <Link to="/admin/transfers" className="cms-shortcut-link"><ArrowLeftRight size={17}/><span>Data transfer</span><ChevronRight size={16}/></Link>
        </div>
        <div className="cms-dashboard-note mt-5 rounded-2xl bg-ink p-4 text-white">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-lime"><Activity size={14}/>Ruang kerja editorial</span>
          <p className="mt-2 text-sm font-extrabold">Cerita sepak bola terbaru, tersaji rapi.</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Pastikan setiap berita memiliki foto dan informasi yang relevan.</p>
        </div>
      </section>
    </div>
  </div>;
}
function AdminArticles() {
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const [deleteNotice, setDeleteNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const cache = useQueryClient();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const result = useQuery({
    queryKey: ['admin-articles', search, status, sort, page],
    queryFn: async () => {
      const query = new URLSearchParams({ page: String(page), limit: '20', sort });
      if (search) query.set('search', search);
      if (status) query.set('status', status);
      const response = await api.get<ApiResponse<Article[]>>(`/articles?${query.toString()}`);
      return response.data;
    },
  });
  const removeArticle = useMutation({
    mutationFn: (article: Article) => api.delete(`/articles/${article.id}`),
    onSuccess: (_response, article) => {
      setPendingDelete(null);
      setDeleteNotice(`Artikel "${article.title}" berhasil dihapus.`);
      if (articles.length === 1 && page > 1) {
        const next = new URLSearchParams(params);
        next.set('page', String(page - 1));
        setParams(next);
      }
      cache.invalidateQueries({ queryKey: ['admin-articles'] });
      cache.invalidateQueries({ queryKey: ['articles'] });
      cache.invalidateQueries({ queryKey: ['article'] });
    },
    onError: error => { setPendingDelete(null); setDeleteNotice(messageFrom(error)); },
  });
  const articles = result.data?.data ?? [];
  const pagination = result.data?.pagination;
  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => { if (pendingDelete) deleteCancelRef.current?.focus(); }, [pendingDelete]);

  return <><div className="cms-page-intro flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Konten editorial</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Artikel</h1><p className="mt-2 text-sm text-slate-500">Kelola draf dan publikasi berita 2anNews.</p></div><Link className="button w-full gap-2 sm:w-auto" to="/admin/articles/create"><Plus size={17}/>Artikel baru</Link></div>
    <form className="cms-article-filters mt-5 grid gap-3 border-y border-slate-200 bg-white p-4 sm:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto] sm:items-end sm:px-0" role="search" onSubmit={event => { event.preventDefault(); updateParams({ search: searchInput.trim(), page: '1' }); }}>
      <label className="block text-xs font-bold text-slate-600">Cari artikel<input value={searchInput} onChange={event => setSearchInput(event.target.value)} className="mt-1 w-full rounded-md border px-3 py-2.5 text-sm font-normal" placeholder="Judul, isi, atau kategori" /></label>
      <label className="block text-xs font-bold text-slate-600">Status<select value={status} onChange={event => updateParams({ status: event.target.value, page: '1' })} className="mt-1 w-full rounded-md border px-3 py-2.5 text-sm font-normal"><option value="">Semua status</option>{['DRAFT','SUBMITTED','UNDER_REVIEW','REVISION','APPROVED','SCHEDULED','PUBLISHED','REJECTED','ARCHIVED'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="block text-xs font-bold text-slate-600">Urutkan<select value={sort} onChange={event => updateParams({ sort: event.target.value, page: '1' })} className="mt-1 w-full rounded-md border px-3 py-2.5 text-sm font-normal"><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="views">Tayangan terbanyak</option></select></label>
      <button className="button gap-2 px-4"><FileText size={16}/>Cari</button>
    </form>
    {deleteNotice && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{deleteNotice}</p>}
    <div className="cms-table-card card mt-4 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><FileText size={17} className="text-pitch"/><h2 className="text-sm font-extrabold text-ink">Daftar artikel</h2></div><span className="text-xs font-semibold text-slate-500">{pagination ? `${pagination.total} artikel` : `${articles.length} artikel`}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr><th className="px-4 py-3 sm:px-5">Judul artikel</th><th>Status</th><th>Kategori</th><th className="pr-5 text-right">Aksi</th></tr></thead><tbody>{articles.map(article => <tr className="border-b border-slate-100 last:border-0" key={article.id}><td className="max-w-[26rem] px-4 py-4 sm:px-5"><p className="truncate font-bold text-ink">{article.title}</p><p className="mt-1 text-xs text-slate-400">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Belum dipublikasikan'}</p></td><td><span className={`cms-status ${article.status === 'PUBLISHED' ? 'is-success' : article.status === 'REJECTED' ? 'is-danger' : 'is-neutral'}`}>{label(article.status)}</span></td><td className="text-slate-500">{article.category.name}</td><td className="pr-5 text-right whitespace-nowrap"><Link className="cms-row-action" to={`/admin/articles/${article.id}/edit`}>Ubah <ChevronRight size={15}/></Link><button type="button" className="ml-3 font-bold text-red-600 disabled:opacity-50" disabled={removeArticle.isPending} onClick={() => { setDeleteNotice(''); setPendingDelete(article); }}>Hapus</button></td></tr>)}</tbody></table>
      {result.isLoading && <p className="p-5 text-sm text-slate-500">Memuat artikel…</p>}{result.isError && <p role="alert" className="p-5 text-sm text-red-700">{messageFrom(result.error)}</p>}{!result.isLoading && !result.isError && !articles.length && <div className="px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mist text-pitch"><FileText size={20}/></span><p className="mt-3 font-bold text-ink">{search || status ? 'Tidak ada artikel yang sesuai' : 'Belum ada artikel'}</p><p className="mt-1 text-sm text-slate-500">{search || status ? 'Ubah pencarian atau filter untuk melihat hasil lain.' : 'Mulai dengan menulis berita pertama Anda.'}</p>{!search && !status && <Link className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-pitch" to="/admin/articles/create"><Plus size={16}/>Tulis artikel</Link>}</div>}</div>
      {pagination && pagination.totalPages > 1 && <nav aria-label="Halaman artikel" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5"><span className="text-xs text-slate-500">Halaman {pagination.page} dari {pagination.totalPages}</span><div className="flex gap-2"><button type="button" className="cms-page-button" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>Sebelumnya</button><button type="button" className="cms-page-button" disabled={page >= pagination.totalPages} onClick={() => updateParams({ page: String(page + 1) })}>Berikutnya</button></div></nav>}</div>
    {pendingDelete && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget && !removeArticle.isPending) setPendingDelete(null); }} onKeyDown={event => { if (event.key === 'Escape' && !removeArticle.isPending) setPendingDelete(null); }}><section role="dialog" aria-modal="true" aria-labelledby="delete-article-title" aria-describedby="delete-article-description" className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"><div className="p-6 sm:p-7"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={21}/></div><h2 id="delete-article-title" className="mt-5 text-xl font-black text-ink">Hapus artikel ini?</h2><p id="delete-article-description" className="mt-2 text-sm leading-6 text-slate-600">Artikel berikut akan dihapus dari CMS dan halaman berita:</p><p className="mt-3 break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-ink">{pendingDelete.title}</p><p className="mt-3 text-xs leading-5 text-slate-500">Tindakan ini tidak dapat dibatalkan.</p></div><div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end"><button ref={deleteCancelRef} type="button" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60" disabled={removeArticle.isPending} onClick={() => setPendingDelete(null)}>Batal</button><button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60" disabled={removeArticle.isPending} onClick={() => removeArticle.mutate(pendingDelete)}><Trash2 size={16}/>{removeArticle.isPending ? 'Menghapus...' : 'Ya, hapus artikel'}</button></div></section></div>}
  </>;
}
function AdminResource({ section }: { section: string }) {
  if (section === 'comments') return <CommentManager />;
  if (section === 'media') return <MediaManager />;
  if (section === 'settings') return <SettingsManager />;
  const config = adminSections[section];
  if (!config) return <NotFoundPage />;
  return <CrudManager config={config} section={section} />;
}

function CrudManager({ config, section }: { config: AdminSection; section: string }) {
  const cache = useQueryClient(); const [editing, setEditing] = useState<Record<string, any> | null>(null); const [formOpen, setFormOpen] = useState(false); const [notice, setNotice] = useState(''); const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [clubSearchInput, setClubSearchInput] = useState(''); const [clubSearch, setClubSearch] = useState(''); const [clubPage, setClubPage] = useState(1);
  const [transferSearchInput, setTransferSearchInput] = useState(''); const [transferSearch, setTransferSearch] = useState(''); const [transferContinent, setTransferContinent] = useState(''); const [transferPage, setTransferPage] = useState(1);
  const pagedSection = section === 'clubs' || section === 'transfers';
  const activeSearch = section === 'clubs' ? clubSearch : section === 'transfers' ? transferSearch : '';
  const activePage = section === 'clubs' ? clubPage : transferPage;
  const result = useQuery({
    queryKey: ['admin', section, activeSearch, section === 'transfers' ? transferContinent : '', pagedSection ? activePage : 1],
    queryFn: async () => {
      const query = new URLSearchParams({ limit: '50', page: String(pagedSection ? activePage : 1) });
      if (activeSearch) query.set('search', activeSearch);
      if (section === 'transfers' && transferContinent) query.set('continent', transferContinent);
      const response = await api.get<ApiResponse<Record<string, any>[]>>(`${config.endpoint}?${query}`);
      return pagedSection ? response.data : response.data.data;
    },
  });
  const rows: Record<string, any>[] = pagedSection ? result.data?.data ?? [] : result.data ?? [];
  const pagination = pagedSection ? result.data?.pagination : undefined;
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => read<{ id: number; name: string }[]>('/roles'), enabled: section === 'users' });
  const save = useMutation({ mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) => id ? api.put(`${config.endpoint}/${id}`, payload) : api.post(config.endpoint, payload), onSuccess: () => { setNotice('Data berhasil disimpan.'); setFieldErrors({}); setEditing(null); setFormOpen(false); cache.invalidateQueries({ queryKey: ['admin', section] }); }, onError: error => { const errors = error?.response?.data?.errors?.fieldErrors ?? {}; setFieldErrors(errors); const invalidFields = Object.keys(errors).map(name => config.fields.find(field => field.name === name)?.label ?? name); setNotice(invalidFields.length ? `Data belum bisa disimpan. Periksa kolom: ${invalidFields.join(', ')}.` : messageFrom(error)); } });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`${config.endpoint}/${id}`), onSuccess: () => { setNotice('Data berhasil dihapus.'); if (section === 'clubs') setClubPage(1); if (section === 'transfers') setTransferPage(1); cache.invalidateQueries({ queryKey: ['admin', section] }); }, onError: error => setNotice(messageFrom(error)) });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const formElement = event.currentTarget; const invalid = validateAdminFields(formElement, config.fields.filter(field => !(editing && section === 'users' && ['email', 'password'].includes(field.name)))); if (Object.keys(invalid).length) { setFieldErrors(invalid); setNotice(`Data belum bisa disimpan. Periksa kolom: ${Object.keys(invalid).map(name => config.fields.find(field => field.name === name)?.label ?? name).join(', ')}.`); return; } const form = new FormData(formElement); const payload: Record<string, unknown> = {}; for (const field of config.fields) { const value = String(form.get(field.name) ?? '').trim(); if (!value) continue; payload[field.name] = field.type === 'number' ? Number(value) : value; } if (section === 'users' && editing) { delete payload.email; delete payload.password; } setNotice(''); setFieldErrors({}); save.mutate({ id: editing?.id, payload }); };
  return <><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Manajemen CMS</p><h1 className="text-3xl font-black">{config.title}</h1></div><button className="button" onClick={() => { setEditing(null); setFieldErrors({}); setNotice(''); setFormOpen(true); }}>Tambah {config.title}</button></div>{notice && <p role={Object.keys(fieldErrors).length ? 'alert' : 'status'} className={`mt-4 rounded-lg p-3 text-sm ${Object.keys(fieldErrors).length ? 'border border-red-200 bg-red-50 text-red-800' : 'bg-slate-100'}`}>{notice}</p>}{formOpen && <form noValidate key={editing?.id ?? 'new'} className="card mt-6 grid gap-4 p-5 md:grid-cols-2" onSubmit={submit}><div className="md:col-span-2 flex items-center justify-between"><h2 className="text-lg font-black">{editing ? `Ubah ${config.title}` : `Tambah ${config.title}`}</h2><button type="button" className="text-sm font-bold text-slate-600" onClick={() => { setFormOpen(false); setEditing(null); }}>Tutup</button></div>{config.fields.filter(field => !(editing && (section === 'users' && ['email', 'password'].includes(field.name)))).map(field => section === 'users' && field.name === 'roleId' ? <label className="block text-sm font-semibold" key={field.name}>{field.label}<select name="roleId" required defaultValue={editing?.roleId ?? ''} aria-invalid={Boolean(fieldErrors.roleId?.length)} aria-describedby={fieldErrors.roleId?.length ? 'roleId-error' : undefined} className={`mt-1 w-full rounded-lg border p-2 ${fieldErrors.roleId?.length ? 'border-red-500' : ''}`}><option value="">Pilih peran</option>{(roles.data ?? []).map(role => <option key={role.id} value={role.id}>{label(role.name)}</option>)}</select>{fieldErrors.roleId?.map(error => <span id="roleId-error" role="alert" className="mt-1 block text-xs font-normal text-red-700" key={error}>{translateValidationMessage(error)}</span>)}</label> : <AdminFieldInput key={field.name} field={field} value={valueForForm(editing?.[field.name], field.type)} error={fieldErrors[field.name]?.[0]} />)}<div className="md:col-span-2"><button className="button" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button></div></form>}<div className="cms-table-card card mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><h2 className="text-sm font-extrabold text-ink">Daftar {config.title.toLowerCase()}</h2>{pagedSection && <span className="text-xs font-semibold text-slate-500">{pagination?.total ?? 0} {section === 'clubs' ? 'klub' : 'transfer'}</span>}</div>{section === 'clubs' && <form className="flex w-full gap-2 sm:w-auto" role="search" onSubmit={event => { event.preventDefault(); setClubSearch(clubSearchInput.trim()); setClubPage(1); }}><label className="sr-only" htmlFor="cms-club-search">Cari nama klub atau negara</label><input id="cms-club-search" value={clubSearchInput} onChange={event => setClubSearchInput(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm sm:w-64" placeholder="Cari nama klub atau negara" /><button className="button shrink-0 px-4">Cari</button>{clubSearch && <button type="button" className="rounded-lg border px-3 text-sm font-semibold" onClick={() => { setClubSearchInput(''); setClubSearch(''); setClubPage(1); }}>Hapus filter</button>}</form>}{section === 'transfers' && <form className="flex w-full flex-wrap gap-2 sm:w-auto" role="search" onSubmit={event => { event.preventDefault(); setTransferSearch(transferSearchInput.trim()); setTransferPage(1); }}><label className="sr-only" htmlFor="cms-transfer-search">Cari nama pemain atau klub</label><input id="cms-transfer-search" value={transferSearchInput} onChange={event => setTransferSearchInput(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm sm:w-56" placeholder="Cari pemain atau klub"/><label className="sr-only" htmlFor="cms-transfer-continent">Filter benua</label><select id="cms-transfer-continent" value={transferContinent} onChange={event => { setTransferContinent(event.target.value); setTransferPage(1); }} className="rounded-lg border px-3 py-2 text-sm"><option value="">Semua benua</option>{['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'].map(value => <option key={value} value={value}>{value}</option>)}</select><button className="button shrink-0 px-4">Cari</button>{(transferSearch || transferContinent) && <button type="button" className="rounded-lg border px-3 text-sm font-semibold" onClick={() => { setTransferSearchInput(''); setTransferSearch(''); setTransferContinent(''); setTransferPage(1); }}>Hapus filter</button>}</form>}</div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b bg-slate-50"><tr>{config.columns.map(column => <th className="p-3" key={column.label}>{column.label}</th>)}<th className="p-3">Aksi</th></tr></thead><tbody>{rows.map(row => <tr className="border-b last:border-0" key={row.id}>{config.columns.map(column => <td className="p-3" key={column.label}><AdminCell section={section} column={column} row={row} /></td>)}<td className="p-3 whitespace-nowrap"><button className="mr-3 font-bold text-pitch" onClick={() => { setEditing(row); setFieldErrors({}); setNotice(''); setFormOpen(true); }}>Ubah</button><button className="font-bold text-red-600" onClick={() => { if (window.confirm(`Hapus data ini?`)) remove.mutate(row.id); }}>Hapus</button></td></tr>)}</tbody></table>{result.isLoading && <p className="p-5 muted">Memuat data…</p>}{result.isError && <p role="alert" className="p-5 text-red-600">{messageFrom(result.error)}</p>}{!result.isLoading && !result.isError && !rows.length && <p className="p-5 muted">{section === 'clubs' && clubSearch ? `Klub “${clubSearch}” tidak ditemukan.` : section === 'transfers' && transferSearch ? `Transfer untuk “${transferSearch}” tidak ditemukan.` : 'Belum ada data.'}</p>}</div>{pagedSection && pagination && pagination.totalPages > 1 && <nav aria-label={section === 'clubs' ? 'Halaman daftar klub' : 'Halaman data transfer'} className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5"><span className="text-xs text-slate-500">Halaman {pagination.page} dari {pagination.totalPages}</span><div className="flex gap-2"><button type="button" className="cms-page-button" disabled={activePage <= 1} onClick={() => section === 'clubs' ? setClubPage(value => value - 1) : setTransferPage(value => value - 1)}>Sebelumnya</button><button type="button" className="cms-page-button" disabled={activePage >= pagination.totalPages} onClick={() => section === 'clubs' ? setClubPage(value => value + 1) : setTransferPage(value => value + 1)}>Berikutnya</button></div></nav>}</div></>;
}

function AdminCell({ section, column, row }: { section: string; column: { label: string; value: (row: Record<string, any>) => string }; row: Record<string, any> }) {
  const club = section === 'clubs' && column.label === 'Klub'
    ? row
    : section === 'players' && column.label === 'Klub'
      ? row.club
      : section === 'transfers'
        ? column.label === 'Dari' ? row.fromClub : column.label === 'Ke' ? row.toClub : null
        : null;
  if (club?.name) return <span className="inline-flex items-center gap-2"><ClubLogo name={club.name} slug={club.slug} size="sm" />{column.value(row)}</span>;
  if (section === 'matches' && column.label === 'Pertandingan') return <span className="inline-flex items-center gap-2"><ClubLogo name={row.homeClub?.name ?? ''} slug={row.homeClub?.slug} size="sm" />{row.homeClub?.name ?? row.homeClubId}<span aria-hidden="true">vs</span><ClubLogo name={row.awayClub?.name ?? ''} slug={row.awayClub?.slug} size="sm" />{row.awayClub?.name ?? row.awayClubId}</span>;
  return column.value(row);
}

function AdminFieldInput({ field, value, error }: { field: AdminField; value: string; error?: string }) { const common = { name: field.name, required: field.required, minLength: field.minLength, maxLength: field.maxLength, placeholder: field.placeholder, defaultValue: value, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${field.name}-error` : undefined, className: `mt-1 w-full rounded-lg border p-2 ${error ? 'border-red-500 focus:border-red-500' : ''}` }; return <label className={`block text-sm font-semibold ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>{field.label}{field.type === 'textarea' ? <textarea {...common} rows={3} /> : field.type === 'select' ? <select {...common}><option value="">Pilih {field.label.toLowerCase()}</option>{field.options?.map(option => <option value={option} key={option}>{label(option)}</option>)}</select> : <input {...common} type={field.type ?? 'text'} />}{error && <span id={`${field.name}-error`} role="alert" className="mt-1 block text-xs font-normal text-red-700">{translateValidationMessage(error)}</span>}</label>; }

function CommentManager() { const cache = useQueryClient(); const [notice, setNotice] = useState(''); const result = useQuery({ queryKey: ['admin', 'comments'], queryFn: () => read<Record<string, any>[]>('/comments?limit=50') }); const act = useMutation({ mutationFn: ({ id, action }: { id: number; action: string }) => action === 'delete' ? api.delete(`/comments/${id}`) : api.post(`/comments/${id}/${action}`, {}), onSuccess: () => { setNotice('Komentar berhasil diperbarui.'); cache.invalidateQueries({ queryKey: ['admin', 'comments'] }); }, onError: error => setNotice(messageFrom(error)) }); return <><p className="eyebrow">Moderasi CMS</p><h1 className="text-3xl font-black">Komentar</h1>{notice && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{notice}</p>}<div className="mt-6 overflow-x-auto card"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="p-3">Komentar</th><th>Artikel</th><th>Status</th><th className="p-3">Aksi</th></tr></thead><tbody>{(result.data ?? []).map(row => <tr className="border-b last:border-0" key={row.id}><td className="p-3"><p className="font-semibold">{row.user?.name ?? row.name ?? 'Pengunjung'}</p><p className="mt-1 max-w-md text-slate-600">{row.content}</p></td><td>{row.article?.title ?? '—'}</td><td>{label(row.status)}</td><td className="p-3 whitespace-nowrap">{['approve', 'reject', 'spam'].map(action => <button className="mr-2 font-bold text-pitch" key={action} onClick={() => act.mutate({ id: row.id, action })}>{label(action)}</button>)}<button className="font-bold text-red-600" onClick={() => { if (window.confirm('Hapus komentar ini?')) act.mutate({ id: row.id, action: 'delete' }); }}>Hapus</button></td></tr>)}</tbody></table>{result.isLoading && <p className="p-5 muted">Memuat komentar…</p>}{result.isError && <p role="alert" className="p-5 text-red-600">{messageFrom(result.error)}</p>}</div></>; }

function MediaManager() { const cache = useQueryClient(); const [notice, setNotice] = useState(''); const result = useQuery({ queryKey: ['admin', 'media'], queryFn: () => read<Record<string, any>[]>('/media') }); const upload = useMutation({ mutationFn: (form: FormData) => api.post('/media', form), onSuccess: () => { setNotice('Media berhasil diunggah.'); cache.invalidateQueries({ queryKey: ['admin', 'media'] }); }, onError: error => setNotice(messageFrom(error)) }); const remove = useMutation({ mutationFn: (id: number) => api.delete(`/media/${id}`), onSuccess: () => { setNotice('Media berhasil dihapus.'); cache.invalidateQueries({ queryKey: ['admin', 'media'] }); }, onError: error => setNotice(messageFrom(error)) }); return <><p className="eyebrow">Pustaka CMS</p><h1 className="text-3xl font-black">Media</h1>{notice && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{notice}</p>}<form className="card mt-6 flex flex-wrap items-end gap-3 p-5" onSubmit={event => { event.preventDefault(); upload.mutate(new FormData(event.currentTarget)); }}><label className="text-sm font-semibold">Berkas gambar<input required name="file" type="file" accept=".jfif,image/jpeg,image/png,image/webp" className="mt-1 block" /></label><label className="text-sm font-semibold">Teks alternatif<input name="altText" className="mt-1 block rounded-lg border p-2" /></label><button className="button" disabled={upload.isPending}>{upload.isPending ? 'Mengunggah…' : 'Unggah media'}</button></form><div className="mt-6 overflow-x-auto card"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="p-3">Nama berkas</th><th>Tipe</th><th>Ukuran</th><th className="p-3">Aksi</th></tr></thead><tbody>{(result.data ?? []).map(row => <tr className="border-b last:border-0" key={row.id}><td className="p-3">{row.originalName}</td><td>{row.mimeType}</td><td>{Math.ceil(row.size / 1024)} KB</td><td className="p-3"><a className="mr-3 font-bold text-pitch" href={`${api.defaults.baseURL?.replace('/api', '')}${row.filepath}`} target="_blank" rel="noreferrer">Lihat</a><button className="font-bold text-red-600" onClick={() => { if (window.confirm('Hapus media ini?')) remove.mutate(row.id); }}>Hapus</button></td></tr>)}</tbody></table>{result.isLoading && <p className="p-5 muted">Memuat media…</p>}{result.isError && <p role="alert" className="p-5 text-red-600">{messageFrom(result.error)}</p>}</div></>; }

function SettingsManager() { const cache = useQueryClient(); const [notice, setNotice] = useState(''); const result = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => read<Record<string, string>>('/settings') }); const save = useMutation({ mutationFn: (payload: Record<string, string>) => api.put('/settings', payload), onSuccess: () => { setNotice('Pengaturan berhasil disimpan.'); cache.invalidateQueries({ queryKey: ['admin', 'settings'] }); }, onError: error => setNotice(messageFrom(error)) }); const fields: AdminField[] = [{ name: 'siteName', label: 'Nama situs' }, { name: 'tagline', label: 'Tagline' }, { name: 'contactEmail', label: 'Email kontak' }, { name: 'articlesPerPage', label: 'Artikel per halaman', type: 'number' }, { name: 'commentsEnabled', label: 'Komentar aktif (true/false)' }, { name: 'maintenanceMode', label: 'Mode pemeliharaan (true/false)' }, { name: 'description', label: 'Deskripsi', type: 'textarea' }]; return <><p className="eyebrow">Konfigurasi CMS</p><h1 className="text-3xl font-black">Pengaturan</h1>{notice && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{notice}</p>}<form className="card mt-6 grid gap-4 p-5 md:grid-cols-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); save.mutate(Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]))); }}>{fields.map(field => <AdminFieldInput field={field} key={field.name} value={result.data?.[field.name] ?? ''} />)}<div className="md:col-span-2"><button className="button" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan pengaturan'}</button></div></form>{result.isError && <p role="alert" className="mt-4 text-red-600">{messageFrom(result.error)}</p>}</>; }

export function ArticleEditorPage() { const { user, loading } = useAuth(); const { id } = useParams(); const navigate = useNavigate(); const existing = useArticle(id ?? ''); const categories = useCategories(); const [error, setError] = useState(''); const imageInput = useRef<HTMLInputElement>(null); const save = useMutation({ mutationFn: async ({ payload, file }: { payload: Record<string, unknown>; file: File | null }) => { if (id) { const response = await api.put(`/articles/${id}`, payload); if (file) { const body = new FormData(); body.append('file', file); await api.post(`/articles/${id}/image`, body); } return response; } const body = new FormData(); for (const [key, value] of Object.entries(payload)) if (key !== 'tagIds' && value !== null && value !== undefined) body.append(key, String(value)); if (file) body.append('image', file); return api.post('/articles', body); }, onSuccess: () => navigate('/admin/articles', { state: { successMessage: id ? 'Artikel berhasil diperbarui.' : 'Artikel berhasil ditambahkan.' } }) }); const article = id ? existing.data : undefined; const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title') ?? '').trim(); const excerpt = String(form.get('excerpt') ?? '').trim(); const content = String(form.get('content') ?? '').trim(); const invalidFields = [title.length < 8 || title.length > 180 ? 'Judul (8–180 karakter)' : '', excerpt.length < 10 || excerpt.length > 500 ? 'Ringkasan (10–500 karakter)' : '', content.length < 30 ? 'Konten (minimal 30 karakter)' : '', !form.get('categoryId') ? 'Kategori' : ''].filter(Boolean); if (invalidFields.length) { setError(`Data belum bisa disimpan. Periksa kolom: ${invalidFields.join(', ')}.`); return; } const payload = { title, excerpt, content, categoryId: Number(form.get('categoryId')), seoTitle: String(form.get('seoTitle')) || null, seoDescription: String(form.get('seoDescription')) || null, tagIds: [] as number[] }; setError(''); const file = imageInput.current?.files?.item(0) ?? null; save.mutate({ payload, file }, { onError: error => setError(messageFrom(error)) }); }; const workflow = useMutation({ mutationFn: (action: string) => api.post(`/articles/${id}/${action}`, {}), onSuccess: (_response, action) => navigate('/admin/articles', { state: { successMessage: action === 'publish' ? 'Artikel berhasil dipublikasikan.' : 'Artikel berhasil dikirim untuk ditinjau.' } }), onError: error => setError(messageFrom(error)) }); if (loading) return <section className="cms-page min-h-[calc(100vh-4.5rem)] px-4 py-10"><p className="mx-auto max-w-5xl text-sm text-slate-500">Memeriksa sesi...</p></section>; if (!user) return <Navigate to="/login" replace />; return <section className="cms-page cms-editor-page min-h-[calc(100vh-4.5rem)] px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">CMS Artikel</p><h1 className="text-3xl font-black">{id ? 'Ubah artikel' : 'Artikel baru'}</h1></div>{id && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button className="button w-full sm:w-auto" disabled={workflow.isPending} onClick={() => workflow.mutate('submit')}>Kirim untuk ulasan</button>{['EDITOR','ADMIN','SUPER_ADMIN'].includes(user.role) && <button className="button w-full sm:w-auto" disabled={workflow.isPending} onClick={() => workflow.mutate('publish')}>Publikasikan</button>}</div>}</div><form noValidate key={article?.id ?? 'new'} className="cms-editor-form mt-5 space-y-4 card p-4 sm:mt-6 sm:p-6" onSubmit={submit}><label className="block font-semibold">Judul <span className="cms-field-note">Wajib diisi (8-180 karakter)</span><input required minLength={8} name="title" defaultValue={article?.title} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block font-semibold">Ringkasan <span className="cms-field-note">Wajib diisi (10-500 karakter)</span><textarea required minLength={10} name="excerpt" defaultValue={article?.excerpt} className="mt-1 w-full rounded-lg border p-2" rows={3}/></label><label className="block font-semibold">Konten <span className="cms-field-note">Wajib diisi (minimal 30 karakter)</span><textarea required minLength={30} name="content" defaultValue={article?.content.replace(/<[^>]*>/g, '')} className="mt-1 w-full rounded-lg border p-2" rows={12}/></label><label className="block font-semibold">Gambar berita<input ref={imageInput} name="image" type="file" accept=".jfif,image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg border p-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Unggah foto yang benar-benar terkait dengan pemain, klub, pertandingan, atau peristiwa di artikel. Hindari foto bola atau stadion generik. Format JPG, JFIF, PNG, atau WebP (maks. 5 MB); gambar disimpan langsung di database.</span></label><label className="block font-semibold">Kategori <span className="cms-field-note">Wajib</span><select required name="categoryId" defaultValue={article?.category ? categories.data?.find(row => row.name === article.category.name)?.id : ''} className="mt-1 w-full rounded-lg border p-2"><option value="">Pilih kategori</option>{(categories.data ?? []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="block font-semibold">Judul SEO <span className="cms-field-note">Opsional</span><input name="seoTitle" defaultValue={article?.seoTitle ?? ''} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block font-semibold">Deskripsi SEO <span className="cms-field-note">Opsional</span><textarea name="seoDescription" defaultValue={article?.seoDescription ?? ''} className="mt-1 w-full rounded-lg border p-2" rows={2}/></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="button w-full sm:w-auto" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan draf'}</button></form></div></section>; }

export function AboutPage() { return <section className="shell max-w-3xl py-10 sm:py-16"><p className="eyebrow">Tentang 2anNews</p><h1 className="page-heading mt-3">Rumah berita sepak bola</h1><p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">2anNews menyatukan berita, jadwal pertandingan, klasemen, klub, pemain, dan kabar transfer dalam satu tempat. Ikuti cerita sepak bola dengan informasi yang tersusun jelas dan mudah dijelajahi.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link className="card p-5 font-bold text-ink hover:text-pitch" to="/news">Jelajahi berita<span className="mt-1 block text-sm font-normal text-slate-500">Liputan terbaru dari dunia sepak bola</span></Link><Link className="card p-5 font-bold text-ink hover:text-pitch" to="/matches">Lihat pertandingan<span className="mt-1 block text-sm font-normal text-slate-500">Jadwal dan hasil pertandingan</span></Link></div></section>; }
export function NotFoundPage() { return <section className="shell grid min-h-[55vh] place-items-center py-14 text-center"><div><p className="eyebrow justify-center">2anNews</p><h1 className="page-heading mt-4">Halaman tidak ditemukan</h1><p className="mx-auto mt-3 max-w-md text-slate-500">Halaman yang Anda cari mungkin sudah dipindahkan.</p><Link className="button mt-6" to="/">Kembali ke beranda</Link></div></section>; }







