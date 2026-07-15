import Parser from "rss-parser";

export const revalidate = 86400;

type FeedSource = {
  name: string;
  homepage: string;
  feed: string;
};

type Article = {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  timestamp: number;
  contentSnippet: string;
};

type ImpactProfile = {
  industry: string;
  affectedSystem: string;
  protectedAsset: string;
  threatEvent: string;
  exposure: string;
  ciaImpact: string;
  likelihood: string;
  riskResponse: string;
  simpleAnalogy: string;
  humanImpact: string[];
};

const SOURCES: FeedSource[] = [
  {
    name: "BleepingComputer",
    homepage: "https://www.bleepingcomputer.com",
    feed: "https://www.bleepingcomputer.com/feed/",
  },
  {
    name: "KrebsOnSecurity",
    homepage: "https://krebsonsecurity.com",
    feed: "https://krebsonsecurity.com/feed/",
  },
  {
    name: "The Hacker News",
    homepage: "https://thehackernews.com",
    feed: "https://feeds.feedburner.com/TheHackersNews",
  },
  {
    name: "SecurityWeek",
    homepage: "https://www.securityweek.com",
    feed: "https://www.securityweek.com/feed/",
  },
];

const IMPACT_PROFILES: { keywords: string[]; profile: ImpactProfile }[] = [
  {
    keywords: ["hospital", "health", "clinic", "patient", "medical"],
    profile: {
      industry: "Healthcare",
      affectedSystem: "Clinical scheduling, patient records, or care coordination systems",
      protectedAsset: "Patient safety, care availability, and protected health information",
      threatEvent: "Disruption or compromise of clinical support systems",
      exposure: "High dependency on timely, accurate records and identity-backed workflows",
      ciaImpact: "Availability and integrity are the primary CIA concerns",
      likelihood: "Elevated when patient-facing operations rely on shared digital platforms",
      riskResponse: "Reduce through tested downtime procedures, segmentation, backups, and incident response exercises",
      simpleAnalogy:
        "Like a hospital losing the clipboard, phone tree, and appointment book at the same time. Care can still happen, but every step takes longer and mistakes are easier to make.",
      humanImpact: [
        "Appointments or procedures can be delayed while staff fall back to manual workflows",
        "Patients may wait longer for prescriptions, lab results, referrals, or billing answers",
        "Care teams spend more time reconciling records instead of focusing on people",
        "A routine health issue can become more stressful, expensive, or harder to navigate",
      ],
    },
  },
  {
    keywords: ["farm", "agriculture", "food", "grain", "wheat", "dairy", "meat"],
    profile: {
      industry: "Food and Agriculture",
      affectedSystem: "Production planning, logistics, inventory, or industrial control systems",
      protectedAsset: "Food production capacity, supply continuity, and operational technology",
      threatEvent: "Disruption of production, planning, logistics, or control systems",
      exposure: "Operational concentration can create single points of failure in regional supply chains",
      ciaImpact: "Availability is dominant, with integrity risk around production and inventory data",
      likelihood: "Moderate when farms, processors, and suppliers depend on connected systems",
      riskResponse: "Reduce through manual fallback plans, OT isolation, supplier redundancy, and recovery-time objectives",
      simpleAnalogy:
        "Like a farm or food plant losing the dashboard that tells workers what to harvest, process, ship, and restock. The food may exist, but getting it to shelves becomes slower and less predictable.",
      humanImpact: [
        "Farm or processing operations may slow while systems are restored",
        "Reduced production can tighten availability for ingredients or finished goods",
        "Retailers and restaurants may face higher prices or inconsistent supply",
        "Households can feel the impact as everyday staples become less predictable",
      ],
    },
  },
  {
    keywords: ["school", "university", "college", "student", "education"],
    profile: {
      industry: "Education",
      affectedSystem: "Learning platforms, identity systems, payroll, or student records",
      protectedAsset: "Student records, learning access, identity services, and campus operations",
      threatEvent: "Compromise or outage affecting academic and administrative services",
      exposure: "Large user populations and distributed access increase identity and data handling risk",
      ciaImpact: "Confidentiality and availability are the primary CIA concerns",
      likelihood: "Moderate to elevated during periods of high account activity or limited IT staffing",
      riskResponse: "Reduce through MFA, least privilege, data minimization, backup testing, and awareness training",
      simpleAnalogy:
        "Like a school locking the doors to classrooms, gradebooks, and office files at once. Learning continues where possible, but students and staff lose the normal map for the day.",
      humanImpact: [
        "Classes, assignments, or campus services can be interrupted",
        "Students and families may lose access to schedules, grades, or financial records",
        "Staff may shift to manual work and take longer to resolve support requests",
        "A disruption can widen stress for students who rely on school services daily",
      ],
    },
  },
  {
    keywords: ["bank", "payment", "fintech", "credit", "loan", "financial"],
    profile: {
      industry: "Financial Services",
      affectedSystem: "Payment processing, customer portals, fraud systems, or account services",
      protectedAsset: "Customer funds, transaction integrity, identity data, and financial trust",
      threatEvent: "Account, payment, or fraud-control disruption",
      exposure: "High-value data and always-on transaction systems increase attacker motivation",
      ciaImpact: "Integrity and availability are dominant, with confidentiality risk for account data",
      likelihood: "Elevated because financial systems are frequent targets for fraud and extortion",
      riskResponse: "Reduce and transfer through layered fraud controls, monitoring, cyber insurance, and tested recovery plans",
      simpleAnalogy:
        "Like a bank branch where the vault, teller screens, and fraud desk all need extra verification before anyone can move money safely.",
      humanImpact: [
        "People may lose easy access to balances, transfers, or payment history",
        "Merchants and customers may experience delayed transactions or support backlogs",
        "Fraud monitoring and account recovery work can become slower",
        "A missed payment or blocked account can ripple into fees, stress, or credit concerns",
      ],
    },
  },
  {
    keywords: ["water", "electric", "power", "energy", "utility", "pipeline", "grid"],
    profile: {
      industry: "Utilities and Energy",
      affectedSystem: "Operational technology, dispatch, billing, or monitoring systems",
      protectedAsset: "Essential service delivery, safety systems, and operational continuity",
      threatEvent: "Operational technology or dispatch disruption",
      exposure: "Cyber-physical dependencies can turn IT incidents into service-impacting events",
      ciaImpact: "Availability and integrity are the primary CIA concerns",
      likelihood: "Moderate, but impact severity can be high because services are essential",
      riskResponse: "Reduce through OT segmentation, safety interlocks, manual operations, and disaster recovery planning",
      simpleAnalogy:
        "Like a control room losing confidence in its gauges. Operators can still act, but they slow down because the cost of a wrong move is high.",
      humanImpact: [
        "Operators may reduce automation and rely on manual checks",
        "Outage response, maintenance, or customer notices can slow down",
        "Local communities may see service instability or longer restoration windows",
        "Basic household routines become harder when essential services feel uncertain",
      ],
    },
  },
  {
    keywords: ["transport", "shipping", "airport", "airline", "rail", "logistics", "freight"],
    profile: {
      industry: "Transportation and Logistics",
      affectedSystem: "Routing, booking, dispatch, warehouse, or fleet management systems",
      protectedAsset: "Movement of people, goods, routing data, and delivery commitments",
      threatEvent: "Disruption of routing, booking, dispatch, or warehouse operations",
      exposure: "Interdependent systems can amplify small delays across suppliers and customers",
      ciaImpact: "Availability is dominant, with integrity risk around routing and inventory decisions",
      likelihood: "Moderate when operations depend on connected scheduling and fleet systems",
      riskResponse: "Reduce through continuity plans, alternate carriers, manual dispatch paths, and supplier risk management",
      simpleAnalogy:
        "Like a delivery network losing its map, schedule, and loading list. Trucks may still move, but delays stack up quickly.",
      humanImpact: [
        "Shipments, travel, or deliveries may be delayed while systems recover",
        "Businesses may struggle to restock inventory or meet customer commitments",
        "Individuals may face missed appointments, travel disruption, or late essentials",
        "Small delays can compound across supply chains and everyday schedules",
      ],
    },
  },
  {
    keywords: ["ransomware", "breach", "stolen", "credentials", "data leak", "extortion"],
    profile: {
      industry: "Digital Services",
      affectedSystem: "Identity, customer data, internal operations, or support systems",
      protectedAsset: "User identity, customer data, service availability, and brand trust",
      threatEvent: "Credential theft, data exposure, malware, or service disruption",
      exposure: "Internet-facing services and reused credentials can expand the attack surface",
      ciaImpact: "Confidentiality and availability are dominant, with integrity risk for account actions",
      likelihood: "Elevated when exposed services, credentials, or third-party integrations are involved",
      riskResponse: "Reduce through MFA, logging, vulnerability management, least privilege, and user notification workflows",
      simpleAnalogy:
        "Like someone getting a copy of the master key ring and the customer service script. They can try doors, impersonate users, and create confusion before anyone notices.",
      humanImpact: [
        "People may need to reset passwords, monitor accounts, or verify suspicious messages",
        "Support teams can become overwhelmed, slowing help for everyday users",
        "Scammers may use leaked context to make phishing more convincing",
        "A technical incident can turn into personal time loss, anxiety, and financial risk",
      ],
    },
  },
];

const DEFAULT_PROFILE: ImpactProfile = {
  industry: "General Business Operations",
  affectedSystem: "Internal applications, identity systems, data stores, or operational workflows",
  protectedAsset: "Business continuity, customer trust, employee productivity, and sensitive data",
  threatEvent: "Operational disruption, data exposure, credential abuse, or malware activity",
  exposure: "Critical workflows often depend on identity, SaaS platforms, and third-party providers",
  ciaImpact: "Availability is common, with confidentiality and integrity depending on the affected system",
  likelihood: "Context-dependent, based on exposure, control maturity, and attacker motivation",
  riskResponse: "Reduce through layered controls, recovery objectives, tabletop exercises, and vendor risk management",
  simpleAnalogy:
    "Like a business losing access to its front desk, filing cabinet, and staff directory. Work can continue, but everything becomes slower, more manual, and easier to misunderstand.",
  humanImpact: [
    "Employees may lose access to normal tools and switch to slower manual processes",
    "Customers may face delays, missing updates, or reduced support quality",
    "Downstream partners can experience uncertainty around orders, billing, or service delivery",
    "The human impact often shows up as lost time, stress, higher costs, and reduced trust",
  ],
};

const parser = new Parser();

function normalizeUrl(value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isArticleLink(link: string, source: FeedSource) {
  try {
    const url = new URL(link);
    const homepage = new URL(source.homepage);

    return (
      url.hostname.replace(/^www\./, "") ===
        homepage.hostname.replace(/^www\./, "") &&
      url.pathname !== "/" &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

function toTimestamp(value?: string) {
  if (!value) return 0;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function subjectFromTitle(title: string) {
  const subject = title
    .split(
      /\s+(?:warns?|abused|infected|exposes|targeted|hacked|breached|hit|suffers|discloses|patches|fixes|vulnerability|malware|framework|attack)\b/i,
    )[0]
    .replace(/^(critical|unpatched|new|ongoing)\s+/i, "")
    .replace(/[,:-]+$/, "")
    .trim();

  return subject && subject.length <= 72 ? subject : "the affected technology";
}

function incidentSpecificImpact(article: Article): ImpactProfile | null {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  const subject = subjectFromTitle(article.title);

  if (includesAny(text, ["seed phrase", "recovery phrase", "hardware wallet", "crypto wallet"])) {
    return {
      industry: "Digital Assets",
      affectedSystem: `${subject} on an already-compromised user device`,
      protectedAsset: "Wallet recovery phrases, cryptocurrency holdings, and transaction control",
      threatEvent: "A trusted-looking wallet workflow is altered to request the user's recovery secret",
      exposure: "The malicious prompt appears inside familiar desktop software, making normal trust cues unreliable",
      ciaImpact: "Confidentiality of the recovery phrase leads directly to loss of transaction integrity and asset control",
      likelihood: "Conditional on malware already running on the wallet owner's computer",
      riskResponse: "Never enter a recovery phrase into a desktop prompt; verify wallet actions on the hardware device and rebuild infected systems",
      simpleAnalogy: `Like a fake vault clerk appearing inside the real ${subject} lobby and asking for the only master key to the vault.`,
      humanImpact: [
        `Malware on the computer presents a convincing recovery-phrase request through ${subject}`,
        "A wallet owner may disclose the phrase because the surrounding application appears legitimate",
        "The attacker can recreate the wallet elsewhere and authorize irreversible transfers",
        "The owner may lose funds and face a difficult recovery process because blockchain transfers generally cannot be reversed",
      ],
    };
  }

  if (includesAny(text, ["npm", "package manager", "malicious package", "software supply-chain", "supply-chain attack"])) {
    const packageSubject =
      subject.replace(/\s+(?:npm\s+)?packages?$/i, "").trim() || subject;

    return {
      industry: "Software Supply Chain",
      affectedSystem: `${packageSubject} dependencies, developer workstations, and downstream build environments`,
      protectedAsset: "Developer credentials, source code, build integrity, and downstream software users",
      threatEvent: "A trusted package update delivers credential-stealing or remote-access malware",
      exposure: "Automated dependency installation can spread one poisoned release across many development environments",
      ciaImpact: "Credential confidentiality and build integrity are primary, with possible downstream availability impact",
      likelihood: "Highest for teams that installed the named malicious versions before removal or detection",
      riskResponse: "Identify affected versions, rotate exposed credentials, rebuild trusted environments, and review package-lock and build logs",
      simpleAnalogy: `Like a supplier placing a key copier inside a routine shipment labeled ${packageSubject}; every workshop that opens it may expose its keys.`,
      humanImpact: [
        `A developer or automated build installs a compromised ${packageSubject} package version`,
        "The package can collect credentials or give the attacker access to the development environment",
        "Stolen access may be used against source repositories, release pipelines, or connected cloud services",
        "Engineering teams and customers may face emergency credential rotation, delayed releases, or concern about affected software",
      ],
    };
  }

  if (includesAny(text, ["account takeover", "hijack accounts", "account hijack"])) {
    return {
      industry: "Collaboration and SaaS",
      affectedSystem: `${subject} user accounts, desktop clients, and connected integrations`,
      protectedAsset: "Account identity, private communications, meeting access, and trusted user relationships",
      threatEvent: "An unauthenticated attacker exploits the client flaw to take control of a user account",
      exposure: "Affected client or SDK versions may place accounts at risk before users or administrators apply the fix",
      ciaImpact: "Account confidentiality and integrity are primary, with availability affected if legitimate users are locked out",
      likelihood: "Depends on exposure to the vulnerable software version and whether the flaw is actively exploited",
      riskResponse: "Patch affected clients and SDKs, review sessions and account changes, revoke suspicious tokens, and enforce MFA",
      simpleAnalogy: `Like a flaw in the ${subject} front door letting a stranger take over a visitor badge without first proving who they are.`,
      humanImpact: [
        `The vulnerable ${subject} client creates a path to a user's account`,
        "An attacker could impersonate the user or access communications available to that account",
        "Coworkers or customers may trust messages, invitations, or requests sent from the hijacked identity",
        "The affected person and organization may spend time restoring access, reviewing exposure, and warning contacts",
      ],
    };
  }

  if (
    includesAny(text, ["code execution", "remote code execution", "arbitrary code"]) &&
    includesAny(text, ["repository", "developer", "ide", "cursor", "project root"])
  ) {
    return {
      industry: "Software Development",
      affectedSystem: `${subject} workspaces, developer machines, and repositories opened from untrusted sources`,
      protectedAsset: "Developer endpoints, source code, credentials, and access to build or cloud systems",
      threatEvent: "Opening a crafted repository causes attacker-controlled code to run on the developer's machine",
      exposure: "Developers routinely clone and inspect external projects, and the malicious file can resemble a normal repository component",
      ciaImpact: "Endpoint and source-code integrity are primary, with confidentiality risk for credentials stored on the workstation",
      likelihood: "Requires a user to open a malicious or compromised repository with an affected application",
      riskResponse: "Apply vendor mitigations, treat unknown repositories as untrusted, isolate review environments, and rotate credentials after suspected execution",
      simpleAnalogy: `Like opening a project folder in ${subject} and having a file inside quietly run as though it were a trusted tool.`,
      humanImpact: [
        "An attacker publishes or shares a repository containing the crafted executable",
        `A developer opens the project in ${subject}, triggering code on their workstation`,
        "The attacker may gain access to local code, tokens, or connected development services",
        "The team may need to isolate systems, rotate credentials, audit repositories, and pause releases while trust is restored",
      ],
    };
  }

  if (
    includesAny(text, ["ai tool", "hacking agent", "gemini", "copilot", "language model"]) &&
    includesAny(text, ["botnet", "malware", "threat actor", "hacking"])
  ) {
    return {
      industry: "AI and Developer Tooling",
      affectedSystem: `${subject} command-line workflows and attacker-controlled botnet infrastructure`,
      protectedAsset: "Systems exposed to automated reconnaissance, victim devices, and confidence in AI-assisted tools",
      threatEvent: "A threat actor uses a legitimate AI tool to accelerate hacking tasks and operate malware infrastructure",
      exposure: "General-purpose automation can reduce the effort needed to analyze targets or coordinate repetitive malicious activity",
      ciaImpact: "The eventual impact depends on the systems targeted by the actor; the AI tool is an accelerator rather than the initial access itself",
      likelihood: "The report demonstrates misuse, but does not imply that ordinary users of the tool are compromised",
      riskResponse: "Monitor tool and API abuse, constrain automation privileges, detect botnet behavior, and focus defenses on the actor's actual access paths",
      simpleAnalogy: `Like an intruder using ${subject} as a faster research assistant and dispatcher; it helps them work, but it is not itself the broken lock.`,
      humanImpact: [
        `The threat actor directs ${subject} to assist with analysis or repetitive operational tasks`,
        "That assistance can make a small operator more efficient at managing malware or probing targets",
        "More organizations may encounter faster reconnaissance, phishing preparation, or botnet activity",
        "Defenders must investigate the resulting malicious behavior without assuming all use of the underlying AI tool is unsafe",
      ],
    };
  }

  if (includesAny(text, ["ransomware", "extortion", "encrypted systems"])) {
    return {
      ...DEFAULT_PROFILE,
      industry: "Ransomware-Affected Operations",
      affectedSystem: `${subject} systems and the identity, backup, and network services they depend on`,
      threatEvent: "Attackers disrupt operations through encryption, data theft, or extortion pressure",
      simpleAnalogy: `Like the organization described in ${subject} finding its working files locked while copies may already be in an extortionist's hands.`,
      humanImpact: [
        "Attackers gain enough access to steal data, disable systems, or deploy ransomware",
        "Staff lose normal tools and critical workflows move to slower manual alternatives",
        "Customers or partners may experience service delays and may need notification if their information was exposed",
        "Recovery costs, operational backlogs, and uncertainty can persist after systems return",
      ],
    };
  }

  if (includesAny(text, ["phishing", "credential-stealing", "credentials stolen", "stealer malware"])) {
    return {
      ...DEFAULT_PROFILE,
      industry: "Identity and Access",
      affectedSystem: `${subject} users, sign-in workflows, and services reachable with captured credentials`,
      protectedAsset: "User credentials, authenticated sessions, personal data, and trusted account actions",
      threatEvent: "Deceptive content or malware captures credentials that can be reused for account access",
      simpleAnalogy: `Like a convincing ${subject} sign-in desk secretly making a copy of every key handed across the counter.`,
      humanImpact: [
        "A person encounters the malicious prompt, message, or credential-stealing software",
        "Captured credentials give the attacker a chance to access the associated account",
        "Reused passwords or active sessions can expand the incident into other services",
        "The affected person may need to recover accounts, monitor activity, and warn contacts about impersonation",
      ],
    };
  }

  return null;
}

function inferredThreatEvent(text: string) {
  if (includesAny(text, ["ddos", "denial-of-service", "outage", "disruption", "offline"])) {
    return {
      label: "service disruption",
      event: "The reported activity reduces or interrupts access to the affected service",
      progression: "Users and dependent systems may lose reliable access while operators contain the disruption and restore capacity",
    };
  }

  if (includesAny(text, ["data leak", "data breach", "exposed data", "stolen data", "records stolen"])) {
    return {
      label: "data exposure",
      event: "The reported incident creates a path for sensitive information to leave its intended control boundary",
      progression: "Exposed records may support fraud, phishing, identity abuse, or regulatory notification depending on the data involved",
    };
  }

  if (includesAny(text, ["zero-day", "vulnerability", "security flaw", "exploit", "cve-"])) {
    return {
      label: "vulnerability exploitation",
      event: "The reported weakness gives an attacker a way to make the affected technology behave outside its intended controls",
      progression: "Successful exploitation may provide access, privileges, or code execution that can be used to reach connected systems and data",
    };
  }

  if (includesAny(text, ["credential", "password", "token", "session cookie", "account access"])) {
    return {
      label: "identity compromise",
      event: "The reported activity puts credentials, sessions, or trusted account access at risk",
      progression: "Stolen access can let an attacker impersonate a legitimate user and reach services available to that identity",
    };
  }

  if (includesAny(text, ["malware", "trojan", "backdoor", "spyware", "infostealer", "botnet"])) {
    return {
      label: "malware activity",
      event: "The reported malware establishes unwanted capability on an affected device or service",
      progression: "That foothold may be used to collect information, maintain access, issue commands, or support additional attacks",
    };
  }

  if (includesAny(text, ["phishing", "social engineering", "scam", "impersonat"])) {
    return {
      label: "deceptive access attempt",
      event: "The reported campaign uses trusted branding or context to persuade someone to take an unsafe action",
      progression: "A successful deception may disclose information, authorize a payment, install software, or provide access to an account",
    };
  }

  return {
    label: "reported cyber incident",
    event: "The reported activity challenges the security or reliability of the affected technology",
    progression: "The incident may create unauthorized access, unreliable operation, or investigative work depending on what the report confirms",
  };
}

function contextualizeFallback(article: Article, base: ImpactProfile): ImpactProfile {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  const subject = subjectFromTitle(article.title);
  const inferred = inferredThreatEvent(text);
  const sectorOutcome = base.humanImpact.at(-1) ||
    "People may experience lost time, uncertainty, higher costs, or reduced trust while the incident is resolved";

  return {
    ...base,
    affectedSystem: `${subject}, specifically the ${base.affectedSystem.toLowerCase()}`,
    threatEvent: inferred.event,
    simpleAnalogy: `Think of ${subject} as one link in a working chain: this ${inferred.label} weakens that link, and the practical impact depends on which people and services rely on it next.`,
    humanImpact: [
      `The reported ${inferred.label} affects ${subject}`,
      inferred.progression,
      `That creates risk to ${base.protectedAsset.toLowerCase()}`,
      sectorOutcome,
    ],
  };
}

function consumerOrCustomerImpact(article: Article, profile: ImpactProfile) {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();

  if (includesAny(text, ["seed phrase", "recovery phrase", "hardware wallet", "crypto wallet"])) {
    return "Consumer or Customer Impact: wallet owners could lose direct control of digital assets and may have little recourse after an unauthorized transfer";
  }

  if (includesAny(text, ["npm", "package manager", "software supply-chain", "supply-chain attack"])) {
    return "Consumer or Customer Impact: users of downstream software may face delayed updates, emergency fixes, or uncertainty about whether a product they trust included the compromised dependency";
  }

  if (includesAny(text, ["account takeover", "hijack accounts", "account hijack"])) {
    return "Consumer or Customer Impact: customers may receive convincing messages or requests from a hijacked account and may need to verify prior interactions with the legitimate owner";
  }

  if (includesAny(text, ["data leak", "data breach", "exposed data", "stolen data"])) {
    return "Consumer or Customer Impact: affected people may need to monitor accounts, handle notifications, and remain alert for fraud or phishing that uses the exposed information";
  }

  if (includesAny(text, ["credential", "password", "phishing", "impersonat", "infostealer"])) {
    return "Consumer or Customer Impact: people may need to recover accounts, reset reused credentials, review suspicious activity, and warn contacts about possible impersonation";
  }

  if (includesAny(text, ["ddos", "denial-of-service", "outage", "disruption", "offline"])) {
    return "Consumer or Customer Impact: customers may temporarily lose access to the service, encounter delayed transactions or support, and need an alternative way to complete time-sensitive tasks";
  }

  const industryImpact: Record<string, string> = {
    Healthcare:
      "patients may experience delays, extra administrative work, or uncertainty around appointments, results, prescriptions, or the privacy of their health information",
    "Financial Services":
      "customers may experience delayed payments, blocked access, added identity checks, or concern about the integrity of their accounts",
    Education:
      "students and families may lose timely access to classes, records, financial services, or other campus resources",
    "Utilities and Energy":
      "households and businesses may experience service instability, slower restoration, or less reliable customer information",
    "Transportation and Logistics":
      "travelers and recipients may face missed connections, delayed deliveries, or reduced visibility into where people and goods are",
    "Food and Agriculture":
      "shoppers may see less predictable availability, substitutions, or higher prices if operational delays reach the supply chain",
  };

  const tailored = industryImpact[profile.industry];
  if (tailored) return `Consumer or Customer Impact: ${tailored}`;

  return "Consumer or Customer Impact: customers may experience delays, additional security checks, account-recovery work, or reduced trust depending on how closely they rely on the affected service";
}

export function classifyImpact(article: Article) {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  const incidentProfile = incidentSpecificImpact(article);

  if (incidentProfile) return incidentProfile;

  const sectorProfile =
    IMPACT_PROFILES.find(({ keywords }) =>
      keywords.some((keyword) => text.includes(keyword)),
    )?.profile || DEFAULT_PROFILE;

  return contextualizeFallback(article, sectorProfile);
}

export function impactForArticle(article: Article) {
  const profile = classifyImpact(article);

  return {
    ...profile,
    humanImpact: [
      ...profile.humanImpact,
      consumerOrCustomerImpact(article, profile),
    ],
  };
}

function isBreachLike(article: Article) {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  return [
    "attack",
    "breach",
    "cyberattack",
    "data leak",
    "extortion",
    "hacked",
    "malware",
    "outage",
    "ransomware",
    "stolen",
    "vulnerability",
  ].some((keyword) => text.includes(keyword));
}

async function readFeed(source: FeedSource): Promise<Article[]> {
  const feed = await parser.parseURL(source.feed);

  return feed.items
    .map((item) => {
      const link = normalizeUrl(item.link || item.guid);

      if (!link || !isArticleLink(link, source) || !item.title) {
        return null;
      }

      const timestamp = toTimestamp(item.isoDate || item.pubDate);

      return {
        source: source.name,
        title: item.title,
        link,
        pubDate: timestamp
          ? new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(timestamp)
          : "Recent",
        timestamp,
        contentSnippet:
          item.contentSnippet?.replace(/\s+/g, " ").trim() ||
          "Open the original report for full details.",
      };
    })
    .filter((item): item is Article => Boolean(item));
}

export async function GET() {
  const settled = await Promise.allSettled(SOURCES.map(readFeed));
  const seen = new Set<string>();
  const articles = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((article) => {
      if (seen.has(article.link)) return false;
      seen.add(article.link);
      return true;
    })
    .filter(isBreachLike)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map((article) => {
      const profile = impactForArticle(article);

      return {
        ...article,
        industry: profile.industry,
        affectedSystem: profile.affectedSystem,
        protectedAsset: profile.protectedAsset,
        threatEvent: profile.threatEvent,
        exposure: profile.exposure,
        ciaImpact: profile.ciaImpact,
        likelihood: profile.likelihood,
        riskResponse: profile.riskResponse,
        simpleAnalogy: profile.simpleAnalogy,
        humanImpact: profile.humanImpact,
      };
    });

  return Response.json({
    updatedAt: new Date().toISOString(),
    disclaimer:
      "Impact chains are hypothetical human-centered scenarios based on article context and industry patterns, not claims about confirmed downstream harm.",
    items: articles,
  });
}
