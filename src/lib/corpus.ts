import MiniSearch from "minisearch";
import type { Chunk } from "./types";
import raw from "@/data/corpus.json";

const chunks = raw as Chunk[];
const byId = new Map(chunks.map((c) => [c.id, c]));

const STOP = new Set(
  "a an the of to in on for and or is are do does did you your does can be with by as at from that this it its we our any all how what which when where who will has have been not if".split(" "),
);

// Questionnaire wording rarely matches doc wording. Expand the common security vocabulary.
const SYNONYMS: Record<string, string> = {
  sso: "single sign-on saml oidc",
  saml: "sso single sign-on",
  mfa: "multi-factor two-factor authentication",
  "2fa": "multi-factor two-factor authentication",
  rbac: "role-based access control permissions roles",
  ldap: "active directory sync",
  ad: "ldap active directory",
  pii: "personal data masking sensitive",
  phi: "health data masking hipaa",
  kms: "key management encryption keys",
  hsm: "key management encryption keys",
  byok: "customer managed keys encryption",
  tls: "https encryption in transit ssl certificate",
  ssl: "tls https certificate",
  soc: "soc 2 compliance audit report",
  iso: "27001 certification compliance",
  gdpr: "data protection privacy erasure retention",
  hipaa: "health data compliance",
  dora: "resilience regulated financial",
  dr: "disaster recovery multi-region failover backup",
  rpo: "disaster recovery backup replication",
  rto: "disaster recovery failover",
  backup: "backups snapshot time travel recovery",
  "air-gapped": "air gap offline isolated network on-premises",
  airgapped: "air gap offline isolated network on-premises",
  airgap: "air gap offline isolated network on-premises",
  siem: "audit logs export logging monitoring",
  audit: "audit logs logging query history",
  pentest: "penetration test vulnerability",
  penetration: "pentest vulnerability assessment",
  cve: "vulnerability patch security update",
  sbom: "software bill of materials dependencies",
  vendor: "iomete support access",
  subprocessor: "sub-processor third party",
  tenant: "multi-tenant isolation namespace domain",
  tenancy: "multi-tenant isolation namespace domain",
  residency: "data sovereignty region location",
  sovereignty: "sovereign residency on-premises",
  "row-level": "row level security filter policy",
  "column-level": "column masking policy",
  masking: "data masking anonymize policy",
  retention: "snapshot expiration delete lifecycle",
  deletion: "delete purge erasure retention",
  secrets: "secret management vault credentials",
  token: "access tokens api expiry",
  tokens: "access tokens api expiry",
  encryption: "encrypt encrypted sse cse at rest in transit",
  network: "network policies ingress egress firewall",
  firewall: "network policies ingress egress",
  logging: "logs audit monitoring",
  monitoring: "prometheus grafana metrics alerts",
  patch: "upgrade release version update",
  patching: "upgrade release version update",
  upgrade: "release notes version",
  kubernetes: "k8s helm namespace",
  k8s: "kubernetes helm namespace",
  telemetry: "phone home usage data outbound",
  support: "enterprise support sla severity",
  sla: "support severity response time",
  uptime: "high availability multi-region",
  availability: "high availability multi-region failover",
  incident: "incident response breach notification",
  breach: "incident response notification security",
};

let index: MiniSearch<Chunk> | null = null;

function getIndex(): MiniSearch<Chunk> {
  if (index) return index;
  index = new MiniSearch<Chunk>({
    fields: ["title", "heading", "text"],
    storeFields: [],
    processTerm: (term) => {
      const t = term.toLowerCase();
      return t.length < 2 || STOP.has(t) ? null : t;
    },
    searchOptions: {
      boost: { title: 2.2, heading: 1.6 },
      prefix: (term) => term.length > 3,
      fuzzy: (term) => (term.length > 5 ? 0.15 : false),
      combineWith: "OR",
    },
  });
  index.addAll(chunks);
  return index;
}

export function expandQuery(q: string): string {
  const words = q.toLowerCase().replace(/[^\w\s-]/g, " ").split(/\s+/).filter(Boolean);
  const extra: string[] = [];
  for (const w of words) if (SYNONYMS[w]) extra.push(SYNONYMS[w]);
  // multi-word phrases
  const lower = q.toLowerCase();
  if (/at rest/.test(lower)) extra.push("encryption at rest sse cse storage");
  if (/in transit/.test(lower)) extra.push("tls https encryption in transit");
  if (/single sign/.test(lower)) extra.push("sso saml oidc");
  if (/time travel|point.in.time|roll ?back/.test(lower)) extra.push("iceberg snapshot time travel rollback");
  if (/your (own )?(infrastructure|environment|cloud|data ?cent)/.test(lower)) extra.push("self-hosted on-premises deployment");
  return [q, ...extra].join(" ");
}

export function search(question: string, k = 8): Chunk[] {
  const ms = getIndex();
  const hits = ms.search(expandQuery(question));
  // Marketing pages and glossary are useful but should not crowd out product docs.
  const weight = (c: Chunk) => (c.src === "docs" || c.src === "user-guide" ? 1 : c.src === "website" ? 0.95 : c.src === "blog" ? 0.85 : 0.6);
  const ranked = hits
    .map((h) => ({ c: byId.get(h.id as string)!, s: h.score }))
    .filter((x) => x.c)
    .map((x) => ({ ...x, s: x.s * weight(x.c) }))
    .sort((a, b) => b.s - a.s);
  // at most 2 chunks per page so the model sees breadth
  const perPage = new Map<string, number>();
  const out: Chunk[] = [];
  for (const { c } of ranked) {
    const page = c.url.split("#")[0];
    const n = perPage.get(page) || 0;
    if (n >= 2) continue;
    perPage.set(page, n + 1);
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
}

export function getChunk(id: string): Chunk | undefined {
  return byId.get(id);
}

export const corpusStats = {
  chunks: chunks.length,
  pages: new Set(chunks.map((c) => c.url.split("#")[0])).size,
  sources: chunks.reduce<Record<string, number>>((acc, c) => ((acc[c.src] = (acc[c.src] || 0) + 1), acc), {}),
};
