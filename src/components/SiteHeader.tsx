import Link from 'next/link';

/**
 * Шапка с логотипом проекта.
 *
 * Логотип — золото на почти чёрном фоне, поэтому идёт с `mix-blend-mode: screen`:
 * тёмная подложка растворяется в фоне сайта, остаётся только золотая надпись.
 * Так картинку не пришлось вырезать и не видно прямоугольной рамки.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="logo" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Мөлдір өлең" className="logo-img" />
      </Link>
      <span className="season">2-маусым</span>
    </header>
  );
}
