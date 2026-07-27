import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="logo" href="/">
        <span className="logo-mark">Ө</span>
        <b>Мөлдір өлең</b>
      </Link>
      <span className="season">2-маусым</span>
    </header>
  );
}
