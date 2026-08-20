/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { generateRandomPacket, specsData } from '../data';
import { AuditPacket, SpecType } from '../types';
import { 
  Play, 
  Pause, 
  Trash2, 
  Layers, 
  PlusCircle, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  Activity,
  Terminal,
  Clock,
  ChevronRight,
  Filter,
  Eye,
  Send
} from 'lucide-react';

interface AuditStreamProps {
  logs: AuditPacket[];
  setLogs: Dispatch<SetStateAction<AuditPacket[]>>;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  onSelectSpec: (spec: SpecType) => void;
  onAddLog: (logText: string, spec: SpecType, status: 'valid' | 'warning' | 'invalid') => void;
}

export default function AuditStream({ 
  logs, 
  setLogs, 
  isPaused, 
  setIsPaused, 
  onSelectSpec, 
  onAddLog 
}: AuditStreamProps) {
  const [selectedPacket, setSelectedPacket] = useState<AuditPacket | null>(null);
  const [specFilter, setSpecFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Custom injector states
  const [injSpec, setInjSpec] = useState<SpecType>('mcp_tool_card');
  const [injSender, setInjSender] = useState<string>('FactPublisher Node [AEO]');
  const [injStatus, setInjStatus] = useState<'valid' | 'warning' | 'invalid'>('valid');
  const [injCustomFieldKey, setInjCustomFieldKey] = useState<string>('override_authority');
  const [injCustomFieldValue, setInjCustomFieldValue] = useState<string>('CRITICAL-BYPASS-ENCRYPTED');

  const scrollRef = useRef<HTMLDivElement>(null);
  const totalCount = useRef(logs.length);

  // Auto scroll logs when active
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Handle continuous random generation in background
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      totalCount.current += 1;
      const newPkl = generateRandomPacket(totalCount.current) as AuditPacket;
      
      setLogs(prev => {
        const copy = [...prev, newPkl];
        // Retain maximum size of 100 on client to save memory
        if (copy.length > 80) return copy.slice(copy.length - 80);
        return copy;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [isPaused, setLogs]);

  // Inject Custom Protocol Packet
  const handleInjectPacket = () => {
    totalCount.current += 1;
    const basePayload = specsData.find(s => s.id === injSpec)?.samplePayload || {};
    
    // Construct custom payload with overrides injected
    const customPayload = {
      ...JSON.parse(JSON.stringify(basePayload)),
      [injCustomFieldKey]: injCustomFieldValue,
      inject_agent_override: true,
      timestamp: new Date().toISOString()
    };

    const targetSpecObj = specsData.find(s => s.id === injSpec);
    onAddLog(`OPERATOR INTERVENTION: Forcing custom frames on [${injSpec.toUpperCase()}] spec channels...`, injSpec, injStatus);

    const newCustomPacket: AuditPacket = {
      id: `pkt_inj_${String(totalCount.current).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      specType: injSpec,
      sender: injSender,
      receiver: injSender.includes('Publisher') ? 'SearchAnswerEngine [AEO Consumer]' : 'Governance-Shield [Auditor]',
      status: injStatus,
      latencyMs: Math.floor(Math.random() * 210) + 15,
      payload: customPayload,
      verificationHash: `BYPASS_SIG_${Math.random().toString(16).substring(2, 8).toUpperCase()}`
    };

    setLogs(prev => [...prev, newCustomPacket]);
    setSelectedPacket(newCustomPacket);
    onAddLog(`SPIKE DETECTED: Injected custom framing payload ID [${newCustomPacket.id}] securely. Status codes initialized.`, injSpec, injStatus);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
      case 'invalid': return <XCircle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />;
      default: return null;
    }
  };

  const getStatusBannerColor = (status: string) => {
    if (status === 'valid') return 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400';
    if (status === 'warning') return 'border-amber-500/20 bg-amber-950/20 text-amber-400';
    return 'border-rose-500/20 bg-rose-950/20 text-rose-400';
  };

  const getSpecTextClass = (spec: SpecType) => {
    switch (spec) {
      case 'aeo': return 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/40';
      case 'prompt_provenance': return 'text-purple-400 bg-purple-950/40 border border-purple-900/40';
      case 'agent_card': return 'text-violet-400 bg-violet-950/40 border border-violet-900/40';
      case 'ai_evidence': return 'text-pink-400 bg-pink-950/40 border border-pink-900/40';
      case 'mcp_tool_card': return 'text-amber-400 bg-amber-950/40 border border-amber-900/40';
      case 'tutor_card': return 'text-blue-400 bg-blue-950/40 border border-blue-900/40';
      case 'student_disclosure': return 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/40';
      case 'classroom_aup': return 'text-rose-400 bg-rose-950/40 border border-rose-900/40';
    }
  };

  // Filter lists
  const filteredPackets = logs.filter(pkt => {
    const specMatch = specFilter === 'all' || pkt.specType === specFilter;
    const statusMatch = statusFilter === 'all' || pkt.status === statusFilter;
    return specMatch && statusMatch;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      
      {/* Scroll Spine list area */}
      <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between" style={{ minHeight: '520px' }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400 animate-pulse" />
                <h2 className="text-xs font-bold text-white font-mono tracking-widest uppercase">Audit-Stream Spine Visualizer</h2>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Simulating real-time schema audit transactions across open cloud edges</p>
            </div>

            {/* Play/pause button toolbar */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`p-1 px-2.5 rounded-sm text-[9px] font-mono font-bold transition-all flex items-center gap-1 border uppercase ${
                  isPaused 
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-on-accent' 
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800'
                }`}
              >
                {isPaused ? <Play className="h-3 w-3 fill-white animate-pulse" /> : <Pause className="h-3 w-3 text-slate-400" />}
                {isPaused ? 'RESUME STREAM' : 'FREEZE FRAME'}
              </button>
              
              <button
                onClick={() => {
                  setLogs([]);
                  setSelectedPacket(null);
                  onAddLog('Audit log spine database scrubbed.', 'aeo', 'warning');
                }}
                className="p-1 px-1.5 hover:bg-slate-850 text-slate-500 hover:text-rose-400 border border-slate-800 rounded-sm font-mono text-[9px] leading-none uppercase font-bold"
                title="Wipe database packets cache"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Table Filters Board */}
          <div className="flex flex-wrap gap-2.5 items-center bg-black/40 p-2.5 rounded-sm border border-slate-800/80 mb-3.5 font-mono">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-550 font-bold">
              <Filter className="h-3 w-3 text-slate-600" />
              <span>FILTER SPINE:</span>
            </div>
            
            {/* Spec type filter dropdown */}
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="bg-black border border-slate-800 text-slate-300 rounded-sm text-[10px] px-1.5 py-0.5 focus:outline-none focus:border-cyan-500/80 font-bold font-mono"
            >
              <option value="all">ALL SPEC SCHEMAS</option>
              {specsData.map(s => (
                <option key={s.id} value={s.id}>{s.name.replace(' spec', '').toUpperCase()}</option>
              ))}
            </select>

            {/* Status filters */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black border border-slate-800 text-slate-300 rounded-sm text-[10px] px-1.5 py-0.5 focus:outline-none focus:border-cyan-500/80 font-bold font-mono"
            >
              <option value="all">ALL STATUS LEVELS</option>
              <option value="valid">VALID (HEALTHY)</option>
              <option value="warning">WARNING CODE</option>
              <option value="invalid">FAULTY (MALFORMED)</option>
            </select>

            {/* Log counters */}
            <div className="text-[10px] text-slate-600 ml-auto hidden md:block font-bold">
              SHOWING: <span className="text-cyan-450 font-bold">{filteredPackets.length}</span> / {logs.length} BUFFER STORES
            </div>
          </div>

          {/* Stream Log Scroller Window */}
          <div 
            ref={scrollRef}
            className="flex-1 bg-black rounded-sm border border-slate-800 overflow-y-auto font-mono text-xs flex flex-col select-none relative divide-y divide-slate-900"
            style={{ maxHeight: '290px', minHeight: '260px' }}
          >
            {filteredPackets.length > 0 ? (
              filteredPackets.map(pkt => {
                const isSelected = selectedPacket?.id === pkt.id;
                
                return (
                  <div
                    key={pkt.id}
                    onClick={() => setSelectedPacket(pkt)}
                    className={`w-full text-left p-2.5 flex items-start sm:items-center gap-2.5 cursor-pointer hover:bg-slate-900 transition-all ${
                      isSelected ? 'bg-cyan-950/15 hover:bg-cyan-950/20 border-l-2 border-l-cyan-450' : ''
                    }`}
                  >
                    <div className="mt-0.5 sm:mt-0 shrink-0">
                      {getStatusIcon(pkt.status)}
                    </div>

                    <div className="text-[9px] text-slate-600 font-semibold shrink-0">
                      [{new Date(pkt.timestamp).toLocaleTimeString()}]
                    </div>

                    <div className="shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase ${getSpecTextClass(pkt.specType)}`}>
                        {pkt.specType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex-1 truncate text-slate-300 font-sans text-[11px] font-medium pl-1 hidden sm:block">
                      {pkt.sender.split(' ')[0]} <span className="text-slate-500 font-mono text-[10px]">&gt;</span> {pkt.receiver.split(' ')[0]}
                    </div>

                    <div className="text-[10px] text-slate-500 truncate text-right font-mono pr-2 hidden md:block">
                      hash: <span className="text-slate-400 font-semibold">{pkt.verificationHash.substring(0, 10)}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 shrink-0 font-semibold">
                      {pkt.latencyMs}ms
                    </div>

                    <div className="shrink-0 text-slate-500">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-24 text-slate-500">
                <Activity className="h-8 w-8 text-slate-800 animate-pulse mb-2" />
                <span>Stream currently empty under active filters.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Packet Inspector Drawer & Custom Event Injector console */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between select-none">
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Section 1: Selected Packet Details */}
          <div>
            <span className="text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold block border-b border-slate-800 pb-2 mb-3">
              Packet Inspector Tool
            </span>

            {selectedPacket ? (
              <div className="space-y-3 font-mono">
                {/* Packet Title metadata */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white font-bold">{selectedPacket.id}</span>
                  <span className={`px-1.5 py-0.5 text-[8.5px] rounded-sm font-bold uppercase border ${getStatusBannerColor(selectedPacket.status)}`}>
                    {selectedPacket.status}
                  </span>
                </div>

                <div className="text-[10.5px] space-y-1.5 bg-black/40 p-2.5 rounded-sm border border-slate-800 text-slate-450 font-mono">
                  <div className="flex justify-between">
                    <span>SENDER NODE:</span>
                    <span className="text-slate-300 truncate max-w-[130px]" title={selectedPacket.sender}>{selectedPacket.sender}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-1">
                    <span>RECEIVER NODE:</span>
                    <span className="text-slate-300 truncate max-w-[130px]">{selectedPacket.receiver}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-1">
                    <span>TIMESTAMP:</span>
                    <span className="text-slate-300 text-[10px]">{new Date(selectedPacket.timestamp).toISOString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-1">
                    <span>CHECKSUM:</span>
                    <span className="text-cyan-450 font-bold text-[10px]">{selectedPacket.verificationHash}</span>
                  </div>
                </div>

                {/* Micro Payload parameter snippets */}
                <div>
                  <h4 className="text-[8.5px] text-slate-550 uppercase tracking-widest mb-1 font-bold">Decrypted Body parameters</h4>
                  <pre className="text-[9px] bg-black p-2 rounded-sm border border-slate-800 overflow-x-auto text-cyan-400 max-h-[110px] leading-tight">
                    {JSON.stringify(selectedPacket.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-sm bg-black/20 border border-slate-800/60 text-slate-600 text-xs font-mono select-none">
                <Eye className="h-5 w-5 text-slate-800 mx-auto mb-2 animate-pulse" />
                Select any packet in the cascading stream to inspect its parameters live.
              </div>
            )}
          </div>

          {/* Section 2: Command/Packet Injector Form */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block mb-2 px-0.5">
              Inject custom framing
            </span>

            <div className="space-y-2 font-mono text-xs">
              {/* Spec selection in dropdown */}
              <div className="space-y-1">
                <label className="text-slate-550 text-[9px] uppercase font-bold">Payload Template Spec</label>
                <select
                  value={injSpec}
                  onChange={(e) => setInjSpec(e.target.value as SpecType)}
                  className="w-full bg-black border border-slate-800 text-slate-300 rounded-sm p-1.5 focus:outline-none focus:border-cyan-500 font-bold font-mono"
                >
                  {specsData.map(s => (
                    <option key={s.id} value={s.id}>{s.name.replace(' spec', '').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Sender node selections */}
              <div className="space-y-1">
                <label className="text-slate-550 text-[9px] uppercase font-bold">Emitter Egress Node</label>
                <select
                  value={injSender}
                  onChange={(e) => setInjSender(e.target.value)}
                  className="w-full bg-black border border-slate-800 text-slate-300 rounded-sm p-1.5 focus:outline-none focus:border-cyan-500 font-bold font-mono"
                >
                  <option value="FactPublisher Node [AEO]">FactPublisher [AEO Link]</option>
                  <option value="AgentOrchestrator [Agent + MCP]">AgentOrchestrator [Core Agent]</option>
                  <option value="SearchAnswerEngine [AEO Consumer]">SearchAnswerEngine [AI Consumer]</option>
                  <option value="AcademiaHub [EdTech Trio]">AcademiaHub [Classroom LTI]</option>
                </select>
              </div>

              {/* Status codes set */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                {(['valid', 'warning', 'invalid'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => setInjStatus(style)}
                    className={`p-1 border rounded-sm text-[9.5px] font-bold uppercase text-center transition-all ${
                      injStatus === style 
                        ? style === 'valid' ? 'bg-slate-850 border-emerald-500/80 text-emerald-400' : style === 'warning' ? 'bg-slate-850 border-amber-500/85 text-amber-400' : 'bg-slate-850 border-rose-500/85 text-rose-450'
                        : 'bg-black border-slate-850 text-slate-650 hover:text-slate-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {/* Overriding custom field parameter inputs */}
              <div className="grid grid-cols-2 gap-1 pb-1 pt-0.5">
                <input
                  type="text"
                  placeholder="key override"
                  value={injCustomFieldKey}
                  onChange={(e) => setInjCustomFieldKey(e.target.value)}
                  className="bg-black border border-slate-800 rounded-sm p-1 text-[9.5px] text-cyan-400 placeholder-slate-650 font-bold focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="override value"
                  value={injCustomFieldValue}
                  onChange={(e) => setInjCustomFieldValue(e.target.value)}
                  className="bg-black border border-slate-800 rounded-sm p-1 text-[9.5px] text-slate-350 placeholder-slate-650 font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Submit Trigger Injection */}
              <button
                onClick={handleInjectPacket}
                className="w-full bg-cyan-500 hover:bg-cyan-400 p-2 mt-1 rounded-sm text-on-accent font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all focus:outline-none active:scale-95 shadow-md shadow-cyan-500/10"
              >
                <Send className="h-3 w-3 fill-white" />
                Inject Protocol Frame
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
