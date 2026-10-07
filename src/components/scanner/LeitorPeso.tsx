import { useEffect, useRef, useState } from 'react';
import { extrairPesoDeTexto } from '@/utils/pesoVariavel';

interface LeitorPesoProps {
    onDetectar: (pesoKg: number) => void;
    onFechar: () => void;
}

/**
 * Tira uma foto da etiqueta/embalagem e lê o peso impresso via OCR (tesseract.js, roda no
 * navegador). Só um atalho — a leitura nunca é garantida, o valor sempre fica editável depois.
 * tesseract.js baixa o worker/idioma de um CDN na primeira vez — exige internet no aparelho.
 */
export default function LeitorPeso({ onDetectar, onFechar }: LeitorPesoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [usarFallbackArquivo, setUsarFallbackArquivo] = useState(false);
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        async function iniciar() {
            if (!navigator.mediaDevices?.getUserMedia) {
                setUsarFallbackArquivo(true);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                });
                if (cancelado) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (!videoRef.current) return;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            } catch {
                setUsarFallbackArquivo(true);
            }
        }

        void iniciar();
        return () => {
            cancelado = true;
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    async function reconhecer(fonte: Blob | string) {
        setProcessando(true);
        setErro(null);
        try {
            const { recognize } = await import('tesseract.js');
            const { data } = await recognize(fonte, 'eng');
            const peso = extrairPesoDeTexto(data.text);
            if (peso) {
                onDetectar(peso);
            } else {
                setErro('Não encontrei um peso no texto da foto. Tente de novo com mais luz e foco, ou digite manualmente.');
            }
        } catch {
            setErro('Não foi possível ler a foto. Verifique sua conexão (a leitura de texto precisa de internet) e tente de novo.');
        } finally {
            setProcessando(false);
        }
    }

    function tirarFoto() {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) void reconhecer(blob);
        }, 'image/jpeg');
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex items-center justify-between bg-black/80 px-4 py-3 text-white">
                <p className="text-sm font-medium">⚖️ Ler peso da etiqueta</p>
                <button type="button" onClick={onFechar} className="rounded px-2 py-1 text-sm text-white/80 hover:text-white">
                    Fechar
                </button>
            </div>

            {!usarFallbackArquivo && (
                <div className="relative flex-1 overflow-hidden">
                    <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-64 rounded-lg border-2 border-white/70" />
                    </div>
                    <div className="absolute inset-x-0 bottom-6 flex justify-center">
                        <button
                            type="button"
                            disabled={processando}
                            onClick={tirarFoto}
                            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {processando ? 'Lendo...' : 'Tirar foto'}
                        </button>
                    </div>
                </div>
            )}

            {usarFallbackArquivo && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
                    <p className="text-sm text-white/80">Use a câmera do aparelho para fotografar o peso na etiqueta.</p>
                    <label className="cursor-pointer rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white">
                        {processando ? 'Lendo...' : 'Tirar foto da etiqueta'}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={processando}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void reconhecer(file);
                            }}
                        />
                    </label>
                </div>
            )}

            {erro && <div className="bg-red-900/80 px-4 py-2 text-center text-sm text-white">{erro}</div>}
        </div>
    );
}
