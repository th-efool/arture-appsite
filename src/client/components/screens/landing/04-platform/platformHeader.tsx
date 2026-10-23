import Image from "next/image";

export function PlatformHeader() {
    return (
        <div className="flex flex-col items-center text-center mb-12">
            {/* Top Pill / Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.25em]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                THE PLATFORM
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>

            {/* Main Headline */}
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] max-w-4xl">
                Industrial systems should{" "}
                <span className="text-primary underline decoration-primary/30 underline-offset-8">teach</span>,{" "}
                <span className="text-primary underline decoration-primary/30 underline-offset-8">guide</span>, and{" "}
                <span className="text-primary underline decoration-primary/30 underline-offset-8">document</span> themselves.
            </h2>

            {/* Subheader Banner Box */}
            <div className="mt-8 w-full max-w-4xl rounded-2xl border border-primary/20 bg-[#0e1015]/90 p-5 sm:p-6 lg:p-7 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 text-left border-t-2 border-t-primary/50">
                {/* Official Logo & Name */}
                <div className="flex items-center gap-3 shrink-0">
                    <Image
                        src="/icons/logo.svg"
                        alt="Arture Logo"
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain rounded-xl"
                    />
                    <div>
                        <span className="text-2xl font-light tracking-[0.25em] text-white">Arture</span>
                        <span className="block text-[10px] font-bold tracking-widest text-primary/90 uppercase">Industrial Platform</span>
                    </div>
                </div>

                {/* Divider Line */}
                <div className="hidden md:block w-px h-12 bg-white/10" />

                {/* Description */}
                <p className="text-sm lg:text-base text-white/80 leading-relaxed max-w-xl">
                    <strong className="text-white font-semibold">Arture</strong> enables industrial systems to participate during the work itself –{" "}
                    <span className="text-white font-medium">explaining</span>,{" "}
                    <span className="text-white font-medium">guiding</span>,{" "}
                    <span className="text-white font-medium">verifying</span>,{" "}
                    <span className="text-white font-medium">documenting</span>, and{" "}
                    <span className="text-white font-medium">continuously improving</span> every interaction as it happens.
                </p>
            </div>
        </div>
    );
}
