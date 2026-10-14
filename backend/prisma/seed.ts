import { PrismaClient, ArticleStatus, MatchStatus, Position, TransferStatus, TransferType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '../src/utils/slug.js';
const prisma = new PrismaClient();
const names = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Champions League', 'Europa League', 'International', 'Asia', 'Africa', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica', 'Transfer', 'Match Report', 'Match Preview', 'Football World'];
const tags = ['Transfer', 'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Manchester City', 'Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 'Mbappe', 'Haaland', 'Champions League', 'Premier League', 'Tactics', 'Youth', 'Injury', 'Manager', 'England', 'Spain', 'Asia', 'Africa', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica', 'ASEAN', 'Indonesia', 'Thailand', 'Vietnam', 'Japan', 'Korea Republic', 'AFC Asian Cup'];
const clubNames = [['Manchester United','MUN','England'],['Liverpool','LIV','England'],['Arsenal','ARS','England'],['Chelsea','CHE','England'],['Manchester City','MCI','England'],['Tottenham Hotspur','TOT','England'],['Real Madrid','RMA','Spain'],['Barcelona','BAR','Spain'],['Atletico Madrid','ATM','Spain'],['Bayern Munich','BAY','Germany'],['Borussia Dortmund','BVB','Germany'],['Juventus','JUV','Italy'],['Inter Milan','INT','Italy'],['Paris Saint-Germain','PSG','France'],['Ajax','AJA','Netherlands']] as const;
const leagues = [['Premier League','England'],['La Liga','Spain'],['Serie A','Italy'],['Bundesliga','Germany'],['UEFA Champions League','Europe']] as const;
type SeedPlayer = { name: string; nationality: string; position: Position; club: 'Liverpool' | 'Manchester City' };
// Skuad di bawah menggunakan pemain aktif dari daftar klub untuk musim 2026/27.
// Data ini menggantikan nama placeholder agar halaman pemain dapat digunakan sebagai demo yang realistis.
const realPlayers: readonly SeedPlayer[] = [
  { name: 'Gianluigi Donnarumma', nationality: 'Italy', position: Position.GOALKEEPER, club: 'Manchester City' },
  { name: 'James Trafford', nationality: 'England', position: Position.GOALKEEPER, club: 'Manchester City' },
  { name: 'Ruben Dias', nationality: 'Portugal', position: Position.DEFENDER, club: 'Manchester City' },
  { name: 'Marc Guehi', nationality: 'England', position: Position.DEFENDER, club: 'Manchester City' },
  { name: 'Josko Gvardiol', nationality: 'Croatia', position: Position.DEFENDER, club: 'Manchester City' },
  { name: 'Rayan Ait-Nouri', nationality: 'Algeria', position: Position.DEFENDER, club: 'Manchester City' },
  { name: 'Rico Lewis', nationality: 'England', position: Position.DEFENDER, club: 'Manchester City' },
  { name: 'Abdukodir Khusanov', nationality: 'Uzbekistan', position: Position.DEFENDER, club: 'Manchester City' },
  { name: 'Matheus Nunes', nationality: 'Portugal', position: Position.MIDFIELDER, club: 'Manchester City' },
  { name: 'Elliot Anderson', nationality: 'England', position: Position.MIDFIELDER, club: 'Manchester City' },
  { name: 'Tijjani Reijnders', nationality: 'Netherlands', position: Position.MIDFIELDER, club: 'Manchester City' },
  { name: 'Phil Foden', nationality: 'England', position: Position.MIDFIELDER, club: 'Manchester City' },
  { name: 'Erling Haaland', nationality: 'Norway', position: Position.FORWARD, club: 'Manchester City' },
  { name: 'Antoine Semenyo', nationality: 'Ghana', position: Position.FORWARD, club: 'Manchester City' },
  { name: 'Omar Marmoush', nationality: 'Egypt', position: Position.FORWARD, club: 'Manchester City' },
  { name: 'Alisson Becker', nationality: 'Brazil', position: Position.GOALKEEPER, club: 'Liverpool' },
  { name: 'Giorgi Mamardashvili', nationality: 'Georgia', position: Position.GOALKEEPER, club: 'Liverpool' },
  { name: 'Virgil van Dijk', nationality: 'Netherlands', position: Position.DEFENDER, club: 'Liverpool' },
  { name: 'Joe Gomez', nationality: 'England', position: Position.DEFENDER, club: 'Liverpool' },
  { name: 'Milos Kerkez', nationality: 'Hungary', position: Position.DEFENDER, club: 'Liverpool' },
  { name: 'Jeremie Frimpong', nationality: 'Netherlands', position: Position.DEFENDER, club: 'Liverpool' },
  { name: 'Ronald Araujo', nationality: 'Uruguay', position: Position.DEFENDER, club: 'Liverpool' },
  { name: 'Alexis Mac Allister', nationality: 'Argentina', position: Position.MIDFIELDER, club: 'Liverpool' },
  { name: 'Ryan Gravenberch', nationality: 'Netherlands', position: Position.MIDFIELDER, club: 'Liverpool' },
  { name: 'Dominik Szoboszlai', nationality: 'Hungary', position: Position.MIDFIELDER, club: 'Liverpool' },
  { name: 'Florian Wirtz', nationality: 'Germany', position: Position.MIDFIELDER, club: 'Liverpool' },
  { name: 'Wataru Endo', nationality: 'Japan', position: Position.MIDFIELDER, club: 'Liverpool' },
  { name: 'Cody Gakpo', nationality: 'Netherlands', position: Position.FORWARD, club: 'Liverpool' },
  { name: 'Alexander Isak', nationality: 'Sweden', position: Position.FORWARD, club: 'Liverpool' },
  { name: 'Hugo Ekitike', nationality: 'France', position: Position.FORWARD, club: 'Liverpool' },
] as const;

// Ringkasan di bawah ditulis ulang oleh 2anNews dari hasil pertandingan yang
// terverifikasi. Sumber dan tanggal publikasi disimpan pada setiap artikel
// agar seed tetap transparan dan tidak mengaku sebagai liputan orisinal.
type SeedNews = {
  date: string;
  title: string;
  category?: string;
  club?: string;
  tags: readonly string[];
  source: string;
  home?: string;
  away?: string;
  score?: string;
  excerpt?: string;
  summary?: string;
  imageFile?: string;
  imageAlt?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
};

export const recentNews: readonly SeedNews[] = [
  {
    date: '2026-10-13T22:00:00Z',
    title: 'Arsenal dan Barcelona menang besar, Bayern ditahan Viking di Liga Champions',
    category: 'Europe',
    tags: ['Europe', 'Champions League', 'Arsenal', 'Barcelona', 'Bayern Munich'],
    source: 'https://www.uefa.com/uefachampionsleague/news/02aa-21d1f3303cf3-f0d4f4701545-1000--champions-league-matchday-2-tuesday-round-up-arsenal-barce/',
    excerpt: 'Arsenal menang 3-0 atas Lille, Barcelona membalikkan keadaan untuk menang 4-1, sementara Bayern bermain imbang 3-3.',
    summary: 'Matchday 2 Liga Champions pada 13 Oktober menghadirkan kemenangan Arsenal 3-0 atas Lille dan Barcelona 4-1 di markas Galatasaray. Sporting CP juga menang 2-0 atas Lens. Bayern München sempat tertinggal dua gol dan berbalik unggul sebelum ditahan Viking 3-3; tiga tim mempertahankan rekor dua kemenangan.',
  },
  {
    date: '2026-10-12T23:45:00Z',
    title: 'Rosario Central pesta gol, River menang, dan Boca berbagi angka di Argentina',
    category: 'South America',
    tags: ['South America'],
    source: 'https://www.tycsports.com/liga-profesional-de-futbol/fecha-12-del-clausura-2026-resultados-y-partidos-de-la-liga-profesional-argentina-id765031.html',
    excerpt: 'Rosario Central menang 5-0, River Plate menundukkan Estudiantes de Río Cuarto 1-0, dan Boca bermain imbang 2-2.',
    summary: 'Pekan ke-12 Torneo Clausura Argentina berakhir pada 12 Oktober. Rosario Central mencatat kemenangan terbesar dengan skor 5-0 atas Independiente Rivadavia, River Plate menang 1-0 atas Estudiantes de Río Cuarto, dan Boca Juniors bermain imbang 2-2 saat bertandang ke Instituto. Lanús menutup pekan dengan kemenangan 2-0 atas Vélez.',
  },
  {
    date: '2026-10-11T21:00:00Z',
    title: 'Al Ahly menangkan derby Kairo 2-0 atas Zamalek',
    category: 'Africa',
    tags: ['Africa'],
    source: 'https://www.cafonline.com/news/al-ahly-beat-zamalek-to-dominate-cairo-derby/',
    home: 'Zamalek',
    away: 'Al Ahly',
    score: '0-2',
    excerpt: 'Gol Mohamed Hany dan Monsef Bakrar mengantar Al Ahly menguasai derby dan sementara naik ke puncak liga Mesir.',
    summary: 'Al Ahly mengalahkan rival sekota Zamalek 2-0 pada Matchday 6 Liga Primer Mesir. Mohamed Hany membuka skor pada menit ke-39 dan Monsef Bakrar menambah gol pada menit ke-80. Kemenangan di Cairo International Stadium membawa Al Ahly sementara ke puncak klasemen dengan 16 poin.',
  },
  {
    date: '2026-10-10T20:00:00Z',
    title: 'South Melbourne juarai Australia Cup setelah menang adu penalti',
    category: 'Oceania',
    tags: ['Oceania'],
    source: 'https://www.ofcproleague.com/news/south-melbourne-fc-make-history-with-australia-cup-success/',
    excerpt: 'South Melbourne mengalahkan Melbourne Victory melalui adu penalti setelah final berakhir 1-1 hingga extra time.',
    summary: 'South Melbourne FC mengangkat trofi Australia Cup setelah mengalahkan Melbourne Victory melalui adu penalti pada 10 Oktober. Kedua tim bermain imbang 1-1 setelah perpanjangan waktu; Max Mikkola menyamakan skor tiga menit sebelum laga usai. South Melbourne menjadi klub non-A-League pertama yang menjuarai kompetisi tersebut.',
  },
  {
    date: '2026-10-07T12:00:00Z',
    title: 'Amerika Serikat tutup jeda internasional dengan kemenangan atas Kanada',
    category: 'North America',
    tags: ['North America'],
    source: 'https://www.ussoccer.com/stories/2026/10/usmnt-vs-canada-match-recap-highlights-st-paul-minnesota',
    home: 'Amerika Serikat',
    away: 'Kanada',
    score: '1-0',
    excerpt: 'Gol Justin Ellis memastikan kemenangan keempat beruntun USMNT dan menutup rangkaian pertandingan internasional musim gugur.',
    summary: 'Tim nasional putra Amerika Serikat mengalahkan Kanada 1-0 di St. Paul pada 6 Oktober. Justin Ellis mencetak gol penentu. Hasil yang dilaporkan U.S. Soccer pada 7 Oktober itu menjadi kemenangan keempat beruntun Amerika Serikat dan menutup kamp internasional tiga minggu mereka.',
  },
  {
    date: '2026-10-14T09:00:00Z',
    title: 'Shabab Al Ahli kalahkan Al Ittihad 2-1 lewat dua gol Sardar Azmoun',
    category: 'Asia',
    tags: ['Asia', 'Champions League'],
    source: 'https://www.the-afc.com/en/club/afc_champions_league_elite.html/news/md2-al-ittihad-club-ksa-1-2-shabab-al-ahli-uae',
    home: 'Al Ittihad',
    away: 'Shabab Al Ahli',
    score: '1-2',
    excerpt: 'Brace Sardar Azmoun membawa Shabab Al Ahli menang di Jeddah dan mengoleksi enam poin dari dua laga.',
    summary: 'Shabab Al Ahli mengalahkan Al Ittihad 2-1 pada Matchday 2 AFC Champions League Elite 2026/27. Sardar Azmoun mencetak kedua gol tim Uni Emirat Arab itu. Hasil tersebut membuat Shabab Al Ahli mengantongi enam poin, sementara Al Ittihad masih mencari kemenangan pertamanya.',
  },
  {
    date: '2026-10-14T08:30:00Z',
    title: 'Al Hilal menang 2-0 atas Al Sadd dan lanjutkan start sempurna',
    category: 'Asia',
    tags: ['Asia', 'Champions League'],
    source: 'https://www.the-afc.com/en/club/afc_champions_league_elite.html/news/md2-al-sadd-sc-qat-0-2-al-hilal-sfc-ksa',
    home: 'Al Sadd',
    away: 'Al Hilal',
    score: '0-2',
    excerpt: 'Gol Ollie Watkins dan penalti Ruben Neves memastikan kemenangan kedua beruntun Al Hilal di fase liga.',
    summary: 'Al Hilal mencatat kemenangan kedua di AFC Champions League Elite 2026/27 setelah menundukkan Al Sadd 2-0 di Doha. Ollie Watkins membuka skor pada babak pertama, lalu Ruben Neves memastikan hasil lewat titik penalti. Al Sadd menelan kekalahan kedua secara beruntun.',
  },
  {
    date: '2026-10-12T19:30:00Z',
    title: 'Liga Champions kembali: Arsenal, Barcelona, Bayern, dan Manchester United beraksi malam ini',
    category: 'Champions League',
    tags: ['Champions League', 'Arsenal', 'Barcelona', 'Bayern Munich', 'Manchester United'],
    source: 'https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-a/',
    imageFile: 'champions-league-matchday-2.jpeg',
    imageAlt: 'Lautaro Martínez, Harry Kane, dan Viktor Gyökeres menjelang Matchday 2 Liga Champions',
    imageCredit: 'UEFA',
    imageSourceUrl: 'https://www.uefa.com/uefachampionsleague/news/02aa-21c5297d7408-32d70b5a4443-1000--champions-league-matchday-2-key-stats-and-what-to-look-o/',
    excerpt: 'Matchday kedua fase liga menghadirkan Arsenal vs Lille, Galatasaray vs Barcelona, Atlético vs Manchester United, serta Viking vs Bayern München.',
    summary: 'UEFA menjadwalkan sembilan pertandingan Liga Champions pada Selasa, 13 Oktober. Laga lain yang menarik perhatian adalah Inter vs Club Brugge dan Villarreal vs Napoli. Pertandingan berlangsung malam ini waktu Eropa.',
  },
  {
    date: '2026-10-12T10:00:00Z',
    title: 'City menang di Anfield, Arsenal bangkit, dan Chelsea berpesta gol pada akhir pekan Premier League',
    category: 'Premier League',
    tags: ['Premier League', 'Manchester City', 'Arsenal', 'Chelsea', 'Liverpool'],
    source: 'https://www.theguardian.com/football/2026/oct/12/premier-league-10-talking-points-from-the-weekend-action',
    imageFile: 'premier-league-weekend-roundup.jpg',
    imageAlt: 'Pemain Premier League dalam rangkuman pertandingan akhir pekan',
    imageCredit: 'The Guardian',
    imageSourceUrl: 'https://www.theguardian.com/football/2026/oct/12/premier-league-10-talking-points-from-the-weekend-action',
    excerpt: 'Pekan keenam menyajikan kemenangan besar Manchester City dan Chelsea, kebangkitan Arsenal, serta satu poin untuk Tottenham di Old Trafford.',
    summary: 'Rangkuman akhir pekan Guardian menyoroti kemenangan Manchester City 3-0 di Liverpool, Arsenal yang membalikkan keadaan untuk menang 2-1 atas Leeds, dan Chelsea yang mengalahkan Bournemouth 5-1. Tottenham juga menahan Manchester United 1-1 setelah bermain dengan sepuluh pemain.',
  },
  {
    date: '2026-10-11T18:00:00Z',
    title: 'Manchester City bungkam Anfield 3-0 dan lanjutkan start sempurna',
    category: 'Premier League',
    club: 'Manchester City',
    tags: ['Premier League', 'Manchester City', 'Liverpool', 'Haaland'],
    source: 'https://www.skysports.com/football/liverpool-vs-manchester-city/559501',
    imageFile: 'liverpool-manchester-city.jpg',
    imageAlt: 'Manchester City dan Liverpool menjelang pertandingan di Anfield',
    imageCredit: 'Sky Sports',
    imageSourceUrl: 'https://www.skysports.com/football/liverpool-vs-manchester-city/559501',
    home: 'Liverpool',
    away: 'Manchester City',
    score: '0-3',
    excerpt: 'Gol Erling Haaland, Jérémy Doku, dan Rayan Cherki memastikan kemenangan City atas Liverpool yang bermain dengan sepuluh orang.',
    summary: 'Manchester City mengalahkan Liverpool 3-0 di Anfield pada 11 Oktober. Ryan Gravenberch menerima kartu kuning kedua pada menit ke-62; Haaland, Doku, dan Cherki kemudian mencetak gol. Hasil ini mempertahankan rekor sempurna City di liga.',
  },
  {
    date: '2026-10-10T18:00:00Z',
    title: 'Jordan Henderson bersinar saat Chelsea menang 5-1 atas Bournemouth',
    category: 'Premier League',
    club: 'Chelsea',
    tags: ['Premier League', 'Chelsea', 'Transfer'],
    source: 'https://www.premierleague.com/en/news/4730396/henderson-stars-on-home-debut-as-chelsea-thrash-bournemouth',
    imageFile: 'chelsea-bournemouth.jpg',
    imageAlt: 'Jordan Henderson dan João Pedro merayakan gol Chelsea',
    imageCredit: 'Premier League',
    imageSourceUrl: 'https://www.premierleague.com/en/news/4730396/henderson-stars-on-home-debut-as-chelsea-thrash-bournemouth',
    home: 'Chelsea',
    away: 'Bournemouth',
    score: '5-1',
    excerpt: 'Henderson mencetak dua gol dan membuat satu assist pada debut kandangnya, sementara Chelsea naik ke posisi kelima.',
    summary: 'Chelsea mengakhiri rangkaian tanpa kemenangan dengan mengalahkan Bournemouth 5-1 di Stamford Bridge. Jordan Henderson mencetak dua gol dan memberi assist, sedangkan João Pedro juga mencatatkan dua gol.',
  },
  {
    date: '2026-10-10T14:30:00Z',
    title: 'Arsenal bangkit dari ketertinggalan untuk menundukkan Leeds 2-1',
    category: 'Premier League',
    club: 'Arsenal',
    tags: ['Premier League', 'Arsenal'],
    source: 'https://www.premierleague.com/en/news/4731669/what-weve-learned-from-saturdays-matches/',
    imageFile: 'arsenal-leeds.jpg',
    imageAlt: 'Bruno Guimarães merayakan gol Arsenal melawan Leeds',
    imageCredit: 'The Guardian',
    imageSourceUrl: 'https://www.premierleague.com/en/news/4731669/what-weve-learned-from-saturdays-matches/',
    home: 'Arsenal',
    away: 'Leeds United',
    score: '2-1',
    excerpt: 'Gol Riccardo Calafiori dan Bruno Guimarães dalam rentang 15 menit membawa Arsenal membalikkan keadaan di Emirates Stadium.',
    summary: 'Leeds sempat unggul lewat James Justin pada menit ke-55. Arsenal merespons cepat melalui Riccardo Calafiori dan Bruno Guimarães untuk mengamankan kemenangan 2-1 pada 10 Oktober.',
  },
  {
    date: '2026-10-10T17:30:00Z',
    title: 'Tottenham selamatkan satu poin setelah bermain dengan sepuluh pemain di Old Trafford',
    category: 'Premier League',
    tags: ['Premier League', 'Manchester United'],
    source: 'https://www.theguardian.com/football/2026/oct/12/premier-league-10-talking-points-from-the-weekend-action',
    imageFile: 'manchester-united-tottenham.jpg',
    imageAlt: 'Pemain Tottenham merayakan gol di Old Trafford',
    imageCredit: 'The Guardian',
    imageSourceUrl: 'https://www.theguardian.com/football/2026/oct/12/premier-league-10-talking-points-from-the-weekend-action',
    home: 'Manchester United',
    away: 'Tottenham Hotspur',
    score: '1-1',
    excerpt: 'Dominic Solanke mencetak gol penyama pada akhir laga dan membawa Tottenham pulang dengan satu poin.',
    summary: 'Manchester United dan Tottenham bermain imbang 1-1 pada 10 Oktober. Tottenham mengakhiri laga dengan sepuluh pemain, tetapi Dominic Solanke mencetak gol penyeimbang setelah United tampil kurang meyakinkan.',
  },
  {
    date: '2026-10-02T16:00:00Z',
    title: 'Indonesia lolos ke final FIFA ASEAN Cup 2026 usai menang 9-2 atas Bangladesh',
    category: 'Asia',
    tags: ['Asia', 'ASEAN', 'Indonesia'],
    source: 'https://www.the-afc.com/en/more/fifa_asean_cup.html/news/div-1-indonesia-pip-malaysia-in-group-a-to-reach-decider',
    imageFile: 'indonesia-bangladesh-9-2.jpg',
    imageAlt: 'Pemain Indonesia merayakan kemenangan atas Bangladesh di FIFA ASEAN Cup',
    imageCredit: 'AFC',
    imageSourceUrl: 'https://www.the-afc.com/en/more/fifa_asean_cup.html/news/div-1-indonesia-pip-malaysia-in-group-a-to-reach-decider',
    home: 'Indonesia',
    away: 'Bangladesh',
    score: '9-2',
    excerpt: 'Dua gol pada masa tambahan waktu membawa Indonesia ke final FIFA ASEAN Cup 2026 Division 1.',
    summary: 'AFC melaporkan Indonesia mengalahkan Bangladesh 9-2 untuk menyalip Malaysia pada jumlah gol yang dicetak. Kedua tim sama-sama mengoleksi tujuh poin dan selisih gol yang sama di Grup A.',
  },
  {
    date: '2026-10-02T15:00:00Z',
    title: 'Thailand puncaki Grup B, Vietnam pastikan laga perebutan tempat ketiga',
    category: 'Asia',
    tags: ['Asia', 'ASEAN', 'Thailand', 'Vietnam'],
    source: 'https://www.the-afc.com/en/more/fifa_asean_cup.html/news/div-1-thailand-top-group-b-vietnam-to-vie-for-third-place',
    imageFile: 'thailand-philippines-asean-cup.jpg',
    imageAlt: 'Pemain Thailand dan Filipina berebut bola di FIFA ASEAN Cup',
    imageCredit: 'AFC',
    imageSourceUrl: 'https://www.the-afc.com/en/more/fifa_asean_cup.html/news/div-1-thailand-top-group-b-vietnam-to-vie-for-third-place',
    excerpt: 'Thailand tetap memimpin Grup B FIFA ASEAN Cup 2026, sementara Vietnam menang 4-2 atas Pakistan.',
    summary: 'Menurut AFC, Thailand tetap finis di puncak Grup B meski kalah 1-2 dari Filipina. Vietnam bangkit pada babak kedua untuk mengalahkan Pakistan 4-2 dan melaju ke laga perebutan tempat ketiga melawan Malaysia.',
  },
  {
    date: '2026-10-02T13:30:00Z',
    title: 'Jepang menang adu penalti atas Ekuador; Uzbekistan dan Lebanon pesta gol',
    category: 'Asia',
    tags: ['Asia', 'Japan'],
    source: 'https://www.the-afc.com/en/more/international_friendlies.html/news/japan-triumph-uzbekistan-lebanon-impress-3',
    imageFile: 'japan-ecuador-friendly.jpg',
    imageAlt: 'Pemain Jepang merayakan hasil pertandingan persahabatan melawan Ekuador',
    imageCredit: 'AFC',
    imageSourceUrl: 'https://www.the-afc.com/en/more/international_friendlies.html/news/japan-triumph-uzbekistan-lebanon-impress-3',
    home: 'Jepang',
    away: 'Ekuador',
    score: '0-0 (5-4 pen.)',
    excerpt: 'Jepang menang 5-4 lewat adu penalti setelah bermain imbang tanpa gol melawan Ekuador di Yokohama.',
    summary: 'AFC mencatat Jepang memenangkan laga uji coba lewat adu penalti. Uzbekistan menang 4-1 atas Suriah, sedangkan Lebanon mengalahkan Maladewa 6-0.',
  },
  {
    date: '2026-10-01T12:00:00Z',
    title: 'Kualifikasi Piala Asia Wanita U-17 2027 dimulai dengan rekor 29 peserta',
    category: 'Asia',
    tags: ['Asia', 'Youth'],
    source: 'https://www.the-afc.com/en/national/afc_u17_womens_asian_cup.html/news/u17wac-qualifiers-cast-sets-sights-china-2027',
    excerpt: 'Sebanyak 29 tim akan memulai perjuangan menuju AFC U-17 Women’s Asian Cup China 2027 pada 5 Oktober.',
    summary: 'AFC menyebut jumlah peserta kualifikasi kali ini sebagai yang terbesar dalam sejarah kompetisi. Delapan tiket putaran final akan diperebutkan oleh 29 tim.',
  },
  {
    date: '2026-09-29T12:00:00Z',
    title: 'Arab Saudi memasuki hitung mundur 100 hari menuju Piala Asia 2027',
    category: 'Asia',
    tags: ['Asia', 'AFC Asian Cup'],
    source: 'https://www.the-afc.com/en/national/afc_asian_cup.html/news/100-days-to-go-saudi-arabia-ready-asiancup2027',
    excerpt: 'Persiapan AFC Asian Cup Saudi Arabia 2027 memasuki fase operasional menjelang laga pembuka 7 Januari.',
    summary: 'AFC menyatakan Arab Saudi bersiap menjadi tuan rumah Piala Asia untuk pertama kalinya. Turnamen dijadwalkan berlangsung dari 7 Januari hingga 5 Februari 2027.',
  },
  {
    date: '2026-10-02T14:30:00Z',
    title: 'Pemain Premier League menonjol di jeda internasional, Havertz kembali ke Arsenal untuk perawatan',
    category: 'Premier League',
    tags: ['Premier League', 'Arsenal', 'Liverpool', 'Manchester City', 'England'],
    source: 'https://www.premierleague.com/en/news/4727187',
    imageFile: 'premier-league-international-players.jpg',
    imageAlt: 'Kolase pemain Premier League yang tampil pada jeda internasional',
    imageCredit: 'Premier League',
    imageSourceUrl: 'https://www.premierleague.com/en/news/4727187',
    excerpt: 'Sejumlah pemain Premier League tampil untuk tim nasional, sementara Kai Havertz kembali ke Arsenal setelah mengalami masalah otot.',
    summary: 'Premier League mencatat Florian Wirtz mencetak gol penentu kemenangan Jerman atas Serbia. Laporan yang sama menyebut Kai Havertz kembali ke Arsenal untuk menjalani perawatan setelah ditarik keluar saat Jerman menghadapi Belanda.',
  },
  {
    date: '2026-10-02T12:00:00Z',
    title: 'Inggris menatap laga Kroasia setelah menang 2-0 atas Ceko',
    category: 'International',
    tags: ['England', 'Manchester City'],
    source: 'https://www.englandfootball.com/england/mens-senior-team',
    home: 'Ceko',
    away: 'Inggris',
    score: '0-2',
    excerpt: 'Inggris meraih kemenangan tandang 2-0 atas Ceko dan dijadwalkan melanjutkan UEFA Nations League melawan Kroasia.',
    summary: 'Situs resmi England Football mencatat kemenangan 2-0 di Praha pada 29 September. Laga berikutnya adalah tandang melawan Kroasia di Rijeka pada 3 Oktober.',
  },
  {
    date: '2026-10-01T14:30:00Z',
    title: 'Nico O’Reilly mundur dari skuad Inggris untuk laga UEFA Nations League',
    category: 'International',
    tags: ['England', 'Manchester City'],
    source: 'https://www.englandfootball.com/articles/2026/Sep/21/england-men-september-october-2026-squad-updates',
    excerpt: 'Bek Manchester City Nico O’Reilly kembali ke klub dan tidak akan tampil pada sisa laga UEFA Nations League Inggris.',
    summary: 'England Football mengonfirmasi O’Reilly kembali ke Manchester City untuk pemeriksaan lanjutan setelah absen pada kemenangan 2-0 atas Ceko. Tidak ada pengganti tambahan yang direncanakan untuk skuad senior.',
  },
  {
    date: '2026-09-28T12:00:00Z',
    title: 'Premier League kembali bergulir 10 Oktober usai jeda internasional',
    category: 'Premier League',
    tags: ['Premier League', 'Arsenal'],
    source: 'https://www.premierleague.com/ar/news/4726845/when-does-the-premier-league-return',
    excerpt: 'Premier League 2026/27 dijadwalkan dimulai lagi pada 10 Oktober setelah jeda internasional yang diperpanjang.',
    summary: 'Premier League menyatakan kompetisi kembali pada Sabtu, 10 Oktober. Arsenal dijadwalkan menghadapi Leeds United pada laga pembuka Matchweek 6.',
  },
  { date: '2026-09-15T21:15:00Z', home: 'Al Ain', away: 'Al-Nassr', score: '4-0', title: 'Al Ain menang 4-0 atas Al-Nassr di AFC Champions League Elite', category: 'Football World', tags: [], source: 'https://matchcalendar.football/today/2026-09-15/' },
  { date: '2026-09-15T20:45:00Z', home: 'Kashima Antlers', away: 'Newcastle Jets', score: '7-1', title: 'Kashima Antlers pesta tujuh gol saat menaklukkan Newcastle Jets', category: 'Football World', tags: [], source: 'https://matchcalendar.football/today/2026-09-15/' },
  { date: '2026-09-14T21:30:00Z', home: 'Leeds United', away: 'Newcastle United', score: '4-1', title: 'Leeds United tundukkan Newcastle United 4-1 di Elland Road', category: 'Premier League', tags: [], source: 'https://fbref.com/en/matches/latest/' },
  { date: '2026-09-14T20:45:00Z', home: 'Villarreal', away: 'Real Betis', score: '1-2', title: 'Real Betis menang 2-1 di kandang Villarreal', category: 'La Liga', tags: [], source: 'https://fbref.com/en/matches/latest/' },
  { date: '2026-09-13T21:30:00Z', home: 'Manchester United', away: 'Manchester City', score: '0-1', title: 'Manchester City bawa pulang kemenangan 1-0 dari markas Manchester United', category: 'Premier League', club: 'Manchester City', tags: ['Manchester United', 'Manchester City'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-13' },
  { date: '2026-09-13T21:00:00Z', home: 'Brest', away: 'Paris Saint-Germain', score: '0-1', title: 'Paris Saint-Germain menang tipis 1-0 atas Brest', category: 'Ligue 1', club: 'Paris Saint-Germain', tags: ['PSG'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-13' },
  { date: '2026-09-13T20:30:00Z', home: 'Levante', away: 'Barcelona', score: '2-4', title: 'Barcelona raih kemenangan 4-2 di kandang Levante', category: 'La Liga', club: 'Barcelona', tags: ['Barcelona'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-13' },
  { date: '2026-09-13T20:00:00Z', home: 'SV Elversberg', away: 'Bayern Munich', score: '1-2', title: 'Bayern Munich menang 2-1 atas SV Elversberg', category: 'Bundesliga', club: 'Bayern Munich', tags: ['Bayern Munich'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-13' },
  { date: '2026-09-12T21:30:00Z', home: 'Sunderland', away: 'Arsenal', score: '0-2', title: 'Arsenal jaga rekor sempurna usai menang 2-0 atas Sunderland', category: 'Premier League', club: 'Arsenal', tags: ['Arsenal'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-12' },
  { date: '2026-09-12T21:00:00Z', home: 'Liverpool', away: 'Fulham', score: '0-0', title: 'Liverpool dan Fulham berbagi poin setelah bermain tanpa gol', category: 'Premier League', club: 'Liverpool', tags: ['Liverpool'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-12' },
  { date: '2026-09-12T20:30:00Z', home: 'Chelsea', away: 'Hull City', score: '2-2', title: 'Chelsea ditahan Hull City 2-2 di Stamford Bridge', category: 'Premier League', club: 'Chelsea', tags: ['Chelsea'], source: 'https://www.soccerbase.com/matches/results.sd?date=2026-09-12' },
  { date: '2026-09-10T21:30:00Z', home: 'Manchester United', away: 'Sabah', score: '4-0', title: 'Manchester United buka Liga Champions dengan kemenangan 4-0 atas Sabah', club: 'Manchester United', tags: ['Manchester United', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures/' },
  { date: '2026-09-10T21:15:00Z', home: 'Bayern München', away: 'Bodø/Glimt', score: '5-0', title: 'Bayern München menundukkan Bodø/Glimt 5-0 pada laga pembuka', club: 'Bayern Munich', tags: ['Bayern Munich', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures/' },
  { date: '2026-09-10T20:45:00Z', home: 'Como', away: 'Leipzig', score: '4-1', title: 'Como raih kemenangan 4-1 atas Leipzig di debut fase liga', club: undefined, tags: ['Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures/' },
  { date: '2026-09-10T20:15:00Z', home: 'Slavia Praha', away: 'Lens', score: '2-3', title: 'Lens menang dramatis 3-2 di markas Slavia Praha', club: undefined, tags: ['Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218f8f423733-f11ec44c8418-1000--resumen-y-videos-del-jueves-de-la-jornada-1-de-la-champions/' },
  { date: '2026-09-09T21:30:00Z', home: 'Barcelona', away: 'Feyenoord', score: '5-1', title: 'Barcelona menang 5-1 atas Feyenoord pada matchday pertama', club: 'Barcelona', tags: ['Barcelona', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218d8d30549a-1b24ad6c6a98-1000--champions-league-matchday-1-wednesday-highlights-and-roun/' },
  { date: '2026-09-09T21:00:00Z', home: 'Paris Saint-Germain', away: 'Slovan Bratislava', score: '6-1', title: 'Paris Saint-Germain memulai kampanye dengan kemenangan 6-1', club: 'Paris Saint-Germain', tags: ['PSG', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218d8d30549a-1b24ad6c6a98-1000--champions-league-matchday-1-wednesday-highlights-and-roun/' },
  { date: '2026-09-09T20:30:00Z', home: 'Liverpool', away: 'Atlético de Madrid', score: '2-1', title: 'Liverpool bangkit untuk mengalahkan Atlético de Madrid 2-1', club: 'Liverpool', tags: ['Liverpool', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218d8d30549a-1b24ad6c6a98-1000--champions-league-matchday-1-wednesday-highlights-and-roun/' },
  { date: '2026-09-09T20:00:00Z', home: 'Napoli', away: 'Arsenal', score: '0-1', title: 'Arsenal curi kemenangan 1-0 dari Napoli di Italia', club: 'Arsenal', tags: ['Arsenal', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218d8d30549a-1b24ad6c6a98-1000--champions-league-matchday-1-wednesday-highlights-and-roun/' },
  { date: '2026-09-08T21:30:00Z', home: 'Real Madrid', away: 'Inter', score: '2-1', title: 'Real Madrid menaklukkan Inter 2-1 pada pembukaan fase liga', club: 'Real Madrid', tags: ['Real Madrid', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218b8c00ab1e-0e070e496ca8-1000--champions-league-matchday-1-highlights-and-round-up-real-mad/' },
  { date: '2026-09-08T21:00:00Z', home: 'Porto', away: 'Manchester City', score: '0-2', title: 'Manchester City menang 2-0 di kandang Porto', club: 'Manchester City', tags: ['Manchester City', 'Champions League', 'Haaland'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218b8c00ab1e-0e070e496ca8-1000--champions-league-matchday-1-highlights-and-round-up-real-mad/' },
  { date: '2026-09-08T20:30:00Z', home: 'Club Brugge', away: 'Aston Villa', score: '2-3', title: 'Aston Villa bawa pulang kemenangan 3-2 dari Club Brugge', club: undefined, tags: ['Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a9-218b8c00ab1e-0e070e496ca8-1000--champions-league-matchday-1-highlights-and-round-up-real-mad/' },
  { date: '2026-09-08T20:00:00Z', home: 'Borussia Dortmund', away: 'Villarreal', score: '3-2', title: 'Borussia Dortmund ungguli Villarreal 3-2 dalam laga lima gol', club: 'Borussia Dortmund', tags: ['Borussia Dortmund', 'Champions League'], source: 'https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures/' },
];
async function main() {
  const worldClubs = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), 'world-clubs.json'), 'utf8')) as { name: string; shortName: string; country: string; continent: string }[];
  const password = await bcrypt.hash('Password123!', 12);
  const permissions = ['articles.create','articles.read','articles.update','articles.delete','articles.publish','users.create','users.read','users.update','users.delete','clubs.manage','players.manage','leagues.manage','matches.manage','standings.manage','transfers.manage','comments.moderate','analytics.view','settings.manage'];
  for (const name of permissions) await prisma.permission.upsert({ where: { name }, create: { name }, update: {} });
  const allPermissions = await prisma.permission.findMany();
  const roles = ['SUPER_ADMIN','ADMIN','EDITOR','REPORTER','READER'];
  for (const name of roles) { const role = await prisma.role.upsert({ where: { name }, create: { name }, update: {} }); const allowed = name === 'SUPER_ADMIN' ? allPermissions : allPermissions.filter(p => name === 'READER' ? p.name === 'articles.read' : name === 'REPORTER' ? ['articles.create','articles.read','articles.update'].includes(p.name) : name === 'EDITOR' ? !p.name.startsWith('users.') && p.name !== 'settings.manage' : !['users.delete'].includes(p.name)); await prisma.rolePermission.createMany({ data: allowed.map(permission => ({ roleId: role.id, permissionId: permission.id })), skipDuplicates: true }); }
  for (const roleName of roles) { const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } }); await prisma.user.upsert({ where: { email: `${roleName.toLowerCase().replace('_','')}@2annews.test` }, create: { name: roleName.split('_').map(x => x[0] + x.slice(1).toLowerCase()).join(' '), email: `${roleName.toLowerCase().replace('_','')}@2annews.test`, password, roleId: role.id, bio: '2anNews development account.' }, update: { password, roleId: role.id } }); }
  for (const name of names) await prisma.category.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name), description: `${name} news and analysis.` }, update: {} });
  for (const name of tags) await prisma.tag.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name) }, update: {} });
  for (const [name, shortName, country] of clubNames) await prisma.club.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name), shortName, country, continent: 'Europe', city: country === 'England' ? 'England' : country, stadium: `${name} Stadium`, foundedYear: 1890, description: `${name} is included as football directory seed data for 2anNews.` }, update: { continent: 'Europe' } });
  await prisma.club.createMany({ data: worldClubs.map(club => ({ ...club, slug: slugify(club.name), description: 'Listed in the OpenFootball public club directory; current active status and academy classification have not been verified.' })), skipDuplicates: true });
  const clubs = await prisma.club.findMany();
  for (const [name, country] of leagues) await prisma.league.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name), country, season: '2025/26', description: `${name} coverage.` }, update: {} });
  const leagueRows = await prisma.league.findMany();
  const players = [];
  for (const [index, player] of realPlayers.entries()) {
    const club = clubs.find(row => row.name === player.club);
    if (!club) throw new Error(`Klub tidak ditemukan: ${player.club}`);
    const legacySlug = slugify(`Development Player ${index + 1}`);
    const existing = await prisma.player.findUnique({ where: { slug: slugify(player.name) } }) ?? await prisma.player.findUnique({ where: { slug: legacySlug } });
    const data = { name: player.name, slug: slugify(player.name), nationality: player.nationality, position: player.position, shirtNumber: index + 1, clubId: club.id, bio: `${player.name} adalah pemain sepak bola profesional dalam data demo 2anNews.` };
    players.push(existing ? await prisma.player.update({ where: { id: existing.id }, data }) : await prisma.player.create({ data }));
  }
  for (let index = 0; index < 20; index++) { const homeClub = clubs[index % clubs.length]; const awayClub = clubs[(index + 1) % clubs.length]; await prisma.match.upsert({ where: { id: index + 1 }, create: { leagueId: leagueRows[index % leagueRows.length].id, homeClubId: homeClub.id, awayClubId: awayClub.id, homeScore: index < 10 ? index % 4 : null, awayScore: index < 10 ? (index + 1) % 3 : null, matchDate: new Date(Date.now() + (index - 10) * 86400000), venue: homeClub.stadium, status: index < 10 ? MatchStatus.FINISHED : MatchStatus.SCHEDULED, season: '2025/26' }, update: {} }); }
  for (let index = 0; index < 20; index++) await prisma.transfer.upsert({ where: { id: index + 1 }, create: { playerId: players[index].id, fromClubId: clubs[index % clubs.length].id, toClubId: clubs[(index + 2) % clubs.length].id, transferFee: 10000000 + index * 1250000, currency: 'EUR', transferDate: new Date(Date.now() - index * 86400000 * 3), transferType: index % 3 === 0 ? TransferType.LOAN : TransferType.PERMANENT, status: index % 4 === 0 ? TransferStatus.RUMOUR : TransferStatus.CONFIRMED, description: 'Fictional transfer data for local development.' }, update: {} });
  const author = await prisma.user.findUniqueOrThrow({ where: { email: 'reporter@2annews.test' } });
  const championsLeague = leagueRows.find(league => league.name === 'UEFA Champions League');
  const categoriesByName = new Map((await prisma.category.findMany()).map(category => [category.name, category]));
  const clubsByName = new Map(clubs.map(club => [club.name, club]));
  const tagsByName = new Map((await prisma.tag.findMany()).map(tag => [tag.name, tag]));
  // Hapus hanya artikel fiktif dari seed versi sebelumnya. Artikel buatan pengguna tidak disentuh.
  await prisma.article.deleteMany({ where: { title: { startsWith: 'Football briefing ' } } });
  for (const news of recentNews) {
    const slug = slugify(news.title);
    const tagIds = news.tags.map(name => tagsByName.get(name)?.id).filter((id): id is number => id !== undefined);
    const category = categoriesByName.get(news.category ?? 'Champions League');
    if (!category) throw new Error(`Kategori tidak ditemukan: ${news.category ?? 'Champions League'}`);
    const hasScore = Boolean(news.home && news.away && news.score);
    const headline = hasScore ? `<strong>${news.home} ${news.score} ${news.away}</strong>` : `<strong>${news.title}</strong>`;
    const summary = news.summary ?? 'Artikel ini adalah ringkasan singkat berdasarkan data hasil pertandingan, bukan salinan naskah sumber.';
    const content = `<p>${headline} merupakan pembaruan sepak bola terbaru yang masuk dalam rangkuman 2anNews.</p><p>${summary}</p><p><strong>Sumber resmi:</strong> <a href="${news.source}" target="_blank" rel="noreferrer">lihat informasi lengkap</a>.</p>`;
    const fallbackExcerpt = hasScore ? `${news.home} ${news.score} ${news.away} dalam laga ${news.category ?? 'Liga Champions'} pada ${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(news.date))}.` : `Pembaruan ${news.category ?? 'sepak bola'} terbaru pada ${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(news.date))}.`;
    const data = { authorId: author.id, categoryId: category.id, title: news.title, slug, excerpt: news.excerpt ?? fallbackExcerpt, content, status: ArticleStatus.PUBLISHED, publishedAt: new Date(news.date), viewsCount: 0, clubId: news.club ? clubsByName.get(news.club)?.id : null, leagueId: news.category === 'Champions League' ? championsLeague?.id ?? null : null, ...(news.imageFile ? { thumbnail: `/api/articles/${slug}/image` } : {}) };
    const article = await prisma.article.upsert({
      where: { slug },
      create: { ...data, tags: { create: tagIds.map(tagId => ({ tagId })) } },
      update: { ...data, tags: { deleteMany: {}, create: tagIds.map(tagId => ({ tagId })) } },
    });
    if (news.imageFile) {
      const imageBytes = await readFile(resolve(process.cwd(), 'prisma', 'assets', 'news', news.imageFile));
      const mimeType = news.imageFile.toLowerCase().endsWith('.png') ? 'image/png' : news.imageFile.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      await prisma.articleImage.upsert({
        where: { articleId: article.id },
        create: { articleId: article.id, mimeType, data: Uint8Array.from(imageBytes), altText: news.imageAlt ?? news.title, credit: news.imageCredit, sourceUrl: news.imageSourceUrl },
        update: { mimeType, data: Uint8Array.from(imageBytes), altText: news.imageAlt ?? news.title, credit: news.imageCredit, sourceUrl: news.imageSourceUrl },
      });
    }
  }
  // Bersihkan interaksi contoh dari seed terdahulu agar artikel nyata tidak
  // terlihat seolah-olah sudah memperoleh komentar atau reaksi pembaca.
  const reader = await prisma.user.findUniqueOrThrow({ where: { email: 'reader@2annews.test' } });
  const seededArticleIds = (await prisma.article.findMany({ where: { slug: { in: recentNews.map(news => slugify(news.title)) } }, select: { id: true } })).map(article => article.id);
  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { userId: reader.id, articleId: { in: seededArticleIds }, content: 'Great development discussion and a useful match preview.' } }),
    prisma.like.deleteMany({ where: { userId: reader.id, articleId: { in: seededArticleIds } } }),
    prisma.bookmark.deleteMany({ where: { userId: reader.id, articleId: { in: seededArticleIds } } }),
    prisma.articleView.deleteMany({ where: { articleId: { in: seededArticleIds }, userAgent: 'Seed' } }),
  ]);
  for (const [key, value] of Object.entries({ siteName: '2anNews', tagline: 'The Home of Football News', description: 'Football-only news and analysis.', articlesPerPage: '10', commentsEnabled: 'true', maintenanceMode: 'false' })) await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
if (process.argv.some(argument => resolve(argument) === fileURLToPath(import.meta.url))) {
  main().then(() => prisma.$disconnect()).catch(error => { console.error(error); return prisma.$disconnect().finally(() => process.exit(1)); });
}
