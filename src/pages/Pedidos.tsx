import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';

export default function PedidosPage() {
    return (
        <AppShell>
            <PageIntro
                eyebrow="Serviço"
                title="Pedidos"
                description="Comandas abertas, o que já foi para a cozinha e o que ainda está na mesa."
            />
            <div className="panel mt-10 px-6 py-16 text-center">
                <p className="font-display text-3xl italic text-ink/80">Nenhuma comanda nesta passagem.</p>
                <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">
                    Os pedidos do serviço vão aparecer aqui, na ordem em que o salão os lançar.
                </p>
            </div>
        </AppShell>
    );
}
