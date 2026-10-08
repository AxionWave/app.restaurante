const traco = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export default function IconeNav({ path, className = 'h-5 w-5 shrink-0' }: { path: string; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
            {path === '/inicio' && <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />}
            {path === '/cardapio' && (
                <>
                    <path d="M12 4v16" />
                    <path d="M12 4H7.2A2.2 2.2 0 0 0 5 6.2v11.6A2.2 2.2 0 0 1 7.2 15.6H12" />
                    <path d="M12 4h4.8A2.2 2.2 0 0 1 19 6.2v11.6a2.2 2.2 0 0 0-2.2-2.2H12" />
                </>
            )}
            {path === '/pedidos' && (
                <>
                    <path d="M8 3.5h8v3H8z" />
                    <path d="M7 6.5h10V20H7z" />
                    <path d="M10 11h4M10 14.5h3" />
                </>
            )}
            {path === '/mesas' && (
                <>
                    <rect x="3.5" y="3.5" width="7" height="7" rx="0.5" />
                    <rect x="13.5" y="3.5" width="7" height="7" rx="0.5" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="0.5" />
                    <rect x="13.5" y="13.5" width="7" height="7" rx="0.5" />
                </>
            )}
            {path === '/estoque' && (
                <>
                    <path d="M3.5 8 12 4.5 20.5 8 12 11.5z" />
                    <path d="M3.5 8v8L12 19.5 20.5 16V8" />
                    <path d="M12 11.5V19.5" />
                </>
            )}
        </svg>
    );
}
