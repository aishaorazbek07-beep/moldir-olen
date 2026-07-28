'use client';

import { useEffect, useRef } from 'react';

/**
 * Фон сайта: снимок «золотого часа» и вуаль поверх него.
 *
 * Пузырьки-частицы и парящие буквы убраны — они выглядели механически и
 * отвлекали. Настроение теперь держит сам снимок, а не анимация.
 *
 * Снимок отдельным слоем, а не фоном body: background-attachment:fixed на iOS
 * прокручивается рывками.
 */
export function Backdrop() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const bar = progressRef.current;
        if (!bar) return;

        const scrollable = document.body.scrollHeight - innerHeight;
        bar.style.width = scrollable > 0 ? `${(scrollY / scrollable) * 100}%` : '0%';
      });
    };

    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="bg-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bg.webp"
          srcSet="/bg-small.webp 900w, /bg.webp 1600w"
          sizes="100vw"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
      </div>
      <div className="bg-veil" />
      <div id="progress" ref={progressRef} />
    </>
  );
}
