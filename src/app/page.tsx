import { Hero } from "@/client/components/screens/landing/01-hero";
import { VideoExplainer } from "@/client/components/screens/landing/video-explainer";
import { Showcase } from "@/client/components/screens/landing/02-showcase";
import { Ikigai } from "@/client/components/screens/landing/03-ikigai";
import { Platform } from "@/client/components/screens/landing/04-platform";
import { Architecture } from "@/client/components/screens/landing/05-architecture";
import { Vision } from "@/client/components/screens/landing/06-vision";
import { Footer } from "@/client/components/screens/landing/07-footer";

export default function Page() {
    return (
        <main id="main-content" className="relative flex flex-col min-h-screen bg-[#08090c] text-white">
            <Hero />
            <VideoExplainer />
            <Showcase />
            <Ikigai />
            <Platform />
            <Architecture />
            <Vision />
            <Footer />
        </main>
    );
}
