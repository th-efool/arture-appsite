import { ecosystemLogos } from "./architectureData";

export function ArchitectureEcosystem() {
    return (
        <div className="w-full max-w-5xl mx-auto mt-12 mb-6">
            {/* Bottom Statement Quote */}
            <div className="text-center mb-10">
                <blockquote className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1F2933]">
                    &ldquo;No single technology enables Arture.&rdquo;
                </blockquote>
                <p className="mt-2 text-sm sm:text-base text-[#5B6470] max-w-2xl mx-auto font-normal">
                    Arture exists where spatial computing, industrial engineering, machine intelligence, and enterprise systems converge.
                </p>
            </div>

            {/* Enterprise Integration Strip Box */}
            <div className="relative rounded-lg border border-[#3A506B]/30 bg-[#F7F4ED]/90 p-5 shadow-xs backdrop-blur-xs">
                {/* Blueprint Drafting Corner Marks */}
                <span className="absolute -top-1.5 -left-1.5 text-[10px] font-mono text-[#3A506B]/50 select-none">+</span>
                <span className="absolute -top-1.5 -right-1.5 text-[10px] font-mono text-[#3A506B]/50 select-none">+</span>
                <span className="absolute -bottom-1.5 -left-1.5 text-[10px] font-mono text-[#3A506B]/50 select-none">+</span>
                <span className="absolute -bottom-1.5 -right-1.5 text-[10px] font-mono text-[#3A506B]/50 select-none">+</span>

                {/* Strip Title */}
                <div className="text-center mb-4 pb-2 border-b border-[#3A506B]/20">
                    <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#1F2933] uppercase">
                        BUILT TO INTEGRATE WITH MODERN INDUSTRIAL INFRASTRUCTURE
                    </span>
                </div>

                {/* 12 Ecosystem Partner Logos Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {ecosystemLogos.map((logo) => (
                        <div
                            key={logo.id}
                            className="group flex flex-col items-center justify-center p-2.5 rounded-md border border-[#3A506B]/20 bg-white/70 hover:border-primary/50 hover:bg-white transition-all duration-200"
                        >
                            <span className="text-xs font-mono font-extrabold text-[#1F2933] tracking-tight group-hover:text-primary transition-colors">
                                {logo.name}
                            </span>
                            <span className="mt-0.5 text-[9px] font-mono text-[#5B6470] tracking-wider uppercase">
                                {logo.subtext}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
