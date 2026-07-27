'use client';

import { useEffect, useRef } from 'react';

const VERSE =
  'Мөлдір сөзден бастау алар ұлы жыр, ақын үні - даланың тынысы. ' +
  'Сахнада сөз сөйлесін, халық тыңдасын - бұл поэзияның жаңа ғасыры.';

const ACCENTS: Record<string, string> = {
  'Мөлдір': 'cyan',
  'жыр,': 'gold',
  'үні': 'pink',
  'жаңа': 'gold',
  'ғасыры.': 'cyan',
  'Сахнада': 'pink',
};

/** Стих, который «зажигается» по словам по мере прокрутки. */
export function VerseScroll() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);

  const words = VERSE.split(' ');

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const wrap = wrapRef.current;
        if (!wrap) return;

        const rect = wrap.getBoundingClientRect();
        const vh = innerHeight;
        if (rect.top >= vh || rect.bottom <= 0) return;

        const total = rect.height - vh;
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
        const lit = Math.floor(progress * 1.15 * wordsRef.current.length);

        wordsRef.current.forEach((el, i) => el?.classList.toggle('lit', i < lit));
        if (penRef.current) penRef.current.style.width = `${progress * 100}%`;
      });
    };

    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="verse-scroll" id="verse" ref={wrapRef}>
      <div className="verse-sticky">
        <div className="verse-label">Оқып көріңіз - сырғытыңыз</div>
        <p className="verse-text">
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className={`w ${ACCENTS[word] ?? ''}`.trim()}
              ref={(el) => {
                if (el) wordsRef.current[i] = el;
              }}
            >
              {word}{' '}
            </span>
          ))}
        </p>
        <div className="verse-pen" ref={penRef} />
      </div>
    </div>
  );
}
