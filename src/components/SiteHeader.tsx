import Link from 'next/link';

/**
 * Шапка с логотипом проекта.
 *
 * Логотип — золото на почти чёрном. На светлом фоне он без оправы читался бы
 * как вырезанный прямоугольник, поэтому обрамлён золотой рамкой: получается
 * медальон, а не наклейка.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="logo" href="/" aria-label="Мөлдір өлең">
        <span className="logo-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Мөлдір өлең" className="logo-img" />
        </span>
      </Link>
      <span className="season">2-маусым</span>
    </header>
  );
}
