import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function VisionCTA() {
    return (
        <div className="flex flex-col items-center text-center mt-14 mb-6">
            {/* Official Arture Brand Logo */}
            <div className="flex items-center gap-3 mb-2">
                <Image
                    src="/icons/logo.svg"
                    alt="Arture Logo"
                    width={52}
                    height={52}
                    className="h-12 w-12 object-contain rounded-xl"
                />
                <span className="text-3xl font-light tracking-[0.25em] text-white">
                    Arture
                </span>
            </div>

            {/* Sub-tagline */}
            <p className="text-base sm:text-lg font-bold text-white/90 tracking-tight">
                Redefining Human–Industrial Interaction.
            </p>

            {/* CTA Buttons */}
            <div className="mt-7 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link
                    href="/login"
                    className="group inline-flex items-center justify-center gap-2 bg-[#F59E38] hover:bg-[#E88819] text-black text-sm sm:text-base font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto"
                >
                    Login / Signup
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                </Link>

                <a
                    href="#contact"
                    className="inline-flex items-center justify-center bg-[#0e1015] hover:bg-[#141822] text-white border border-primary/30 hover:border-primary text-sm sm:text-base font-bold px-8 py-3.5 rounded-xl transition-all duration-300 w-full sm:w-auto"
                >
                    Contact Us
                </a>
            </div>

            {/* Sub-caption */}
            <p className="mt-6 text-xs sm:text-sm text-white/60 font-normal">
                Built for the next generation of{" "}
                <span className="text-primary font-semibold">industrial interaction.</span>
            </p>
        </div>
    );
}
