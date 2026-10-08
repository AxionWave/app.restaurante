import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import IconeNav from '@/components/IconeNav';

const CARDS = [
    {
        to: '/configuracoes/ambientes',
        eyebrow: 'Salas',
        title: 'Ambientes',
        text: 'Principal, varanda, reservado. A ordem em que o mapa abre.',
        icon: '/mesas',
    },
    {
        to: '/configuracoes/mesas',
        eyebrow: 'Móveis',
        title: 'Mesas',
        text: 'Número, lugares de sempre e a forma de cada mesa.',
        icon: '/mesas',
    },
    {
        to: '/configuracoes/equipe',
        eyebrow: 'Casa',
        title: 'Equipe',
        text: 'Quem entra no restaurante e lança o pedido no próprio nome.',
        icon: '/pedidos',
    },
] as const;

export default function ConfiguracoesPage() {
    return (
        <AppShell>
            <PageIntro
                eyebrow="Casa"
                title="Configurações"
                description="O que a casa é, antes do serviço começar. Cada card abre a sua sala."
            />
            <div className="mt-12 grid gap-px bg-line md:grid-cols-3">
                {CARDS.map((card) => (
                    <Link key={card.to} to={card.to} className="group bg-paper px-6 py-8 transition hover:bg-ivory">
                        <IconeNav path={card.icon} className="h-5 w-5 text-brass" />
                        <p className="kicker mt-6">{card.eyebrow}</p>
                        <p className="mt-2 font-display text-4xl text-ink">{card.title}</p>
                        <p className="mt-3 text-sm leading-relaxed text-ink/55">{card.text}</p>
                    </Link>
                ))}
            </div>
        </AppShell>
    );
}
