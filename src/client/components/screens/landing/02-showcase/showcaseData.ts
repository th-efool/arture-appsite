export interface ShowcaseItem {
    id: string;
    number: string;
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
}

export const showcaseItems: ShowcaseItem[] = [
    {
        id: "vr-training",
        number: "01",
        title: "VR Training",
        description: "Practice in a risk-free virtual environment.",
        imageSrc: "/images/landng/s1.png",
        imageAlt: "VR Training interface showing haptic glove valve assembly and step instruction HUD",
    },
    {
        id: "expert-guidance",
        number: "02",
        title: "Expert Guidance",
        description: "Connect with experts in real-time, anywhere.",
        imageSrc: "/images/landng/s2.png",
        imageAlt: "Expert Guidance live video call interface with Senior Maintenance Engineer Rahul Sharma",
    },
    {
        id: "maintenance-logging",
        number: "03",
        title: "Maintenance Logging",
        description: "Every inspection. Every action. Automatically logged.",
        imageSrc: "/images/landng/s3.png",
        imageAlt: "Maintenance Logging dashboard with machine status, health score, and inspection checklist",
    },
    {
        id: "ai-guided-assistance",
        number: "04",
        title: "AI Guided Assistance",
        description: "Mixed Reality + AI to guide you step-by-step.",
        imageSrc: "/images/landng/s4.png",
        imageAlt: "AI Guided Assistance AR bounding box and step-by-step repair instruction card",
    },
];
