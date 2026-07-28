/**
 * Снимок города.
 *
 * Файлы лежат у нас в двух ширинах — 400 и 640. Викимедиа на произвольные
 * размеры отвечает 400, поэтому хотлинк с ресайзом не годился: снимки скачаны
 * один раз, сжаты в webp и отдаются со своего домена. 269 КБ превратились в 18.
 *
 * Если ссылка задана вручную в админке, отдаём её как есть.
 */
export function CityPhoto({ src, alt }: { src: string; alt: string }) {
  const pair = /^(.*)-640\.webp$/.exec(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={pair ? `${pair[1]}-400.webp 400w, ${src} 640w` : undefined}
      sizes="(max-width: 760px) 50vw, 340px"
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
