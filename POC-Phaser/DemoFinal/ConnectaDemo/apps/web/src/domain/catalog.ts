export type EventRole = "VISITOR" | "PRESENTER" | "JUDGE" | "STAFF";
export type Category = "Engineering" | "Computing" | "Design" | "Health";
export interface Project {
  id: string;
  code: string;
  title: string;
  name: string;
  category: Category;
  topic: string;
  description: string;
  presenter: string;
  character: number;
  slot: string | null;
  color: string;
}
export interface Showcase {
  id: string;
  title: string;
  host: string;
  date: string;
  time: string;
  status: "live" | "upcoming" | "ended";
  category: string;
  color: string;
  description: string;
}
export const showcases: Showcase[] = [
  {
    id: "senior-showcase",
    title: "Senior Design Showcase 2026",
    host: "King Mongkut’s University of Technology Thonburi",
    date: "17 October 2026",
    time: "10:00 – 16:00 ICT",
    status: "live",
    category: "Technology & design",
    color: "blue",
    description:
      "A day of fresh perspectives, working prototypes, and conversations with the people building what comes next.",
  },
  {
    id: "greener-tomorrow",
    title: "Ideas for a greener tomorrow",
    host: "Sustainability & Design Lab",
    date: "23 October 2026",
    time: "10:00 – 15:00 ICT",
    status: "upcoming",
    category: "Sustainability",
    color: "green",
    description:
      "Small ideas for a healthier planet. Meet the next generation of circular design.",
  },
  {
    id: "capstone-demo",
    title: "Capstone Demo Day",
    host: "School of Information Technology",
    date: "30 October 2026",
    time: "09:00 – 16:00 ICT",
    status: "upcoming",
    category: "Computing",
    color: "orange",
    description:
      "Discover student projects that turn an everyday problem into a new possibility.",
  },
];
export const projects: Project[] = [
  {
    id: "aurora",
    code: "A01",
    title: "Mapping urban heat with open satellite data",
    name: "Aurora",
    category: "Engineering",
    topic: "Climate & cities",
    description:
      "Turning open satellite imagery into practical maps of urban heat. Explore how greener streets and better urban planning can make our cities more comfortable.",
    presenter: "Mika",
    character: 0,
    slot: "booth-01",
    color: "blue",
  },
  {
    id: "pixel-path",
    code: "A07",
    title: "Sign-language recognition on edge devices",
    name: "Pixel Path",
    category: "Computing",
    topic: "AI & accessibility",
    description:
      "Making everyday conversations more accessible. Our on-device model recognises hand gestures in real time, with no internet connection required.",
    presenter: "Prae",
    character: 9,
    slot: "booth-02",
    color: "purple",
  },
  {
    id: "greenloop",
    code: "B03",
    title: "A smarter soil-moisture network for campus gardens",
    name: "GreenLoop",
    category: "Engineering",
    topic: "Environment & IoT",
    description:
      "Small sensors, healthier gardens. This low-cost sensor network helps campus gardeners use less water and gives students a live view of soil health.",
    presenter: "Phum",
    character: 8,
    slot: "booth-03",
    color: "green",
  },
  {
    id: "recycle",
    code: "B09",
    title: "A modular bike-share dock from recycled aluminium",
    name: "Re:Cycle",
    category: "Design",
    topic: "Circular design",
    description:
      "A repairable bike dock made from reclaimed aluminium, designed to make short campus trips easier and reduce material waste.",
    presenter: "Ren",
    character: 3,
    slot: "booth-04",
    color: "orange",
  },
  {
    id: "touchpoint",
    code: "C02",
    title: "Adaptive prosthetic grip with tactile feedback",
    name: "Touchpoint",
    category: "Health",
    topic: "Assistive technology",
    description:
      "A lightweight prosthetic hand that gives the wearer useful feedback when holding everyday objects. Meet the team and explore the prototype.",
    presenter: "Dr. Pim",
    character: 11,
    slot: "booth-05",
    color: "pink",
  },
  {
    id: "open-notes",
    code: "C05",
    title: "Speech-to-text tutoring for first-generation students",
    name: "Open Notes",
    category: "Computing",
    topic: "Education & HCI",
    description:
      "Accessible lecture notes and real-time captions, co-designed with students to make learning easier to follow.",
    presenter: "Fah",
    character: 12,
    slot: null,
    color: "blue",
  },
];
export const characterNames = [
  "Mika",
  "Haru",
  "Nami",
  "Ren",
  "Sora",
  "Yuki",
  "Mali",
  "Nont",
  "Phum",
  "Prae",
  "Dr. Arun",
  "Dr. Pim",
  "Fah",
  "Dr. May",
];
export const characters = characterNames.map((name, index) => ({
  id: index,
  name,
  walk: `assets/characters/character-${String(index + 1).padStart(2, "0")}-walk.png`,
  idle:
    index >= 8
      ? `assets/characters/character-${String(index + 1).padStart(2, "0")}-idle.png`
      : null,
  portrait: `assets/characters/character-${String(index + 1).padStart(2, "0")}-portrait.png`,
}));
export const categories: Category[] = [
  "Engineering",
  "Computing",
  "Design",
  "Health",
];
export const sessions = [
  {
    id: "opening",
    time: "10:00",
    end: "10:20",
    title: "Together, create what’s next",
    type: "Opening",
    speaker: "Faculty of Engineering",
    project: null,
  },
  {
    id: "climate",
    time: "10:30",
    end: "11:00",
    title: "A cooler city starts with better data",
    type: "Project talk",
    speaker: "Mika · Aurora",
    project: "aurora",
  },
  {
    id: "accessible",
    time: "11:00",
    end: "11:30",
    title: "Designing for conversations without barriers",
    type: "Project talk",
    speaker: "Prae · Pixel Path",
    project: "pixel-path",
  },
  {
    id: "garden",
    time: "13:00",
    end: "13:30",
    title: "Small sensors. Greener campuses.",
    type: "Project talk",
    speaker: "Phum · GreenLoop",
    project: "greenloop",
  },
  {
    id: "awards",
    time: "15:30",
    end: "16:00",
    title: "Celebrating ideas and the people behind them",
    type: "Closing & awards",
    speaker: "All participants",
    project: null,
  },
];
export const rubric = [
  {
    id: "problem",
    name: "Problem & relevance",
    description:
      "A clear problem, supported by an understanding of the people affected.",
    weight: 25,
    max: 5,
  },
  {
    id: "innovation",
    name: "Innovation & approach",
    description:
      "Thoughtful choices and a meaningful contribution beyond existing work.",
    weight: 25,
    max: 5,
  },
  {
    id: "execution",
    name: "Execution & evidence",
    description:
      "A working outcome with appropriate testing and measurable results.",
    weight: 30,
    max: 5,
  },
  {
    id: "communication",
    name: "Communication",
    description: "A clear presentation and well reasoned answers.",
    weight: 20,
    max: 5,
  },
];
export function searchProjects(
  query: string,
  category = "All",
  list = projects,
) {
  const q = query.trim().toLocaleLowerCase();
  return list.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.title} ${p.name} ${p.topic} ${p.presenter} ${p.code}`
        .toLocaleLowerCase()
        .includes(q),
  );
}
export function weightedScore(scores: Record<string, number>) {
  return rubric.reduce(
    (sum, c) => sum + ((scores[c.id] ?? 0) / c.max) * c.weight,
    0,
  );
}
export function validScores(scores: Record<string, number>) {
  return rubric.every(
    (c) =>
      Number.isInteger(scores[c.id]) &&
      scores[c.id] >= 1 &&
      scores[c.id] <= c.max,
  );
}
