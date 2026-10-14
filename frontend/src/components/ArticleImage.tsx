import { useEffect, useState } from 'react';
import type { Article } from '../types';

function resolveImageUrl(source: string) {
  if (source.startsWith('/api/')) {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
    return `${apiUrl.replace(/\/api\/?$/, '')}${source}`;
  }
  if (source.startsWith('/uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
    return `${apiUrl.replace(/\/api\/?$/, '')}${source}`;
  }
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  return source;
}

export function ArticleImage({ article, className = '' }: { article: Pick<Article, 'thumbnail' | 'title' | 'category'> & { image?: Article['image'] }; className?: string }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  useEffect(() => setImageUnavailable(false), [article.thumbnail]);
  if (!article.thumbnail || imageUnavailable) return <div className={`${className} bg-slate-100`} role="img" aria-label={`Foto berita belum tersedia: ${article.title}`} />;

  return <img
    className={className}
    src={resolveImageUrl(article.thumbnail)}
    alt={article.image?.altText || `Foto berita: ${article.title}`}
    loading="lazy"
    onError={() => setImageUnavailable(true)}
  />;
}
