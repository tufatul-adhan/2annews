export type RecentMatchResult = {
  continent: string;
  date: string;
  competition: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  note?: string;
  source: string;
};

// Selected results verified from competition, federation, club, and match-report sources.
export const recentMatchResults: readonly RecentMatchResult[] = [
  {
    continent: 'Africa', date: '2026-10-13T12:00:00.000Z', competition: 'Betway Premiership',
    home: 'Orlando Pirates', away: 'TS Galaxy', homeScore: 3, awayScore: 0,
    source: 'https://www.psl.co.za/news/article/5616284-pirates-defuse-the-rockets-in-winning',
  },
  {
    continent: 'Africa', date: '2026-10-13T12:00:00.000Z', competition: 'Betway Premiership',
    home: 'Durban City', away: 'AmaZulu', homeScore: 1, awayScore: 2,
    source: 'https://www.psl.co.za/news/article/5616254-amazulu-hand-tinkler-a-rough-start',
  },
  {
    continent: 'Africa', date: '2026-10-13T12:00:00.000Z', competition: 'Betway Premiership',
    home: 'Kaizer Chiefs', away: 'Stellenbosch', homeScore: 1, awayScore: 1,
    source: 'https://www.psl.co.za/news/article/5616274-chiefs-show-character-but-drop-points',
  },
  {
    continent: 'Asia', date: '2026-10-13T12:00:00.000Z', competition: 'AFC Champions League Elite',
    home: 'Pohang Steelers', away: 'Johor Darul Ta’zim', homeScore: 0, awayScore: 2,
    source: 'https://www.the-afc.com/en/club/afc_champions_league_elite.html/news/md2-fc-pohang-steelers-kor-0-2-johor-darul-ta%E2%80%99zim-mas',
  },
  {
    continent: 'Asia', date: '2026-10-13T12:00:00.000Z', competition: 'AFC Champions League Elite',
    home: 'Al Gharafa', away: 'Esteghlal', homeScore: 1, awayScore: 2,
    source: 'https://www.the-afc.com/en/club/afc_champions_league_elite.html/news/md2-al-gharafa-sc-qat-1-2-esteghlal-fc-irn',
  },
  {
    continent: 'Europe', date: '2026-10-13T12:00:00.000Z', competition: 'UEFA Champions League',
    home: 'Arsenal', away: 'Lille', homeScore: 3, awayScore: 0,
    source: 'https://www.uefa.com/uefachampionsleague/news/02aa-21d1f3303cf3-f0d4f4701545-1000--champions-league-matchday-2-tuesday-round-up-arsenal-barce/',
  },
  {
    continent: 'Europe', date: '2026-10-13T12:00:00.000Z', competition: 'UEFA Champions League',
    home: 'Internazionale', away: 'Club Brugge', homeLogo: 'inter-milan', homeScore: 3, awayScore: 4,
    source: 'https://www.uefa.com/uefachampionsleague/news/02aa-21d1f3303cf3-f0d4f4701545-1000--champions-league-matchday-2-tuesday-round-up-arsenal-barce/',
  },
  {
    continent: 'North America', date: '2026-10-10T12:00:00.000Z', competition: 'Major League Soccer',
    home: 'Inter Miami', away: 'D.C. United', homeLogo: 'inter-miami-cf', homeScore: 4, awayScore: 0,
    source: 'https://www.dcunited.com/competitions/mls-regular-season/2026/matches/miavsdc-10-10-2026/lineups',
  },
  {
    continent: 'South America', date: '2026-10-13T12:00:00.000Z', competition: 'Campeonato Brasileiro Série A',
    home: 'Red Bull Bragantino', away: 'Cruzeiro', homeLogo: 'rb-bragantino', homeScore: 4, awayScore: 2,
    source: 'https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro-serie-a/a/brasileirao-30-rodada-termina-com-vitoria-do-red-bull-bragantino-sobre-o-cruzeiro',
  },
  {
    continent: 'Oceania', date: '2026-10-10T12:00:00.000Z', competition: 'Hahn Australia Cup',
    home: 'South Melbourne', away: 'Melbourne Victory', homeScore: 1, awayScore: 1,
    note: 'South Melbourne menang 4–3 melalui adu penalti',
    source: 'https://aleagues.com.au/news/australia-cup-south-melbourne-melbourne-victory-match-report/',
  },
];
