import type { ReactNode } from 'react';

interface PageIntroProps {
    eyebrow?: string;
    title: string;
    description?: string;
    children?: ReactNode;
}

export default function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                {eyebrow && <p className="kicker">{eyebrow}</p>}
                <h1 className={`${eyebrow ? 'mt-2' : ''} display`}>{title}</h1>
                {description && <p className="lede mt-3">{description}</p>}
            </div>
            {children}
        </div>
    );
}
