import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, Heart } from 'lucide-react';
import type { Article } from '../types';
import { ArticleImage } from './ArticleImage';

export function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return <article className={`card group overflow-hidden ${featured ? 'md:col-span-2' : ''}`}>
    <div className={`flex h-full ${featured ? 'flex-col md:flex-row' : 'flex-col'}`}>
      <Link aria-label={`Baca: ${article.title}`} to={`/news/${article.slug}`} className={`${featured ? 'aspect-[16/9] md:aspect-auto md:min-h-[19rem] md:w-[46%]' : 'aspect-[16/9]'} relative block overflow-hidden bg-emerald-950 focus-visible:z-10`}>
        <ArticleImage article={article} className="absolute inset-0 h-full w-full object-cover"/>
        <span className="chip article-image-category absolute left-4 top-4">{article.category.name}</span>
        <div aria-hidden="true" className="article-card-arrow absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center text-white"><ArrowUpRight size={18}/></div>
      </Link>
      <div className={`${featured ? 'md:w-[54%]' : ''} article-card-copy flex flex-1 flex-col p-5 sm:p-6`}>
        <p className="story-kicker">{article.category.name}</p>
        <h2 className={`mt-2 font-bold tracking-tight ${featured ? 'text-2xl sm:text-3xl' : 'text-xl'} text-ink`}><Link to={`/news/${article.slug}`} className="rounded-sm outline-none hover:text-pitch focus:text-pitch">{article.title}</Link></h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
        <div className="article-card-meta mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5 text-xs font-semibold text-slate-500">
          <span>{article.author.name}</span>
          {article.publishedAt && <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}
          <span className="inline-flex items-center gap-1"><Eye size={13}/>{article.viewsCount}</span>
          <span className="inline-flex items-center gap-1"><Heart size={13}/>{article._count?.likes ?? 0}</span>
        </div>
      </div>
    </div>
  </article>;
}
