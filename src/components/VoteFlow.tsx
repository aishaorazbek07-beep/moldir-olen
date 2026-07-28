'use client';

import { useEffect, useState } from 'react';
import { FIRST_VOTE_PACKS, VOTE_PACKS } from '@/lib/config';
import { fmt, tenge } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import type { TeamWithStats } from '@/lib/votes';
import { PhoneField, Sheet, SheetCta } from './Sheet';

/**
 * Шаги в том порядке, в котором их проходит человек:
 *
 *   pay    выбран город → пакет голосов → кнопка ведёт на Kaspi ЭТОГО города
 *   proof  ФИО и номер, с которого отправлена оплата — здесь пишется заявка
 *   done   заявка принята, предложение проголосовать ещё
 *
 * Город выбирается ДО оплаты: ссылка Kaspi у каждого своя.
 *
 * Оплата автоматически не проверяется — организаторы сверяют её по выписке
 * Kaspi. Поэтому ФИО и номер отправителя обязательны: по ним платёж и ищут.
 */
type Step = 'pay' | 'proof' | 'done';

/** Отметка о первом отданном голосе. */
const UNLOCK_KEY = 'mo_voted';

export function VoteFlow({
  teams,
  onTeamsChange,
  activeSlug,
  onClose,
  votePrice,
}: {
  teams: TeamWithStats[];
  onTeamsChange: (teams: TeamWithStats[]) => void;
  activeSlug: string | null;
  onClose: () => void;
  votePrice: number;
}) {
  const team = teams.find((t) => t.slug === activeSlug) ?? null;

  const [step, setStep] = useState<Step>('pay');
  const [votes, setVotes] = useState(1);
  const [payerName, setPayerName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(0);

  /**
   * Пакеты 5 и 10 открываются только после первого отданного голоса.
   *
   * Отметка живёт в localStorage: человек уже прошёл путь целиком и понимает,
   * за что платит. Предлагать десять голосов тому, кто ещё ни разу этого не
   * делал, преждевременно.
   */
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(localStorage.getItem(UNLOCK_KEY) === '1');
    } catch {
      // приватный режим браузера — оставляем закрытым
    }
  }, []);

  const packs = unlocked ? VOTE_PACKS : FIRST_VOTE_PACKS;
  const amount = votes * votePrice;
  const proofReady = payerName.trim().length >= 3 && Boolean(normalizePhone(phone));

  const close = () => {
    setStep('pay');
    setVotes(1);
    setPayerName('');
    setPhone('+7 ');
    setError(null);
    setGranted(0);
    onClose();
  };

  const openKaspi = () => {
    if (!team) return;

    if (!team.kaspiUrl) {
      setError('Бұл қала үшін төлем сілтемесі әзірге қосылмаған. Ұйымдастырушыларға хабарласыңыз.');
      return;
    }

    setError(null);
    window.open(team.kaspiUrl, '_blank', 'noopener,noreferrer');
    // Заплатил человек или нет — мы не знаем. Ведём дальше и честно об этом говорим.
    setStep('proof');
  };

  const submitClaim = async () => {
    if (!team || !proofReady) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/vote/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamSlug: team.slug,
          amount,
          payerName: payerName.trim(),
          phone,
        }),
      });

      const data = (await res.json()) as {
        quantity?: number;
        teams?: TeamWithStats[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? 'Дауысты тіркеу мүмкін болмады');
        setBusy(false);
        return;
      }

      setGranted(data.quantity ?? votes);
      if (data.teams) onTeamsChange(data.teams);

      try {
        localStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        // не критично: просто останутся доступны только одиночные голоса
      }
      setUnlocked(true);

      setStep('done');
    } catch {
      setError('Байланыс үзілді. Интернетті тексеріп, қайталаңыз.');
    } finally {
      setBusy(false);
    }
  };

  const voteAgain = (pack: number) => {
    setVotes(pack);
    setError(null);
    setStep('pay');
  };

  if (!team) return null;

  return (
    <Sheet open onClose={close}>
      {step === 'pay' ? (
        <>
          <h3 className="serif">{team.name} үшін дауыс</h3>
          <p className="sub">1 дауыс — {tenge(votePrice)}. Kaspi арқылы төлейсіз.</p>

          <div className="packs">
            {packs.map((pack) => (
              <button
                key={pack}
                type="button"
                className={`pack${votes === pack ? ' on' : ''}`}
                onClick={() => setVotes(pack)}
              >
                <b>{pack}</b>
                <span>дауыс</span>
                <i>{fmt(pack * votePrice)} ₸</i>
              </button>
            ))}
          </div>

          {!unlocked ? (
            <p className="pack-hint">
              Алдымен бір дауыс беріңіз — содан кейін 5 және 10 дауыс нұсқалары ашылады.
            </p>
          ) : null}

          <SheetCta>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-fire btn-block" onClick={openKaspi} type="button">
              {tenge(amount)} · Kaspi арқылы төлеу
            </button>
          </SheetCta>
        </>
      ) : step === 'proof' ? (
        <>
          <h3 className="serif">Мәліметтеріңізді қалдырыңыз</h3>

          <div className="warn-box">
            <b>Төлемей дауыс есептелмейді</b>
            <p>
              Дода аяқталған соң біз <b>барлық төлемді тексереміз</b>. Аты-жөніңіз бен
              нөміріңіз бойынша төлем табылмаса, дауыс санақтан алынып тасталады.
            </p>
          </div>

          <div className="recap">
            <div>
              <span>Қала</span>
              <b>{team.name}</b>
            </div>
            <div>
              <span>Сома</span>
              <b>{tenge(amount)}</b>
            </div>
            <div>
              <span>Дауыс</span>
              <b>{fmt(votes)}</b>
            </div>
          </div>

          <div className="field">
            <label htmlFor="payer-name">Аты-жөніңіз</label>
            <input
              id="payer-name"
              type="text"
              autoComplete="name"
              placeholder="Айдана Серікқызы"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
            />
            <p className="phone-hint">Kaspi-де көрсетілгендей жазыңыз.</p>
          </div>

          <PhoneField value={phone} onChange={setPhone} label="Төлем жасалған нөмір" />

          <SheetCta>
            {error ? <p className="form-error">{error}</p> : null}
            {!proofReady ? (
              <p className="phone-hint" style={{ margin: '0 0 10px' }}>
                Аты-жөніңіз бен нөміріңізді толтырыңыз.
              </p>
            ) : null}
            <button
              className="btn btn-fire btn-block"
              onClick={() => void submitClaim()}
              disabled={busy || !proofReady}
              type="button"
            >
              {busy ? 'Тіркелуде...' : 'Дауысты тіркеу'}
            </button>
            <button
              className="btn btn-glass btn-block btn-back"
              onClick={() => setStep('pay')}
              type="button"
            >
              Артқа
            </button>
          </SheetCta>
        </>
      ) : (
        <>
          <div className="pay-ok">
            <div className="check">✓</div>
            <h3 className="serif">Дауысыңыз тіркелді</h3>
            <p className="sub">
              {team.name} — {fmt(granted)} дауыс. Рахмет! Төлеміңіз тексерілгеннен кейін дауыс
              түпкілікті есептеледі.
            </p>
          </div>

          <div className="again">
            <p className="sub">Тағы дауыс бересіз бе?</p>
            <div className="packs">
              {VOTE_PACKS.map((pack) => (
                <button key={pack} type="button" className="pack" onClick={() => voteAgain(pack)}>
                  <b>+{pack}</b>
                  <span>дауыс</span>
                  <i>{fmt(pack * votePrice)} ₸</i>
                </button>
              ))}
            </div>
          </div>

          <SheetCta>
            <button className="btn btn-glass btn-block" onClick={close} type="button">
              Жабу
            </button>
          </SheetCta>
        </>
      )}
    </Sheet>
  );
}
