import { PlatformHeader } from "./platformHeader";
import { PlatformDiagram } from "./platformDiagram";
import { PlatformEvolution } from "./platformEvolution";
import { PlatformFooter } from "./platformFooter";

export function Platform() {
    return (
        <section
            id="platform"
            className="relative w-full bg-[#08090c] text-white py-14 lg:py-20 px-4 sm:px-8 lg:px-12 overflow-hidden border-t border-white/10"
        >
            {/* Background Ambient Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="mx-auto max-w-[1520px] relative z-10">
                <PlatformHeader />
                <PlatformDiagram />
                <PlatformEvolution />
                <PlatformFooter />
            </div>
        </section>
    );
}