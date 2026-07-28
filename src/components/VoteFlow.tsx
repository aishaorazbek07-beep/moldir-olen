'use client';

import { useState } from 'react';
import { VOTE_PACKS } from '@/lib/config';
import { fmt, tenge } from '@/lib/format';
import type { TeamWithStats } from '@/lib/votes';
import { Sheet, SheetCta } from './Sheet';

/**
 * Шаги в том порядке, в котором их проходит человек:
 *
 *   pay    выбран город → сумма → кнопка ведёт на Kaspi ЭТОГО города
 *   proof  номер чека и имя → предупреждение → WhatsApp, здесь же пишется заявка
 *   done   заявка принята, предложение проголосовать ещё
 *
 * Город выбирается ДО оплаты: ссылка Kaspi у каждого своя.
 *
 * Оплата автоматически не проверяется, поэтому весь расчёт на то, чтобы
 * заплатить было проще, чем сымитировать. Номер чека — ключевой шаг: у
 * заплатившего он под рукой, а выдуманный не сойдётся с выпиской.
 */
type Step = 'pay' | 'proof' | 'done';

export function VoteFlow({
  teams,
  onTeamsChange,
  activeSlug,
  onClose,
  whatsappBase,
  votePrice,
}: {
  teams: TeamWithStats[];
  onTeamsChange: (teams: TeamWithStats[]) => void;
  activeSlug: string | null;
  onClose: () => void;
  whatsappBase: string;
  votePrice: number;
}) {
  const team = teams.find((t) => t.slug === activeSlug) ?? null;

  const [step, setStep] = useState<Step>('pay');
  const [amount, setAmount] = useState(String(votePrice));
  const [payerName, setPayerName] = useState('');
  const [receipt, setReceipt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(0);

  const amountNumber = Number(amount.replace(/\s/g, '')) || 0;
  const voteCount = Math.floor(amountNumber / votePrice);
  const proofReady = receipt.trim().length >= 4 && payerName.trim().length >= 2;

  const close = () => {
    setStep('pay');
    setAmount(String(votePrice));
    setPayerName('');
    setReceipt('');
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
    if (voteCount < 1) {
      setError(`Ең аз сома — ${tenge(votePrice)}`);
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

    const text =
      `Мөлдір өлең · дауыс\n` +
      `Қала: ${team.name}\n` +
      `Сома: ${fmt(amountNumber)} ₸ (${voteCount} дауыс)\n` +
      `Аты-жөнім: ${payerName.trim()}\n` +
      `Чек нөмірі: ${receipt.trim()}\n` +
      `\nТөлем түбіртегінің скриншотын осы хатқа тіркеңіз.`;

    if (whatsappBase) {
      window.open(`${whatsappBase}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }

    try {
      const res = await fetch('/api/vote/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamSlug: team.slug,
          amount: amountNumber,
          payerName: payerName.trim(),
          receipt: receipt.trim(),
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

      setGranted(data.quantity ?? voteCount);
      if (data.teams) onTeamsChange(data.teams);
      setStep('done');
    } catch {
      setError('Байланыс үзілді. Интернетті тексеріп, қайталаңыз.');
    } finally {
      setBusy(false);
    }
  };

  const voteAgain = (packVotes: number) => {
    setAmount(String(packVotes * votePrice));
    setReceipt('');
    setError(null);
    setStep('pay');
  };

  if (!team) return null;

  return (
    <Sheet open onClose={close}>
      {step === 'pay' ? (
        <>
          <h3 className="serif">{team.name} үшін дауыс</h3>
          <p className="sub">1 дауыс — {tenge(votePrice)}. Соманы таңдап, Kaspi арқылы төлеңіз.</p>

          <div className="packs">
            {VOTE_PACKS.map((pack) => {
              const packAmount = pack * votePrice;
              return (
                <button
                  key={pack}
                  type="button"
                  className={`pack${amountNumber === packAmount ? ' on' : ''}`}
                  onClick={() => setAmount(String(packAmount))}
                >
                  <b>{pack}</b>
                  <span>дауыс</span>
                  <i>{fmt(packAmount)} ₸</i>
                </button>
              );
            })}
          </div>

          <div className="field">
            <label htmlFor="vote-amount">Сома, ₸</label>
            <input
              id="vote-amount"
              type="number"
              inputMode="numeric"
              min={votePrice}
              step={votePrice}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="phone-hint">
              {voteCount > 0
                ? `${fmt(voteCount)} дауыс болып есептеледі`
                : `Ең аз сома — ${tenge(votePrice)}`}
            </p>
          </div>

          <SheetCta>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-fire btn-block" onClick={openKaspi} type="button">
              {tenge(amountNumber)} · Kaspi арқылы төлеу
            </button>
          </SheetCta>
        </>
      ) : step === 'proof' ? (
        <>
          <h3 className="serif">Төлемді растаңыз</h3>

          <div className="warn-box">
            <b>Төлемей дауыс есептелмейді</b>
            <p>
              Дода аяқталған соң біз <b>барлық төлемді бір-бірлеп тексереміз</b>.
              Чек нөмірі бойынша төлем табылмаса, дауыс санақтан алынып тасталады
              және нәтижеге әсер етпейді.
            </p>
          </div>

          <div className="recap">
            <div>
              <span>Қала</span>
              <b>{team.name}</b>
            </div>
            <div>
              <span>Сома</span>
              <b>{tenge(amountNumber)}</b>
            </div>
            <div>
              <span>Дауыс</span>
              <b>{fmt(voteCount)}</b>
            </div>
          </div>

          <div className="field">
            <label htmlFor="receipt">Kaspi чегінің нөмірі</label>
            <input
              id="receipt"
              type="text"
              inputMode="numeric"
              placeholder="Мысалы: 1126827352"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
            <p className="phone-hint">
              Kaspi қосымшасында төлем түбіртегін ашсаңыз, нөмір жоғарғы жағында тұр.
            </p>
          </div>

          <div className="field">
            <label htmlFor="payer-name">Kaspi-дегі атыңыз</label>
            <input
              id="payer-name"
              type="text"
              placeholder="Айдана С."
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
            />
            <p className="phone-hint">Төлемді выпискадан табу үшін керек.</p>
          </div>

          <p className="sub">
            Түйме WhatsApp-ты ашады — сол жерге түбіртектің скриншотын жіберіңіз.
          </p>

          <SheetCta>
            {error ? <p className="form-error">{error}</p> : null}
            {!whatsappBase ? <p className="form-error">WhatsApp нөмірі әзірге қосылмаған.</p> : null}
            {!proofReady ? (
              <p className="phone-hint" style={{ margin: '0 0 10px' }}>
                Чек нөмірі мен атыңызды толтырыңыз.
              </p>
            ) : null}
            <button
              className="btn btn-wa btn-block"
              onClick={() => void submitClaim()}
              disabled={busy || !proofReady}
              type="button"
            >
              {busy ? 'Тіркелуде...' : 'WhatsApp-қа скриншот жіберу'}
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
              {team.name} — {fmt(granted)} дауыс. Скриншот WhatsApp-қа жіберілгеннен кейін
              төлем тексеріледі.
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
