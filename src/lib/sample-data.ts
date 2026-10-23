export const artureDemoMachines = [
  { assetCode: "ATR-DEMO-001", name: "CNC Router", model: "Mira 7i", location: "Workshop A", status: "operational" as const },
  { assetCode: "ATR-DEMO-002", name: "Laser Cutter", model: "Luma 60W", location: "Workshop B", status: "service_due" as const },
  { assetCode: "ATR-DEMO-003", name: "Vacuum Former", model: "FormLab VX", location: "Prototype Bay", status: "offline" as const },
];

export const artureDemoTechnicians = [
  { name: "Asha Mehta", specialty: "CNC and motion systems", phone: "+91 90000 00001", active: true },
  { name: "Rohan Iyer", specialty: "Laser optics and calibration", phone: "+91 90000 00002", active: true },
  { name: "Nisha Rao", specialty: "Fabrication and safety", phone: "+91 90000 00003", active: true },
];

export const artureDemoMaintenance = [
  { seedKey: "arture-demo-laser-alignment-v1", assetCode: "ATR-DEMO-002", technicianName: "Rohan Iyer", serviceDate: new Date("2026-10-14T09:30:00.000Z"), minutesSpent: 45, notes: "Cleaned lens assembly and scheduled mirror alignment." },
  { seedKey: "arture-demo-router-inspection-v1", assetCode: "ATR-DEMO-001", technicianName: "Asha Mehta", serviceDate: new Date("2026-10-08T11:00:00.000Z"), minutesSpent: 30, notes: "Completed spindle inspection and lubrication." },
  { seedKey: "arture-demo-former-assessment-v1", assetCode: "ATR-DEMO-003", technicianName: "Nisha Rao", serviceDate: new Date("2026-10-03T08:45:00.000Z"), minutesSpent: 60, notes: "Marked offline after heater fault assessment; replacement pending." },
];
