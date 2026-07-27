'use client';

import { useEffect, useRef, useState } from 'react';
import { SHOWS, type ShowConfig } from '@/lib/config';
import { tenge } from '@/lib/format';
import { Reveal } from './Reveal';
import { FailScreen, PhoneField, Sheet, SheetCta, WaitingScreen } from './Sheet';
import { TEST_MODE, usePayment } from './usePayment';

export function TicketSection() {
  const railRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState<ShowConfig | null>(null);
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState('');

  const payment = usePayment();

  // Центральная карточка карусели выделяется — как в исходной вёрстке.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const focus = () => {
      const mid = innerWidth / 2;
      for (const card of Array.from(rail.querySelectorAll('.show')) as HTMLElement[]) {
        const r = card.getBoundingClientRect();
        card.classList.toggle('focus', Math.abs(r.left + r.width / 2 - mid) < r.width / 2);
      }
    };

    const onScroll = () => requestAnimationFrame(focus);
    rail.addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', focus);
    focus();
    const t = setTimeout(focus, 300);

    return () => {
      rail.removeEventListener('scroll', onScroll);
      removeEventListener('resize', focus);
      clearTimeout(t);
    };
  }, []);

  const openTicket = (target: ShowConfig) => {
    setShow(target);
    setQty(1);
    payment.reset();
  };

  const closeSheet = () => {
    setShow(null);
    payment.reset();
  };

  const changeQty = (delta: number) => {
    if (!show) return;
    setQty((prev) => Math.min(show.maxQty, Math.max(1, prev + delta)));
  };

  const submit = () => {
    if (!show) return;
    void payment.start('/api/ticket/start', { showSlug: show.slug, qty, phone });
  };

  const busy = payment.phase === 'starting';

  return (
    <>
      <Reveal>
        <span className="eyebrow">Поэзия кештері</span>
        <h2 className="h2">
          Билет <em>алыңыз</em>
        </h2>
        <p className="lead">Кешті таңдаңыз - бағасы автоматты түрде көрсетіледі.</p>
      </Reveal>

      <div className="rail" ref={railRef}>
        {SHOWS.map((s) => (
          <div className={`show${s.hot ? ' hot' : ''}`} key={s.slug}>
            <span className="tag">{s.tag}</span>
            <h3 className="serif">{s.title}</h3>
            <p className="when">{s.when}</p>
            <div className="price">
              {tenge(s.price)}
              <small>бір билет</small>
            </div>
            <button
              className={`btn ${s.hot ? 'btn-moldir' : 'btn-glass'} btn-block`}
              onClick={() => openTicket(s)}
              type="button"
            >
              Билет алу
            </button>
          </div>
        ))}
      </div>

      <Sheet open={show !== null} onClose={closeSheet}>
        {show === null ? null : payment.phase === 'form' || payment.phase === 'starting' ? (
          <>
            <h3 className="serif">{show.title}</h3>
            <p className="sub">
              {show.when} · {tenge(show.price)} / билет
            </p>

            <div className="qty">
              <button onClick={() => changeQty(-1)} disabled={busy} type="button" aria-label="Азайту">
                −
              </button>
              <b>{qty}</b>
              <button onClick={() => changeQty(1)} disabled={busy} type="button" aria-label="Көбейту">
                +
              </button>
            </div>

            <div className="sum">
              <span>Жалпы сома</span>
              <b>{tenge(qty * show.price)}</b>
            </div>

            <PhoneField value={phone} onChange={setPhone} disabled={busy} />

            <SheetCta>
              {payment.error ? <p className="form-error">{payment.error}</p> : null}
              <button className="btn btn-moldir btn-block" onClick={submit} disabled={busy} type="button">
                {busy ? 'Шот жіберілуде...' : `${tenge(qty * show.price)} · Kaspi арқылы төлеу`}
              </button>
            </SheetCta>
          </>
        ) : payment.phase === 'waiting' ? (
          <WaitingScreen showTestButton={TEST_MODE} onTestPay={() => void payment.testPay()} />
        ) : payment.phase === 'paid' ? (
          <div className="pay-ok">
            <div className="check">✓</div>
            <h3 className="serif">Билетіңіз дайын!</h3>
            <div className="ticket">
              <div className="ticket-top">
                <small>Мөлдір өлең · 2-маусым</small>
                <h4>{payment.ticket?.title ?? show.title}</h4>
              </div>
              <div className="ticket-mid">
                <div>
                  <small>Күні</small>
                  <b>{payment.ticket?.when ?? show.when}</b>
                </div>
                <div>
                  <small>Саны</small>
                  <b>{payment.ticket?.qty ?? qty}</b>
                </div>
                <div>
                  <small>Сома</small>
                  <b>{tenge(payment.ticket?.sum ?? qty * show.price)}</b>
                </div>
              </div>
              <div className="ticket-bot">
                <span className="num">№ {payment.ticket?.number ?? '—'}</span>
                <span className="qr" />
              </div>
            </div>
            <button className="btn btn-glass btn-block" onClick={closeSheet} type="button">
              Жабу
            </button>
          </div>
        ) : (
          <FailScreen message={payment.error ?? 'Төлем өтпеді'} onRetry={payment.reset} />
        )}
      </Sheet>
    </>
  );
}
