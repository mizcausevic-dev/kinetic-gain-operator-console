/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  initialTopologyNodes,
  initialTopologyLinks
} from '../data';
import { TopologyNode, TopologyLink, SpecType, SignatureStatus, RuntimeGate } from '../types';
import {
  Activity,
  Cpu,
  Layers,
  Network,
  Radio,
  TrendingUp,
  RotateCcw,
  Zap,
  Info,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Crosshair,
  KeyRound
} from 'lucide-react';

interface TopologyDiagramProps {
  onSelectSpec: (spec: SpecType) => void;
  onAddLog: (logText: string, spec: SpecType, status: 'valid' | 'warning' | 'invalid') => void;
}

type ViewMode = 'flow' | 'heatmap' | 'signed' | 'gates';

// Inline Decision-Card runtime gates → display metadata.
const GATE_META: Record<RuntimeGate, { label: string; short: string; color: string }> = {
  mcp_permission_broker: { label: 'MCP Permission Broker', short: 'MCP BROKER', color: '#fb7185' },
  azure_openai_governance_bridge: { label: 'Azure OpenAI Governance Bridge', short: 'AZURE BRIDGE', color: '#60a5fa' },
  sql_contract_enforcer: { label: 'SQL Contract Enforcer', short: 'SQL CONTRACT', color: '#f59e0b' }
};

// ed25519 signature posture → display metadata.
const SIG_META: Record<SignatureStatus, { label: string; ring: string; text: string; chip: string }> = {
  verified: { label: 'ed25519 VERIFIED', ring: '#34d399', text: 'text-emerald-400', chip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  unsigned: { label: 'UNSIGNED', ring: '#64748b', text: 'text-slate-400', chip: 'bg-slate-500/10 border-slate-500/30 text-slate-400' },
  expired: { label: 'KEY EXPIRED', ring: '#f59e0b', text: 'text-amber-400', chip: 'bg-amber-500/10 border-amber-500/30 text-amber-400' }
};

export default function TopologyDiagram({ onSelectSpec, onAddLog }: TopologyDiagramProps) {
  const [nodes, setNodes] = useState<TopologyNode[]>(initialTopologyNodes);
  const [links] = useState<TopologyLink[]>(initialTopologyLinks);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('agent_node');
  const [pulses, setPulses] = useState<{ id: string; linkId: string; progress: number; spec: SpecType }[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [blastActive, setBlastActive] = useState(false);
  const heatmapActive = viewMode === 'heatmap';

  const [linkLatencies, setLinkLatencies] = useState<Record<string, number>>({
    link_aeo_flow: 122,
    link_pub_agent: 48,
    link_agent_azure: 94,
    link_azure_search: 138,
    link_agent_mcp: 63,
    link_mcp_agent: 57,
    link_evid_route: 42,
    link_edu_aup: 58,
    link_edu_disclosure: 76,
    link_edu_audit: 110,
    link_audit_spine: 24,
    link_agent_spine: 33,
    link_azure_spine: 61,
    link_mcp_spine: 29,
    link_spine_incident: 210
  });

  const pulsesRef = useRef(pulses);
  useEffect(() => {
    pulsesRef.current = pulses;
  }, [pulses]);

  // Periodic tiny fluctuations in node CPU metrics and link latencies to make it feel alive
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setNodes(prev =>
        prev.map(node => {
          if (node.status === 'inactive') return node;
          const fluctuation = Math.floor(Math.random() * 7) - 3; // -3% to +3%
          const newCpu = Math.max(5, Math.min(95, node.metrics.cpu + fluctuation));
          return {
            ...node,
            metrics: {
              ...node.metrics,
              cpu: newCpu
            }
          };
        })
      );

      setLinkLatencies(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          const fluctuation = Math.floor(Math.random() * 14) - 7; // -7ms to +7ms
          updated[id] = Math.max(15, Math.min(650, (updated[id] || 50) + fluctuation));
        });
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Handle flow pulses along the links
  useEffect(() => {
    if (!isSimulating) return;

    // Trigger new random pulses periodically
    const triggerInterval = setInterval(() => {
      const randomLink = links[Math.floor(Math.random() * links.length)];
      setPulses(prev => [
        ...prev,
        {
          id: `pulse_${Math.random().toString(36).substring(2, 7)}`,
          linkId: randomLink.id,
          progress: 0,
          spec: randomLink.activeSpec
        }
      ]);
    }, 2500);

    // Animate active pulses
    const animationInterval = setInterval(() => {
      const currentPulses = pulsesRef.current;
      const updated = currentPulses.map(p => ({ ...p, progress: p.progress + 6 }));

      const completed = updated.filter(p => p.progress >= 100);
      const active = updated.filter(p => p.progress < 100);

      if (completed.length > 0) {
        completed.forEach(p => {
          const l = links.find(link => link.id === p.linkId);
          if (l) {
            const srcNodeName = nodes.find(n => n.id === l.source)?.label || 'Node';
            const destNodeName = nodes.find(n => n.id === l.target)?.label || 'Node';
            onAddLog(
              `Transmission Complete: Spec [${p.spec.toUpperCase()}] transferred successfully from ${srcNodeName.split(' ')[0]} to ${destNodeName.split(' ')[0]}.`,
              p.spec,
              'valid'
            );
          }
        });
      }

      setPulses(active);
    }, 150);

    return () => {
      clearInterval(triggerInterval);
      clearInterval(animationInterval);
    };
  }, [isSimulating, links, nodes, onAddLog]);

  const activeNode = nodes.find(n => n.id === selectedNodeId) || null;

  // Blast-radius closure: BFS over directed edges from the selected node.
  const blast = useMemo(() => {
    if (!blastActive || !selectedNodeId) return null;
    const nodeSet = new Set<string>([selectedNodeId]);
    const linkSet = new Set<string>();
    let frontier = [selectedNodeId];
    while (frontier.length) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const l of links) {
          if (l.source === id) {
            linkSet.add(l.id);
            if (!nodeSet.has(l.target)) {
              nodeSet.add(l.target);
              next.push(l.target);
            }
          }
        }
      }
      frontier = next;
    }
    return { nodeSet, linkSet };
  }, [blastActive, selectedNodeId, links]);

  // Manual ping flow tool
  const triggerManualDiagnostics = () => {
    if (!selectedNodeId) return;
    onAddLog(`System Diagnostics Initiated manually for Node ID [${selectedNodeId}]...`, 'aeo', 'valid');

    const outboundLinks = links.filter(l => l.source === selectedNodeId);
    if (outboundLinks.length > 0) {
      setPulses(prev => [
        ...prev,
        ...outboundLinks.map((l, i) => ({
          id: `manual_pulse_${i}_${Math.random().toString(36).substring(2, 7)}`,
          linkId: l.id,
          progress: 0,
          spec: l.activeSpec
        }))
      ]);
      onAddLog(`Dispatched diagnostic spec frame checks through ${outboundLinks.length} routing channels.`, outboundLinks[0].activeSpec, 'valid');
    } else {
      const inboundLinks = links.filter(l => l.target === selectedNodeId);
      if (inboundLinks.length > 0) {
        setPulses(prev => [
          ...prev,
          ...inboundLinks.map((l, i) => ({
            id: `manual_pulse_in_${i}_${Math.random().toString(36).substring(2, 7)}`,
            linkId: l.id,
            progress: 0,
            spec: l.activeSpec
          }))
        ]);
        onAddLog(`Requested return-status handshake spec packets across ${inboundLinks.length} channels.`, inboundLinks[0].activeSpec, 'valid');
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (status === 'synced') return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    if (status === 'warn') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-slate-500 bg-slate-500/10 border-slate-500/30';
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'publisher': return '#34d399'; // Emerald
      case 'agent': return '#a78bfa'; // Violet/Indigo
      case 'auditor': return '#f59e0b'; // Amber
      case 'search_engine': return '#2dd4bf'; // Teal
      case 'classroom_hub': return '#60a5fa'; // Light Blue
      case 'runtime_gate': return '#fb7185'; // Rose
      case 'spine': return '#22d3ee'; // Cyan
      case 'incident': return '#ef4444'; // Red
      default: return '#94a3b8';
    }
  };

  const getSpecStroke = (spec: SpecType) => {
    switch (spec) {
      case 'aeo': return 'rgba(52, 211, 153, 0.45)';
      case 'prompt_provenance': return 'rgba(167, 139, 250, 0.45)';
      case 'ai_evidence': return 'rgba(244, 114, 182, 0.45)';
      case 'classroom_aup': return 'rgba(251, 113, 133, 0.45)';
      case 'student_disclosure': return 'rgba(34, 211, 238, 0.45)';
      case 'mcp_tool_card': return 'rgba(245, 158, 11, 0.45)';
      case 'tutor_card': return 'rgba(96, 165, 250, 0.45)';
      case 'agent_card': return 'rgba(167, 139, 250, 0.45)';
      default: return '#475569';
    }
  };

  const getPulseColor = (spec: SpecType) => {
    switch (spec) {
      case 'aeo': return '#10b981';
      case 'prompt_provenance': return '#8b5cf6';
      case 'ai_evidence': return '#ec4899';
      case 'classroom_aup': return '#f43f5e';
      case 'student_disclosure': return '#06b6d4';
      case 'mcp_tool_card': return '#f59e0b';
      case 'tutor_card': return '#60a5fa';
      case 'agent_card': return '#a78bfa';
      default: return '#a78bfa';
    }
  };

  const getSpecColorClass = (spec: SpecType) => {
    switch (spec) {
      case 'aeo': return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
      case 'prompt_provenance': return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
      case 'agent_card': return 'text-violet-400 border-violet-500/30 bg-violet-950/20';
      case 'ai_evidence': return 'text-pink-400 border-pink-500/30 bg-pink-950/20';
      case 'mcp_tool_card': return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
      case 'tutor_card': return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
      case 'student_disclosure': return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20';
      case 'classroom_aup': return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
    }
  };

  // Gates that touch the active node (in or out).
  const activeNodeGates: RuntimeGate[] = activeNode
    ? Array.from(
        new Set<RuntimeGate>(
          links
            .filter(l => !!l.gate && (l.source === activeNode.id || l.target === activeNode.id))
            .map(l => l.gate as RuntimeGate)
        )
      )
    : [];

  const viewModes: { id: ViewMode; label: string; title: string }[] = [
    { id: 'flow', label: 'FLOW', title: 'Spec-colored producer/consumer flow' },
    { id: 'heatmap', label: 'HEAT', title: 'Per-edge latency heatmap' },
    { id: 'signed', label: 'SIGNED', title: 'ed25519 node signature posture' },
    { id: 'gates', label: 'GATES', title: 'Inline Decision-Card runtime gates' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Topology Canvas Section */}
      <div className="lg:col-span-3 bg-[#07080c] border border-slate-800 rounded p-4 relative overflow-hidden flex flex-col justify-between select-none" style={{ minHeight: '520px' }}>
        {/* Ambient background grid pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 0.61px, transparent 0.61px)', backgroundSize: '16px 16px' }}></div>

        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 z-10 border-b border-slate-800 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-cyan-400 animate-pulse" />
              <h2 className="text-xs font-bold text-white font-mono tracking-widest uppercase">Active Topology Mesh</h2>
              <span className="text-[8px] font-mono text-cyan-500/80 border border-cyan-800/50 rounded-sm px-1 py-0.5 tracking-wider">v0.2</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">9 producers/consumers · 3 runtime gates · hash-chained spine · ed25519 posture</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* View-mode segmented control */}
            <div className="flex items-center bg-black/40 border border-slate-800 rounded-sm p-0.5 gap-0.5">
              {viewModes.map(vm => (
                <button
                  key={vm.id}
                  onClick={() => {
                    setViewMode(vm.id);
                    onAddLog(`Topology view mode → ${vm.label}.`, 'aeo', 'valid');
                  }}
                  title={vm.title}
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono font-bold tracking-wider transition-all ${
                    viewMode === vm.id
                      ? 'bg-cyan-950/60 text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {vm.label}
                </button>
              ))}
            </div>

            {/* Blast radius toggle */}
            <button
              onClick={() => {
                setBlastActive(!blastActive);
                onAddLog(`Blast-radius tracing ${!blastActive ? 'ENABLED' : 'DISABLED'}.`, 'ai_evidence', !blastActive ? 'warning' : 'valid');
              }}
              title="Trace every downstream-affected surface from the selected node"
              className={`px-2 py-1 rounded-sm text-[9px] font-mono font-bold tracking-wider transition-all flex items-center gap-1 border ${
                blastActive
                  ? 'bg-rose-950/50 border-rose-600/40 text-rose-300 shadow-sm shadow-rose-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <Crosshair className={`h-3 w-3 ${blastActive ? 'text-rose-400 animate-pulse' : ''}`} />
              BLAST
            </button>

            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-2 py-1 rounded-sm text-[9px] font-mono font-bold transition-all flex items-center gap-1 border ${
                isSimulating
                  ? 'bg-cyan-950/40 border-cyan-600/30 text-cyan-400 hover:bg-slate-900'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-850'
              }`}
            >
              <Activity className={`h-3 w-3 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'TRANSMITTING' : 'PAUSED'}
            </button>

            <button
              onClick={() => {
                setPulses([]);
                onAddLog('Topology pulse stack cleared.', 'aeo', 'warning');
              }}
              title="Clear active flow frames"
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-sm text-slate-500 font-mono text-[10px] hover:text-red-400"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Dynamic Topology Chart SVG Area */}
        <div className="relative flex-1 bg-[#040508] border border-slate-800 rounded-sm overflow-hidden flex items-center justify-center p-2" style={{ minHeight: '380px' }}>

          {/* Overlay legend guide (mode-aware) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none hidden sm:flex bg-black/70 p-2 rounded border border-slate-850/40 backdrop-blur-xs select-none shadow-md max-w-[150px]">
            {viewMode === 'flow' && (
              <>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold border-b border-slate-800/40 pb-1">Spec Legend</span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400"><span className="w-2.5 h-1 bg-emerald-400/80 rounded-full inline-block"></span> AEO Card Flow</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400"><span className="w-2.5 h-1 bg-purple-400/80 rounded-full inline-block"></span> Prompt Provenance</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-pink-400"><span className="w-2.5 h-1 bg-pink-400/80 rounded-full inline-block"></span> AI Evidence Proof</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400"><span className="w-2.5 h-1 bg-amber-400/80 rounded-full inline-block"></span> MCP Tool Card</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400"><span className="w-2.5 h-1 bg-cyan-400/80 rounded-full inline-block"></span> Student Disclosure</div>
              </>
            )}
            {viewMode === 'heatmap' && (
              <>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-semibold border-b border-amber-800/40 pb-1">Heatmap Legend</span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400"><span className="w-2.5 h-1 bg-emerald-500 rounded-full inline-block"></span> Nominal (&lt; 80ms)</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400"><span className="w-2.5 h-1 bg-amber-500 rounded-full inline-block"></span> Warning (80-200ms)</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-rose-400"><span className="w-2.5 h-1 bg-rose-500 rounded-full inline-block"></span> Bottleneck (&gt; 200ms)</div>
                <div className="text-[7px] font-mono text-slate-500 mt-1 leading-snug">*Click any latency badge to spike lag and test SRE warnings.</div>
              </>
            )}
            {viewMode === 'signed' && (
              <>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold border-b border-slate-800/40 pb-1">ed25519 Posture</span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400"><span className="w-2 h-2 rounded-full inline-block border border-emerald-400" style={{ background: '#34d399' }}></span> Key Verified</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400"><span className="w-2 h-2 rounded-full inline-block border border-amber-400" style={{ background: '#f59e0b' }}></span> Key Expired</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400"><span className="w-2 h-2 rounded-full inline-block border border-slate-400" style={{ background: '#64748b' }}></span> Unsigned</div>
                <div className="text-[7px] font-mono text-slate-500 mt-1 leading-snug">*Node rings recolor by signing-key status.</div>
              </>
            )}
            {viewMode === 'gates' && (
              <>
                <span className="text-[10px] font-mono text-rose-300 uppercase tracking-widest font-semibold border-b border-slate-800/40 pb-1">Runtime Gates</span>
                <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: GATE_META.mcp_permission_broker.color }}><span className="w-2.5 h-1 rounded-full inline-block" style={{ background: GATE_META.mcp_permission_broker.color }}></span> MCP Broker</div>
                <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: GATE_META.azure_openai_governance_bridge.color }}><span className="w-2.5 h-1 rounded-full inline-block" style={{ background: GATE_META.azure_openai_governance_bridge.color }}></span> Azure Bridge</div>
                <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: GATE_META.sql_contract_enforcer.color }}><span className="w-2.5 h-1 rounded-full inline-block" style={{ background: GATE_META.sql_contract_enforcer.color }}></span> SQL Contract</div>
                <div className="text-[7px] font-mono text-slate-500 mt-1 leading-snug">*Shields mark edges with inline Decision-Card enforcement.</div>
              </>
            )}
          </div>

          {/* Blast-radius banner */}
          {blast && (
            <div className="absolute top-3 right-3 z-10 pointer-events-none bg-rose-950/70 border border-rose-700/50 rounded px-2.5 py-1.5 backdrop-blur-xs shadow-md">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider">
                <Crosshair className="h-3 w-3 animate-pulse" /> Blast Radius
              </div>
              <div className="text-[9px] font-mono text-rose-200/80 mt-0.5">
                {blast.nodeSet.size - 1} downstream surface{blast.nodeSet.size - 1 === 1 ? '' : 's'} affected
              </div>
            </div>
          )}

          <svg className="w-full h-full min-h-[360px]" style={{ touchAction: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Draw pathways */}
            {links.map(link => {
              const src = nodes.find(n => n.id === link.source);
              const dest = nodes.find(n => n.id === link.target);
              if (!src || !dest) return null;

              const latency = linkLatencies[link.id] || 50;
              const isLinkActive = selectedNodeId === link.source || selectedNodeId === link.target;
              const mx = (src.coordinates.x + dest.coordinates.x) / 2;
              const my = (src.coordinates.y + dest.coordinates.y) / 2;

              // Resolve stroke per active mode (blast overrides everything).
              let strokeColor = getSpecStroke(link.activeSpec);
              let strokeWidth = isLinkActive ? 1.0 : 0.45;
              let dash: string | undefined = isLinkActive ? '1,0' : '1.5,1.5';
              let opacity = 1;

              if (blast) {
                if (blast.linkSet.has(link.id)) {
                  strokeColor = 'rgba(244, 63, 94, 0.9)';
                  strokeWidth = 1.2;
                  dash = undefined;
                } else {
                  strokeColor = '#1e293b';
                  strokeWidth = 0.4;
                  dash = '1.5,1.5';
                  opacity = 0.2;
                }
              } else if (viewMode === 'heatmap') {
                let heat = 'rgba(16, 185, 129, 0.85)';
                if (latency >= 80 && latency < 200) heat = 'rgba(245, 158, 11, 0.9)';
                else if (latency >= 200) heat = 'rgba(239, 68, 68, 0.95)';
                strokeColor = heat;
                strokeWidth = latency >= 200 ? 1.4 : 0.8;
                dash = undefined;
              } else if (viewMode === 'gates') {
                if (link.gate) {
                  strokeColor = GATE_META[link.gate].color + 'd0';
                  strokeWidth = 1.1;
                  dash = undefined;
                } else {
                  strokeColor = '#1e293b';
                  strokeWidth = 0.45;
                  dash = '1.5,1.5';
                  opacity = 0.4;
                }
              } else if (viewMode === 'signed') {
                strokeWidth = isLinkActive ? 0.9 : 0.4;
                opacity = 0.55;
              }

              const showGateShield = !!link.gate && (viewMode === 'gates' || isLinkActive);
              const gateScale = viewMode === 'gates' ? 1 : 0.6;

              return (
                <g key={link.id}>
                  {/* Outer glow back-layer for bottleneck (heatmap) or blast path */}
                  {((viewMode === 'heatmap' && latency >= 200) || (blast && blast.linkSet.has(link.id))) && (
                    <line
                      x1={src.coordinates.x}
                      y1={src.coordinates.y}
                      x2={dest.coordinates.x}
                      y2={dest.coordinates.y}
                      stroke={blast ? 'rgba(244, 63, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)'}
                      strokeWidth={2.6}
                      className="animate-pulse"
                    />
                  )}

                  {/* Main connection line */}
                  <line
                    x1={src.coordinates.x}
                    y1={src.coordinates.y}
                    x2={dest.coordinates.x}
                    y2={dest.coordinates.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                    opacity={opacity}
                    style={{ transition: 'stroke-width 0.3s ease, stroke 0.3s ease, opacity 0.3s ease' }}
                  />

                  {/* Runtime-gate shield badge */}
                  {showGateShield && link.gate && (
                    <g transform={`translate(${mx}, ${my}) scale(${gateScale})`} className="pointer-events-none">
                      <path
                        d="M0,-2 L1.7,-1.2 L1.7,0.6 C1.7,1.7 0.9,2.3 0,2.7 C-0.9,2.3 -1.7,1.7 -1.7,0.6 L-1.7,-1.2 Z"
                        fill="#040508"
                        stroke={GATE_META[link.gate].color}
                        strokeWidth="0.35"
                      />
                      <path
                        d="M-0.75,0.1 L-0.2,0.7 L0.85,-0.55"
                        fill="none"
                        stroke={GATE_META[link.gate].color}
                        strokeWidth="0.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* Heatmap interactive floating latency badges */}
                  {viewMode === 'heatmap' && !blast && (
                    <g
                      transform={`translate(${mx}, ${my})`}
                      className="cursor-pointer group select-none pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinkLatencies(prev => {
                          const currentVal = prev[link.id] || 50;
                          const nextVal = currentVal > 400 ? 45 : currentVal + 115;
                          onAddLog(`Operator manual spike connection link [${link.id}] average latency: ${nextVal}ms`, 'aeo', nextVal > 200 ? 'invalid' : nextVal > 80 ? 'warning' : 'valid');
                          return { ...prev, [link.id]: nextVal };
                        });
                      }}
                    >
                      <rect
                        x="-4.8"
                        y="-2.5"
                        width="9.6"
                        height="5"
                        rx="1"
                        fill="#020407"
                        stroke={latency >= 200 ? '#ef4444' : latency >= 80 ? '#f59e0b' : '#10b981'}
                        strokeWidth="0.25"
                        className="transition-colors group-hover:fill-slate-900"
                      />
                      <text
                        textAnchor="middle"
                        y="0.9"
                        fontSize="1.6"
                        fontWeight="bold"
                        fill={latency >= 200 ? '#fca5a5' : latency >= 80 ? '#fde047' : '#34d399'}
                        className="font-mono tracking-tighter"
                      >
                        {latency}ms
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Simulated Live Pulses Moving Along Guidelines */}
            {pulses.map(pulse => {
              const link = links.find(l => l.id === pulse.linkId);
              if (!link) return null;
              const src = nodes.find(n => n.id === link.source);
              const dest = nodes.find(n => n.id === link.target);
              if (!src || !dest) return null;

              const px = src.coordinates.x + (dest.coordinates.x - src.coordinates.x) * (pulse.progress / 100);
              const py = src.coordinates.y + (dest.coordinates.y - src.coordinates.y) * (pulse.progress / 100);
              const pulseColor = getPulseColor(pulse.spec);
              const pulseDim = blast && !blast.linkSet.has(link.id) ? 0.15 : 1;

              return (
                <circle
                  key={pulse.id}
                  cx={px}
                  cy={py}
                  r="0.8"
                  fill={pulseColor}
                  opacity={pulseDim}
                  className="animate-ping"
                  style={{
                    filter: `drop-shadow(0 0 4px ${pulseColor})`,
                    transformOrigin: `${px}% ${py}%`
                  }}
                />
              );
            })}

            {/* Render Nodes as SVG structures */}
            {nodes.map(node => {
              const isActive = selectedNodeId === node.id;
              const themeColor = getNodeColor(node.type);
              const ringColor = isActive
                ? '#ffffff'
                : viewMode === 'signed'
                  ? SIG_META[node.signature].ring
                  : themeColor;
              const ringWidth = isActive ? 0.4 : 0.2;
              const dimmed = blast && !blast.nodeSet.has(node.id) ? 0.18 : 1;
              const isOrigin = blast && node.id === selectedNodeId;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.coordinates.x}, ${node.coordinates.y})`}
                  className="cursor-pointer"
                  opacity={dimmed}
                  style={{ transition: 'opacity 0.3s ease' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                >
                  {/* Ripple radial animation for active / blast-origin */}
                  {(isActive || isOrigin) && (
                    <circle
                      r="4.6"
                      fill="none"
                      stroke={isOrigin ? '#f43f5e' : themeColor}
                      strokeWidth="0.12"
                      className="animate-ping"
                      opacity="0.35"
                    />
                  )}

                  {/* Node base shape by kind */}
                  {node.type === 'runtime_gate' ? (
                    <rect x="-2.7" y="-2.7" width="5.4" height="5.4" rx="1.3" fill="#0f172a" stroke={ringColor} strokeWidth={ringWidth} style={{ transition: 'stroke 0.3s ease' }} />
                  ) : node.type === 'spine' ? (
                    <rect x="-5.2" y="-2" width="10.4" height="4" rx="1.6" fill="#0f172a" stroke={ringColor} strokeWidth={ringWidth} style={{ transition: 'stroke 0.3s ease' }} />
                  ) : node.type === 'incident' ? (
                    <polygon points="0,-3.4 3.1,2.5 -3.1,2.5" fill="#0f172a" stroke={ringColor} strokeWidth={ringWidth} style={{ transition: 'stroke 0.3s ease' }} />
                  ) : (
                    <circle r="2.8" fill="#0f172a" stroke={ringColor} strokeWidth={ringWidth} style={{ transition: 'stroke 0.3s ease' }} />
                  )}

                  {/* Core indicator keeps node-type identity even in signed mode */}
                  <circle r="0.9" cy={node.type === 'incident' ? 0.4 : 0} fill={themeColor} />

                  {/* Signature glyph ring (signed mode only) */}
                  {viewMode === 'signed' && node.signature !== 'verified' && (
                    <circle r="3.6" fill="none" stroke={SIG_META[node.signature].ring} strokeWidth="0.15" strokeDasharray="0.6,0.6" className="animate-pulse" />
                  )}

                  {/* Mini-Label */}
                  <text
                    y={node.type === 'spine' ? 5.0 : 5.8}
                    textAnchor="middle"
                    fill={isActive ? '#ffffff' : '#94a3b8'}
                    fontSize="1.8"
                    fontWeight={isActive ? 'bold' : 'normal'}
                    className="font-mono tracking-wide pointer-events-none select-none"
                  >
                    {node.label.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Simulated telemetry dynamic logs bottom overlay */}
          <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-slate-500 bg-black/80 px-1.5 py-0.5 rounded-sm border border-slate-800/80 pointer-events-none">
            NODES: {nodes.length} | LINKS: {links.length} | PULSES: {pulses.length} | MODE: {viewMode.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Selected Node Details Side Console */}
      <div className="bg-[#07080c] border border-slate-800 rounded p-4 flex flex-col justify-between">
        {activeNode ? (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Node Title Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Node Operations</span>
                <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded-sm border uppercase font-bold ${getStatusColor(activeNode.status)}`}>
                  {activeNode.status}
                </span>
              </div>

              {/* Node Metadata Card */}
              <h3 className="text-xs font-bold text-white font-mono tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: getNodeColor(activeNode.type) }}></span>
                {activeNode.label}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-sans">
                {activeNode.description}
              </p>

              {/* ed25519 signature posture + blast radius */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded-sm border uppercase font-bold flex items-center gap-1 ${SIG_META[activeNode.signature].chip}`}>
                  {activeNode.signature === 'verified'
                    ? <ShieldCheck className="h-3 w-3" />
                    : activeNode.signature === 'expired'
                      ? <ShieldAlert className="h-3 w-3" />
                      : <ShieldOff className="h-3 w-3" />}
                  {SIG_META[activeNode.signature].label}
                </span>
                {blast && activeNode.id === selectedNodeId && (
                  <span className="px-1.5 py-0.5 text-[8px] font-mono rounded-sm border uppercase font-bold flex items-center gap-1 bg-rose-500/10 border-rose-500/30 text-rose-300">
                    <Crosshair className="h-3 w-3" /> {blast.nodeSet.size - 1} DOWNSTREAM
                  </span>
                )}
              </div>

              {/* Node Telemetry Metrics Gauges */}
              <div className="grid grid-cols-1 gap-2 mt-3 bg-black/30 p-2.5 rounded border border-slate-800/60 font-mono">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Real-Time Telemetry</span>

                {/* CPU gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 flex items-center gap-1 text-[9px]">
                      <Cpu className="h-3 w-3 text-cyan-400" />
                      CPU UTILITY
                    </span>
                    <span className={activeNode.metrics.cpu > 70 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                      {activeNode.metrics.cpu}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm transition-all duration-500 ${
                        activeNode.metrics.cpu > 75 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${activeNode.metrics.cpu}%` }}
                    ></div>
                  </div>
                </div>

                {/* Throughput metrics */}
                <div className="flex justify-between items-center text-[9.5px] border-t border-slate-800/40 pt-1.5 mt-0.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    THROUGHPUT
                  </span>
                  <span className="text-emerald-400 text-[10.5px] font-bold">{activeNode.metrics.throughput}</span>
                </div>

                {/* Memory footprints */}
                <div className="flex justify-between items-center text-[9.5px] border-t border-slate-800/40 pt-1.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-400" />
                    VRAM/MEM FOOTPRINT
                  </span>
                  <span className="text-slate-300 text-[10px]">{activeNode.metrics.memory}</span>
                </div>
              </div>

              {/* Runtime gates touching this node */}
              {activeNodeGates.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1 font-mono">
                    <KeyRound className="h-3 w-3 text-rose-400" /> Inline Decision-Card Gates
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {activeNodeGates.map(g => (
                      <span
                        key={g}
                        className="px-1.5 py-0.5 text-[8.5px] border rounded-sm font-mono font-bold uppercase flex items-center gap-1"
                        style={{ color: GATE_META[g].color, borderColor: GATE_META[g].color + '55', background: GATE_META[g].color + '12' }}
                      >
                        {GATE_META[g].short}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specification Channels mappings Section */}
              <div className="mt-4 space-y-3 font-mono">
                {activeNode.specsProduced.length > 0 && (
                  <div>
                    <h4 className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" /> Produces Specs
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {activeNode.specsProduced.map(spec => (
                        <button
                          key={spec}
                          onClick={() => onSelectSpec(spec)}
                          className={`px-1.5 py-0.5 text-[8.5px] border rounded-sm transition-all font-bold uppercase hover:bg-slate-900 ${getSpecColorClass(spec)}`}
                        >
                          {spec.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeNode.specsConsumed.length > 0 && (
                  <div>
                    <h4 className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-cyan-400" /> Consumes Specs
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {activeNode.specsConsumed.map(spec => (
                        <button
                          key={spec}
                          onClick={() => onSelectSpec(spec)}
                          className={`px-1.5 py-0.5 text-[8.5px] border rounded-sm transition-all font-bold uppercase hover:bg-slate-900 ${getSpecColorClass(spec)}`}
                        >
                          {spec.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick trigger Actions */}
            <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
              <button
                onClick={triggerManualDiagnostics}
                className="w-full bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] transition-all text-white py-1.5 rounded-sm text-[10px] font-mono font-bold tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10"
              >
                <Activity className="h-3 w-3" />
                PING NODE INSPECTOR
              </button>

              <button
                onClick={() => {
                  setBlastActive(true);
                  onAddLog(`Blast-radius traced from [${activeNode.label.split(' ')[0]}].`, 'ai_evidence', 'warning');
                }}
                className="w-full bg-rose-950/40 hover:bg-rose-900/40 border border-rose-700/40 active:scale-[0.98] transition-all text-rose-300 py-1.5 rounded-sm text-[10px] font-mono font-bold tracking-widest flex items-center justify-center gap-1.5"
              >
                <Crosshair className="h-3 w-3" />
                TRACE BLAST RADIUS
              </button>

              <div className="flex gap-1.5 text-[9px] text-slate-500 leading-normal p-2 bg-black/45 rounded-sm border border-slate-800/85">
                <Info className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                <span>
                  All channels validate JSON schemas over ed25519 key chains by default to support the agent era.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-600 font-mono">
            <Radio className="h-6 w-6 text-slate-800 animate-pulse mb-2" />
            <span className="text-[10px]">No Node selected</span>
            <span className="text-[8px] text-slate-700 mt-1">Click any topology node to wire up diagnostics</span>
          </div>
        )}
      </div>
    </div>
  );
}
