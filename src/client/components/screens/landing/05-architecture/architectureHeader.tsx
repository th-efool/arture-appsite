export function ArchitectureHeader() {
    return (
        <div className="flex flex-col items-center text-center mb-10 lg:mb-12 relative z-10">
            {/* Blueprint Caption Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-primary/40 bg-amber-500/10 text-primary text-xs font-mono font-bold tracking-[0.25em] uppercase">
                <span className="w-1.5 h-1.5 bg-primary" />
                THE ARCHITECTURE
                <span className="w-1.5 h-1.5 bg-primary" />
            </div>

            {/* Main Headline */}
            <h2 className="mt-3.5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1F2933] leading-[1.12]">
                SIX ENGINEERING SYSTEMS. <br className="hidden sm:inline" />
                <span className="text-primary font-black">ONE INDUSTRIAL INTERACTION PLATFORM.</span>
            </h2>

            {/* Supporting Paragraph */}
            <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#5B6470] max-w-3xl leading-relaxed font-normal">
                Arture exists where spatial computing, industrial engineering, machine intelligence, and enterprise systems converge to deliver interactive industrial experiences.
            </p>
        </div>
    );
}
