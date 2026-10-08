import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';

export default function CardapioPage() {
    return (
        <AppShell>
            <PageIntro
                eyebrow="Carta"
                title="Cardápio"
                description="A carta da casa. Categorias, pratos e o que sai da cozinha entram nesta sala."
            />
            <div className="panel mt-10 px-6 py-16 text-center">
                <p className="font-display text-3xl italic text-ink/80">A carta ainda não foi composta.</p>
                <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">
                    Quando os pratos forem cadastrados, eles aparecem aqui como a carta que o salão consulta.
                </p>
            </div>
        </AppShell>
    );
}
