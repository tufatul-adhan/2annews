export type TransferNewsItem = {
  continent: string;
  date: string;
  title: string;
  excerpt: string;
  summary: string;
  source: string;
};

// Verified transfer announcements published from 7–14 October 2026.
export const transferNews: readonly TransferNewsItem[] = [
  {
    continent: 'Africa',
    date: '2026-10-08T12:00:00.000Z',
    title: 'Ajara Nchout Njoya kembali ke Kamerun bersama Lekie FF',
    excerpt: 'Penyerang timnas Kamerun itu kembali ke liga domestik untuk memperkuat Lekie FF.',
    summary: 'CAF mengabarkan pada 8 Oktober bahwa Lekie FF merekrut Ajara Nchout Njoya. Penyerang Kamerun itu kembali ke kompetisi domestik setelah berkarier di luar negeri, termasuk bersama Inter Milan, Atlético de Madrid, dan Al-Qadsiah.',
    source: 'https://www.cafonline.com/womens-football/news/ajara-nchout-njoya-returns-to-cameroon-with-lekie-ff/',
  },
  {
    continent: 'Asia',
    date: '2026-10-08T12:00:00.000Z',
    title: 'Uche Agbo bergabung dengan Hapoel Rishon LeZion',
    excerpt: 'Gelandang Nigeria itu diperkenalkan klub Israel setelah bergabung sebagai pemain bebas.',
    summary: 'Uche Agbo bergabung dengan Hapoel Rishon LeZion sebagai pemain bebas dan menandatangani kontrak dua tahun. Kepindahan gelandang Nigeria itu diberitakan pada 8 Oktober 2026.',
    source: 'https://footy-africa.com/uche-agbo-joins-israeli-side-rishon-on-two-year-deal/',
  },
  {
    continent: 'Asia',
    date: '2026-10-08T09:00:00.000Z',
    title: 'Cerezo Osaka mengumumkan kedatangan Hinata Kawai pada 2027',
    excerpt: 'Bek Meiji University itu dijadwalkan bergabung dengan Cerezo Osaka pada 2027.',
    summary: 'J.League mengumumkan pada 8 Oktober bahwa bek Meiji University, Hinata Kawai, akan bergabung dengan Cerezo Osaka pada 2027. Ini adalah perekrutan yang telah diumumkan, dengan tanggal bergabung pada tahun depan.',
    source: 'https://www.jleague.jp/en/news/article/35066/?navicode=j1',
  },
  {
    continent: 'Europe',
    date: '2026-10-07T12:00:00.000Z',
    title: 'Rabbi Matondo resmi bergabung dengan Hibernian',
    excerpt: 'Pemain sayap Wales itu menandatangani kontrak permanen hingga akhir musim 2026/27.',
    summary: 'Hibernian mengumumkan Rabbi Matondo sebagai pemain baru dengan kontrak permanen hingga akhir musim 2026/27. Pemain sayap Wales tersebut datang setelah membela SK Brann; kepindahannya menunggu pemeriksaan administrasi dan izin internasional.',
    source: 'https://www.hibernianfc.co.uk/news/2026/october/07/rabbi-matondo-signs-for-hibs/',
  },
  {
    continent: 'North America',
    date: '2026-10-09T12:00:00.000Z',
    title: 'Charlotte FC merekrut Abdoulaye Doucouré',
    excerpt: 'Gelandang Mali itu menandatangani kontrak sampai akhir musim MLS 2026.',
    summary: 'Charlotte FC mengumumkan perekrutan gelandang Abdoulaye Doucouré pada 9 Oktober menjelang batas pembekuan roster MLS. Pemain bebas asal Mali itu dikontrak sampai akhir musim 2026.',
    source: 'https://www.charlottefootballclub.com/news/charlotte-fc-signs-three-players-prior-to-mls-roster-freeze-deadline',
  },
  {
    continent: 'South America',
    date: '2026-10-09T20:00:00.000Z',
    title: 'Marcos Rojo kembali ke Estudiantes',
    excerpt: 'Bek Argentina itu menandatangani kontrak setelah meninggalkan Racing dengan status bebas transfer.',
    summary: 'Estudiantes mengumumkan Marcos Rojo sebagai pemain baru pada 9 Oktober. Bek berusia 36 tahun itu menandatangani kontrak dan kembali dari Racing dengan status bebas transfer.',
    source: 'https://estudiantesdelaplata.com/marcos-rojo-vuelve-a-estudiantes/',
  },
  {
    continent: 'Oceania',
    date: '2026-10-13T12:00:00.000Z',
    title: 'Central Coast Mariners merekrut Taiyo Hisamatsu',
    excerpt: 'Pemain sayap dan gelandang serang Jepang itu bergabung untuk skuad A-League Men.',
    summary: 'Central Coast Mariners mengumumkan perekrutan Taiyo Hisamatsu pada 13 Oktober. Pemain berusia 19 tahun itu sebelumnya bermain di SKN St. Pölten Amateure; ia dapat mulai bergabung setelah memperoleh visa kerja dan izin yang diperlukan.',
    source: 'https://ccmariners.com.au/news/mariners-add-japanese-attacking-talent-taiyo-hisamatsu/',
  },
];
