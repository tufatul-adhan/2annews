import type { Match } from '../types';
import { ClubLogo } from './ClubLogo';

const statusLabel: Record<string, string> = { SCHEDULED: 'Terjadwal', LIVE: 'Langsung', FINISHED: 'Selesai', POSTPONED: 'Ditunda', CANCELLED: 'Dibatalkan' };

export function MatchCard({ match }: { match: Match }) {
  const complete = match.status === 'FINISHED';
  const live = match.status === 'LIVE';
  const score = complete ? `${match.homeScore} – ${match.awayScore}` : new Date(match.matchDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return <div className="card group p-4 sm:p-5">
    <div className="flex min-h-5 items-center justify-between gap-2">
      <p className="truncate text-[.68rem] font-bold uppercase tracking-wider text-slate-500">{match.league.name}</p>
      <p className="shrink-0 text-[.68rem] font-semibold text-slate-400">{new Date(match.matchDate).toLocaleDateString('id-ID')}</p>
    </div>
    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-black">
      <div className="flex min-w-0 flex-col items-center gap-2 text-center transition-colors group-hover:text-pitch"><ClubLogo name={match.homeClub.name} slug={match.homeClub.slug} size="sm"/><span className="max-w-full truncate">{match.homeClub.shortName}</span></div>
      <span className={`min-w-16 rounded-xl px-2 py-2.5 text-center text-ink ${live ? 'bg-emerald-50 text-pitch ring-1 ring-emerald-100' : 'bg-slate-100'}`}>{score}</span>
      <div className="flex min-w-0 flex-col items-center gap-2 text-center transition-colors group-hover:text-pitch"><ClubLogo name={match.awayClub.name} slug={match.awayClub.slug} size="sm"/><span className="max-w-full truncate">{match.awayClub.shortName}</span></div>
    </div>
    <p className={`mt-4 text-center text-xs font-bold ${live ? 'text-red-600' : 'text-pitch'}`}>{live && <span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"/>}{statusLabel[match.status] ?? match.status}</p>
  </div>;
}
