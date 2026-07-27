'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

/** Заголовок собирается по буквам с нарастающей задержкой — как в исходнике. */
function Letters({ word, delay, accentIndex = -1 }: { word: string; delay: number; accentIndex?: number }) {
  return (
    <>
      {[...word].map((char, i) => (
        <span
          // Буква может повторяться в слове, поэтому в ключе нужна позиция.
          key={`${char}-${i}`}
          className={`ch${i === accentIndex ? ' accent' : ''}`}
          style={{ animationDelay: `${delay + i * 0.06}s` }}
        >
          {char}
        </span>
      ))}
    </>
  );
}

export function Hero() {
  const t1 = useRef<HTMLDivElement>(null);
  const t2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const y = scrollY;
        const vh = innerHeight;
        if (y >= vh || !t1.current || !t2.current) return;

        t1.current.style.transform = `translateX(${-y * 0.22}px)`;
        t2.current.style.transform = `translateX(${y * 0.22}px)`;
        const opacity = String(Math.max(0, 1 - y / (vh * 0.75)));
        t1.current.style.opacity = opacity;
        t2.current.style.opacity = opacity;
      });
    };

    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="hero" id="top">
      <div className="beam" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="side-verse">сөз · сахна · халық</div>

      <div className="hero-inner">
        <span className="hero-eyebrow">Ұлттық поэзиялық жоба</span>
        <div className="title">
          <div className="row t1" ref={t1}>
            <Letters word="МӨЛДІР" delay={0.3} />
          </div>
          <div className="row t2" ref={t2}>
            <Letters word="ӨЛЕҢ" delay={0.75} accentIndex={0} />
          </div>
        </div>
        <div className="hero-tags">
          <span>
            <b>20</b> өңір
          </span>
          <span>
            <b>60</b> ақын
          </span>
          <span>
            <b>3 000 000 ₸</b> бас жүлде
          </span>
        </div>
        <div className="hero-cta">
          <Link className="btn btn-fire" href="/dauys">
            Дауыс беру
          </Link>
          <Link className="btn btn-glass" href="/bilet">
            Билет алу
          </Link>
        </div>
      </div>

      <a className="spin-wrap" href="#verse" aria-label="Төмен">
        <svg viewBox="0 0 100 100">
          <defs>
            <path id="circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text fill="rgba(255,248,238,.55)" fontSize="10.5" letterSpacing="2.5">
            <textPath href="#circ">МӨЛДІР ӨЛЕҢ · 2-МАУСЫМ · ПОЭЗИЯ ·</textPath>
          </text>
        </svg>
        <span className="arr">↓</span>
      </a>
    </section>
  );
}
