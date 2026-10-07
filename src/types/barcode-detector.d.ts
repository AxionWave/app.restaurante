// A Barcode Detection API ainda não está nos libs padrão do TypeScript (só Chrome/Edge/Android).
// Declaração mínima para o uso feito em src/components/scanner/LeitorCodigo.tsx.
export {};

declare global {
    type BarcodeFormat =
        | 'aztec'
        | 'code_128'
        | 'code_39'
        | 'code_93'
        | 'codabar'
        | 'data_matrix'
        | 'ean_13'
        | 'ean_8'
        | 'itf'
        | 'pdf417'
        | 'qr_code'
        | 'upc_a'
        | 'upc_e';

    interface DetectedBarcode {
        readonly rawValue: string;
        readonly format: BarcodeFormat;
    }

    interface BarcodeDetectorOptions {
        formats?: BarcodeFormat[];
    }

    class BarcodeDetector {
        constructor(options?: BarcodeDetectorOptions);
        static getSupportedFormats(): Promise<BarcodeFormat[]>;
        detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
    }

    interface Window {
        BarcodeDetector?: typeof BarcodeDetector;
    }
}
