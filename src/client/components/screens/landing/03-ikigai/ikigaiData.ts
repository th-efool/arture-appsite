export interface LossMetric {
    id: string;
    icon: string; // SVG icon type
    value: string;
    label: string;
    sublabel: string;
}

export interface ComparisonStep {
    icon: string;
    label: string;
    description: string;
}

export interface FeatureCardItem {
    id: string;
    title: string;
    imageSrc: string;
    description: string;
}

export interface ImpactStat {
    id: string;
    icon: string;
    value: string;
    label: string;
}

export const lossMetrics: LossMetric[] = [
    {
        id: "downtime-cost",
        icon: "wrench",
        value: "₹70L+",
        label: "Cost per hour of unplanned downtime",
        sublabel: "88% of Indian plants face monthly outages",
    },
    {
        id: "skill-gap",
        icon: "user",
        value: "40–45%",
        label: "Shortfall in skilled shopfloor technicians",
        sublabel: "~44% of workforce requires retraining",
    },
    {
        id: "copq-quality",
        icon: "gear",
        value: "15–20%",
        label: "Revenue lost to defects, scrap & rework",
        sublabel: "Up to 10–12% scrap in Tier-2/3 supply chains",
    },
    {
        id: "sme-delay",
        icon: "clock",
        value: "4–6 Hrs",
        label: "Average delay waiting for SME support",
        sublabel: "Plants spread across remote industrial corridors",
    },
];

export const todaySteps: ComparisonStep[] = [
    { icon: "file-text", label: "Search", description: "Manuals, PDFs, multiple systems" },
    { icon: "message-square", label: "Ask", description: "Colleagues, WhatsApp, calls" },
    { icon: "search", label: "Investigate", description: "Trial & error, machine stopped" },
    { icon: "clipboard", label: "Document", description: "Paper notes, forgotten later" },
];

export const todayBullets = [
    "Information is scattered across tools, people, and places.",
    "Tribal knowledge is lost when experts aren't available.",
    "Fixes take longer, repeat more often, and cost more.",
    "No real-time visibility. No continuous learning.",
];

export const artureSteps: ComparisonStep[] = [
    { icon: "glasses", label: "See", description: "Information in your view" },
    { icon: "brain", label: "Ask", description: "AI understands your context" },
    { icon: "target", label: "Act", description: "Guided steps, right the first time" },
    { icon: "check-circle", label: "Record", description: "Automated evidence, always connected" },
];

export const artureBullets = [
    "The right knowledge appears at the right moment.",
    "AI captures and scales your expert knowledge.",
    "Downtime drops. Quality improves. Costs fall.",
    "Data flows automatically. Insights drive action.",
];

export const featureCards: FeatureCardItem[] = [
    {
        id: "see-it",
        title: "See It. Understand It.",
        imageSrc: "/images/ikigai/see-it.jpg",
        description: "AI highlights what matters, explains why, and shows the next step.",
    },
    {
        id: "ask-anything",
        title: "Ask Anything.",
        imageSrc: "/images/ikigai/ask-anything.jpg",
        description: "Natural voice interaction. Instant answers based on your machine and your data.",
    },
    {
        id: "act-confidence",
        title: "Act With Confidence.",
        imageSrc: "/images/ikigai/act-confidence.jpg",
        description: "Guided procedures, real-time checklists, and tool assistance.",
    },
    {
        id: "capture-improve",
        title: "Capture & Improve.",
        imageSrc: "/images/ikigai/capture-improve.jpg",
        description: "Automatic documentation, evidence capture, and continuous learning.",
    },
    {
        id: "connect-experts",
        title: "Connect Experts.",
        imageSrc: "/images/ikigai/connect-experts.jpg",
        description: "Remote experts see what you see and guide you in real time.",
    },
];

export const impactStats: ImpactStat[] = [
    {
        id: "downtime-reduction",
        icon: "trending-down",
        value: "20–40%",
        label: "Reduction in downtime",
    },
    {
        id: "first-fix",
        icon: "check-circle",
        value: "30–50%",
        label: "Increase in first-time fix rate",
    },
    {
        id: "energy-savings",
        icon: "leaf",
        value: "10–25%",
        label: "Energy savings",
    },
    {
        id: "safer-ops",
        icon: "shield",
        value: "Safer operations",
        label: "Fewer incidents",
    },
    {
        id: "training-time",
        icon: "award",
        value: "1/3 the time",
        label: "to train new technicians",
    },
];
