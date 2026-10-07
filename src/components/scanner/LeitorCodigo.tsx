import { useEffect, useRef, useState } from 'react';
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType, NotFoundException } from '@zxing/library';

export type FormatoLeitura = 'ean' | 'qr';

interface LeitorCodigoProps {
    /** Quais tipos de código aceitar — controla os formatos habilitados no detector. */
    formatos: FormatoLeitura[];
    onDetectar: (valor: string) => void;
    onFechar: () => void;
    titulo?: string;
}

const FORMATOS_NATIVOS: Record<FormatoLeitura, BarcodeFormat_[]> = {
    ean: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    qr: ['qr_code', 'code_128'],
};

const FORMATOS_ZXING: Record<FormatoLeitura, BarcodeFormat[]> = {
    ean: [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128],
    qr: [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128],
};

type BarcodeFormat_ = 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e' | 'code_128' | 'qr_code';

/**
 * Leitor de código de barras/QR pela câmera. Usa a Barcode Detection API nativa quando disponível
 * (Chrome/Android); senão cai para @zxing/library. Sem câmera/permissão negada → fallback de
 * upload de foto (`<input capture>`), que funciona em qualquer navegador/PWA instalado.
 */
export default function LeitorCodigo({ formatos, onDetectar, onFechar, titulo }: LeitorCodigoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const zxingRef = useRef<BrowserMultiFormatReader | null>(null);
    const rafRef = useRef<number | null>(null);
    const detectandoRef = useRef(false);
    const [erro, setErro] = useState<string | null>(null);
    const [usarFallbackArquivo, setUsarFallbackArquivo] = useState(false);

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

                if (window.BarcodeDetector) {
                    iniciarDeteccaoNativa();
                } else {
                    await iniciarZxing(stream);
                }
            } catch (e) {
                const nome = (e as DOMException)?.name;
                if (nome === 'NotAllowedError') {
                    setErro('Permissão de câmera negada. Permita o acesso nas configurações do navegador/app.');
                } else if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
                    setErro('Nenhuma câmera encontrada neste dispositivo.');
                } else {
                    setErro('Não foi possível abrir a câmera.');
                }
                setUsarFallbackArquivo(true);
            }
        }

        function iniciarDeteccaoNativa() {
            const aceitos = new Set(formatos.flatMap((f) => FORMATOS_NATIVOS[f]));
            const detector = new window.BarcodeDetector!({ formats: Array.from(aceitos) });
            const loop = async () => {
                if (cancelado || detectandoRef.current || !videoRef.current) return;
                detectandoRef.current = true;
                try {
                    const codigos = await detector.detect(videoRef.current);
                    if (codigos.length > 0) {
                        onDetectar(codigos[0].rawValue);
                        return;
                    }
                } catch {
                    // frame ilegível — tenta o próximo
                } finally {
                    detectandoRef.current = false;
                }
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        }

        async function iniciarZxing(stream: MediaStream) {
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, formatos.flatMap((f) => FORMATOS_ZXING[f]));
            const reader = new BrowserMultiFormatReader(hints);
            zxingRef.current = reader;
            if (!videoRef.current) return;
            await reader.decodeFromStream(stream, videoRef.current, (result, err) => {
                if (cancelado) return;
                if (result) {
                    onDetectar(result.getText());
                } else if (err && !(err instanceof NotFoundException)) {
                    // erro de decodificação pontual — ignora e continua tentando
                }
            });
        }

        void iniciar();
        return () => {
            cancelado = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            zxingRef.current?.reset();
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function decodificarArquivo(file: File) {
        const url = URL.createObjectURL(file);
        try {
            if (window.BarcodeDetector) {
                const aceitos = new Set(formatos.flatMap((f) => FORMATOS_NATIVOS[f]));
                const detector = new window.BarcodeDetector({ formats: Array.from(aceitos) });
                const bitmap = await createImageBitmap(file);
                const codigos = await detector.detect(bitmap);
                if (codigos.length > 0) {
                    onDetectar(codigos[0].rawValue);
                    return;
                }
                setErro('Nenhum código encontrado na foto. Tente novamente com mais luz e foco.');
            } else {
                const hints = new Map();
                hints.set(DecodeHintType.POSSIBLE_FORMATS, formatos.flatMap((f) => FORMATOS_ZXING[f]));
                const reader = new BrowserMultiFormatReader(hints);
                const result = await reader.decodeFromImageUrl(url);
                onDetectar(result.getText());
            }
        } catch {
            setErro('Nenhum código encontrado na foto. Tente novamente com mais luz e foco.');
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex items-center justify-between bg-black/80 px-4 py-3 text-white">
                <p className="text-sm font-medium">{titulo || 'Escanear'}</p>
                <button type="button" onClick={onFechar} className="rounded px-2 py-1 text-sm text-white/80 hover:text-white">
                    Fechar
                </button>
            </div>

            {!usarFallbackArquivo && (
                <div className="relative flex-1 overflow-hidden">
                    <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-40 w-64 rounded-lg border-2 border-white/70" />
                    </div>
                </div>
            )}

            {usarFallbackArquivo && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
                    <p className="text-sm text-white/80">
                        {erro || 'Use a câmera do aparelho para fotografar o código.'}
                    </p>
                    <label className="cursor-pointer rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white">
                        Tirar foto do código
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void decodificarArquivo(file);
                            }}
                        />
                    </label>
                </div>
            )}

            {erro && !usarFallbackArquivo && (
                <div className="bg-red-900/80 px-4 py-2 text-center text-sm text-white">{erro}</div>
            )}
        </div>
    );
}
