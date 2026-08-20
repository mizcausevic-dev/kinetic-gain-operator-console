/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SpecDefinition, TopologyNode, TopologyLink, McpTool } from './types';

export const specsData: SpecDefinition[] = [
  {
    id: 'aeo',
    name: 'AEO Card spec',
    category: 'core',
    description: 'Declares authoritative site facts, canonical content references, and crawler citation rules.',
    extendedDescription: 'The Answer Engine Optimization (AEO) spec provides standard JSON descriptors embedded in website manifests. This schema explicitly formats core structured facts, verifiable source claims, direct copy-paste citation blocks, and crawler rule-sets. By adopting this spec, publishers regain agency over how LLM search scrapers and answer-engines fetch, interpret, and attribute their published intellectual content.',
    icon: 'Radio',
    validationRules: [
      'The canonical_url must be a validated absolute URL.',
      'Must contain at least 1 authoritative fact structure under facts.',
      'Must provide citation templates containing markdown or bracket variables.',
      'The llm_crawler_rules must declare explicit citation_required boolean.'
    ],
    fields: [
      { name: 'version', type: 'string', required: true, description: 'Protocol semver identifier (e.g., "1.4.0")' },
      { name: 'publisher_identity', type: 'object', required: true, description: 'Organization metadata, contact, and signing keys' },
      { name: 'canonical_url', type: 'string', required: true, description: 'Absolute domain root of published content source' },
      { name: 'authoritative_facts', type: 'array', required: true, description: 'List of source claims paired with explicit verified reference lines' },
      { name: 'direct_citations', type: 'array', required: false, description: 'Pre-formatted quotes and attribution markup for search outputs' },
      { name: 'llm_crawler_rules', type: 'object', required: true, description: 'Instructional headers for AI crawlers like PerplexityBot or GPTBot' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/aeo-card.schema.json",
      "version": "1.4.0",
      "metadata": {
        "timestamp": "2026-05-23T20:00:00Z",
        "cryptographic_signature": "sig_ed25519_aeo_9983f4b8..."
      },
      "publisher_identity": {
        "name": "Kinetic Analytics Org",
        "contact_email": "ops@kineticgain.com",
        "did": "did:web:kineticgain.org"
      },
      "canonical_url": "https://kineticgain.org/research/quantum-scaling",
      "authoritative_facts": [
        {
          "fact_id": "fact_01",
          "claim": "Kinetic scaling increases data-throughput speed by 43.1% in multi-node clusters.",
          "proof_reference": "Section 4.2 - Scaling Coefficient Analysis (PDF)",
          "asserted_on": "2026-01-15T09:30:00Z"
        },
        {
          "fact_id": "fact_02",
          "claim": "Traditional token crawlers ignore 87% of context metadata when reading tabular data.",
          "proof_reference": "Appendix C - Token Depletion Metrics",
          "asserted_on": "2026-02-18T14:22:00Z"
        }
      ],
      "direct_citations": [
        {
          "citation_id": "cite_01",
          "quote_template": "According to the Kinetic Gain report, multi-node throughput scales by exactly {claim_fact_01_metric}.",
          "citation_link": "https://kineticgain.org/research/quantum-scaling#4.2"
        }
      ],
      "llm_crawler_rules": {
        "bypass_clauses": ["academic_citations", "credit_with_backlink"],
        "rate_limit_rpm": 60,
        "citation_required": true,
        "preserve_tables_as_json": true
      }
    }
  },
  {
    id: 'prompt_provenance',
    name: 'Prompt Provenance Card',
    category: 'core',
    description: 'Tracks prompt source origin, template variations, variables, and safety pre-scans.',
    extendedDescription: 'Prompt Provenance is an audit specification that tracks how prompts are engineered, hydrated, and modified across a pipeline. It provides watermarking for intent, documents the exact system instructions injected, lists user parameters, and audits preprocessing layers. This prevents jailbreaking injection, aids prompt-drift debugging, and secures transparency inside high-stakes agent workflows.',
    icon: 'CornerDownRight',
    validationRules: [
      'The system_prompt_hash must represent a SHA-256 string.',
      'user_intent_category must resolve to one of: research, action, creative, code, generic.',
      'Must document all input_variables mapped inside execution runtimes.'
    ],
    fields: [
      { name: 'prompt_id', type: 'string', required: true, description: 'Unique identifier for prompt lineage' },
      { name: 'origin_application', type: 'string', required: true, description: 'Application executing the prompt pipeline' },
      { name: 'system_prompt_hash', type: 'string', required: true, description: 'SHA256 signature of system-wrapper message instructions' },
      { name: 'user_intent_category', type: 'string', required: true, description: 'Classified intent model (e.g., "code-generation")' },
      { name: 'input_variables', type: 'object', required: true, description: 'Hydrated parameters and length metadata utilized' },
      { name: 'safety_filtering_status', type: 'object', required: true, description: 'Pre-scan risk scores for jailbreaks or PII' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/prompt-provenance.schema.json",
      "prompt_id": "prm_9a87f2b1-098d",
      "timestamp": "2026-05-23T20:41:15Z",
      "origin_application": "Kinetic Financial Analyst Suite",
      "template": {
        "template_id": "tpl_fin_summary_v3",
        "system_prompt_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "system_instruction_source": "git://github.com/kinetic-gain/prompts#fin_summary"
      },
      "user_intent_category": "analysis",
      "input_variables": {
        "portfolio_target": "TECH_SEC_AGGRESSIVE",
        "reporting_quarter": "Q1-2026",
        "data_payload_size_kb": 245.8
      },
      "safety_filtering_status": {
        "jailbreak_risk_score": 0.02,
        "pii_redacted": true,
        "anonymization_strategy": "entity-masking",
        "pre_scan_engine": "GuardShield-v1.2"
      }
    }
  },
  {
    id: 'agent_card',
    name: 'Agent Card spec',
    category: 'core',
    description: 'Registers AI agent identities, authority bounds, budgets, and authorized tools.',
    extendedDescription: 'The Agent Card acts as an active passport and permission descriptor for autonomous LLM agents acting within enterprise networks. It outlines organizational ownership, cryptographic credentials for identity assertion (signing keys), tight financial budget allocations, tool access whitelist, and strict environment bounds. SRE and S3 gateways use this file to immediately deny requests when an agent breaches boundaries.',
    icon: 'ShieldAlert',
    validationRules: [
      'Must declare an owner_organization with valid technical email.',
      'Must define budget_limit_usd and track current_spent_usd.',
      'The allowed_mcp_servers and allowed_tools must contain rigid string sets.'
    ],
    fields: [
      { name: 'agent_id', type: 'string', required: true, description: 'UUID of Agent instance' },
      { name: 'name', type: 'string', required: true, description: 'Operator-given name for logs' },
      { name: 'owner_organization', type: 'object', required: true, description: 'Organization legally responsible for agent actions' },
      { name: 'security_clearance_tier', type: 'number', required: true, description: 'Authority Level (1 = Low, 4 = Critical Restricted)' },
      { name: 'allowed_mcp_servers', type: 'array', required: true, description: 'Names of allowed Model Context Protocol hosts' },
      { name: 'financial_limits', type: 'object', required: true, description: 'Spend budgets, coin limits, and billing thresholds' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/agent-card.schema.json",
      "agent_id": "agt_4f56-be77-10029b3c",
      "name": "AuditOrchestrator-04",
      "owner_organization": {
        "entity_name": "Kinetic Financial Labs LLC",
        "compliance_officer": "officer-finance@kineticgain.com",
        "signing_certificate_id": "cert_sha256_00998a12bc"
      },
      "security_clearance_tier": 3,
      "environment_restrictions": {
        "allowed_geographies": ["US-WEST", "EU-CENTRAL"],
        "network_isolation_level": "vpc-peered"
      },
      "allowed_mcp_servers": [
        "mcp-server-sec-records",
        "mcp-server-web-fetcher"
      ],
      "allowed_tools": [
        "query_ledger",
        "retrieve_pdf_chunk",
        "post_slack_notification"
      ],
      "financial_limits": {
        "budget_limit_usd_per_day": 50.00,
        "current_spent_usd": 12.45,
        "price_per_million_tokens_trigger": 10.00
      }
    }
  },
  {
    id: 'ai_evidence',
    name: 'AI Evidence Card',
    category: 'core',
    description: 'Provides cryptographic generation proofs, model watermarks, and verification keys.',
    extendedDescription: 'AI Evidence Card addresses "AI-slop" and deepfake containment. It records cryptographic token logs, generation timestamps, and mathematical watermark signatures generated by validated weights of neural nets. Consumers can decode this card to verify that a medical summary, financial prediction, or academic file was computed on a specific verified hardware chip or secure cloud instance.',
    icon: 'FileCheck',
    validationRules: [
      'The model_signature must match standard regex hexadecimal pattern.',
      'entropy_score must be a value between 0.0 and 10.0.',
      'Attestation provider must be declared with secure verification endpoint.'
    ],
    fields: [
      { name: 'evidence_id', type: 'string', required: true, description: 'System-wide unique audit record id' },
      { name: 'model_signature', type: 'string', required: true, description: 'Cryptographic hash generated by model layer output' },
      { name: 'generation_hardware_attestation', type: 'object', required: true, description: 'Hardware-level proof (e.g., TPM, Secure Enclave, H100 signature)' },
      { name: 'entropy_score', type: 'number', required: true, description: 'Output token mathematical distribution scoring' },
      { name: 'generation_timestamp', type: 'string', required: true, description: 'UTC Iso Timestamp of token finalization' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/ai-evidence.schema.json",
      "evidence_id": "evd_c08b-4a55-8822f",
      "generation_timestamp": "2026-05-23T20:47:00Z",
      "model_credentials": {
        "model_family": "Gemini-3.5-Pro",
        "weights_hash": "a1b2c3d4e5f60718293a4b5c6d7e8f90011223344556677889900aabbccddeeff",
        "license_id": "lic_gg_enterprise_9981"
      },
      "generation_hardware_attestation": {
        "secure_tpm_id": "tpm_gcp_h100_cluster_8c",
        "chip_signature": "attest_hardware_tpm_7af88b2299fd60e18bcc92"
      },
      "token_performance": {
        "input_tokens": 14500,
        "output_tokens": 820,
        "duration_ms": 1180,
        "tps": 694.9
      },
      "entropy_score": 7.421,
      "watermark_hash": "wm_sine_wave_poly_662f88a12"
    }
  },
  {
    id: 'mcp_tool_card',
    name: 'MCP Tool Card spec',
    category: 'core',
    description: 'Documents tool definitions, parameters, latency SLAs, and cooldown properties.',
    extendedDescription: 'With the Model Context Protocol (MCP) rising in prominence, the MCP Tool Card specifies granular guardrails for client-tool integration. While typical schemas define input variables, MCP Tool Cards add strict performance SLAs (latency bounds, max retries), secure authorization steps (e.g., prompting humans for confirmation), cooldown speeds, and rate ceilings. SRE managers can throttle tool execution safely.',
    icon: 'Wrench',
    validationRules: [
      'latency_sla_ms must be an integer above zero.',
      'Must specify user_approval_required flag as boolean.',
      'The parameters description maps must not contain empty targets.'
    ],
    fields: [
      { name: 'tool_name', type: 'string', required: true, description: 'Unique function locator name in MCP register' },
      { name: 'server_id', type: 'string', required: true, description: 'VPC or remote host routing ID' },
      { name: 'latency_sla_ms', type: 'number', required: true, description: 'Maximum tolerable duration before hard timeout' },
      { name: 'user_approval_required', type: 'boolean', required: true, description: 'Forces human-in-the-loop validation during executions' },
      { name: 'cooldown_period_sec', type: 'number', required: false, description: 'Throttle delay between consecutive calls to avoid abuse' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/mcp-tool-card.schema.json",
      "tool_name": "delete_cloud_storage_bucket",
      "server_id": "server-gcp-ops-mcp-01",
      "role_authorized": "platform-architect",
      "latency_sla_ms": 5000,
      "user_approval_required": true,
      "tool_parameters": {
        "bucket_name": {
          "type": "string",
          "required": true,
          "description": "Unique Google Cloud Storage identifier to remove permanently."
        },
        "archive_before_delete": {
          "type": "boolean",
          "required": false,
          "defaultValue": true,
          "description": "Backup content to secondary archival tier prior to purge."
        }
      },
      "throttling": {
        "cooldown_period_sec": 300,
        "calls_per_hour_limit": 5
      }
    }
  },
  {
    id: 'tutor_card',
    name: 'Tutor Card spec',
    category: 'edtech',
    description: 'Establishes adaptive pedagogy loops, scaffold rules, and tutoring guardrails.',
    extendedDescription: 'The Tutor Card is the first of the EdTech Trio specifications. It serves as a pedagogical contract for digital-twin AI tutors. It mandates the exact teaching style (Socratic, Inquiry, or direct Instruction), sets rules for scaffolding (e.g., how many hints to provide before revealing the solution), defines content boundaries (no essay drafting), and ensures the tutoring agent respects classroom policies.',
    icon: 'GraduationCap',
    validationRules: [
      'Must declare pedagogy_style: socratic, direct, or conceptual.',
      'scaffolding_rules must define positive integer thresholds.',
      'Forbidden topics array must contain at least standard items like homework_solver, prompt_leak.'
    ],
    fields: [
      { name: 'tutor_id', type: 'string', required: true, description: 'Unique tutor profile registry code' },
      { name: 'pedagogy_style', type: 'string', required: true, description: 'Tutoring methodologies (e.g., "Socratic-Dialogue")' },
      { name: 'academic_subject', type: 'string', required: true, description: 'Course domain code (e.g., "PHYS-202")' },
      { name: 'scaffolding_rules', type: 'object', required: true, description: 'Rules restricting immediate answers' },
      { name: 'forbidden_actions', type: 'array', required: true, description: 'Banned assistance styles (e.g., writing code, drafting paragraphs)' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/tutor-card.schema.json",
      "tutor_id": "tut_math_socrates_v4",
      "pedagogy_style": "socratic",
      "academic_subject": "AP-Calculus-BC",
      "target_grade_level": "K12-Grade12",
      "scaffolding_rules": {
        "max_hints_per_problem": 3,
        "allow_direct_answers": false,
        "encourage_partial_working": true,
        "praise_per_attempt_factor": 1.2
      },
      "forbidden_actions": [
        "allow_copy_paste_to_clipboard",
        "solve_complete_systems_of_equations",
        "draft_concluding_paragraphs_for_essays"
      ],
      "guardrails": {
        "divergent_topic_redirection": "Return focus back to derivatives",
        "max_tokens_per_dialog_turn": 250
      }
    }
  },
  {
    id: 'student_disclosure',
    name: 'Student AI Disclosure',
    category: 'edtech',
    description: 'Tracks assignment AI contribution levels, assisted tasks, and human refinements.',
    extendedDescription: 'The Student AI Disclosure spec promotes trust and academic honesty by recording a transparent audit trail of how students interact with AI during assignments. It specifies models used, percent contribution to brainstorming vs writing, prompts executed, and precise human corrections made on top of raw outputs.',
    icon: 'FileSpreadsheet',
    validationRules: [
      'ai_contribution_percentage must be an integer between 0 and 100.',
      'human_refinement_actions must contain explicit description items.'
    ],
    fields: [
      { name: 'student_id', type: 'string', required: true, description: 'Pseudonymized or LTI-based student hash' },
      { name: 'assignment_id', type: 'string', required: true, description: 'LMS-synchronized course task identifier' },
      { name: 'ai_contribution_percentage', type: 'number', required: true, description: 'Self-reported and telemetry-verified work share' },
      { name: 'assisted_tasks', type: 'array', required: true, description: 'Phases which invoked LLMs (e.g. grammar, restructuring)' },
      { name: 'human_refinement_actions', type: 'array', required: true, description: 'Exact edits, formula derivations, and original writing added by student' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/student-disclosure.schema.json",
      "student_id": "std_f99a8b11c2a03",
      "assignment_id": "asg_physics_lab_elastic_collisions",
      "disclosure_timestamp": "2026-05-23T19:12:00Z",
      "ai_contribution_percentage": 25,
      "assisted_tasks": [
        "spelling_and_grammar_cleanup",
        "elastic_collision_python_boilerplate"
      ],
      "prompt_sessions": [
        {
          "model_used": "Gemini-3.5-Flash",
          "prompts_sent": ["Explain elastic collagen math variables in plain terms"]
        }
      ],
      "human_refinement_actions": [
        "Re-wrote python chart titles to match laboratory coordinates",
        "Manually measured and typed collision speed results table coefficients",
        "Wrote exclusive collision discussion paragraph under Section 5 by hand"
      ]
    }
  },
  {
    id: 'classroom_aup',
    name: 'Classroom AI AUP spec',
    category: 'edtech',
    description: 'Enforces school/classroom specific Acceptable Use Policies for AI systems.',
    extendedDescription: 'The Classroom AI Acceptable Use Policy spec (Classroom AI AUP) bridges teacher intent and tool enforcement. Using this spec, course administrators publish JSON permission trees specifying which models are authorized, what tasks are prohibited (e.g., calculator OK, essay writing BLOCKED), and triggers strict browser/OS lockdowns during testing phases. LTI plugins read this JSON to enforce terms dynamically.',
    icon: 'Hammer',
    validationRules: [
      'policy_tier must match strict levels: permissive, blended, strict, or zero.',
      'Must declare allowed_model_families explicitly.'
    ],
    fields: [
      { name: 'classroom_id', type: 'string', required: true, description: 'School/Class LMS registry code' },
      { name: 'class_name', type: 'string', required: true, description: 'Human readable course title' },
      { name: 'policy_tier', type: 'string', required: true, description: 'Policy stringency level ("blended-collaboration")' },
      { name: 'allowed_model_families', type: 'array', required: true, description: 'Authorized LLM families' },
      { name: 'prohibited_interactions', type: 'array', required: true, description: 'Actions explicitly blocked by software rules' },
      { name: 'exam_mode_active', type: 'boolean', required: true, description: 'Forces immediate lockdown protocols when true' }
    ],
    samplePayload: {
      "$schema": "https://specs.kineticgain.org/v1/classroom-aup.schema.json",
      "classroom_id": "cls_bio_ap_102",
      "class_name": "AP Biology - Block C",
      "policy_tier": "blended-collaboration",
      "allowed_model_families": [
        "Gemini-3.5-Pro",
        "ChatGPT-4o-Mini-edu"
      ],
      "prohibited_interactions": [
        "essay_generation",
        "direct_quiz_solving"
      ],
      "authorized_integration_layers": [
        "LTI-Canvas-Plugin-v2",
        "Google-Assignments-Sync"
      ],
      "exam_mode_active": false,
      "lockdown_level": "none"
    }
  }
];

export const initialTopologyNodes: TopologyNode[] = [
  {
    id: 'pub_node',
    label: 'FactPublisher Node [AEO]',
    type: 'publisher',
    status: 'active',
    description: 'The authoritative content server publishing structured, verified site facts.',
    specsProduced: ['aeo'],
    specsConsumed: [],
    signature: 'verified',
    coordinates: { x: 8, y: 25 },
    metrics: { cpu: 14, memory: '1.2 GB / 4 GB', throughput: '412 rps' }
  },
  {
    id: 'agent_node',
    label: 'AgentOrchestrator [Agent + MCP]',
    type: 'agent',
    status: 'active',
    description: 'Executes tools and routes client sub-agent behaviors within structured boundaries.',
    specsProduced: ['prompt_provenance', 'student_disclosure'],
    specsConsumed: ['agent_card', 'mcp_tool_card', 'tutor_card'],
    signature: 'verified',
    coordinates: { x: 28, y: 50 },
    metrics: { cpu: 52, memory: '6.4 GB / 16 GB', throughput: '1,890 rps' }
  },
  {
    id: 'search_node',
    label: 'SearchAnswerEngine [AEO Consumer]',
    type: 'search_engine',
    status: 'active',
    description: 'Aggregates metadata claims and outputs cited citations dynamically to user agents.',
    specsProduced: ['ai_evidence'],
    specsConsumed: ['aeo', 'prompt_provenance'],
    signature: 'expired',
    coordinates: { x: 70, y: 50 },
    metrics: { cpu: 31, memory: '4.1 GB / 8 GB', throughput: '590 rps' }
  },
  {
    id: 'classroom_node',
    label: 'AcademiaHub [EdTech Trio]',
    type: 'classroom_hub',
    status: 'active',
    description: 'Monitors student submissions and enforces acceptable student-AI tutor relationships.',
    specsProduced: ['classroom_aup', 'tutor_card'],
    specsConsumed: ['student_disclosure', 'tutor_card'],
    signature: 'unsigned',
    coordinates: { x: 8, y: 75 },
    metrics: { cpu: 18, memory: '1.5 GB / 4 GB', throughput: '124 rps' }
  },
  {
    id: 'mcp_broker',
    label: 'MCP Permission Broker [Gate]',
    type: 'runtime_gate',
    status: 'active',
    description: 'Inline Decision-Card gate: evaluates tool-call requests against permission posture before grant.',
    specsProduced: ['mcp_tool_card'],
    specsConsumed: ['agent_card'],
    signature: 'verified',
    coordinates: { x: 48, y: 25 },
    metrics: { cpu: 22, memory: '0.9 GB / 2 GB', throughput: '430 grants/s' }
  },
  {
    id: 'azure_bridge',
    label: 'Azure OpenAI Governance Bridge [Gate]',
    type: 'runtime_gate',
    status: 'active',
    description: 'Governs model calls: enforces allow/deny tool baselines and re-stamps prompt provenance.',
    specsProduced: ['prompt_provenance'],
    specsConsumed: ['prompt_provenance', 'agent_card'],
    signature: 'verified',
    coordinates: { x: 48, y: 75 },
    metrics: { cpu: 27, memory: '1.1 GB / 4 GB', throughput: '760 rps' }
  },
  {
    id: 'auditor_node',
    label: 'Governance-Shield [Auditor]',
    type: 'auditor',
    status: 'synced',
    description: 'Continuously hashes payloads to verify generation trust, provenance, and policy adherence.',
    specsProduced: [],
    specsConsumed: ['prompt_provenance', 'ai_evidence', 'student_disclosure'],
    signature: 'verified',
    coordinates: { x: 92, y: 50 },
    metrics: { cpu: 8, memory: '0.8 GB / 2 GB', throughput: '85 rps' }
  },
  {
    id: 'spine_node',
    label: 'AuditStream Spine [Hash-Chained Log]',
    type: 'spine',
    status: 'synced',
    description: 'The tamper-evident, hash-chained governance log. Every event-kind producer terminates here.',
    specsProduced: ['ai_evidence'],
    specsConsumed: ['aeo', 'prompt_provenance', 'ai_evidence', 'student_disclosure', 'classroom_aup', 'mcp_tool_card'],
    signature: 'verified',
    coordinates: { x: 110, y: 50 },
    metrics: { cpu: 11, memory: '2.3 GB / 8 GB', throughput: '3,240 events/s' }
  },
  {
    id: 'incident_node',
    label: 'Incident Correlator [Blast Radius]',
    type: 'incident',
    status: 'warn',
    description: 'Reads the spine to correlate AI incidents and trace every downstream-affected spec surface.',
    specsProduced: [],
    specsConsumed: ['ai_evidence'],
    signature: 'verified',
    coordinates: { x: 126, y: 50 },
    metrics: { cpu: 6, memory: '0.6 GB / 2 GB', throughput: '12 incidents/h' }
  }
];

export const initialTopologyLinks: TopologyLink[] = [
  { id: 'link_aeo_flow', source: 'pub_node', target: 'search_node', activeSpec: 'aeo', trafficState: 'idle' },
  { id: 'link_pub_agent', source: 'pub_node', target: 'agent_node', activeSpec: 'aeo', trafficState: 'idle' },
  { id: 'link_agent_azure', source: 'agent_node', target: 'azure_bridge', activeSpec: 'prompt_provenance', trafficState: 'idle', gate: 'azure_openai_governance_bridge' },
  { id: 'link_azure_search', source: 'azure_bridge', target: 'search_node', activeSpec: 'prompt_provenance', trafficState: 'idle' },
  { id: 'link_agent_mcp', source: 'agent_node', target: 'mcp_broker', activeSpec: 'mcp_tool_card', trafficState: 'idle', gate: 'mcp_permission_broker' },
  { id: 'link_mcp_agent', source: 'mcp_broker', target: 'agent_node', activeSpec: 'mcp_tool_card', trafficState: 'idle', gate: 'mcp_permission_broker' },
  { id: 'link_evid_route', source: 'search_node', target: 'auditor_node', activeSpec: 'ai_evidence', trafficState: 'idle' },
  { id: 'link_edu_aup', source: 'classroom_node', target: 'agent_node', activeSpec: 'classroom_aup', trafficState: 'idle' },
  { id: 'link_edu_disclosure', source: 'agent_node', target: 'classroom_node', activeSpec: 'student_disclosure', trafficState: 'idle' },
  { id: 'link_edu_audit', source: 'classroom_node', target: 'auditor_node', activeSpec: 'student_disclosure', trafficState: 'idle', gate: 'sql_contract_enforcer' },
  { id: 'link_audit_spine', source: 'auditor_node', target: 'spine_node', activeSpec: 'ai_evidence', trafficState: 'idle' },
  { id: 'link_agent_spine', source: 'agent_node', target: 'spine_node', activeSpec: 'prompt_provenance', trafficState: 'idle' },
  { id: 'link_azure_spine', source: 'azure_bridge', target: 'spine_node', activeSpec: 'prompt_provenance', trafficState: 'idle' },
  { id: 'link_mcp_spine', source: 'mcp_broker', target: 'spine_node', activeSpec: 'mcp_tool_card', trafficState: 'idle' },
  { id: 'link_spine_incident', source: 'spine_node', target: 'incident_node', activeSpec: 'ai_evidence', trafficState: 'idle' }
];

export const initialMcpTools: McpTool[] = [
  {
    name: 'fetch_aeo_manifest',
    category: 'AEO crawling',
    description: 'HTTP crawler requesting /.well-known/aeo-card.json and validating ed25519 signature.',
    latencySla: 1200,
    inputs: [
      { name: 'url', type: 'string', desc: 'Canonical URL structure to inspect for AEO rules', defaultValue: 'https://kineticgain.org' },
      { name: 'resolve_redirects', type: 'boolean', desc: 'Follow 301/302 links mapping authoritative canonicals', defaultValue: 'true' }
    ],
    status: 'ready',
    executionCount: 224
  },
  {
    name: 'verify_prompt_signature',
    category: 'Provenance Audit',
    description: 'Compares active prompt prompt_id SHA-256 against system git guidelines.',
    latencySla: 300,
    inputs: [
      { name: 'prompt_id', type: 'string', desc: 'UUID assigned during session hydration' },
      { name: 'commit_hash', type: 'string', desc: 'System prompt registry hash to enforce' }
    ],
    status: 'ready',
    executionCount: 1890
  },
  {
    name: 'assert_budget_limit',
    category: 'Agent Control',
    description: 'Validates agent financial spend per-token to prevent runway pricing surges.',
    latencySla: 150,
    inputs: [
      { name: 'agent_id', type: 'string', desc: 'Identifier of invoking AI instance' },
      { name: 'token_cost_forecast', type: 'number', desc: 'Calculated project pricing tier' }
    ],
    status: 'ready',
    executionCount: 5122
  },
  {
    name: 'verify_tpm_attestation',
    category: 'AI Evidence Verification',
    description: 'Extracts chip-level TPM key and audits entropy scores for mathematical watermarks.',
    latencySla: 1200,
    inputs: [
      { name: 'evidence_id', type: 'string', desc: 'Secure generation document key' },
      { name: 'raw_watermark_signal', type: 'string', desc: 'Staged signature embedded in text streams' }
    ],
    status: 'ready',
    executionCount: 812
  },
  {
    name: 'enforce_aup_lockdown',
    category: 'EdTech Security',
    description: 'Active LMS-trigger setting exam mode browser flags and locking exam clipboards.',
    latencySla: 800,
    inputs: [
      { name: 'classroom_id', type: 'string', desc: 'Target class registry token' },
      { name: 'duration_minutes', type: 'number', desc: 'Exam lock-out sequence count', defaultValue: '60' }
    ],
    status: 'ready',
    executionCount: 42
  },
  {
    name: 'collate_disclosure_log',
    category: 'EdTech Auditing',
    description: 'Compiles pupil tool telemetry logs, computing percentages against human drafts.',
    latencySla: 500,
    inputs: [
      { name: 'student_id', type: 'string', desc: 'Anonymized pupil hash' },
      { name: 'draft_text_chars', type: 'number', desc: 'Volume of submitted document work' }
    ],
    status: 'ready',
    executionCount: 118
  }
];

export const generateRandomPacket = (idCount: number): Record<string, any> => {
  const specs = specsData;
  const targetSpec = specs[Math.floor(Math.random() * specs.length)];
  const senderReceiverPairList = [
    { sender: 'FactPublisher Node [AEO]', receiver: 'SearchAnswerEngine [AEO Consumer]' },
    { sender: 'AgentOrchestrator [Agent + MCP]', receiver: 'SearchAnswerEngine [AEO Consumer]' },
    { sender: 'SearchAnswerEngine [AEO Consumer]', receiver: 'Governance-Shield [Auditor]' },
    { sender: 'AcademiaHub [EdTech Trio]', receiver: 'AgentOrchestrator [Agent + MCP]' },
    { sender: 'AgentOrchestrator [Agent + MCP]', receiver: 'AcademiaHub [EdTech Trio]' },
    { sender: 'AcademiaHub [EdTech Trio]', receiver: 'Governance-Shield [Auditor]' }
  ];
  const pair = senderReceiverPairList[Math.floor(Math.random() * senderReceiverPairList.length)];
  const isOk = Math.random() > 0.08;

  // Clone sample payload and inject fake specific UUIDs/Timestamps
  const payload = JSON.parse(JSON.stringify(targetSpec.samplePayload));
  if (payload.prompt_id) payload.prompt_id = `prm_${Math.random().toString(36).substring(2, 10)}`;
  if (payload.agent_id) payload.agent_id = `agt_${Math.random().toString(36).substring(2, 10)}`;
  if (payload.evidence_id) payload.evidence_id = `evd_${Math.random().toString(36).substring(2, 10)}`;
  
  return {
    id: `pkt_${String(idCount).padStart(5, '0')}`,
    timestamp: new Date().toISOString(),
    specType: targetSpec.id,
    sender: pair.sender,
    receiver: pair.receiver,
    status: isOk ? 'valid' : (Math.random() > 0.5 ? 'warning' : 'invalid'),
    latencyMs: Math.floor(Math.random() * 850) + 50,
    payload,
    verificationHash: Math.random().toString(16).substring(2, 18).toUpperCase()
  };
};
