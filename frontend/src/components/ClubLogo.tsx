import { useEffect, useState } from 'react';

type ClubLogoProps = {
  name: string;
  slug?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = { sm: 'h-9 w-9', md: 'h-14 w-14', lg: 'h-24 w-24' };

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : name.slice(0, 3)).toUpperCase();
}

function crestColor(value: string) {
  const palette = ['#166534', '#1d4ed8', '#9f1239', '#7c2d12', '#6b21a8', '#0f766e', '#1e293b'];
  const hash = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function ClubLogo({ name, slug, size = 'md' }: ClubLogoProps) {
  const [failed, setFailed] = useState(false);
  const clubSlug = slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  useEffect(() => setFailed(false), [clubSlug]);

  return (
    <span className={`club-logo ${sizes[size]} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5`}>
      {!failed && <img className="h-full w-full object-contain" src={`/clubs/${clubSlug}.svg`} alt={`${name} logo`} loading="lazy" onError={() => setFailed(true)} />}
      {failed && <svg className="h-full w-full" viewBox="0 0 64 64" role="img" aria-label={`Lambang ${name}`}>
        <path d="M8 7h48v23c0 13-9 22-24 28C17 52 8 43 8 30V7Z" fill={crestColor(clubSlug)} />
        <path d="M14 13h36v17c0 9-6 16-18 21-12-5-18-12-18-21V13Z" fill="none" stroke="white" strokeOpacity=".75" strokeWidth="2" />
        <text x="32" y="37" fill="white" fontSize="17" fontWeight="800" textAnchor="middle" fontFamily="Arial, sans-serif">{initials(name)}</text>
      </svg>}
    </span>
  );
}
