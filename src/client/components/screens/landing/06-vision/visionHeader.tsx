export function VisionHeader() {
    return (
        <div className="flex flex-col items-center text-center mb-12">
            {/* Pill / Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.25em]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                THE VISION
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>

            {/* Main Headline */}
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] max-w-4xl">
                Industrial systems have spent decades waiting for people to understand them.{" "}
                <span className="block mt-2 text-primary font-black">
                    It&apos;s time they understood us.
                </span>
            </h2>
        </div>
    );
}
