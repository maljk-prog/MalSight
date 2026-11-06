type TermProfile = {
  matches: string[];
  fields: [string, string, string, string, string];
  analogy: string;
};

export const trendFieldLabels = ["What it means", "How it works", "Why it matters", "What to look for", "What helps"] as const;

const profiles: TermProfile[] = [
  {
    matches: ["privilege escalation"],
    fields: [
      "Privilege escalation means gaining permissions beyond those an account or process should have.",
      "Attackers can exploit a software flaw, a misconfiguration, or overly broad permissions to reach a more powerful role.",
      "An ordinary account becoming an administrator can expose sensitive data and let an attacker disable defenses or take over systems.",
      "Watch for unexpected administrator membership, changes to access policies, and processes running with unusual elevated privileges.",
      "Apply relevant patches, enforce least privilege, review privileged roles, and investigate unexpected elevation events.",
    ],
    analogy: "Think of someone with a visitor badge finding a way to turn it into a master key for the whole building.",
  },
  {
    matches: ["ransomware"],
    fields: [
      "Ransomware is malware used to deny access to systems or files, usually alongside a demand for payment.",
      "Attackers gain access, may steal data, and can encrypt files across reachable systems.",
      "A single intrusion can interrupt operations and expose stolen information even when backups are available.",
      "Watch for unusual bulk file changes, attempts to disable backups, and unexpected remote administration activity.",
      "Keep tested isolated backups, patch exposed services, restrict access, and contain compromised systems quickly.",
    ],
    analogy: "It is like someone locking the office filing cabinets and demanding money for the keys, after possibly copying the paperwork.",
  },
  {
    matches: ["data breach", "okta breach"],
    fields: [
      "A data breach is unauthorized access to or disclosure of protected information.",
      "Stolen accounts, exposed storage, software flaws, or mistakes can put information in the wrong hands.",
      "Exposed records can enable fraud, targeted scams, account takeover, and further intrusions.",
      "Watch for unusual data exports, unfamiliar sign-ins, unexpected sharing, and provider incident notices.",
      "Limit data access and retention, monitor exports, and follow the affected provider’s verified response guidance.",
    ],
    analogy: "Think of confidential office files being copied and handed to someone outside the company.",
  },
  {
    matches: ["zero day", "zero-day"],
    fields: [
      "A zero-day vulnerability is a software flaw unknown to the vendor or one for which a fix was not available when it was exploited.",
      "An attacker uses the flaw before defenders can rely on a vendor patch to close it.",
      "Up-to-date software can still be exposed, making temporary mitigations and detection especially useful.",
      "Watch vendor advisories for affected versions, exploitation evidence, and recommended workarounds.",
      "Apply verified mitigations, reduce exposure, monitor affected systems, and install the vendor fix when available.",
    ],
    analogy: "It is a hidden fault in a door lock that a thief discovers before the locksmith can supply a repair.",
  },
  {
    matches: ["credential stuffing"],
    fields: [
      "Credential stuffing uses stolen username and password pairs to try to access other accounts.",
      "Automated login attempts test credentials from earlier leaks against services where people may have reused passwords.",
      "A password exposed on one site can put an unrelated account at risk.",
      "Watch for bursts of failed logins, distributed login attempts, and successful sign-ins from unfamiliar locations or devices.",
      "Use unique passwords or passkeys, enable MFA, and apply rate limits and suspicious-login detection.",
    ],
    analogy: "Someone finds a stolen key ring and tries each key on doors all over town, hoping people reused the same lock.",
  },
  {
    matches: ["authentication bypass"],
    fields: [
      "Authentication bypass means accessing a protected feature without completing its intended identity check.",
      "A flaw in login, session handling, or an alternate access path lets a request skip required verification.",
      "An attacker may reach protected information or functions without possessing a valid password.",
      "Watch for protected actions without the expected sign-in trail and vendor reports affecting your authentication components.",
      "Patch affected software, restrict exposed management interfaces, and check authorization on every sensitive action.",
    ],
    analogy: "It is like finding an unlocked side entrance that lets you walk past the reception desk’s badge check.",
  },
  {
    matches: ["phishing"],
    fields: [
      "Phishing uses deceptive messages or websites to persuade someone to reveal information or take an unsafe action.",
      "An attacker impersonates a trusted sender and directs the recipient to a fake login, malicious attachment, or fraudulent request.",
      "A convincing message can lead to stolen accounts, malware, or unauthorized payments.",
      "Watch for unexpected requests, lookalike domains, unusual attachments, and pressure to act urgently.",
      "Verify requests through a known channel, report suspicious messages, and use phishing-resistant authentication where available.",
    ],
    analogy: "Think of a caller pretending to be the building manager and asking you to hand over your keys.",
  },
  {
    matches: ["botnet"],
    fields: [
      "A botnet is a group of compromised devices controlled by an operator.",
      "Malware enrolls computers or connected devices and receives instructions through a command channel.",
      "The devices can be used together for traffic floods, spam, credential attacks, or other abuse.",
      "Watch for unexpected outbound connections, unusual traffic volume, and devices contacting known malicious infrastructure.",
      "Patch devices, replace default credentials, restrict unnecessary network access, and isolate infected hosts.",
    ],
    analogy: "It is like someone secretly taking over a fleet of delivery vans and sending them all on the same unwanted errand.",
  },
  {
    matches: ["infostealer", "information stealer"],
    fields: [
      "An infostealer is malware built to collect sensitive information from an infected device.",
      "It can harvest saved passwords, browser cookies, session tokens, and other locally accessible secrets.",
      "Stolen sessions can allow account access without a fresh password or MFA prompt.",
      "Watch for suspicious access to browser data, unexpected outbound transfers, and unfamiliar account sessions.",
      "Contain the device, remove the infection, revoke affected sessions, and rotate exposed credentials from a clean device.",
    ],
    analogy: "It is a thief taking both your keys and an already-stamped entry ticket that lets them walk straight inside.",
  },
  {
    matches: ["malware"],
    fields: [
      "Malware is software designed to perform harmful or unauthorized actions.",
      "It may arrive through downloads, attachments, compromised sites, or exploitation of a vulnerable service.",
      "Depending on its purpose, it can steal information, disrupt work, or give an attacker ongoing access.",
      "Watch for unexpected processes, persistence changes, security alerts, and unusual network connections.",
      "Keep systems patched, limit execution privileges, use endpoint protection, and investigate suspicious activity.",
    ],
    analogy: "Think of an unwanted worker sneaking into the office and quietly doing jobs for someone outside it.",
  },
  {
    matches: ["cisa kev"],
    fields: [
      "CISA’s Known Exploited Vulnerabilities catalog lists vulnerabilities with evidence of exploitation in the wild.",
      "Catalog entries identify affected products and link to required actions and remediation guidance.",
      "Evidence of real exploitation helps teams prioritize relevant vulnerabilities alongside exposure and business impact.",
      "Compare catalog entries with your software inventory and check whether affected systems are reachable or show compromise indicators.",
      "Follow the vendor’s remediation guidance, apply applicable mitigations, and verify fixes on affected assets.",
    ],
    analogy: "It is a noticeboard of locks thieves have already been seen picking, helping you decide which of your doors to repair first.",
  },
  {
    matches: ["cve", "vulnerability", "exploit"],
    fields: [
      "A vulnerability is a weakness that can affect a system’s security; a CVE identifier names a publicly disclosed vulnerability.",
      "An exploit takes advantage of a weakness when its technical and access conditions are met.",
      "Risk depends on the affected version, exposure, available privileges, and whether exploitation is occurring.",
      "Check vendor advisories, affected versions, exploitation reports, and your own inventory before judging relevance.",
      "Prioritize exposed affected assets, apply vendor fixes or mitigations, and verify remediation.",
    ],
    analogy: "A vulnerability is a faulty lock; an exploit is the technique used to open it. A CVE is the reference number on the repair notice.",
  },
];

export function explainCyberTrend(query: string) {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  const profile = profiles.find(profile => profile.matches.some(term => normalized.includes(term)));
  return {
    title: query,
    fields: profile?.fields ?? [
      `“${query}” is the current cybersecurity topic receiving increased news attention.`,
      "The index compares matching coverage in its recent window with a daily baseline; it measures attention rather than proving an incident.",
      "A rising topic can help identify a subject worth reviewing for relevance to your environment.",
      "Read the linked reporting and primary advisories to establish what happened, which products are affected, and what is confirmed.",
      "Check your inventory and access exposure before taking action; follow verified guidance relevant to your systems.",
    ],
    analogy: profile?.analogy ?? "Think of a busy conversation at the office cooler: more people discussing a subject is a reason to listen, then check the facts.",
  };
}
