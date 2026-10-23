export function HeroBackground() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">

            {/* Background Video */}
            <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/images/hero-poster.webp"
                className="
                    absolute
                    inset-0
                    w-full
                    h-full
                    object-cover
                    object-center
                "
            >
                <source src="/videos/hero.webm" type="video/webm" />
                <source src="/videos/hero.mp4" type="video/mp4" />
            </video>

            {/* Left Reading Gradient */}
            <div
                className="
                    absolute inset-0
                    bg-[linear-gradient(to_right,rgba(17,16,24,0.88)_0%,rgba(17,16,24,0.72)_28%,rgba(17,16,24,0.35)_52%,rgba(17,16,24,0.08)_72%,transparent_100%)]
                "
            />

            {/* Top Fade */}
            <div
                className="
                    absolute inset-x-0 top-0 h-48
                    bg-gradient-to-b
                    from-black/45
                    via-black/20
                    to-transparent
                "
            />

            {/* Bottom Fade */}
            <div
                className="
                    absolute inset-x-0 bottom-0 h-72
                    bg-gradient-to-t
                    from-black/65
                    via-black/20
                    to-transparent
                "
            />

            {/* Edge Vignette */}
            <div
                className="
                    absolute inset-0
                    bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.12)_72%,rgba(0,0,0,0.45)_100%)]
                "
            />

        </div>
    );
}
