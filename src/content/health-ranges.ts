/**
 * Informational reference bands (spec §10). NOT a diagnosis — every
 * badge carries the disclaimer below. Aurora's clinicians complete
 * reviewedBy/reviewedOn before launch; thresholds are theirs to edit.
 * Units: mg/dL for glucose and lipids, mmHg for blood pressure.
 */
export const rangesMeta = {
  reviewedBy: "",
  reviewedOn: "",
  disclaimer: "Reference ranges are general guidance, not a diagnosis. Talk to your care team.",
} as const;

export const bpThresholds = {
  source: "AHA/ACC 2017",
  urgentSystolic: 180, urgentDiastolic: 120,   // above either => urgent
  stage2Systolic: 140, stage2Diastolic: 90,    // at/above either => stage 2
  stage1Systolic: 130, stage1Diastolic: 80,    // at/above either => stage 1
  elevatedSystolic: 120,                       // 120–129 with diastolic < 80
} as const;

export const glucoseThresholds = {
  source: "ADA",
  low: 70,
  urgentHigh: 300,
  fasting: { normalBelow: 100, highFrom: 126 },
  other: { normalBelow: 140, highFrom: 200 },   // after meal / random / bedtime
} as const;

export const cholesterolThresholds = {
  source: "NCEP ATP III",
  total: { desirableBelow: 200, highFrom: 240 },
  ldl: [100, 130, 160, 190] as const,           // optimal | near optimal | borderline | high | very high
  hdl: { lowBelow: 40, protectiveFrom: 60 },
  triglycerides: [150, 200, 500] as const,      // normal | borderline | high | very high
} as const;

export const urgentMessages = {
  bp: "This reading is very high. If you have chest pain, shortness of breath, weakness, vision changes or trouble speaking, seek emergency care now. Otherwise rest for five minutes, measure again, and contact your care team today.",
  glucoseHigh: "This reading is very high. If you feel very thirsty, sick, drowsy or confused, seek emergency care now. Otherwise drink water, re-test in an hour, and contact your care team today.",
  glucoseLow: "This reading is low. Take fast-acting sugar now (juice, glucose tablets or sweets), re-test in 15 minutes, and seek emergency care if you feel faint or confused.",
} as const;
