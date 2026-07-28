'use client';

import { useEffect, useRef } from 'react';

/**
 * Салют из золотых искр после засчитанного голоса.
 *
 * Рисуется на канвасе один раз и сам останавливается: это момент благодарности,
 * а не фоновая анимация, которая крутится вечно и садит батарею.
 * При включённом «уменьшить движение» не запускается вовсе.
 */
export function Celebrate() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = (canvas.width = canvas.offsetWidth * dpr);
    const h = (canvas.height = canvas.offsetHeight * dpr);

    const colors = ['#E0B44C', '#B4862B', '#FFF3D6', '#8A6520', '#26324F'];
    const parts = Array.from({ length: 70 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.6 + Math.random() * 4.2) * dpr;
      return {
        x: w / 2,
        y: h * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 * dpr,
        size: (2 + Math.random() * 3.4) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
        life: 1,
      };
    });

    let frame = 0;
    let start = 0;

    const tick = (t: number) => {
      if (!start) start = t;
      const elapsed = t - start;

      ctx.clearRect(0, 0, w, h);
      let alive = false;

      for (const p of parts) {
        p.vy += 0.09 * dpr; // притяжение
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        p.life = Math.max(0, 1 - elapsed / 2200);
        if (p.life > 0 && p.y < h + 40) alive = true;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.7);
        ctx.restore();
      }

      if (alive) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas className="celebrate" ref={ref} aria-hidden="true" />;
}
