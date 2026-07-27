import type { Metadata } from 'next';
import { Reveal } from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Дода форматы | Мөлдір өлең',
  description: 'Мөлдір өлең доласы қалай өтеді: іріктеуден суперфиналға дейін.',
};

const STEPS = [
  { title: 'Онлайн іріктеу', text: 'Өтінім тапсырған ақындар арасынан үздіктер таңдалады.' },
  { title: 'Поэзия кештері', text: 'Әр сәрсенбі сайын командалар сахнада бақ сынасады.' },
  { title: 'Халық дауысы', text: 'Аз дауыс жинаған команда додадан шығып отырады.' },
  { title: 'Суперфинал', text: 'Үш үздік команда бас жүлде үшін күш сынасады.' },
];

export default function FormatPage() {
  return (
    <section className="page-top">
      <Reveal>
        <span className="eyebrow">Формат</span>
        <h2 className="h2">
          Дода қалай <em>өтеді?</em>
        </h2>
      </Reveal>

      <Reveal>
        <div className="steps">
          {STEPS.map((step, i) => (
            <div className="step" key={step.title}>
              <span className="dot serif">{i + 1}</span>
              <p>
                <b>{step.title}</b>
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
