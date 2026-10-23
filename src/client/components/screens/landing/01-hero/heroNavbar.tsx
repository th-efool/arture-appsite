import Image from "next/image";
import Link from "next/link";

const navigation = [
    { href: "#showcase", label: "Showcase" },
    { href: "#ikigai", label: "Why Arture" },
    { href: "#platform", label: "Platform" },
    { href: "#architecture", label: "Architecture" },
    { href: "#vision", label: "Vision" },
];

export function HeroNavbar() {
    return (
        <header className="absolute inset-x-0 top-0 z-30 pt-6 sm:pt-10 xl:pt-14 2xl:pt-16 px-4 sm:px-8 xl:px-14 2xl:px-20">
            {/* Accessible Skip Link for Keyboard & Screen Reader Users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black shadow-2xl transition-all"
            >
                Skip to main content
            </a>

            <div className="mx-auto max-w-[1520px] xl:max-w-[2000px] 2xl:max-w-[2500px] 3xl:max-w-[3000px]">
                <div className="flex items-center justify-between gap-4">

                    {/* Official Arture Brand Logo with Ultra-Wide Scaling */}
                    <Link href="/" className="flex items-center gap-3 xl:gap-4 2xl:gap-5 shrink-0" aria-label="Arture Home">
                        <Image
                            src="/icons/logo.svg"
                            alt="Arture Logo"
                            width={80}
                            height={80}
                            priority
                            className="h-10 w-10 sm:h-14 sm:w-14 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20 object-contain rounded-xl"
                        />
                        <span className="text-xl sm:text-2xl lg:text-[1.9rem] xl:text-[2.2rem] 2xl:text-[2.6rem] font-light tracking-[0.25em] text-white">
                            Arture
                        </span>
                    </Link>

                    {/* Desktop & Ultra-Wide Navigation Links */}
                    <nav className="hidden md:block" aria-label="Main Navigation">
                        <ul className="flex items-center gap-6 lg:gap-10 xl:gap-14 2xl:gap-18">
                            {navigation.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-medium text-white/80 transition-colors duration-300 hover:text-white"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Header CTA: Login / Signup Button */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Link
                            href="/login"
                            aria-label="Arture Login or Sign Up"
                            className="inline-flex h-10 sm:h-12 xl:h-14 2xl:h-16 items-center rounded-2xl 2xl:rounded-3xl bg-[#F59E38] hover:bg-[#E88819] px-4 sm:px-7 xl:px-9 2xl:px-11 text-xs sm:text-base xl:text-lg 2xl:text-xl font-bold text-black shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02]"
                        >
                            Login / Signup
                            <span className="ml-2 text-sm sm:text-lg xl:text-xl">&rarr;</span>
                        </Link>
                    </div>

                </div>
            </div>
        </header>
    );
}
