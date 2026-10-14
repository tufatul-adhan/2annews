import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Clock3, Eye, Heart, MessageCircle, Share2, Star } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useArticle } from '../hooks/useContent';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { ApiResponse, Article } from '../types';
import { ArticleImage } from '../components/ArticleImage';
import { ArticleBody } from '../components/ArticleBody';

type Comment = { id: number; content: string; createdAt: string; name?: string | null; user?: { name: string } | null; replies: { id: number; content: string; user?: { name: string } | null }[] };
const readComments = (articleId: number) => api.get<ApiResponse<Comment[]>>(`/comments?articleId=${articleId}`).then(response => response.data.data);

export function ArticlePage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const article = useArticle(slug);
  const client = useQueryClient();
  const commentForm = useRef<HTMLFormElement>(null);
  const [commentError, setCommentError] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const comments = useQuery({ queryKey: ['comments', article.data?.id], queryFn: () => readComments(article.data!.id), enabled: Boolean(article.data?.id) });
  const action = useMutation({ mutationFn: ({ kind, active }: { kind: 'like' | 'bookmark'; active: boolean }) => api.request({ url: `/articles/${article.data!.id}/${kind}`, method: active ? 'delete' : 'post' }), onSuccess: () => client.invalidateQueries({ queryKey: ['article', slug] }) });
  const submitComment = useMutation({ mutationFn: ({ content, name, email }: { content: string; name?: string; email?: string }) => api.post('/comments', { articleId: article.data!.id, content, ...(name ? { name } : {}), ...(email ? { email } : {}) }), onSuccess: () => { setCommentError(''); commentForm.current?.reset(); client.invalidateQueries({ queryKey: ['comments', article.data?.id] }); client.invalidateQueries({ queryKey: ['article', slug] }); }, onError: () => setCommentError('Komentar tidak dapat dikirim. Silakan coba lagi.') });
  const submitRating = useMutation({ mutationFn: (value: number) => api.put(`/articles/${article.data!.id}/rating`, { value }), onSuccess: (_response, value) => { setRatingError(''); setSelectedRating(value); client.invalidateQueries({ queryKey: ['article', slug] }); }, onError: () => setRatingError('Rating tidak dapat disimpan. Silakan coba lagi.') });
  useEffect(() => { setSelectedRating(null); setRatingError(''); }, [article.data?.id]);
  const onComment = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); submitComment.mutate({ content: String(form.get('content') ?? ''), ...(!user ? { name: String(form.get('name') ?? ''), email: String(form.get('email') ?? '') } : {}) }); };
  const shareArticle = async () => {
    try {
      if (navigator.share) await navigator.share({ title: article.data?.title, url: window.location.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); setShareNotice('Tautan artikel disalin.'); }
      else setShareNotice('Fitur berbagi tidak tersedia di browser ini.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareNotice('Tautan artikel belum bisa dibagikan.');
    }
  };
  if (article.isLoading) return <div className="shell py-20 muted">Memuat artikel…</div>;
  if (!article.data) return <div className="shell py-20">Artikel tidak ditemukan.</div>;
  const item = article.data;

  return <article className="article-page pb-10 sm:pb-14"><header className="article-masthead relative isolate overflow-hidden py-10 sm:py-16"><div className="shell relative max-w-5xl"><p className="article-category">{item.category.name}</p><h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight sm:mt-6 sm:text-6xl">{item.title}</h1><p className="mt-4 max-w-3xl text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8">{item.excerpt}</p><div className="article-byline mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold sm:mt-8"><span>Oleh <strong>{item.author.name}</strong></span><span className="inline-flex items-center gap-1.5"><Clock3 size={15}/>{item.publishedAt && new Date(item.publishedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span><span className="inline-flex items-center gap-1.5"><Eye size={15}/>{item.viewsCount} tayangan</span></div></div></header>
    <div className="shell article-deck max-w-5xl"><div className="article-cover relative -mt-8 aspect-[16/8] overflow-hidden bg-emerald-950"><ArticleImage article={item} className="absolute inset-0 h-full w-full object-cover"/>{item.image?.credit && <div className="article-photo-credit absolute bottom-4 left-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-white sm:bottom-5 sm:left-5"><span>Foto: {item.image.credit}</span>{item.image.sourceUrl && <a className="underline underline-offset-2 hover:text-lime" href={item.image.sourceUrl} target="_blank" rel="noreferrer">Lihat sumber</a>}</div>}</div>
      <div className="article-body mx-auto max-w-3xl"><div className="article-actions sticky top-24 z-20 -mt-5 flex flex-wrap items-center gap-1 p-1.5 sm:top-[4.5rem] sm:gap-2 sm:p-2"><button disabled={!user || action.isPending} className="button px-2.5 py-2 text-sm sm:px-3" onClick={() => action.mutate({ kind: 'like', active: Boolean(item.viewer?.liked) })}><Heart size={16}/><span className="ml-1.5">{item.viewer?.liked ? 'Disukai' : 'Suka'} · {item._count?.likes ?? 0}</span></button><button disabled={!user || action.isPending} className="min-h-11 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 sm:px-3" onClick={() => action.mutate({ kind: 'bookmark', active: Boolean(item.viewer?.bookmarked) })}><Bookmark className="inline" size={16}/> <span className="ml-1">{item.viewer?.bookmarked ? 'Tersimpan' : 'Simpan'}</span></button><button className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-pitch" aria-label="Bagikan artikel" onClick={shareArticle}><Share2 size={17}/></button></div>{shareNotice && <p role="status" aria-live="polite" className="mt-2 text-right text-sm text-slate-500">{shareNotice}</p>}
        <div className="article-prose prose prose-slate mt-8 max-w-none text-base leading-7 text-slate-700 sm:mt-10 sm:text-lg sm:leading-8"><ArticleBody content={item.content}/></div>
        <div className="mt-8 flex flex-wrap gap-2 border-y border-slate-200 py-5">{item.tags.map(({ tag }) => <span className="chip" key={tag.id}>#{tag.name}</span>)}</div>
        <section className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5">
            <div>
              <p className="font-black text-ink">Beri rating untuk artikel ini</p>
              <p className="mt-1 text-sm text-slate-600"><span className="font-bold text-amber-600">{item.rating?.average ? item.rating.average.toFixed(1) : '0.0'} / 5</span> · {item.rating?.count ?? 0} rating</p>
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Pilih rating 1 sampai 5">
              {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" disabled={!user || submitRating.isPending} aria-label={`${value} dari 5 bintang`} aria-pressed={(selectedRating ?? item.rating?.viewer ?? 0) === value} onClick={() => setSelectedRating(value)} className="rounded-md p-1 text-amber-500 disabled:cursor-not-allowed disabled:opacity-60"><Star size={25} fill={(selectedRating ?? item.rating?.viewer ?? 0) >= value ? 'currentColor' : 'none'}/></button>)}
              {user && <button className="button ml-2 px-3 py-2 text-sm" disabled={!selectedRating || submitRating.isPending} onClick={() => selectedRating && submitRating.mutate(selectedRating)}>{submitRating.isPending ? 'Menyimpan…' : item.rating?.viewer ? 'Ubah rating' : 'Kirim rating'}</button>}
            </div>
            {!user && <p className="w-full text-sm text-slate-600"><Link className="font-bold text-pitch" to="/login">Masuk</Link> untuk memberi rating.</p>}
            {ratingError && <p role="alert" className="w-full text-sm text-red-600">{ratingError}</p>}
          </div>
        </section>
        <section className="mt-12 border-t border-slate-200 pt-8"><div className="flex items-center gap-2"><MessageCircle className="text-pitch"/><h2 className="text-2xl font-black">Komentar <span className="text-slate-400">({item._count?.comments ?? 0})</span></h2></div><form ref={commentForm} className="mt-5" onSubmit={onComment}>{!user && <div className="mb-3 grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold" htmlFor="comment-name">Nama</label><input id="comment-name" name="name" required minLength={2} maxLength={80} className="input-field" autoComplete="name" placeholder="Nama Anda"/></div><div><label className="mb-1 block text-sm font-semibold" htmlFor="comment-email">Email</label><input id="comment-email" name="email" type="email" required className="input-field" autoComplete="email" placeholder="nama@email.com"/></div></div>}<label className="sr-only" htmlFor="comment">Tulis komentar</label><textarea id="comment" name="content" required minLength={2} maxLength={2000} className="input-field" rows={4} placeholder="Bagikan pendapat Anda…"/><div className="mt-3 flex items-center gap-3"><button className="button" disabled={submitComment.isPending}>{submitComment.isPending ? 'Mengirim…' : 'Kirim komentar'}</button>{commentError && <p role="alert" className="text-sm text-red-600">{commentError}</p>}</div></form><div className="mt-6 space-y-4">{comments.isLoading && <p className="muted">Memuat komentar…</p>}{(comments.data ?? []).map(comment => <div className="card no-lift p-5" key={comment.id}><p className="font-black text-ink">{comment.user?.name ?? comment.name ?? 'Pembaca'}</p><p className="mt-2 whitespace-pre-line leading-7 text-slate-700">{comment.content}</p><p className="mt-3 text-xs font-semibold text-slate-400">{new Date(comment.createdAt).toLocaleString('id-ID')}</p>{comment.replies.map(reply => <div className="mt-4 border-l-2 border-pitch/30 pl-4" key={reply.id}><p className="text-sm font-black">{reply.user?.name ?? 'Pembaca'}</p><p className="mt-1 text-sm text-slate-700">{reply.content}</p></div>)}</div>)}{!comments.isLoading && !comments.data?.length && <p className="muted">Jadilah orang pertama yang berkomentar.</p>}</div></section>
        {item.relatedArticles?.length ? <section className="mt-12 border-t border-slate-200 pt-8"><p className="eyebrow">Lanjut membaca</p><h2 className="mt-2 text-2xl font-black">Artikel terkait</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{item.relatedArticles.map((related: Article) => <Link key={related.id} className="card p-5 font-bold text-ink hover:text-pitch" to={`/news/${related.slug}`}><p className="text-xs font-bold text-pitch">{related.category.name}</p><p className="mt-2">{related.title}</p></Link>)}</div></section> : null}
      </div>
    </div>
  </article>;
}
