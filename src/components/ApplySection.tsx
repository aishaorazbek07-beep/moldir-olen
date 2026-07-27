'use client';

import { useState } from 'react';
import { APPLICATION_DEADLINE, APPLICATION_FEE } from '@/lib/config';
import { tenge } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import { Reveal } from './Reveal';
import { FailScreen, PhoneField, Sheet, WaitingScreen } from './Sheet';
import { TEST_MODE, usePayment } from './usePayment';

export function ApplySection() {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [region, setRegion] = useState('');
  const [resume, setResume] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [localError, setLocalError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const payment = usePayment();

  const submit = () => {
    setLocalError(null);

    if (name.trim().length < 2) {
      setLocalError('Аты-жөніңізді енгізіңіз');
      return;
    }
    if (!/^\d{4}$/.test(birthYear.trim())) {
      setLocalError('Туған жылыңызды енгізіңіз');
      return;
    }
    // Проверяем нормализацией, а не длиной: поле никогда не пустое — в нём
    // всегда есть «+7».
    if (!normalizePhone(phone)) {
      setLocalError('Kaspi нөміріңізді толық енгізіңіз');
      return;
    }

    setSheetOpen(true);
    void payment.start('/api/application/start', {
      name: name.trim(),
      birthYear: Number(birthYear),
      region: region.trim(),
      resume: resume.trim(),
      phone,
    });
  };

  const closeSheet = () => {
    setSheetOpen(false);
    payment.reset();
  };

  const busy = payment.phase === 'starting';

  return (
    <>
      <Reveal>
        <span className="eyebrow">2-маусым</span>
        <h2 className="h2">
          Өтінім <em>тапсыру</em>
        </h2>
        <p className="lead">
          Мөлдір өлең жобасының 2-маусымына қатысқыңыз келе ме? Өтінім қалдырыңыз.
        </p>
      </Reveal>

      <Reveal>
        <div className="apply-card">
          <div className="field">
            <label htmlFor="a-name">Аты-жөніңіз</label>
            <input
              id="a-name"
              type="text"
              placeholder="Мысалы: Айдана Серікқызы"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="a-year">Туған жылыңыз</label>
            <input
              id="a-year"
              type="number"
              inputMode="numeric"
              placeholder="1998"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="a-region">Өңіріңіз</label>
            <input
              id="a-region"
              type="text"
              placeholder="Алматы облысы"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="a-resume">Резюме / шығармашылық жолыңыз</label>
            <textarea
              id="a-resume"
              placeholder="Қысқаша өзіңіз және шығармашылығыңыз туралы жазыңыз..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>

          <PhoneField value={phone} onChange={setPhone} />

          <div className="fee">
            <span>Онлайн іріктеу турына қатысу құны</span>
            <b>{tenge(APPLICATION_FEE)}</b>
          </div>

          {localError ? <p className="form-error">{localError}</p> : null}

          <button className="btn btn-fire btn-block" onClick={submit} type="button">
            Төлеу және өтінім жіберу
          </button>
          <div className="deadline">
            ⏳ Өтінім қабылдау <b>{APPLICATION_DEADLINE}</b> аяқталады
          </div>
        </div>
      </Reveal>

      <Sheet open={sheetOpen} onClose={closeSheet}>
        {payment.phase === 'waiting' || busy ? (
          <WaitingScreen showTestButton={TEST_MODE} onTestPay={() => void payment.testPay()} />
        ) : payment.phase === 'paid' ? (
          <div className="pay-ok">
            <div className="check">✓</div>
            <h3 className="serif">Өтінім қабылданды!</h3>
            <p className="sub">
              Онлайн іріктеу турының нәтижесі туралы хабарлаймыз. Іске сәт!
            </p>
            <button className="btn btn-glass btn-block" onClick={closeSheet} type="button">
              Жабу
            </button>
          </div>
        ) : (
          <FailScreen
            message={payment.error ?? 'Төлем өтпеді'}
            onRetry={() => {
              setSheetOpen(false);
              payment.reset();
            }}
          />
        )}
      </Sheet>
    </>
  );
}
