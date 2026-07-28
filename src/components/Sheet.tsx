'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { formatPhoneInput } from '@/lib/phone';

/**
 * Нижняя шторка. На широких экранах CSS ставит её по центру.
 *
 * Рендерится порталом прямо в body, а не там, где стоит в разметке.
 * Причина: шторка вызывается изнутри <section>, у которой position:relative и
 * z-index:1 — это создаёт отдельный контекст наложения, и z-index шторки
 * действует только внутри него. Таб-бар живёт на уровне body, и без портала он
 * оказывается поверх шторки, закрывая кнопку оплаты на телефоне.
 */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  // На сервере document нет, поэтому портал вешаем только после монтирования.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div className="modal open" role="dialog" aria-modal="true">
      <button className="modal-bg" onClick={onClose} aria-label="Жабу" type="button" />
      <div className="sheet">
        <div className="grip" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Поле номера с постоянным «+7»: код страны не нужно набирать и нельзя стереть,
 * пробелы расставляются сами. Меньше поводов ввести номер в неверном виде.
 */
export function PhoneField({
  value,
  onChange,
  disabled,
  label = 'Kaspi нөміріңіз',
  hint = 'Төлем жасалған нөмірді жазыңыз.',
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor="kaspi-phone">{label}</label>
      <input
        id="kaspi-phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="+7 700 123 45 67"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(formatPhoneInput(e.target.value))}
        onFocus={(e) => {
          // Курсор всегда в конец, чтобы нельзя было начать печатать внутри «+7».
          const el = e.currentTarget;
          requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
        }}
      />
      <p className="phone-hint">{hint}</p>
    </div>
  );
}

/**
 * Подвал шторки с главной кнопкой. Прилипает к низу, поэтому кнопка видна и
 * когда экранная клавиатура съедает половину экрана.
 */
export function SheetCta({ children }: { children: ReactNode }) {
  return <div className="sheet-cta">{children}</div>;
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
            Сынақ режимі. Нақты ақша алынбайды.
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
