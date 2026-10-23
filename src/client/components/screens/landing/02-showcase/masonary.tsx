import Image from "next/image";
import { showcaseItems, ShowcaseItem } from "./showcaseData";

export function Masonary() {
    const vrTraining = showcaseItems[0];         // 01 landscape
    const expertGuidance = showcaseItems[1];      // 02 portrait
    const maintenanceLogging = showcaseItems[2];  // 03 landscape
    const aiGuidedAssistance = showcaseItems[3];  // 04 centered

    return (
        <div className="flex flex-col gap-[3px]">

            {/* ─── Row 1: Left col = VR Training (01) + Maintenance Logging (03), Right col = Expert Guidance (02 portrait) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[3px] items-stretch">

                {/* Left Column: 2 landscape cards stacked with 3px gap */}
                <div className="flex flex-col gap-[3px] justify-between">
                    <OverlayCard item={vrTraining} cardHeight="h-[280px] sm:h-[340px] lg:h-[390px]" />
                    <OverlayCard
                        item={maintenanceLogging}
                        cardHeight="h-[300px] sm:h-[360px] lg:h-[410px]"
                        objectFit="object-contain"
                    />
                </div>

                {/* Right Column: Expert Guidance (02) portrait card matching height on desktop, responsive on mobile */}
                <div className="h-full">
                    <OverlayCard
                        item={expertGuidance}
                        cardHeight="h-[380px] sm:h-[520px] lg:h-[803px]"
                        objectFit="object-contain"
                    />
                </div>
            </div>

            {/* ─── Row 2: AI Guided Assistance (04) centered, 1.5x width & extended vertically to avoid cutoff ─── */}
            <div className="w-full flex justify-center mt-[3px]">
                <div className="w-full lg:w-[75%] max-w-5xl">
                    <OverlayCard
                        item={aiGuidedAssistance}
                        cardHeight="h-[340px] sm:h-[440px] lg:h-[560px]"
                        objectFit="object-contain"
                    />
                </div>
            </div>
        </div>
    );
}

function OverlayCard({
    item,
    cardHeight,
    objectFit = "object-cover",
}: {
    item: ShowcaseItem;
    cardHeight: string;
    objectFit?: "object-cover" | "object-contain";
}) {
    return (
        <div
            className={`
                group relative overflow-hidden rounded-xl border border-white/10
                bg-[#0b0c10] shadow-xl transition-all duration-300
                hover:border-primary/50 hover:shadow-primary/20
                w-full ${cardHeight} flex flex-col justify-end
            `}
        >
            {/* Background / Content Image */}
            <div className="relative w-full h-full p-2 flex items-center justify-center overflow-hidden">
                <Image
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    fill
                    className={`
                        w-full h-full ${objectFit} object-center rounded-lg
                        transition-transform duration-700 ease-out
                        group-hover:scale-[1.02]
                    `}
                    priority={item.number === "01" || item.number === "02"}
                />
            </div>

            {/* Clean Semi-Transparent Top Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/30 to-transparent pointer-events-none rounded-xl" />

            {/* Text Overlay positioned cleanly at Top */}
            <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 lg:p-5 flex flex-col items-start pointer-events-none">
                <div className="flex items-center gap-2">
                    {/* Glowing Primary Badge */}
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-primary/25 text-primary border border-primary/50 backdrop-blur-xs">
                        {item.number}
                    </span>
                    {/* Card Title */}
                    <h3 className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-white drop-shadow-md">
                        {item.title}
                    </h3>
                </div>
                {/* Description */}
                <p className="mt-1 text-[11px] sm:text-xs lg:text-sm text-white/90 font-medium leading-snug drop-shadow-sm max-w-lg">
                    {item.description}
                </p>
            </div>
        </div>
    );
}
