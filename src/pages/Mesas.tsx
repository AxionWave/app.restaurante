import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';

export default function MesasPage() {
    return (
        <AppShell>
            <PageIntro
                eyebrow="Salão"
                title="Mesas"
                description="O mapa do salão. Ocupação, lugares e o ritmo do serviço."
            />
            <div className="panel mt-10 grid gap-px bg-line sm:grid-cols-3">
                {['Salão', 'Varanda', 'Reservas'].map((zona) => (
                    <div key={zona} className="bg-paper px-6 py-10">
                        <p className="kicker">Ambiente</p>
                        <p className="mt-3 font-display text-3xl text-ink">{zona}</p>
                        <p className="mt-2 text-sm text-ink/50">O mapa desta área entra quando as mesas forem definidas.</p>
                    </div>
                ))}
            </div>
        </AppShell>
    );
}
