import type { AnswerId, Difficulty, QuizQuestion, SecurityDomain } from "./types";

type Topic = { concept: string; correct: string; context: string };

const catalog: Record<SecurityDomain, Topic[]> = {
  "security-risk-management": [
    {concept:"Risk appetite",correct:"Define the amount and type of risk leadership is willing to pursue or retain",context:"leadership setting boundaries for business decisions"},
    {concept:"Risk tolerance",correct:"Set measurable variation permitted around a specific risk objective",context:"a service operating near an approved risk limit"},
    {concept:"Risk register",correct:"Record owners, treatments, deadlines, and current risk status",context:"several departments tracking material risks"},
    {concept:"Risk mitigation",correct:"Apply controls that reduce likelihood or business impact",context:"a likely event with unacceptable impact"},
    {concept:"Risk transfer",correct:"Shift defined financial consequences through a contract or insurance",context:"a company considering cyber insurance"},
    {concept:"Risk acceptance",correct:"Document an authorized decision to retain understood residual risk",context:"a control costs more than the expected reduction"},
    {concept:"Due care",correct:"Take reasonable protective actions expected of a prudent organization",context:"leadership approving baseline safeguards"},
    {concept:"Due diligence",correct:"Continuously investigate and verify that safeguards remain effective",context:"management reviewing whether controls still work"},
    {concept:"Policy governance",correct:"Use approved policy to communicate mandatory management direction",context:"teams implementing inconsistent security rules"},
    {concept:"Standards",correct:"Define mandatory, measurable requirements that support policy",context:"engineers need an enforceable encryption requirement"},
    {concept:"Procedures",correct:"Document repeatable steps for performing a security activity",context:"responders need consistent evidence handling"},
    {concept:"Business impact analysis",correct:"Prioritize processes using impacts, dependencies, RTOs, and RPOs",context:"continuity leaders setting restoration priorities"},
    {concept:"Third-party risk",correct:"Assess supplier access, controls, dependencies, and contract obligations",context:"a vendor will process sensitive customer data"},
    {concept:"Separation of duties",correct:"Divide incompatible responsibilities to reduce fraud and error",context:"one employee can create and approve payments"},
    {concept:"Regulatory compliance",correct:"Map applicable obligations to owned, evidenced controls",context:"a new privacy law affects several systems"},
    {concept:"Security awareness",correct:"Tailor training to role-specific risks and measure behavior change",context:"phishing simulations show repeated failures"},
    {concept:"Control ownership",correct:"Assign accountability to someone able to maintain and evidence the control",context:"an audit finds an unowned control"},
    {concept:"Residual risk",correct:"Evaluate risk remaining after safeguards are applied",context:"management reviews a completed treatment plan"},
    {concept:"Quantitative risk",correct:"Use defensible frequency and loss estimates while documenting uncertainty",context:"leaders compare security investments financially"},
    {concept:"Exception management",correct:"Time-box, approve, document, and monitor deviations from requirements",context:"a legacy system cannot meet a standard"},
  ],
  "asset-security": [
    {concept:"Data classification",correct:"Classify information according to sensitivity and business impact",context:"a dataset combines public and confidential fields"},
    {concept:"Data ownership",correct:"Have the accountable business owner authorize classification and use",context:"teams disagree about permitted data use"},
    {concept:"Data custodianship",correct:"Operate storage and safeguards according to the owner's requirements",context:"infrastructure staff administer a sensitive repository"},
    {concept:"Data minimization",correct:"Collect and retain only information necessary for the stated purpose",context:"a form requests unnecessary personal details"},
    {concept:"Retention",correct:"Keep data only for an approved legal and business period",context:"old customer records have no active purpose"},
    {concept:"Secure disposal",correct:"Use verified sanitization or destruction appropriate to media and sensitivity",context:"failed drives are leaving organizational control"},
    {concept:"Encryption at rest",correct:"Protect stored data with managed keys and access-controlled encryption",context:"portable systems store regulated records"},
    {concept:"Data loss prevention",correct:"Detect and control sensitive data movement using context-aware policy",context:"employees upload files to personal cloud storage"},
    {concept:"Privacy purpose limitation",correct:"Use personal data only for disclosed and authorized purposes",context:"marketing wants to reuse support records"},
    {concept:"Data lineage",correct:"Track where data originated, changed, and moved through systems",context:"an analytics result cannot be traced to its sources"},
    {concept:"Labeling",correct:"Apply durable markings that communicate handling requirements",context:"staff exchange documents across departments"},
    {concept:"Handling requirements",correct:"Match access, transmission, storage, and disposal controls to classification",context:"confidential data moves through a workflow"},
    {concept:"Backup protection",correct:"Apply equivalent confidentiality, integrity, and retention controls to backups",context:"production data is copied to recovery media"},
    {concept:"Tokenization",correct:"Replace sensitive values with tokens whose mapping is separately protected",context:"an application needs references without exposing card numbers"},
    {concept:"Anonymization",correct:"Irreversibly reduce identifiability while evaluating linkage risk",context:"researchers want to publish a customer dataset"},
    {concept:"Legal hold",correct:"Suspend normal deletion for information relevant to anticipated proceedings",context:"litigation affects records nearing disposal"},
    {concept:"Asset inventory",correct:"Maintain authoritative ownership, location, criticality, and lifecycle status",context:"unknown systems appear during vulnerability scanning"},
    {concept:"Media transport",correct:"Use tracked custody and protection appropriate to the data classification",context:"backup media must move between facilities"},
    {concept:"Data sovereignty",correct:"Identify jurisdictional storage and processing obligations before placement",context:"a cloud region is selected for international data"},
    {concept:"Aggregation risk",correct:"Raise protection when combined records reveal more than individual elements",context:"low-sensitivity fields create a sensitive profile when joined"},
  ],
  "security-architecture-engineering": [
    {concept:"Defense in depth",correct:"Layer independent preventive, detective, and corrective safeguards",context:"one perimeter control may be bypassed"},
    {concept:"Fail secure",correct:"Enter a defined state that preserves security while respecting safety",context:"an authorization dependency becomes unavailable"},
    {concept:"Least functionality",correct:"Disable unnecessary services, features, ports, and interfaces",context:"a hardened server exposes default components"},
    {concept:"Trust boundaries",correct:"Validate identities and data whenever they cross zones of differing trust",context:"a service accepts requests from another network"},
    {concept:"Key management",correct:"Protect generation, storage, rotation, revocation, and destruction of keys",context:"an application encrypts regulated records"},
    {concept:"Hardware security modules",correct:"Use tamper-resistant hardware for high-value cryptographic operations and keys",context:"a certificate authority protects signing keys"},
    {concept:"Threat modeling",correct:"Identify assets, trust boundaries, abuse cases, and mitigations before build",context:"architects design a new payment platform"},
    {concept:"Secure defaults",correct:"Ship the most protective reasonable configuration without user action",context:"customers deploy a new internet-facing product"},
    {concept:"Complete mediation",correct:"Check authorization on every access to a protected resource",context:"an application caches an earlier access decision"},
    {concept:"Open design",correct:"Rely on protected keys rather than secrecy of the design",context:"a team proposes a proprietary cryptographic algorithm"},
    {concept:"Attack surface reduction",correct:"Remove unnecessary entry points and privileges before adding controls",context:"a platform exposes unused management APIs"},
    {concept:"Isolation",correct:"Separate workloads so compromise does not cross security boundaries",context:"untrusted code runs beside sensitive processing"},
    {concept:"Symmetric encryption",correct:"Use efficiently for bulk confidentiality with securely shared secret keys",context:"large volumes of stored data require encryption"},
    {concept:"Asymmetric encryption",correct:"Use key pairs for scalable key exchange, signatures, or recipient encryption",context:"parties lack a previously shared secret"},
    {concept:"Digital signatures",correct:"Provide origin authentication and integrity using the signer's private key",context:"recipients must verify a software release"},
    {concept:"Hashing",correct:"Use a one-way digest to detect changes, not to recover plaintext",context:"a team needs file-integrity verification"},
    {concept:"Salting passwords",correct:"Use unique random salts with a slow password-hashing function",context:"credentials are stored for authentication"},
    {concept:"Zero trust architecture",correct:"Continuously evaluate explicit access using identity, device, and context",context:"users access resources across network locations"},
    {concept:"Reference monitor",correct:"Make access enforcement tamper-resistant, always invoked, and verifiable",context:"a kernel mediates access to protected objects"},
    {concept:"Secure boot",correct:"Verify signed startup components before transferring execution",context:"a device must resist boot-level persistence"},
  ],
  "communication-network-security": [
    {concept:"Network segmentation",correct:"Enforce least-privilege communication between separated trust zones",context:"a workstation compromise could reach production"},
    {concept:"Firewall rules",correct:"Permit only required sources, destinations, services, and durations",context:"a partner needs access to one service"},
    {concept:"TLS validation",correct:"Validate certificate identity and trust in addition to encrypting traffic",context:"a client accepts any server certificate"},
    {concept:"VPN security",correct:"Use strong authenticated encryption and restrict reachable resources",context:"remote workers connect to internal services"},
    {concept:"Wireless enterprise authentication",correct:"Use individual identities with 802.1X rather than a shared password",context:"an office needs accountable Wi-Fi access"},
    {concept:"DNS security",correct:"Protect resolution integrity and monitor anomalous domain activity",context:"users are redirected despite correct URLs"},
    {concept:"Egress filtering",correct:"Allow outbound traffic only to required destinations and services",context:"malware attempts command-and-control communication"},
    {concept:"Network access control",correct:"Evaluate device and identity posture before granting network access",context:"unmanaged devices connect to corporate ports"},
    {concept:"Proxy controls",correct:"Mediate, inspect, and log application requests according to policy",context:"web traffic needs centralized enforcement"},
    {concept:"Load balancer security",correct:"Protect administrative interfaces and preserve trustworthy client context",context:"traffic passes through a reverse proxy tier"},
    {concept:"DDoS resilience",correct:"Combine upstream capacity, rate controls, distribution, and tested response",context:"a public service faces volumetric attacks"},
    {concept:"Microsegmentation",correct:"Apply workload-level policies based on identity and required flows",context:"dynamic cloud workloads share a network"},
    {concept:"Secure routing",correct:"Authenticate routing relationships and filter invalid route announcements",context:"traffic is diverted through an unexpected network"},
    {concept:"Email transport security",correct:"Use authenticated domains, protected transport, and anti-spoofing controls",context:"attackers impersonate the corporate email domain"},
    {concept:"Bastion hosts",correct:"Concentrate monitored administrative access through a hardened gateway",context:"administrators manage systems in a restricted zone"},
    {concept:"East-west monitoring",correct:"Inspect lateral traffic for unexpected service and identity behavior",context:"perimeter logs miss internal movement"},
    {concept:"IPv6 security",correct:"Apply equivalent inventory, filtering, and monitoring to IPv6 paths",context:"hosts autoconfigure addresses outside IPv4 controls"},
    {concept:"Secure network management",correct:"Use encrypted authenticated protocols and separate management access",context:"operators configure routers remotely"},
    {concept:"API gateway security",correct:"Centralize authentication, validation, rate limiting, and observability",context:"many services expose external APIs"},
    {concept:"Traffic baselining",correct:"Compare current flows with known patterns while accounting for business change",context:"analysts investigate unusual bandwidth"},
  ],
  "identity-access-management": [
    {concept:"Multi-factor authentication",correct:"Require independent factors, preferably resistant to phishing",context:"password reuse threatens remote accounts"},
    {concept:"Least privilege",correct:"Grant only scoped access required for the task and duration",context:"a developer needs temporary production access"},
    {concept:"Access reviews",correct:"Validate entitlements against current role, risk, and business need",context:"employees accumulate permissions over time"},
    {concept:"Joiner-mover-leaver",correct:"Provision, adjust, and revoke access promptly with authoritative HR events",context:"an employee transfers and later departs"},
    {concept:"Privileged access management",correct:"Vault, rotate, approve, and monitor use of privileged credentials",context:"administrators share standing credentials"},
    {concept:"Just-in-time access",correct:"Activate elevated permission only for an approved limited window",context:"support staff occasionally troubleshoot production"},
    {concept:"Single sign-on",correct:"Centralize authentication while protecting the identity provider as critical infrastructure",context:"many applications rely on one login"},
    {concept:"Federation",correct:"Establish verified trust for identity assertions across security domains",context:"a partner authenticates users to a service"},
    {concept:"OAuth scopes",correct:"Request and grant the narrowest delegated permissions required",context:"an application connects to a user's mailbox"},
    {concept:"OpenID Connect",correct:"Use signed identity tokens with validated issuer, audience, nonce, and expiry",context:"a web application delegates user authentication"},
    {concept:"Service accounts",correct:"Assign non-human identities minimal permissions, owners, and rotated credentials",context:"automation accesses production resources"},
    {concept:"Password storage",correct:"Store passwords with a slow adaptive hash and unique salt",context:"an application maintains local credentials"},
    {concept:"Account lockout",correct:"Balance attack resistance with safeguards against denial-of-service abuse",context:"many password guesses target user accounts"},
    {concept:"Risk-based authentication",correct:"Use contextual signals to require proportionate additional assurance",context:"a login originates from a new device and location"},
    {concept:"Role-based access control",correct:"Assign permissions to governed job roles rather than individuals ad hoc",context:"many users perform standardized functions"},
    {concept:"Attribute-based access control",correct:"Evaluate subject, resource, action, and environmental attributes",context:"access depends on clearance, location, and data label"},
    {concept:"Session management",correct:"Protect tokens, rotate identifiers, enforce expiry, and invalidate on logout",context:"an attacker steals a browser session"},
    {concept:"Break-glass access",correct:"Provide monitored emergency access with strong controls and retrospective review",context:"normal identity services fail during an outage"},
    {concept:"Identity proofing",correct:"Verify a person's claimed identity to assurance appropriate for the risk",context:"a customer enrolls for a sensitive service"},
    {concept:"Machine identity",correct:"Inventory, authenticate, rotate, and constrain certificates and workload identities",context:"services communicate without human users"},
  ],
  "security-assessment-testing": [
    {concept:"Vulnerability validation",correct:"Confirm exposure and prioritize with exploitability and business context",context:"a scanner reports a critical internet-facing flaw"},
    {concept:"Penetration rules of engagement",correct:"Define authorization, scope, communications, safety, and stop conditions",context:"testing could affect a critical service"},
    {concept:"Assessment independence",correct:"Use sufficient objectivity and freedom from conflicts of interest",context:"a team evaluates a control it designed"},
    {concept:"False positives",correct:"Validate findings with evidence before escalating remediation",context:"a scanner signature may not match the deployed version"},
    {concept:"Authenticated scanning",correct:"Use controlled credentials to improve visibility into configuration and patches",context:"external scans miss local software state"},
    {concept:"Control testing",correct:"Test design and operating effectiveness using representative evidence",context:"a policy exists but enforcement is uncertain"},
    {concept:"Sampling",correct:"Choose a representative risk-based sample and document limitations",context:"reviewing every transaction is impractical"},
    {concept:"Security metrics",correct:"Use measures tied to decisions, outcomes, definitions, and reliable data",context:"leadership receives counts without context"},
    {concept:"Code analysis",correct:"Combine static and dynamic techniques because each observes different weaknesses",context:"an application approaches release"},
    {concept:"Fuzz testing",correct:"Send malformed and unexpected inputs to discover handling failures",context:"a parser processes untrusted files"},
    {concept:"Red teaming",correct:"Test detection and response against realistic objectives without exceeding authorization",context:"leadership wants adversary-focused assurance"},
    {concept:"Purple teaming",correct:"Have offensive and defensive teams collaborate to improve observable coverage",context:"known attack techniques evade current alerts"},
    {concept:"Audit evidence",correct:"Preserve sufficient, reliable, relevant, and traceable support for conclusions",context:"an assessor reports a control failure"},
    {concept:"Remediation verification",correct:"Retest the original condition and confirm the fix addresses root cause",context:"a team marks a finding complete"},
    {concept:"Attack surface management",correct:"Continuously discover and validate externally reachable assets and exposures",context:"unknown internet services appear regularly"},
    {concept:"Configuration assessment",correct:"Compare actual settings with approved secure baselines and exceptions",context:"server hardening varies between teams"},
    {concept:"Test data protection",correct:"Use synthetic or minimized data and protect any production-derived information",context:"testers need realistic customer records"},
    {concept:"Regression security testing",correct:"Repeat relevant security checks after changes that could reintroduce risk",context:"developers refactor authentication code"},
    {concept:"Finding severity",correct:"Combine technical impact, likelihood, exposure, and business criticality",context:"teams dispute remediation priority"},
    {concept:"Continuous control monitoring",correct:"Automate timely evidence where possible while retaining human validation",context:"cloud configurations change frequently"},
  ],
  "security-operations": [
    {concept:"Alert triage",correct:"Correlate identity, device, asset, and surrounding telemetry before proportionate action",context:"an anomalous login alert fires"},
    {concept:"Incident containment",correct:"Limit spread quickly while considering evidence, safety, and business impact",context:"malware begins moving laterally"},
    {concept:"Evidence preservation",correct:"Use documented collection, integrity verification, and chain of custody",context:"a compromised laptop may support an investigation"},
    {concept:"Ransomware response",correct:"Isolate affected paths, protect backups, preserve evidence, and activate response plans",context:"encryption activity appears on endpoints"},
    {concept:"SIEM correlation",correct:"Combine multiple meaningful signals with context instead of alerting on volume alone",context:"individual events are common but their sequence is suspicious"},
    {concept:"EDR isolation",correct:"Use targeted network isolation while preserving management and forensic capability",context:"an endpoint shows confirmed command execution"},
    {concept:"Threat hunting",correct:"Form a testable hypothesis and query relevant telemetry for evidence",context:"defenders suspect credential-based persistence"},
    {concept:"Detection engineering",correct:"Define behavior, required telemetry, logic, tests, and response guidance",context:"a new attacker technique requires coverage"},
    {concept:"Incident severity",correct:"Base severity on scope, business impact, adversary capability, and urgency",context:"several alerts may belong to one incident"},
    {concept:"Eradication",correct:"Remove root cause, persistence, compromised credentials, and vulnerable paths",context:"containment has stopped active spread"},
    {concept:"Recovery",correct:"Restore in stages, validate integrity, monitor closely, and meet business priorities",context:"systems return after a major incident"},
    {concept:"Lessons learned",correct:"Identify systemic improvements with owners and deadlines after stabilization",context:"an incident has been closed"},
    {concept:"Backup restoration",correct:"Test clean, isolated restores against documented RTO and RPO targets",context:"recovery depends on backups"},
    {concept:"Log retention",correct:"Retain searchable, time-synchronized evidence according to risk and obligations",context:"investigations frequently exceed the current log window"},
    {concept:"Time synchronization",correct:"Use trusted time sources so events can be accurately correlated",context:"logs disagree about event order"},
    {concept:"Playbooks",correct:"Document repeatable decisions, evidence needs, escalation, and containment options",context:"analysts respond inconsistently to phishing"},
    {concept:"Tabletop exercises",correct:"Exercise decision-making, dependencies, and communications using realistic scenarios",context:"leaders need to validate an incident plan"},
    {concept:"Business continuity",correct:"Maintain prioritized critical services during disruption",context:"a facility outage affects operations"},
    {concept:"Disaster recovery",correct:"Restore technology services to approved recovery objectives",context:"a regional failure takes systems offline"},
    {concept:"Forensic scoping",correct:"Use evidence-driven indicators and timelines to determine affected identities and assets",context:"one confirmed host may be part of a larger intrusion"},
  ],
  "digital-forensics-incident-response": [
    {concept:"Windows Prefetch",correct:"Examine Prefetch filenames, run counts, and timestamps to support evidence of program execution",context:"an analyst must determine whether a suspicious executable ran on Windows"},
    {concept:"Amcache and Shimcache",correct:"Correlate Amcache and AppCompatCache entries with other artifacts rather than treating them alone as proof of execution",context:"a binary path appears in Windows compatibility artifacts"},
    {concept:"Windows logon events",correct:"Correlate 4624 logon type, source address, account, and related events to characterize access",context:"Security logs show a successful Windows logon"},
    {concept:"NTFS timeline analysis",correct:"Use MFT metadata and the USN Journal together to reconstruct file creation, rename, and deletion activity",context:"an attacker renamed and removed tools from an NTFS volume"},
    {concept:"Volatile memory acquisition",correct:"Acquire RAM with a trusted tool before shutdown when volatile processes, sockets, or injected code matter",context:"a live host may contain fileless malware"},
    {concept:"Memory process analysis",correct:"Compare process lists, parent relationships, command lines, handles, and memory mappings for hidden or injected activity",context:"a memory image contains an apparently legitimate process"},
    {concept:"Forensic disk imaging",correct:"Create a bit-for-bit image through a controlled process and verify source and image hashes",context:"a storage device must be preserved for examination"},
    {concept:"Timeline normalization",correct:"Normalize timestamps to a documented time zone while retaining original values and clock-skew context",context:"evidence comes from systems in several time zones"},
    {concept:"Registry persistence",correct:"Inspect Run keys, services, scheduled tasks, and relevant user hives while correlating modification times",context:"malware appears to survive user logon and reboot"},
    {concept:"Browser artifact analysis",correct:"Examine browser history, downloads, cache, cookies, and session databases with profile and timestamp context",context:"a phishing investigation must trace a downloaded payload"},
    {concept:"Email header analysis",correct:"Trace Received headers from trusted boundaries and evaluate SPF, DKIM, DMARC, and reply-path anomalies",context:"a message may have spoofed an executive sender"},
    {concept:"Evidence integrity",correct:"Hash evidence at acquisition and verification points while documenting every transfer and transformation",context:"multiple analysts will process the same forensic image"},
  ],
  "detection-engineering-threat-hunting": [
    {concept:"Sysmon process telemetry",correct:"Correlate Event ID 1 process creation with parent image, command line, hashes, user, and host context",context:"a suspicious PowerShell child process appears on an endpoint"},
    {concept:"Process ancestry hunting",correct:"Hunt for unusual parent-child relationships and validate them against role-specific baselines",context:"office applications may be launching command interpreters"},
    {concept:"Sigma rule translation",correct:"Translate Sigma field mappings to the target data model and validate the resulting query against known events",context:"a portable detection must run in a specific SIEM"},
    {concept:"Detection threshold tuning",correct:"Tune thresholds by entity, time window, prevalence, and risk while preserving known attack coverage",context:"a brute-force analytic generates excessive noise"},
    {concept:"DNS threat hunting",correct:"Analyze query rarity, domain age, entropy, response patterns, and host context before escalation",context:"endpoints make unusual DNS requests at regular intervals"},
    {concept:"Living-off-the-land detection",correct:"Detect suspicious behavior and context around trusted binaries instead of blocking solely by filename",context:"attackers may abuse certutil, rundll32, or mshta"},
    {concept:"Credential access telemetry",correct:"Correlate sensitive process access, dump creation, command lines, and identity events for credential theft behavior",context:"defenders suspect LSASS credential dumping"},
    {concept:"Detection validation",correct:"Replay representative benign and malicious test cases and verify alert fields, severity, and response guidance",context:"a new analytic is ready for production"},
    {concept:"Telemetry gap analysis",correct:"Map the behavior to required data sources and verify collection, parsing, retention, and field quality",context:"a hunt cannot confirm or refute its hypothesis"},
    {concept:"ATT&CK mapping",correct:"Map detections to the specific observed behavior and data source rather than the incident label alone",context:"coverage reporting claims an entire ATT&CK technique"},
    {concept:"Beaconing analysis",correct:"Measure periodicity and jitter while considering destination rarity, byte patterns, and process ownership",context:"a host makes small outbound connections throughout the day"},
    {concept:"Rare-event hunting",correct:"Rank low-prevalence events against peer groups and enrich them with signer, path, user, and asset context",context:"analysts are searching for novel execution behavior"},
  ],
  "malware-analysis-reverse-engineering": [
    {concept:"Static malware triage",correct:"Collect hashes, file type, strings, imports, sections, signatures, and metadata without executing the sample",context:"an unknown executable first enters the lab"},
    {concept:"PE header analysis",correct:"Inspect PE sections, entry point, imports, compilation metadata, and anomalies for evidence of packing or tampering",context:"a Windows executable has unusual structure"},
    {concept:"Entropy and packing",correct:"Use high entropy and sparse imports as packing indicators, then confirm with structure and runtime behavior",context:"a sample exposes few readable strings"},
    {concept:"Dynamic sandbox analysis",correct:"Execute the sample in an isolated instrumented environment and capture processes, files, registry, and network behavior",context:"static analysis cannot reveal the payload actions"},
    {concept:"Safe malware handling",correct:"Use isolated lab systems, non-routable or simulated services, controlled transfer, and disabled host integration",context:"analysts need to detonate an untrusted sample"},
    {concept:"Debugger analysis",correct:"Set breakpoints around relevant APIs and control flow to inspect decoded data, arguments, and post-unpack execution",context:"a sample decrypts configuration only at runtime"},
    {concept:"API behavior analysis",correct:"Interpret API call sequences in behavioral context rather than labeling individual APIs as malicious",context:"a process allocates executable memory and starts a thread"},
    {concept:"Runtime unpacking",correct:"Identify the original entry transition and dump reconstructed memory after code and imports are restored",context:"a packed binary unpacks itself during execution"},
    {concept:"YARA rule design",correct:"Combine distinctive stable strings or byte patterns with structural conditions and test against clean and malicious corpora",context:"analysts need durable family-level file detection"},
    {concept:"Configuration extraction",correct:"Trace decoding routines and data references to recover command-and-control, campaign, and feature settings",context:"malware stores an encrypted internal configuration"},
    {concept:"Malware network indicators",correct:"Extract protocol details and infrastructure indicators while separating durable behavior from disposable addresses",context:"a sample communicates with attacker infrastructure"},
    {concept:"Persistence analysis",correct:"Correlate created services, tasks, registry changes, startup items, and dropped files with execution evidence",context:"a sample attempts to survive reboot"},
  ],
  "cloud-container-security": [
    {concept:"AWS CloudTrail investigation",correct:"Correlate eventName, userIdentity, sourceIPAddress, session context, resources, and request parameters",context:"an unexpected AWS API action changes a resource"},
    {concept:"Cloud IAM effective access",correct:"Evaluate identity, resource, boundary, session, and organization policies together to determine effective permission",context:"a cloud role appears more privileged than expected"},
    {concept:"Cloud metadata protection",correct:"Require hardened metadata access, restrict workload reachability, and prevent untrusted URL fetches from reaching metadata",context:"a web workload may be vulnerable to SSRF"},
    {concept:"Kubernetes audit logs",correct:"Trace user, verb, resource, namespace, source, authorization, and response fields for cluster API activity",context:"a Kubernetes secret was read unexpectedly"},
    {concept:"Kubernetes workload identity",correct:"Use dedicated least-privilege service accounts and avoid automatically mounting credentials when unnecessary",context:"pods share a broadly privileged default service account"},
    {concept:"Container image assurance",correct:"Pin trusted image digests, scan contents, verify signatures and provenance, and control registry promotion",context:"a deployment pulls mutable container tags"},
    {concept:"Kubernetes network policy",correct:"Define explicit ingress and egress allowances between selected workloads and required destinations",context:"compromised pods should not freely reach every namespace"},
    {concept:"Container runtime evidence",correct:"Capture pod metadata, runtime events, process and network telemetry, and ephemeral filesystem evidence before teardown",context:"a short-lived container shows suspicious execution"},
    {concept:"Object storage exposure",correct:"Review public-access controls, bucket policy, ACLs, identity policy, and access logs together",context:"cloud storage may be anonymously readable"},
    {concept:"Cloud secret management",correct:"Use workload identities and a managed secret store with scoped retrieval, rotation, and audit logging",context:"applications currently receive long-lived cloud keys"},
    {concept:"Container escape reduction",correct:"Remove privileged mode and dangerous capabilities, enforce isolation controls, and patch the runtime and kernel",context:"a container workload could reach the host"},
    {concept:"Ephemeral cloud forensics",correct:"Automate snapshots and evidence export while preserving identifiers, audit logs, and collection timestamps",context:"an autoscaled instance may terminate during investigation"},
  ],
  "software-development-security": [
    {concept:"Secure requirements",correct:"Translate abuse cases and obligations into testable security requirements",context:"a product is entering design"},
    {concept:"Threat modeling",correct:"Analyze assets, trust boundaries, entry points, threats, and mitigations early",context:"a new payment workflow is designed"},
    {concept:"Parameterized queries",correct:"Keep untrusted data separate from executable database commands",context:"an application builds queries from user input"},
    {concept:"Server-side authorization",correct:"Check every requested object and action on the trusted server",context:"users can alter record identifiers"},
    {concept:"Output encoding",correct:"Encode untrusted content for the exact HTML, URL, script, or CSS context",context:"an application displays user-controlled text"},
    {concept:"CSRF protection",correct:"Use same-site controls and unpredictable request-bound tokens for state changes",context:"a browser submits authenticated actions"},
    {concept:"Secret management",correct:"Store secrets outside source code with scoped access, rotation, and auditing",context:"a pipeline deploys applications"},
    {concept:"Dependency inventory",correct:"Maintain an SBOM and map vulnerable components to actual deployed usage",context:"a library vulnerability is announced"},
    {concept:"Build provenance",correct:"Verify trusted source, isolated builds, signed artifacts, and promotion history",context:"software supply-chain integrity is required"},
    {concept:"Code review",correct:"Review security-sensitive logic with both automated checks and informed humans",context:"authentication code changes before release"},
    {concept:"SAST",correct:"Analyze source or compiled code early while validating findings in context",context:"developers need rapid feedback in CI"},
    {concept:"DAST",correct:"Test the running application from exposed interfaces for observable weaknesses",context:"a staging deployment is available"},
    {concept:"CI/CD least privilege",correct:"Give pipelines short-lived, scoped identities separated by environment",context:"automation can deploy to production"},
    {concept:"Branch protection",correct:"Require reviewed, tested changes and protect release branches from direct modification",context:"unauthorized code could enter a build"},
    {concept:"Error handling",correct:"Return minimal user-safe errors while recording useful protected diagnostics",context:"an exception includes database details"},
    {concept:"Security logging",correct:"Record attributable security events without exposing secrets or sensitive payloads",context:"developers add audit events"},
    {concept:"File upload security",correct:"Validate type and content, rename, isolate storage, and scan before use",context:"users submit documents"},
    {concept:"Deserialization",correct:"Avoid unsafe object reconstruction and accept only constrained validated formats",context:"a service consumes untrusted serialized data"},
    {concept:"Release gates",correct:"Use risk-based criteria with owned, time-bound exceptions instead of silent bypasses",context:"a critical finding appears before launch"},
    {concept:"Vulnerability disclosure",correct:"Provide a safe reporting channel, coordinate remediation, and communicate responsibly",context:"an external researcher reports a flaw"},
  ],
};

const ids: AnswerId[] = ["A", "B", "C", "D"];

const chooseDistractors = (topics: Topic[], topicIndex: number, difficultyIndex: number, used: Set<string>): Topic[] => {
  const candidates = topics.filter((_, index) => index !== topicIndex);
  const combinations: Topic[][] = [];

  for (let first = 0; first < candidates.length - 2; first += 1) {
    for (let second = first + 1; second < candidates.length - 1; second += 1) {
      for (let third = second + 1; third < candidates.length; third += 1) {
        combinations.push([candidates[first], candidates[second], candidates[third]]);
      }
    }
  }

  const circularDistance = (candidate: Topic) => {
    const candidateIndex = topics.indexOf(candidate);
    return Math.abs(candidateIndex - topicIndex);
  };

  combinations.sort((left, right) => {
    const leftDistance = left.reduce((total, candidate) => total + circularDistance(candidate), 0);
    const rightDistance = right.reduce((total, candidate) => total + circularDistance(candidate), 0);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    const leftTieBreaker = left.reduce((total, candidate) => total + topics.indexOf(candidate), difficultyIndex);
    const rightTieBreaker = right.reduce((total, candidate) => total + topics.indexOf(candidate), difficultyIndex);
    return leftTieBreaker - rightTieBreaker;
  });

  for (const selection of combinations) {
    const signature = selection.map((candidate) => candidate.correct).sort().join("|");
    if (!used.has(signature)) {
      used.add(signature);
      return selection;
    }
  }

  throw new Error("Unable to create a unique distractor set");
};

const explainDistractor = (distractor: Topic, topic: Topic): string =>
  `This is a valid response when the issue is ${distractor.concept.toLowerCase()}, but this scenario is testing ${topic.concept.toLowerCase()}. It would not directly resolve the stated condition; here the analyst should ${topic.correct.charAt(0).toLowerCase()}${topic.correct.slice(1)}.`;

const capitalize = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const promptTemplates: Record<Difficulty, ((topic: Topic) => string)[]> = {
  green: [
    (topic) => `Which statement best describes ${topic.concept}?`,
    (topic) => `What is the primary security purpose of ${topic.concept}?`,
    (topic) => `A junior analyst asks how ${topic.concept} should be applied. Which answer is most accurate?`,
    (topic) => `${capitalize(topic.context)}. Which response correctly applies ${topic.concept}?`,
  ],
  orange: [
    (topic) => `${capitalize(topic.context)}. What should the analyst do first?`,
    (topic) => `Scenario: ${capitalize(topic.context)}. Which response is most appropriate?`,
    (topic) => `${capitalize(topic.context)}. Which action would produce the strongest technical evidence?`,
    (topic) => `${capitalize(topic.context)}. Which step best applies ${topic.concept.toLowerCase()}?`,
    (topic) => `Investigation context: ${capitalize(topic.context)}. What is the most useful next action?`,
  ],
  red: [
    (topic) => `${capitalize(topic.context)}. Which approach remains most defensible under technical scrutiny?`,
    (topic) => `A senior analyst must make a high-impact decision about ${topic.concept}. Which option best preserves evidence and reduces uncertainty?`,
    (topic) => `The initial response was inconclusive. ${capitalize(topic.context)}. What should the team do next?`,
    (topic) => `${capitalize(topic.context)}. Which advanced approach handles the condition without weakening security assurance?`,
    (topic) => `${capitalize(topic.context)}. Assume the obvious control is incomplete; which response best validates the actual condition?`,
  ],
};

export const questionBank: QuizQuestion[] = Object.entries(catalog).flatMap(([domain, topics]) => {
  const usedDistractorSets: Record<Difficulty, Set<string>> = {
    green: new Set<string>(),
    orange: new Set<string>(),
    red: new Set<string>(),
  };
  return topics.flatMap((topic, topicIndex) => (["green", "orange", "red"] as Difficulty[]).map((difficulty, difficultyIndex) => {
    const correctIndex = (topicIndex + difficultyIndex) % 4;
    const wrongTopics = chooseDistractors(topics, topicIndex, difficultyIndex, usedDistractorSets[difficulty]);
    const choices: { text: string; source: Topic }[] = wrongTopics.map((source) => ({ text: source.correct, source }));
    choices.splice(correctIndex, 0, { text: topic.correct, source: topic });
    const correctAnswer = ids[correctIndex];
    return {
      id: `${domain}-${topicIndex + 1}-${difficulty}`,
      domain: domain as SecurityDomain,
      difficulty,
      question: promptTemplates[difficulty][(topicIndex + difficultyIndex) % promptTemplates[difficulty].length](topic),
      answers: ids.map((id, index) => ({ id, text: choices[index].text })),
      correctAnswer,
      explanation: `${topic.correct}. This directly addresses ${topic.concept.toLowerCase()} in the stated situation while preserving accountability and evidence.`,
      answerExplanations: Object.fromEntries(ids.map((id, index) => [id, index === correctIndex ? `This is the best answer because it applies ${topic.concept.toLowerCase()} directly.` : explainDistractor(choices[index].source, topic)])) as Record<AnswerId, string>,
      keyConcept: topic.concept,
    };
  }));
});
