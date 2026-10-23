export function HeroContent() {
    return (
        <div className="relative z-20 h-full">

            {/* Ultra-Wide Page Grid */}
            <div className="mx-auto h-full w-full max-w-[1600px] xl:max-w-[2000px] 2xl:max-w-[2500px] 3xl:max-w-[3000px] px-4 sm:px-8 xl:px-14 2xl:px-20">

                {/* Position Hero Block */}
                <div className="pt-28 sm:pt-36 lg:pt-48 xl:pt-60 2xl:pt-72 pb-12 sm:pb-16 xl:pb-24 2xl:pb-32">

                    <div className="max-w-[620px] xl:max-w-[850px] 2xl:max-w-[1100px] 3xl:max-w-[1400px]">

                        {/* Ultra-Wide Scaled Headline */}
                        <h1
                            className="
                                text-3xl sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem] 2xl:text-[6.5rem] 3xl:text-[7.8rem]
                                font-extrabold
                                leading-[1.05] sm:leading-[0.95]
                                tracking-tight
                                text-white
                            "
                        >
                            <span className="block">
                                Redefining how
                            </span>

                            <span className="block text-primary">
                                humans interact
                            </span>

                            <span className="block">
                                with industrial systems.
                            </span>

                        </h1>

                        {/* Ultra-Wide Scaled Subtitle */}
                        <p
                            className="
                                mt-6 sm:mt-8 xl:mt-10 2xl:mt-12
                                max-w-[500px] xl:max-w-[700px] 2xl:max-w-[900px]
                                text-base sm:text-xl lg:text-[1.4rem] xl:text-[1.8rem] 2xl:text-[2.2rem]
                                leading-relaxed
                                text-white/80
                            "
                        >
                            At the frontier of{" "}

                            <span className="text-primary font-semibold">
                                AI
                            </span>

                            ,{" "}

                            <span className="text-primary font-semibold">
                                Spatial Computing
                            </span>

                            {" "} &amp; {" "}

                            <span className="text-primary font-semibold">
                                Digital Twins
                            </span>

                            .

                        </p>

                        {/* Ultra-Wide Scaled Action Buttons */}
                        <div className="mt-8 sm:mt-10 xl:mt-12 2xl:mt-16 flex flex-col sm:flex-row gap-4 sm:gap-5 xl:gap-7 w-full sm:w-auto">

                            <a
                                href="#showcase"
                                aria-label="See Arture in Action — Immersive Industrial Features"
                                className="
                                    h-12 sm:h-14 xl:h-16 2xl:h-20
                                    rounded-2xl 2xl:rounded-3xl
                                    bg-white
                                    px-7 sm:px-9 xl:px-12 2xl:px-16
                                    text-base sm:text-lg xl:text-xl 2xl:text-2xl
                                    font-bold
                                    text-black
                                    transition-all
                                    duration-300
                                    hover:-translate-y-0.5
                                    w-full sm:w-auto
                                    shadow-xl
                                    inline-flex items-center justify-center
                                "
                            >
                                See Arture in Action
                            </a>

                            <a
                                href="#platform"
                                aria-label="Explore Arture Industrial Platform Technology"
                                className="
                                    h-12 sm:h-14 xl:h-16 2xl:h-20
                                    rounded-2xl 2xl:rounded-3xl
                                    border
                                    border-white/30
                                    bg-white/5
                                    px-7 sm:px-9 xl:px-12 2xl:px-16
                                    text-base sm:text-lg xl:text-xl 2xl:text-2xl
                                    font-bold
                                    text-white
                                    backdrop-blur-md
                                    transition-all
                                    duration-300
                                    hover:bg-white/10
                                    w-full sm:w-auto
                                    inline-flex items-center justify-center
                                "
                            >
                                Explore Technology
                            </a>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}