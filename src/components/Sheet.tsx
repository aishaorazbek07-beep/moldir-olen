'use client';

import { useEffect, type ReactNode } from 'react';

/** Нижняя шторка. На широких экранах CSS ставит её по центру. */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = '';
      removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal open" role="dialog" aria-modal="true">
      <button className="modal-bg" onClick={onClose} aria-label="Жабу" type="button" />
      <div className="sheet">
        <div className="grip" />
        {children}
      </div>
    </div>
  );
}

export function PhoneField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor="kaspi-phone">Kaspi нөміріңіз</label>
      <input
        id="kaspi-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 700 123 45 67"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="phone-hint">Шот осы нөмірдің Kaspi қосымшасына жіберіледі.</p>
    </div>
  );
}

/** Экран ожидания оплаты. Здесь человек уходит в Kaspi и подтверждает счёт. */
export function WaitingScreen({
  onTestPay,
  showTestButton,
}: {
  onTestPay?: () => void;
  showTestButton?: boolean;
}) {
  return (
    <div className="pay-wait">
      <div className="ring" />
      <h3 className="serif">Kaspi қосымшасын ашыңыз</h3>
      <p className="sub">
        Нөміріңізге шот жіберілді. Kaspi қосымшасынан төлемді растаңыз — бұл бет өзі жаңарады.
      </p>
      {showTestButton && onTestPay ? (
        <>
          <button className="btn btn-glass btn-block" onClick={onTestPay} type="button">
            Тестілік төлемді растау
          </button>
          <div className="sandbox-note">
            Сынақ режимі. Нақты ақша алынбайды. ApiPay шотты өз жағында өткізеді де, бізге нағыз
            webhook жібереді — растау жолы боевойымен бірдей.
          </div>
        </>
      ) : null}
    </div>
  );
}

export function FailScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="pay-fail">
      <div className="cross">!</div>
      <h3 className="serif">Төлем расталмады</h3>
      <p className="sub">{message}</p>
      <button className="btn btn-glass btn-block" onClick={onRetry} type="button">
        Қайта көру
      </button>
    </div>
  );
}
