import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __moldirSql: Sql | undefined;
}

/**
 * Подключение к базе.
 *
 * Раньше здесь был Proxy, откладывавший создание клиента до первого запроса,
 * чтобы `next build` не падал без DATABASE_URL. Оказалось, что через Proxy
 * postgres.js получал теговый шаблон искажённым и отправлял пустой запрос:
 * соединение уходило в никуда и не возвращалось в пул. После трёх открытий
 * страницы сайт замирал целиком.
 *
 * Поэтому клиент обычный. Отсутствие DATABASE_URL на этапе сборки решается
 * заглушкой: она бросает исключение при попытке запроса, а вся загрузка данных
 * в этом проекте обёрнута в try и умеет работать на резервных данных из кода.
 */
function create(): Sql {
  const url = process.env.DATABASE_URL;

  if (!url) {
    const fail = () => {
      throw new Error(
        'DATABASE_URL не задан. Возьмите строку подключения в Supabase → Project Settings → ' +
          'Database → Connection pooling (режим Transaction, порт 6543).',
      );
    };
    return new Proxy(fail as unknown as Sql, { apply: fail, get: fail });
  }

  return postgres(url, {
    // Пул Supabase в transaction-режиме не поддерживает prepared statements.
    prepare: false,
    // Запас на всплеск в прямом эфире; пул Supabase выдержит.
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
}

// В dev Next перезагружает модули на каждое изменение — без globalThis
// соединения накапливались бы до исчерпания пула.
export const sql: Sql = globalThis.__moldirSql ?? create();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__moldirSql = sql;
}
