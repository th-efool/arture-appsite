import Image from "next/image";
import { Mail } from "lucide-react";

export function Footer() {
    return (
        <footer id="contact" className="relative w-full bg-[#08090c] text-white/70 border-t border-white/10 py-10 px-4 sm:px-8 lg:px-12 z-20">
            <div className="mx-auto max-w-[1520px] flex flex-col md:flex-row items-center justify-between gap-6 text-xs sm:text-sm font-medium">
                {/* Left Side: Official Brand Logo, Copyright & Local NAP Citation */}
                <div className="flex flex-col items-center sm:items-start gap-2.5">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <Image
                                src="/icons/logo.svg"
                                alt="Arture Logo"
                                width={32}
                                height={32}
                                className="h-7 w-7 object-contain rounded-md"
                            />
                            <span className="text-base font-light tracking-[0.25em] text-white">
                                Arture
                            </span>
                        </div>

                        <span className="hidden sm:inline text-white/30">|</span>

                        <span className="text-white/60 text-center sm:text-left">
                            &copy; 2025 Arture Technologies Pvt. Ltd. All rights reserved.
                        </span>
                    </div>

                    {/* Local SEO & Academic Incubation Signal */}
                    <address className="not-italic text-[11px] sm:text-xs text-white/40 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
                        <span>Tinkering Lab, Indian Institute of Technology Roorkee, Uttarakhand 247667, India</span>
                        <span className="hidden sm:inline text-white/20">•</span>
                        <span>Supported by Ministry of MSME</span>
                    </address>
                </div>

                {/* Right Side: Navigation Links & Social Icons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <nav className="flex items-center gap-3 sm:gap-4" aria-label="Legal & Contact Navigation">
                        <a href="mailto:contact@arture.ai?subject=Privacy%20Policy%20Inquiry" className="hover:text-primary transition-colors">
                            Privacy Policy
                        </a>
                        <span className="text-white/30">|</span>
                        <a href="mailto:contact@arture.ai?subject=Terms%20of%20Service%20Inquiry" className="hover:text-primary transition-colors">
                            Terms of Service
                        </a>
                        <span className="text-white/30">|</span>
                        <a href="mailto:contact@arture.ai" className="hover:text-primary transition-colors">
                            Contact
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        {/* LinkedIn SVG Icon */}
                        <a
                            href="https://www.linkedin.com/company/arture-ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-[#0e1015] border border-white/10 flex items-center justify-center text-white/80 hover:text-primary hover:border-primary/50 transition-all"
                            aria-label="Arture on LinkedIn"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                            </svg>
                        </a>

                        {/* YouTube SVG Icon */}
                        <a
                            href="https://www.youtube.com/@ArtureAI"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-[#0e1015] border border-white/10 flex items-center justify-center text-white/80 hover:text-primary hover:border-primary/50 transition-all"
                            aria-label="Arture on YouTube"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-7-.16-8.03-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L1.8 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 7 .16 8.03.44.9.25 1.48.83 1.73 1.73z"/>
                            </svg>
                        </a>

                        {/* Email Icon */}
                        <a
                            href="mailto:contact@arture.ai"
                            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-[#0e1015] border border-white/10 flex items-center justify-center text-white/80 hover:text-primary hover:border-primary/50 transition-all"
                            aria-label="Email Arture at contact@arture.ai"
                        >
                            <Mail className="w-4 h-4" strokeWidth={1.8} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}