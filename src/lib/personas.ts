/**
 * Everything the buyer-facing pages say about an industry lives here.
 * Every "fact" quote is copied verbatim from an IOMETE public page and is checked
 * against the corpus by scripts/check-facts.mjs, so the sales story stays sourced.
 */

export type PersonaId = "hospital" | "bank" | "government" | "retail" | "telecom" | "other";

export interface Fact {
  /** Plain-language benefit headline shown to a non-technical buyer. */
  headline: string;
  /** Verbatim sentence from IOMETE's public pages. */
  quote: string;
  url: string;
  source: string;
}

export interface Column { key: string; label: string; sensitive?: boolean }

export interface Persona {
  id: PersonaId;
  emoji: string;
  name: string;
  tagline: string;
  /** Pain points phrased the way this buyer would say them. */
  frictions: { emoji: string; text: string }[];
  facts: Fact[];
  table: string;
  rowNoun: string;
  columns: Column[];
  rows: Record<string, string | number>[];
  roles: { full: string; restricted: string; why: string };
  questionSql: string;
  questionLabel: string;
  deleteSql: string;
  deleteLabel: string;
  askSuggestions: string[];
}

// ---- shared facts ----------------------------------------------------------
const F = {
  perimeter: {
    headline: "Your data never leaves your building",
    quote: "IOMETE's self-hosted platform ensures your data never leaves your security perimeter.",
    url: "https://iomete.com/product/architecture/data-security#complete-data-sovereignty",
    source: "IOMETE data security",
  },
  compliance: {
    headline: "Built for GDPR, HIPAA and SOC 2",
    quote: "Can IOMETE meet GDPR, HIPAA, and SOC 2 requirements? Yes, because you control the entire deployment.",
    url: "https://iomete.com/faq#security-compliance-cost",
    source: "IOMETE FAQ",
  },
  masking: {
    headline: "Sensitive fields hidden automatically",
    quote: "Safeguard sensitive info like PII, PCI, PHI with column anonymization in query results.",
    url: "https://iomete.com/resources/user-guide/data-security/data-masking",
    source: "IOMETE user guide: data masking",
  },
  savings: {
    headline: "Lower bills than cloud-only platforms",
    quote: "Most organizations save 30-60% compared to SaaS data platforms.",
    url: "https://iomete.com/faq#security-compliance-cost",
    source: "IOMETE FAQ",
  },
  regulated: {
    headline: "Chosen by regulated organisations",
    quote: "Financial institutions, healthcare organizations, and public sector entities use IOMETE specifically because the self-hosted model satisfies regulatory requirements that managed SaaS platforms cannot meet by design.",
    url: "https://iomete.com/resources/blog/data-lakehouse-for-regulated-enterprises#faqs",
    source: "IOMETE blog",
  },
  airgap: {
    headline: "Runs even with zero internet",
    quote: "Government agencies and defense contractors use IOMETE for classified workloads because it can run in secure, air-gapped, or government-cloud environments.",
    url: "https://iomete.com/faq#security-compliance-cost",
    source: "IOMETE FAQ",
  },
  undo: {
    headline: "Mistakes can be undone",
    quote: "Version rollback allows users to quickly correct problems by resetting tables",
    url: "https://iomete.com/resources/reference/iceberg-tables/getting-started#apache-iceberg",
    source: "IOMETE docs: Iceberg tables",
  },
  access: {
    headline: "Everyone sees only what they should",
    quote: "IOMETE implements RBAC and ABAC along with row-level security and data masking, integrating with enterprise identity providers for consistent authentication.",
    url: "https://iomete.com/resources/blog/iomete-core-components-technical-architecture#frequently-asked-questions",
    source: "IOMETE blog: architecture",
  },
  powerbi: {
    headline: "Works with the dashboards you already use",
    quote: "Introduced a custom IOMETE ODBC Driver over Arrow Flight protocol, enabling seamless integration with Power BI.",
    url: "https://iomete.com/resources/deployment/on-prem/release-notes#release-302-feb-03-2025",
    source: "IOMETE release notes",
  },
  realtime: {
    headline: "Live data, no complex plumbing",
    quote: "continuously writes them to Apache Iceberg tables in near real-time. No need to manage complex infrastructure like Kafka.",
    url: "https://iomete.com/resources/deployment/on-prem/release-notes#release-3160-february-9th-2026",
    source: "IOMETE release notes",
  },
  minutes: {
    headline: "Access in minutes, not IT tickets",
    quote: "Carol set up cross-team collaboration in minutes, not days or weeks of IT ticket processing.",
    url: "https://iomete.com/resources/blog/data-platform-security#the-enterprise-impact",
    source: "IOMETE blog: platform security",
  },
} satisfies Record<string, Fact>;

const PATIENT: Fact = {
  headline: "Patient data stays in your control",
  quote: "ensure patient data never leaves their controlled environment.",
  url: "https://iomete.com/resources/blog/why-2026-enterprises-move-saas-to-selfhosted-lakehouses#whos-actually-making-the-move",
  source: "IOMETE blog",
};
const INSURERS: Fact = {
  headline: "Ready for DORA and cross-border rules",
  quote: "Banks and insurance companies can't afford DORA violations or cross-border data transfer failures.",
  url: "https://iomete.com/resources/blog/why-2026-enterprises-move-saas-to-selfhosted-lakehouses#whos-actually-making-the-move",
  source: "IOMETE blog",
};
const CITIZEN: Fact = {
  headline: "Citizen data stays under national law",
  quote: "how agencies build an analytics platform that keeps citizen data under national jurisdiction",
  url: "https://iomete.com/resources/blog/public-sector-data-sovereignty-platform",
  source: "IOMETE blog: public sector",
};
const TELCO: Fact = {
  headline: "Proven at telecom scale",
  quote: "a managed Spark platform reduced data processing costs by up to 50 percent and delivered 2x to 24x faster query performance.",
  url: "https://iomete.com/resources/blog/managed-spark#frequently-asked-questions",
  source: "IOMETE blog: telecom case",
};
const RETAIL: Fact = {
  headline: "Real-time insight for stock and supply",
  quote: "Real-time data provides accurate and timely insights that enable businesses to make informed decisions and improve supply chain agility",
  url: "https://iomete.com/resources/glossary/real-time-retail#real-time-retail",
  source: "IOMETE glossary",
};

// ---- deterministic sample data --------------------------------------------
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Anaya", "Vihaan", "Isha", "Arjun", "Sara", "Reyansh", "Tara", "Kiaan", "Myra", "Dev", "Nisha", "Aditya", "Zoya", "Ishaan", "Riya"];
const LAST = ["Sharma", "Verma", "Gupta", "Iyer", "Khan", "Reddy", "Singh", "Patel", "Das", "Nair", "Mehta", "Bose"];
function people(n: number, seed: number, make: (r: () => number, i: number, name: string) => Record<string, string | number>) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    return make(r, i, name);
  });
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

export const PERSONAS: Persona[] = [
  {
    id: "hospital",
    emoji: "🏥",
    name: "Hospital or healthcare",
    tagline: "Better care decisions, with patient data that never leaves your walls.",
    frictions: [
      { emoji: "🔒", text: "Patient records can't go to someone else's cloud, so good analytics tools are off the table." },
      { emoji: "🧩", text: "Admissions, billing and lab data live in separate systems nobody can query together." },
      { emoji: "👀", text: "Billing staff need numbers, not diagnoses, and enforcing that by hand is slow." },
    ],
    facts: [PATIENT, F.masking, F.compliance, F.undo],
    table: "patients",
    rowNoun: "patient",
    columns: [
      { key: "id", label: "ID" }, { key: "name", label: "Patient", sensitive: true }, { key: "ward", label: "Ward" },
      { key: "age", label: "Age" }, { key: "diagnosis", label: "Diagnosis", sensitive: true }, { key: "stay_days", label: "Days" }, { key: "bill_inr", label: "Bill (₹)" },
    ],
    rows: people(40, 7, (r, i, name) => {
      const ward = pick(r, ["Cardiology", "ICU", "Pediatrics", "Orthopedics", "General"]);
      return { id: 1001 + i, name, ward, age: 18 + Math.floor(r() * 70), diagnosis: pick(r, ["Hypertension", "Fracture", "Asthma", "Diabetes", "Pneumonia", "Migraine"]), stay_days: 1 + Math.floor(r() * 12), bill_inr: Math.round((15000 + r() * 185000) / 100) * 100 };
    }),
    roles: { full: "Doctor", restricted: "Billing analyst", why: "Billing needs totals, never names or diagnoses." },
    questionSql: "SELECT ward, ROUND(AVG(stay_days), 1) AS avg_days FROM patients GROUP BY ward ORDER BY avg_days DESC",
    questionLabel: "Which ward keeps patients the longest?",
    deleteSql: "DELETE FROM patients WHERE ward = 'ICU'",
    deleteLabel: "Delete every ICU record by accident",
    askSuggestions: ["Can we use this without sending patient data to the cloud?", "How do we stop billing staff seeing diagnoses?", "What happens if someone deletes records by mistake?", "Does it work with Power BI?"],
  },
  {
    id: "bank",
    emoji: "🏦",
    name: "Bank or insurance",
    tagline: "Catch fraud faster and pass audits, on infrastructure you control.",
    frictions: [
      { emoji: "📜", text: "Regulators want proof you control your data, not just a vendor's promise." },
      { emoji: "💸", text: "Cloud data bills keep climbing as more teams run reports." },
      { emoji: "🕵️", text: "Fraud teams need card data while marketing must never see it." },
    ],
    facts: [INSURERS, F.regulated, F.savings, F.access],
    table: "transactions",
    rowNoun: "transaction",
    columns: [
      { key: "id", label: "Txn" }, { key: "customer", label: "Customer", sensitive: true }, { key: "card", label: "Card", sensitive: true },
      { key: "city", label: "City" }, { key: "channel", label: "Channel" }, { key: "amount_inr", label: "Amount (₹)" }, { key: "flagged", label: "Flagged" },
    ],
    rows: people(40, 11, (r, i, name) => ({
      id: 50001 + i, customer: name, card: `4${Math.floor(r() * 1e3).toString().padStart(3, "0")} •••• ${Math.floor(1000 + r() * 8999)}`,
      city: pick(r, ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Pune"]), channel: pick(r, ["UPI", "Card", "NetBanking", "ATM"]),
      amount_inr: Math.round(200 + r() * 90000), flagged: r() < 0.18 ? "yes" : "no",
    })),
    roles: { full: "Fraud investigator", restricted: "Marketing analyst", why: "Marketing studies trends, never names or card numbers." },
    questionSql: "SELECT channel, COUNT(*) AS flagged_txns FROM transactions WHERE flagged = 'yes' GROUP BY channel ORDER BY flagged_txns DESC",
    questionLabel: "Which payment channel gets flagged most?",
    deleteSql: "DELETE FROM transactions WHERE city = 'Mumbai'",
    deleteLabel: "Wipe all Mumbai transactions by accident",
    askSuggestions: ["How does this help with DORA or RBI audits?", "Will it cost less than our current cloud warehouse?", "Can the fraud team and marketing see different data?", "Can we run it in our own data center?"],
  },
  {
    id: "government",
    emoji: "🏛️",
    name: "Government or public sector",
    tagline: "Serve citizens better while their data stays under national law.",
    frictions: [
      { emoji: "🌐", text: "Citizen data can't sit with a foreign cloud provider, so modern analytics feels out of reach." },
      { emoji: "📡", text: "Some networks are air-gapped and most tools assume an internet connection." },
      { emoji: "🗂️", text: "Departments can't share data safely, so requests take weeks." },
    ],
    facts: [CITIZEN, F.airgap, F.regulated, F.minutes],
    table: "services",
    rowNoun: "request",
    columns: [
      { key: "id", label: "Request" }, { key: "citizen", label: "Citizen", sensitive: true }, { key: "aadhaar_last4", label: "ID (last 4)", sensitive: true },
      { key: "district", label: "District" }, { key: "service", label: "Service" }, { key: "days_open", label: "Days open" }, { key: "status", label: "Status" },
    ],
    rows: people(40, 23, (r, i, name) => ({
      id: 7001 + i, citizen: name, aadhaar_last4: String(Math.floor(1000 + r() * 8999)),
      district: pick(r, ["North", "South", "East", "West", "Central"]), service: pick(r, ["Water", "Ration card", "Pension", "Birth certificate", "Road repair"]),
      days_open: Math.floor(r() * 40), status: pick(r, ["Open", "Resolved", "Resolved", "In progress"]),
    })),
    roles: { full: "Department officer", restricted: "Policy researcher", why: "Researchers study patterns without identifying anyone." },
    questionSql: "SELECT service, ROUND(AVG(days_open), 1) AS avg_days_open FROM services GROUP BY service ORDER BY avg_days_open DESC",
    questionLabel: "Which service makes citizens wait longest?",
    deleteSql: "DELETE FROM services WHERE district = 'North'",
    deleteLabel: "Remove the whole North district by accident",
    askSuggestions: ["Can it run with no internet at all?", "Does citizen data stay inside the country?", "Can two departments share data safely?", "How do we get started without a big project?"],
  },
  {
    id: "retail",
    emoji: "🛍️",
    name: "Retail or e-commerce",
    tagline: "Know what's selling right now and keep shelves stocked.",
    frictions: [
      { emoji: "⏱️", text: "Sales reports arrive a day late, after the stockout already happened." },
      { emoji: "📈", text: "Every festive season the data bill spikes with traffic." },
      { emoji: "🙈", text: "Customer contact details leak into every spreadsheet." },
    ],
    facts: [RETAIL, F.realtime, F.savings, F.powerbi],
    table: "orders",
    rowNoun: "order",
    columns: [
      { key: "id", label: "Order" }, { key: "customer", label: "Customer", sensitive: true }, { key: "phone", label: "Phone", sensitive: true },
      { key: "city", label: "City" }, { key: "category", label: "Category" }, { key: "amount_inr", label: "Amount (₹)" }, { key: "returned", label: "Returned" },
    ],
    rows: people(40, 31, (r, i, name) => ({
      id: 90001 + i, customer: name, phone: `+91 9${Math.floor(1e8 + r() * 8.9e8)}`,
      city: pick(r, ["Mumbai", "Delhi", "Jaipur", "Kolkata", "Hyderabad"]), category: pick(r, ["Fashion", "Electronics", "Home", "Grocery", "Beauty"]),
      amount_inr: Math.round(199 + r() * 25000), returned: r() < 0.15 ? "yes" : "no",
    })),
    roles: { full: "Store manager", restricted: "Merchandising analyst", why: "Merchandising needs trends, not phone numbers." },
    questionSql: "SELECT category, SUM(amount_inr) AS revenue_inr FROM orders GROUP BY category ORDER BY revenue_inr DESC",
    questionLabel: "Which category earns the most?",
    deleteSql: "DELETE FROM orders WHERE category = 'Electronics'",
    deleteLabel: "Delete all Electronics orders by accident",
    askSuggestions: ["Can we see sales in real time?", "Will this lower our data costs?", "Can we hide customer phone numbers from analysts?", "Does it connect to Power BI or Tableau?"],
  },
  {
    id: "telecom",
    emoji: "📶",
    name: "Telecom",
    tagline: "Billions of records, fast answers, predictable costs.",
    frictions: [
      { emoji: "🐢", text: "Network reports over billions of records take hours to run." },
      { emoji: "💰", text: "Data platform costs grow faster than subscribers." },
      { emoji: "📇", text: "Subscriber details must stay protected under telecom rules." },
    ],
    facts: [TELCO, F.perimeter, F.savings, F.masking],
    table: "network",
    rowNoun: "subscriber",
    columns: [
      { key: "id", label: "Sub ID" }, { key: "subscriber", label: "Subscriber", sensitive: true }, { key: "msisdn", label: "Number", sensitive: true },
      { key: "circle", label: "Circle" }, { key: "plan", label: "Plan" }, { key: "dropped_calls", label: "Dropped calls" }, { key: "data_gb", label: "Data (GB)" },
    ],
    rows: people(40, 41, (r, i, name) => ({
      id: 30001 + i, subscriber: name, msisdn: `+91 8${Math.floor(1e8 + r() * 8.9e8)}`,
      circle: pick(r, ["Mumbai", "Delhi NCR", "Karnataka", "Tamil Nadu", "UP East"]), plan: pick(r, ["Prepaid 299", "Prepaid 599", "Postpaid 499", "Postpaid 999"]),
      dropped_calls: Math.floor(r() * 25), data_gb: Math.round(r() * 120),
    })),
    roles: { full: "Network engineer", restricted: "Marketing analyst", why: "Marketing studies usage, never phone numbers." },
    questionSql: "SELECT circle, SUM(dropped_calls) AS dropped FROM network GROUP BY circle ORDER BY dropped DESC",
    questionLabel: "Which circle drops the most calls?",
    deleteSql: "DELETE FROM network WHERE circle = 'Karnataka'",
    deleteLabel: "Delete the Karnataka circle by accident",
    askSuggestions: ["Can it handle billions of call records?", "How much could we save?", "Can we keep subscriber numbers hidden?", "Can it run in our own data center?"],
  },
  {
    id: "other",
    emoji: "🏢",
    name: "Any other organisation",
    tagline: "One place for all your data, inside your own infrastructure.",
    frictions: [
      { emoji: "🧩", text: "Data is scattered across tools and nobody trusts the numbers." },
      { emoji: "💸", text: "Cloud data platforms get expensive as you grow." },
      { emoji: "🔐", text: "Security reviews stall every new data project." },
    ],
    facts: [F.perimeter, F.savings, F.access, F.powerbi],
    table: "sales",
    rowNoun: "deal",
    columns: [
      { key: "id", label: "Deal" }, { key: "client", label: "Client", sensitive: true }, { key: "email", label: "Email", sensitive: true },
      { key: "region", label: "Region" }, { key: "product", label: "Product" }, { key: "value_inr", label: "Value (₹)" }, { key: "stage", label: "Stage" },
    ],
    rows: people(40, 53, (r, i, name) => ({
      id: 4001 + i, client: name, email: `${name.split(" ")[0].toLowerCase()}@example.com`,
      region: pick(r, ["North", "South", "East", "West"]), product: pick(r, ["Starter", "Growth", "Enterprise"]),
      value_inr: Math.round(20000 + r() * 980000), stage: pick(r, ["Won", "Won", "Lost", "Negotiation"]),
    })),
    roles: { full: "Sales head", restricted: "Finance analyst", why: "Finance needs totals, not client contact details." },
    questionSql: "SELECT region, SUM(value_inr) AS won_inr FROM sales WHERE stage = 'Won' GROUP BY region ORDER BY won_inr DESC",
    questionLabel: "Which region wins the most business?",
    deleteSql: "DELETE FROM sales WHERE region = 'South'",
    deleteLabel: "Delete the South region by accident",
    askSuggestions: ["What is a lakehouse, in plain words?", "Where does our data live?", "How much does it cost to start?", "Does it work with our BI tools?"],
  },
];

export const getPersona = (id: string | null | undefined): Persona => PERSONAS.find((p) => p.id === id) || PERSONAS[0];

/** Docs each playground mission mirrors, so buyers can go deeper on their own. */
export const MISSION_DOCS = {
  explore: { label: "SQL editor guide", url: "https://iomete.com/resources/user-guide/sql-editor/worksheets" },
  question: { label: "Power BI, Tableau and other integrations", url: "https://iomete.com/resources/deployment/on-prem/release-notes/integrations" },
  mask: { label: "Data masking guide", url: "https://iomete.com/resources/user-guide/data-security/data-masking" },
  undo: { label: "Watch: recovering deleted data (IOMETE University)", url: "https://www.youtube.com/watch?v=9CE3sRpibhE" },
  deploy: { label: "Deployment options", url: "https://iomete.com/product/deployment" },
};

export const LINKS = {
  pricing: "https://iomete.com/pricing",
  contact: "https://iomete.com/contact-us",
  university: "https://iomete.com/university",
  docs: "https://iomete.com/resources",
};

export const FREE_TIER: Fact = {
  headline: "Start free, up to 100 vCPUs",
  quote: "The world’s most generous free plan",
  url: "https://iomete.com/pricing#free",
  source: "IOMETE pricing",
};

/** Where-it-runs mission: one documented fact per deployment choice. */
export const DEPLOY_CHOICES: { id: string; emoji: string; label: string; detail: string; fact: Fact }[] = [
  {
    id: "onprem", emoji: "🏢", label: "Our own servers", detail: "On-premises, in your data center",
    fact: { headline: "Fits the servers you already own", quote: "Works with any Kubernetes distribution", url: "https://iomete.com/product/deployment#deploy-on-your-own-kubernetes-clusters-in-your-data-centers", source: "IOMETE deployment" },
  },
  {
    id: "cloud", emoji: "☁️", label: "Our own cloud account", detail: "AWS, Azure or Google Cloud, billed to you",
    fact: { headline: "Keep your cloud discounts", quote: "You can apply existing cloud discounts, reserved instances, and committed use contracts.", url: "https://iomete.com/resources/blog/why-2026-enterprises-move-saas-to-selfhosted-lakehouses#the-cost-argument-just-flipped", source: "IOMETE blog" },
  },
  {
    id: "airgap", emoji: "📡", label: "Fully offline", detail: "Air-gapped, zero internet",
    fact: {
      headline: "Runs even with zero internet",
      quote: "Government agencies and defense contractors use IOMETE for classified workloads because it can run in secure, air-gapped, or government-cloud environments.",
      url: "https://iomete.com/faq#security-compliance-cost", source: "IOMETE FAQ",
    },
  },
];

export const TIME_TRAVEL_DOC = "https://iomete.com/resources/reference/iceberg-tables/time-travel";
