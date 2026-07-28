import type { SiteSettings, TeamRecord } from './content';

/**
 * Резервная копия содержимого на случай, когда база недоступна.
 *
 * Источник истины — таблицы teams и settings, их правят из админки. Но если
 * база отвалится посреди эфира, сайт обязан открыться и дать людям заплатить:
 * неработающая кнопка оплаты хуже, чем устаревшее название города.
 *
 * Поэтому здесь держим слепок актуальных данных. Обновлять его нужно тогда,
 * когда в админке меняют что-то важное — прежде всего ссылки Kaspi.
 */
export const FALLBACK_TEAMS: TeamRecord[] = [
  {
    id: 1,
    slug: 'astana',
    name: 'Астана қаласы',
    placeLabel: 'Финалист',
    colorIndex: 1,
    kaspiUrl: 'https://pay.kaspi.kz/pay/gyhuj7li',
    displayOrder: 1,
    isActive: true,
    imageUrl: '',
  },
  {
    id: 2,
    slug: 'pavlodar',
    name: 'Павлодар облысы',
    placeLabel: 'Финалист',
    colorIndex: 3,
    kaspiUrl: 'https://pay.kaspi.kz/pay/ap4zlsap',
    displayOrder: 2,
    isActive: true,
    imageUrl: '',
  },
];

export const FALLBACK_SETTINGS: SiteSettings = {
  votePrice: 500,
  whatsappNumber: '77784788211',
  voteEyebrow: 'Суперфинал',
  voteTitle: 'Дауыс беріңіз',
  voteLead: 'Екі қала — бір тақ. Сіздің дауысыңыз тағдырды шешеді.',
  voteNote: 'Дауыс Kaspi арқылы төленеді',
  heroTagline: 'Ұлттық поэзиялық жоба',
  heroTags: ['20 өңір', '60 ақын', '3 000 000 ₸ бас жүлде'],
  ticketsOpen: false,
  applicationsOpen: false,
  closedNotice: 'Бұл бөлім әзірге жабық. Жақында ашылады.',
  venue: 'Azure мейрамханасы, Алматы',
  authorName: 'Мөлдір Айтбай',
  authorHandle: '@maitbay',
  contactPhone: '87016202086',
  instagramUrl: 'https://instagram.com/moldir_alemm',
  tiktokUrl: 'https://www.tiktok.com/@moldir_alemm',
  youtubeUrl: 'https://youtube.com/@moldirolen',
duelsTitle: 'Алдағы дуэльдер',
  poetsTitle: 'Ақындар туралы',
  poetsLead: 'Додаға қатысып жүрген ақындармен танысыңыз.',
  booksTitle: 'Кітап алу',
  booksLead: 'Жоба ақындарының жинақтары.',
  aboutTitle: 'Жоба туралы',
  aboutText: 'Мөлдір өлең — қазақ поэзиясын сахнаға шығаратын ұлттық жоба. Әр кеш — екі өңірдің ақындары арасындағы дуэль. Жеңімпазды халық дауысы шешеді.',
  heroVerse: 'Өлең – жүректің тілі, халықтың үні.\nМөлдір өлең – жаңа буынның жұлдызды жолы.',
  footerVerse: 'Өлең – өлмейді, сөз – жоғалмайды.\nСебебі ол – халықпен бірге мәңгі жасайды.',
  firstDuelLabel: 'Алғашқы дуэль',
};
