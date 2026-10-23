export interface VisionStage {
    id: string;
    title: string;
    description: string;
    iconType: "machine" | "interactive" | "adaptive" | "factory" | "future";
}

export const visionStages: VisionStage[] = [
    {
        id: "machine",
        title: "Machine",
        description: "Isolated. Manual. Difficult to use.",
        iconType: "machine",
    },
    {
        id: "interactive",
        title: "Interactive System",
        description: "Visible. Guided. Context-aware.",
        iconType: "interactive",
    },
    {
        id: "adaptive",
        title: "Adaptive System",
        description: "Learns. Predicts. Assists continuously.",
        iconType: "adaptive",
    },
    {
        id: "intelligent",
        title: "Intelligent Factory",
        description: "Connected. Optimized. Operationally autonomous.",
        iconType: "factory",
    },
    {
        id: "future",
        title: "The Future",
        description: "Human + Machine working as one.",
        iconType: "future",
    },
];
