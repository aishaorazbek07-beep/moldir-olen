'use client';

import { useEffect, useRef } from 'react';

const GHOST_CHARS = ['Ә', 'Ө', 'Ү', 'Ж', 'Қ', 'Ң'];

/**
 * Фон, светящаяся пыль, парящие буквы и полоса прогресса.
 *
 * Живёт в layout, поэтому при переходе между страницами не перезапускается:
 * канвас продолжает рисовать, буквы не «прыгают».
 */
export function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Позиции букв считаются один раз и не меняются при перерисовке.
  const ghosts = useRef(
    GHOST_CHARS.map((char, i) => ({
      char,
      left: 6 + i * 16 + ((i * 37) % 6),
      top: 8 + (i % 3) * 30 + ((i * 53) % 8),
      size: 90 + ((i * 71) % 120),
      plx: ((i % 2 ? 1 : -1) * (0.05 + ((i * 29) % 11) / 100)).toFixed(3),
    })),
  ).current;

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (reduced || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['255,194,75', '75,227,218', '240,67,155', '255,248,238'];
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = innerWidth * devicePixelRatio;
      height = canvas.height = innerHeight * devicePixelRatio;
    };
    resize();
    addEventListener('resize', resize);

    const particles = Array.from({ length: 46 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: (0.7 + Math.random() * 1.9) * devicePixelRatio,
      vy: (0.06 + Math.random() * 0.16) / 1000,
      vx: ((Math.random() - 0.5) * 0.05) / 1000,
      c: colors[i % colors.length],
      a: 0.15 + Math.random() * 0.5,
      ph: Math.random() * Math.PI * 2,
    }));

    let last = 0;
    let frame = 0;

    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      if (t - last < 33) return; // ~30 fps достаточно, экономим батарею
      const dt = t - last;
      last = t;

      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.vy * dt;
        p.x += p.vx * dt;
        p.ph += dt * 0.002;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        const tw = 0.55 + 0.45 * Math.sin(p.ph);
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, 7);
        ctx.fillStyle = `rgba(${p.c},${p.a * tw})`;
        ctx.shadowColor = `rgba(${p.c},.9)`;
        ctx.shadowBlur = 8 * devicePixelRatio;
        ctx.fill();
      }
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const y = scrollY;

        const bar = progressRef.current;
        if (bar) {
          const scrollable = document.body.scrollHeight - innerHeight;
          bar.style.width = scrollable > 0 ? `${(y / scrollable) * 100}%` : '0%';
        }

        if (!reduced && ghostsRef.current) {
          for (const el of Array.from(ghostsRef.current.children) as HTMLElement[]) {
            const plx = Number(el.dataset.plx ?? 0);
            el.style.transform = `translateY(${Math.sin(y * 0.0012) * 90 * plx * 10}px)`;
          }
        }
      });
    };

    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="sky" />
      <canvas id="dust" ref={canvasRef} />
      <div className="ghosts" ref={ghostsRef}>
        {ghosts.map((g) => (
          <span
            key={g.char}
            className="ghost"
            data-plx={g.plx}
            style={{ left: `${g.left}%`, top: `${g.top}%`, fontSize: `${g.size}px` }}
          >
            {g.char}
          </span>
        ))}
      </div>
      <div id="progress" ref={progressRef} />
    </>
  );
}
