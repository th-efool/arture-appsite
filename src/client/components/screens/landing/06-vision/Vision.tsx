import { VisionHeader } from "./visionHeader";
import { VisionProgression } from "./visionProgression";
import { VisionCTA } from "./visionCTA";

export function Vision() {
    return (
        <section
            id="vision"
            className="relative w-full bg-[#08090c] text-white py-14 lg:py-20 px-4 sm:px-8 lg:px-12 overflow-hidden border-t border-white/10"
        >
            {/* Background Subtle Ambient Glows */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="mx-auto max-w-[1520px] relative z-10">
                <VisionHeader />
                <VisionProgression />
                <VisionCTA />
            </div>
        </section>
    );
}