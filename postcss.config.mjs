/**
 * Пустой, но обязательный конфиг.
 *
 * Без него Next ищет postcss.config вверх по дереву и находит чужой файл в
 * C:\Users\User, который требует tailwindcss. Здесь Tailwind не используется —
 * вся вёрстка на обычном CSS в globals.css.
 */
const config = {
  plugins: {},
};

export default config;
