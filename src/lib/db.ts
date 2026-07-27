import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __moldirSql: Sql | undefined;
}

function create(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL не задан. Возьмите строку подключения в Supabase → Project Settings → ' +
        'Database → Connection pooling (режим Transaction, порт 6543).',
    );
  }

  return postgres(url, {
    // Пул Supabase в transaction-режиме не поддерживает prepared statements.
    prepare: false,
    // На serverless держать много соединений нельзя — их быстро исчерпает пул.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

let client: Sql | undefined;

function getClient(): Sql {
  // В dev Next перезагружает модули на каждое изменение — без globalThis
  // соединения накапливались бы до исчерпания пула.
  if (globalThis.__moldirSql) return globalThis.__moldirSql;

  if (!client) {
    client = create();
    if (process.env.NODE_ENV !== 'production') globalThis.__moldirSql = client;
  }

  return client;
}

/**
 * Подключение создаётся при первом запросе, а не при импорте модуля.
 *
 * Иначе `next build` падал бы на сборе данных страниц: на этапе сборки базы
 * может не быть вовсе, а импорт всё равно выполняется.
 */
export const sql = new Proxy((() => undefined) as unknown as Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getClient() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as Sql;
