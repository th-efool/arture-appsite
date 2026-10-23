
import {HeroNavbar} from "./heroNavbar";
import {HeroBackground} from "./heroBackground";
import {HeroContent} from "./heroContent";
import {HeroTicker} from "./heroTicker";

export function Hero() {
    return <section
        id="hero"
        className="relative min-h-screen overflow-hidden"
    >

    <HeroNavbar />
    <HeroBackground />
    <HeroContent />
    <HeroTicker/>
    </section>
}