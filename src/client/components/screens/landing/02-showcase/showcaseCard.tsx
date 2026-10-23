import Image from "next/image";
import { ShowcaseItem } from "./showcaseData";

interface ShowcaseCardProps {
    item: ShowcaseItem;
}

export function ShowcaseCard({ item }: ShowcaseCardProps) {
    return (
        <div
            className="
                group relative flex flex-col justify-between
                overflow-hidden rounded-[24px] lg:rounded-[32px]
                border border-white/10 bg-[#0e1015] p-5 lg:p-7
                shadow-2xl transition-all duration-300
                hover:border-primary/40 hover:shadow-primary/5
            "
        >
            {/* Header Content */}
            <div className="mb-5 z-10">
                <span className="text-lg lg:text-xl font-bold text-primary tracking-wide">
                    {item.number}
                </span>
                <h3 className="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
                    {item.title}
                </h3>
                <p className="mt-2 text-sm lg:text-base text-white/70 max-w-xs leading-snug">
                    {item.description}
                </p>
            </div>

            {/* High-Fidelity UI Artwork Image */}
            <div className="relative w-full overflow-hidden rounded-xl lg:rounded-2xl border border-white/5 bg-black/40">
                <Image
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    width={800}
                    height={500}
                    className="
                        w-full h-auto object-cover rounded-xl lg:rounded-2xl
                        transition-transform duration-500 ease-out
                        group-hover:scale-[1.02]
                    "
                />
            </div>
        </div>
    );
}