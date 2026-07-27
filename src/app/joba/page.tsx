import type { Metadata } from 'next';
import { CountUp } from '@/components/CountUp';
import { Reveal } from '@/components/Reveal';
import { PROJECT_STATS } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Жоба туралы | Мөлдір өлең',
  description: 'Мөлдір өлең - қазақ поэзиясын жаңа биікке көтеретін рухани дода.',
};

export default function JobaPage() {
  return (
    <section className="page-top">
      <Reveal>
        <span className="eyebrow">Жоба туралы</span>
        <h2 className="h2">
          Поэзия - <em>сахнада</em>
        </h2>
        <p className="lead">
          Қазақ поэзиясын жаңа биікке көтеретін рухани дода. Әр сәрсенбі - жаңа кеш, жаңа жыр, жаңа
          тартыс.
        </p>
      </Reveal>

      <Reveal>
        <div className="stats">
          {PROJECT_STATS.map((stat) => (
            <div className="stat" key={stat.label}>
              <CountUp to={stat.value} />
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="prize-line">
          <span className="cup">🏆</span>
          <div>
            <b>3 000 000 ₸ + алтын статуэтка</b>
            <small>Бас жүлде - жеңімпаз өңірге табысталады</small>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
