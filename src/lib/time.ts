const getLang = (raw: string | undefined): 'en' | 'ru' | 'uz' => {
  if (!raw) return 'en';
  const l = raw.toLowerCase();
  if (l.startsWith('ru')) return 'ru';
  if (l.startsWith('uz')) return 'uz';
  return 'en';
};

export const formatRelativeTime = (input: Date | string | number, language?: string) => {
  const date =
    input instanceof Date ? input : new Date(typeof input === 'string' ? input : Number(input));

  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return '';

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const lang = getLang(language);

  const text = {
    justNow: {
      en: 'less than a minute ago',
      uz: 'bir necha soniya oldin',
      ru: 'меньше минуты назад',
    },
    minutesAgo: {
      en: (n: number) => `${n} minute${n === 1 ? '' : 's'} ago`,
      uz: (n: number) => `${n} daqiqa oldin`,
      ru: (n: number) => `${n} минут назад`,
    },
    hoursAgo: {
      en: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
      uz: (n: number) => `${n} soat oldin`,
      ru: (n: number) => `${n} часов назад`,
    },
    daysAgo: {
      en: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,
      uz: (n: number) => `${n} kun oldin`,
      ru: (n: number) => `${n} дней назад`,
    },
  } as const;

  if (totalSeconds < 60) {
    return text.justNow[lang];
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return text.minutesAgo[lang](totalMinutes);
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return text.hoursAgo[lang](totalHours);
  }

  const totalDays = Math.floor(totalHours / 24);
  return text.daysAgo[lang](totalDays);
};
