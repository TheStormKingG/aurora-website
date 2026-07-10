/**
 * Health Resources library — PDR §5/§6.1: evidence-based education,
 * categories, search, misinformation-countering content.
 * Mirrors the future Payload `resources` collection.
 * Plain-language standard: ~grade 8 readability (PDR §12).
 */

export type ResourceCategory =
  | "NCD Prevention"
  | "Maternal Health"
  | "Child Health"
  | "Healthy Ageing"
  | "Health Facts";

export const resourceCategories: ResourceCategory[] = [
  "NCD Prevention",
  "Maternal Health",
  "Child Health",
  "Healthy Ageing",
  "Health Facts",
];

export type Resource = {
  slug: string;
  title: string;
  category: ResourceCategory;
  summary: string;
  readingMinutes: number;
  updated: string;
  reviewed: string;
  keyPoints: string[];
  body: { heading: string; paragraphs: string[] }[];
  sources: string[];
};

export const resources: Resource[] = [
  {
    slug: "understanding-type-2-diabetes",
    title: "Type 2 Diabetes: What Your Numbers Mean",
    category: "NCD Prevention",
    summary:
      "What blood sugar readings actually tell you, when to get screened, and the everyday changes with the strongest evidence behind them.",
    readingMinutes: 6,
    updated: "2026-06-15",
    reviewed: "Aurora clinical team",
    keyPoints: [
      "A fasting blood sugar of 126 mg/dL (7.0 mmol/L) or higher on two tests indicates diabetes; 100–125 mg/dL signals pre-diabetes.",
      "Pre-diabetes is reversible for many people — losing 5–7% of body weight and 150 minutes of walking per week cut progression risk dramatically in major trials.",
      "You can have high blood sugar for years without symptoms. Screening matters even when you feel fine.",
    ],
    body: [
      {
        heading: "Why screening matters when you feel fine",
        paragraphs: [
          "Type 2 diabetes develops slowly. Blood sugar can sit above the healthy range for years before you notice thirst, tiredness, or blurry vision — and during those years it is quietly damaging blood vessels, nerves, kidneys, and eyes. That is why waiting for symptoms is the most expensive way to find out.",
          "A simple fasting blood test, or an HbA1c test that reflects your average sugar over three months, is enough to know where you stand. Aurora's mobile clinics offer both.",
        ],
      },
      {
        heading: "Reading your results",
        paragraphs: [
          "Fasting glucose below 100 mg/dL (5.6 mmol/L) is in the healthy range. 100–125 mg/dL is pre-diabetes — a warning light, not a diagnosis. 126 mg/dL or above on two separate tests indicates diabetes. HbA1c tells a similar story: below 5.7% healthy, 5.7–6.4% pre-diabetes, 6.5%+ diabetes.",
          "One high reading is a reason to re-test, not to panic. Illness, stress, and even a bad night's sleep can push a single number up.",
        ],
      },
      {
        heading: "What actually works",
        paragraphs: [
          "The strongest evidence for preventing or delaying type 2 diabetes is unglamorous: modest weight loss (5–7% of body weight), around 150 minutes of brisk walking a week, more fibre, fewer sugary drinks. In the landmark Diabetes Prevention Program study, these changes cut the risk of progressing from pre-diabetes to diabetes by 58% — better than medication.",
          "If you already have diabetes, the same habits plus consistent medication and regular monitoring protect your heart, kidneys, and eyes. Tracking your readings over time — as the Aurora Patient Portal does — turns isolated numbers into a trend you and your care team can act on.",
        ],
      },
    ],
    sources: [
      "WHO fact sheet: Diabetes",
      "Diabetes Prevention Program Research Group, NEJM",
      "PAHO: NCDs in the Americas",
    ],
  },
  {
    slug: "blood-pressure-basics",
    title: "High Blood Pressure: The Silent Number Worth Knowing",
    category: "NCD Prevention",
    summary:
      "Hypertension rarely announces itself. Learn what the two numbers mean, how to measure properly at home, and what brings pressure down.",
    readingMinutes: 5,
    updated: "2026-06-15",
    reviewed: "Aurora clinical team",
    keyPoints: [
      "Blood pressure of 140/90 mmHg or higher, measured properly on separate days, indicates hypertension.",
      "Most people with high blood pressure feel nothing at all — 'I feel fine' is not evidence your pressure is fine.",
      "Less salt, more movement, and taking prescribed medication consistently are the three highest-impact actions.",
    ],
    body: [
      {
        heading: "The two numbers",
        paragraphs: [
          "A blood pressure reading has two numbers: the pressure when your heart beats (systolic, the top number) and the pressure between beats (diastolic, the bottom). A healthy reading sits below 130/85 mmHg. Readings of 140/90 or above, taken correctly on different days, indicate hypertension.",
          "High blood pressure strains the heart and damages arteries, raising the risk of stroke, heart attack, and kidney disease. In the Caribbean, hypertension is among the most common chronic conditions in adults — and among the most under-treated.",
        ],
      },
      {
        heading: "Measuring it right",
        paragraphs: [
          "A rushed reading in a busy moment tells you little. For a reading that means something: sit quietly for five minutes first, feet flat on the floor, arm supported at heart level, no caffeine or smoking in the previous 30 minutes. Take two readings a minute apart and record both.",
          "If you monitor at home, bring your log — or better, track it in the Aurora Patient Portal so your care team sees the trend, not one nervous clinic reading.",
        ],
      },
      {
        heading: "Bringing it down",
        paragraphs: [
          "Three actions carry most of the evidence: cut salt (aim under 5g a day — watch seasoning cubes, processed and tinned foods), move briskly for 30 minutes most days, and if you are prescribed medication, take it every day — not only on days you feel unwell. Blood pressure tablets do not work in the bottle.",
          "Alcohol moderation, weight loss, and managing stress all help too. Small consistent changes beat dramatic short-lived ones.",
        ],
      },
    ],
    sources: [
      "WHO fact sheet: Hypertension",
      "PAHO HEARTS in the Americas",
      "International Society of Hypertension global practice guidelines",
    ],
  },
  {
    slug: "healthy-pregnancy-checklist",
    title: "A Healthy Pregnancy, Visit by Visit",
    category: "Maternal Health",
    summary:
      "What happens at each antenatal stage, the warning signs that need same-day attention, and how to prepare for birth with confidence.",
    readingMinutes: 7,
    updated: "2026-05-30",
    reviewed: "Aurora clinical team",
    keyPoints: [
      "Start antenatal care as early as possible — the first 12 weeks matter most for screening and folic acid.",
      "WHO recommends at least eight antenatal contacts across a pregnancy.",
      "Severe headache, blurred vision, heavy bleeding, reduced baby movement, or fever need same-day medical attention — never 'wait and see'.",
    ],
    body: [
      {
        heading: "Early pregnancy (weeks 1–12)",
        paragraphs: [
          "Book your first antenatal visit as soon as you know you are pregnant. Early visits confirm dates, screen for anaemia, blood group, infections, and blood pressure, and start folic acid — which protects your baby's developing spine most in these first weeks.",
          "Morning sickness, tiredness, and tender breasts are common and usually settle. Persistent vomiting that stops you keeping fluids down is not normal — seek care.",
        ],
      },
      {
        heading: "Mid and late pregnancy",
        paragraphs: [
          "From week 20 onward, visits track your baby's growth, your blood pressure, and screen for gestational diabetes. You will start feeling movement — get to know your baby's pattern, because a noticeable reduction in movement is a same-day reason to be checked.",
          "In the final weeks, your care team confirms the baby's position and helps you build a birth plan: where you will deliver, who supports you, and how you will get there. The Aurora pregnancy journey in the Patient Portal keeps your visits, results, and plan in one place.",
        ],
      },
      {
        heading: "Warning signs — act the same day",
        paragraphs: [
          "Some symptoms should never wait for the next appointment: severe headache or blurred vision, swelling of face and hands, heavy vaginal bleeding, fever, painful urination, waters breaking before 37 weeks, or a clear drop in your baby's movements. Contact your care team or nearest facility the same day.",
          "Trust your instinct. If something feels wrong, being checked and reassured is always the right call.",
        ],
      },
    ],
    sources: [
      "WHO recommendations on antenatal care for a positive pregnancy experience",
      "PAHO maternal health guidance",
    ],
  },
  {
    slug: "first-1000-days-nutrition",
    title: "The First 1,000 Days: Feeding Your Child's Future",
    category: "Child Health",
    summary:
      "From exclusive breastfeeding to first foods — the feeding decisions in your child's first two years shape lifelong health.",
    readingMinutes: 6,
    updated: "2026-05-22",
    reviewed: "Aurora clinical team",
    keyPoints: [
      "Exclusive breastfeeding for the first six months gives babies the strongest start, with protection against infection.",
      "From six months, babies need iron-rich complementary foods alongside continued breastfeeding.",
      "Growth monitoring catches problems early — bring your child for regular weight and length checks even when they seem well.",
    ],
    body: [
      {
        heading: "Birth to six months",
        paragraphs: [
          "Breast milk is the only food or drink a baby needs for the first six months — no water, teas, or porridge. It carries antibodies that protect against diarrhoea and chest infections, and it is always clean, warm, and available.",
          "Breastfeeding can be hard in the first weeks. Painful latching, worries about supply, and pressure from well-meaning relatives are all common — and all workable with support. Aurora's maternal programme and mobile teams provide practical breastfeeding help at home.",
        ],
      },
      {
        heading: "Starting solid foods (from six months)",
        paragraphs: [
          "At around six months, milk alone is no longer enough — especially for iron. Start with soft, mashed family foods and build variety: eggs, fish, chicken, liver, beans, peas, dark-green leafy vegetables, and fruit. Thick enough to stay on a spoon; watery porridges fill the belly without feeding the child.",
          "Keep breastfeeding alongside food into the second year. Avoid sugary drinks and salty snacks — habits form now.",
        ],
      },
      {
        heading: "Watching growth",
        paragraphs: [
          "Children should be weighed and measured regularly through the first two years. A child who is growing along their curve is almost always thriving; a curve that flattens or falls is an early warning that shows up long before a child looks unwell.",
          "Aurora records growth curves and milestones in your child's own lifelong health record — starting a file they will carry into adulthood.",
        ],
      },
    ],
    sources: [
      "WHO/UNICEF: infant and young child feeding",
      "WHO Child Growth Standards",
    ],
  },
  {
    slug: "vaccines-separating-fact-from-fiction",
    title: "Vaccines: Separating Fact from Fiction",
    category: "Health Facts",
    summary:
      "The most common vaccine myths, what the evidence actually shows, and how to weigh health claims you see on social media.",
    readingMinutes: 6,
    updated: "2026-06-28",
    reviewed: "Aurora clinical team",
    keyPoints: [
      "Vaccines are studied in tens of thousands of people before approval and monitored continuously afterward.",
      "The claimed vaccine–autism link came from a single fraudulent 1998 study, retracted and disproven by studies of millions of children.",
      "A useful filter for any health claim: Who is saying it? What do they sell? Does a major health body agree?",
    ],
    body: [
      {
        heading: "Myth: 'Natural infection is better than vaccination'",
        paragraphs: [
          "Infection can produce immunity — at the price of the disease itself. Measles kills and disables; whooping cough suffocates infants; tetanus has no herd immunity at all. Vaccines train the same immune response without the gamble.",
          "The 'natural is safer' instinct is understandable and wrong here: the natural version of these diseases is exactly what vaccines were built to spare us.",
        ],
      },
      {
        heading: "Myth: 'Vaccines cause autism'",
        paragraphs: [
          "This claim traces to one 1998 paper based on twelve children, later exposed as fraudulent and retracted; its author lost his medical licence. Since then, studies covering millions of children across multiple countries have found no link between vaccines and autism.",
          "Autism's signs typically become noticeable around the same age children receive routine vaccines — coincidence in timing, repeatedly shown not to be causation.",
        ],
      },
      {
        heading: "How to judge a health claim online",
        paragraphs: [
          "Misinformation spreads because it is emotionally sticky — fear travels faster than nuance. Before sharing or acting on a claim, ask: Who is making it, and are they qualified? Are they selling a product or channel membership? Do WHO, PAHO, or your ministry of health say the same thing? Does it claim a 'secret' that doctors are hiding?",
          "Countering misinformation with clear, evidence-based information is a core part of Aurora's mission — if a claim worries you, bring it to any Aurora clinician. You will get a straight answer, not judgement.",
        ],
      },
    ],
    sources: [
      "WHO: vaccine safety and misinformation resources",
      "Retraction: Wakefield et al., The Lancet",
      "Taylor et al. meta-analysis, Vaccine (1.2M children)",
    ],
  },
  {
    slug: "staying-strong-after-60",
    title: "Staying Strong After 60: Movement, Muscle, and Balance",
    category: "Healthy Ageing",
    summary:
      "Muscle loss is not destiny. Evidence-backed ways to keep strength, prevent falls, and stay independent longer.",
    readingMinutes: 5,
    updated: "2026-06-02",
    reviewed: "Aurora clinical team",
    keyPoints: [
      "Adults lose 3–8% of muscle per decade after 30 — but strength training works at every age, including your 80s.",
      "Falls are the leading cause of injury in older adults; balance practice measurably reduces them.",
      "The best exercise plan is the one you will actually repeat: start small, build slowly.",
    ],
    body: [
      {
        heading: "Muscle is your independence account",
        paragraphs: [
          "Getting out of a chair, carrying shopping, catching yourself when you trip — all of it runs on muscle. From our thirties we lose muscle steadily unless we use it, and the loss accelerates after 60. The encouraging evidence: resistance exercise rebuilds strength at any age. Studies in people over 80 show meaningful gains within weeks.",
          "You do not need a gym. Sit-to-stand repetitions from a sturdy chair, wall push-ups, carrying groceries, climbing stairs — done regularly, these are strength training.",
        ],
      },
      {
        heading: "Balance: practise before you need it",
        paragraphs: [
          "Falls are the leading cause of injury and lost independence in older adults, and fear of falling shrinks lives long before a fall happens. Balance is trainable: standing on one foot while holding a counter, heel-to-toe walking, or joining a group class all measurably cut fall risk.",
          "Review your home too — loose rugs, poor lighting, and trailing cords cause many falls that fitness alone cannot prevent.",
        ],
      },
      {
        heading: "Where Aurora fits",
        paragraphs: [
          "Aurora's active-ageing programme offers strength and balance classes, regular check-ins, and medication reminders through the Patient Portal. If getting to a class is the barrier, our mobile teams bring assessments to you — and with your explicit permission, a family member can follow your appointments and reminders.",
        ],
      },
    ],
    sources: [
      "WHO guidelines on physical activity for older adults",
      "Cochrane review: exercise for falls prevention",
    ],
  },
];

export function getResource(slug: string): Resource | undefined {
  return resources.find((r) => r.slug === slug);
}
