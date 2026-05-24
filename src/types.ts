/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Representation of the 8 Kinetic Gain Specifications
export type SpecType =
  | 'aeo'
  | 'prompt_provenance'
  | 'agent_card'
  | 'ai_evidence'
  | 'mcp_tool_card'
  | 'tutor_card'
  | 'student_disclosure'
  | 'classroom_aup';

export interface SpecDefinition {
  id: SpecType;
  name: string;
  category: 'core' | 'edtech';
  description: string;
  extendedDescription: string;
  fields: SpecField[];
  samplePayload: Record<string, any>;
  icon: string; // Lucide icon name matching
  validationRules: string[];
}

export interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  vibeText?: string;
}

// ed25519 signature posture for a node's emitted/consumed event frames.
export type SignatureStatus = 'verified' | 'unsigned' | 'expired';

// Runtime policy gates that enforce Decision Cards inline on an edge.
export type RuntimeGate =
  | 'mcp_permission_broker'
  | 'azure_openai_governance_bridge'
  | 'sql_contract_enforcer';

export interface TopologyNode {
  id: string;
  label: string;
  type:
    | 'publisher'
    | 'agent'
    | 'auditor'
    | 'search_engine'
    | 'classroom_hub'
    | 'runtime_gate'
    | 'spine'
    | 'incident';
  status: 'active' | 'synced' | 'warn' | 'inactive';
  description: string;
  specsProduced: SpecType[];
  specsConsumed: SpecType[];
  signature: SignatureStatus; // ed25519 key-chain posture for this node
  coordinates: { x: number; y: number }; // Percentage coords for interactive SVG canvas
  metrics: {
    cpu: number;
    memory: string;
    throughput: string;
  };
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  activeSpec: SpecType;
  trafficState: 'idle' | 'transmitting' | 'error';
  gate?: RuntimeGate; // policy gate enforced inline on this edge, if any
}

export interface AuditPacket {
  id: string;
  timestamp: string;
  specType: SpecType;
  sender: string;
  receiver: string;
  status: 'valid' | 'warning' | 'invalid';
  latencyMs: number;
  payload: Record<string, any>;
  verificationHash: string;
}

export interface McpTool {
  name: string;
  category: string;
  description: string;
  latencySla: number;
  inputs: { name: string; type: string; desc: string; defaultValue?: string }[];
  status: 'ready' | 'running' | 'degraded';
  executionCount: number;
}
