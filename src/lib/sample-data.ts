import { waterPump } from "./demo-machine";

export const artureDemoMachines = [waterPump];

export const artureDemoTechnicians = [
  { name: "Asha Mehta", specialty: "CNC and motion systems", phone: "+91 90000 00001", active: true },
  { name: "Rohan Iyer", specialty: "Laser optics and calibration", phone: "+91 90000 00002", active: true },
  { name: "Nisha Rao", specialty: "Fabrication and safety", phone: "+91 90000 00003", active: true },
];

export const artureDemoMaintenance: { seedKey: string; assetCode: string; technicianName: string; serviceDate: Date; minutesSpent: number; notes: string }[] = [];
