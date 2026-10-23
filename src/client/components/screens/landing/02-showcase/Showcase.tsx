import { ShowcaseHeader } from "./showcaseHeader";
import { Masonary } from "./masonary";

export function Showcase() {
    return (
        <section
            id="showcase"
            className="relative w-full bg-[#08090c] py-6 lg:py-10 px-3 sm:px-6 lg:px-10 overflow-hidden"
        >
            {/* Background Subtle Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="mx-auto max-w-[1520px]">
                <ShowcaseHeader />
                <Masonary />
            </div>
        </section>
    );
}