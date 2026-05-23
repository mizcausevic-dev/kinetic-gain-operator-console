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

export interface TopologyNode {
  id: string;
  label: string;
  type: 'publisher' | 'agent' | 'auditor' | 'search_engine' | 'classroom_hub';
  status: 'active' | 'synced' | 'warn' | 'inactive';
  description: string;
  specsProduced: SpecType[];
  specsConsumed: SpecType[];
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
