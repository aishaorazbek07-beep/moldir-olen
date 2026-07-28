'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Появление блока при попадании в область видимости. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add('in');

    // Блок, уже видимый при загрузке, показываем сразу: ждать прокрутки
    // бессмысленно, а IntersectionObserver в фоновой вкладке может и не сработать.
    const rect = el.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) {
      show();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      show();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);

    // Страховка: что бы ни случилось с наблюдателем, содержимое не должно
    // остаться невидимым. Пустая страница хуже, чем показ без анимации.
    const failsafe = setTimeout(show, 2500);

    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`.trim()}>
      {children}
    </div>
  );
}
