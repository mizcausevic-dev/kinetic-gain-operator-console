/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  Terminal, 
  Layers, 
  Settings, 
  Wrench, 
  Radio, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Info, 
  Compass, 
  Activity,
  UserCheck,
  Smartphone,
  GitBranch,
  Github,
  LayoutGrid
} from 'lucide-react';

import { generateRandomPacket, specsData } from './data';
import { AuditPacket, SpecType } from './types';

// Component Imports
import TopologyDiagram from './components/TopologyDiagram';
import SpecExplorer from './components/SpecExplorer';
import AuditStream from './components/AuditStream';
import AeoReferenceStack from './components/AeoReferenceStack';
import McpServerDashboard from './components/McpServerDashboard';
import OperatorDashboard from './components/OperatorDashboard';

type TabType = 'topology' | 'specification' | 'audit_stream' | 'aeo_stack' | 'mcp_dashboard' | 'operator_dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('topology');
  const [selectedSpecId, setSelectedSpecId] = useState<SpecType>('aeo');
  
  // Real-time audit logs buffers state
  const [logs, setLogs] = useState<AuditPacket[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [activeClock, setActiveClock] = useState<string>('');

  // Diagnostic bottom-ticker string logs list
  const [diagnosticFeeds, setDiagnosticFeeds] = useState<string[]>([
    'SYSTEM INITIALIZED: Kinetic Gain Protocol Suite interactive visualizer running.',
    'LEDGER SYNC: ed25519 signature checks running on all outgoing channels.'
  ]);

  // Seed initial 12 packets so logs stream is active right away
  useEffect(() => {
    const initialPackets: AuditPacket[] = [];
    for (let i = 1; i <= 15; i++) {
      initialPackets.push(generateRandomPacket(i) as AuditPacket);
    }
    setLogs(initialPackets);

    // Dynamic UTC clock
    const updateTime = () => {
      const d = new Date();
      setActiveClock(d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Global callback logger used across modules to append system logs
  const handleAddLiveLog = (text: string, spec: SpecType, status: 'valid' | 'warning' | 'invalid') => {
    // Append to bottom running diagnostics list
    const timestamp = new Date().toLocaleTimeString();
    setDiagnosticFeeds(prev => {
      const update = [...prev, `[${timestamp}] [${spec.toUpperCase()}] ${text}`];
      if (update.length > 5) return update.slice(update.length - 5);
      return update;
    });
  };

  const getLogStatusBullet = (status: string) => {
    if (status === 'valid') return 'text-emerald-400';
    if (status === 'warning') return 'text-amber-400';
    return 'text-rose-400 font-bold';
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-300 font-mono flex flex-col justify-between selection:bg-cyan-500/20 selection:text-white select-none">
      {/* Outer subtle cyan cockpit telemetry aura */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-cyan-500/3 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Primary Wrapper Header Panel */}
      <header className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-[#090b10] shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          
          {/* Logo Brand titles */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.6)] shrink-0 animate-pulse"></div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold text-white tracking-tight uppercase">KINETIC-GAIN // PROTOCOL_SUITE</h1>
              <span className="text-[8px] px-1 py-0.2 rounded-sm bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 font-mono font-bold uppercase tracking-widest hidden sm:inline">Suite v1.4</span>
              <span
                className="text-[8px] px-1 py-0.2 rounded-sm bg-amber-950/40 border border-amber-700/40 text-amber-400 font-mono font-bold uppercase tracking-widest"
                title="A high-fidelity simulation of what the governed-AI control plane looks like. Telemetry, packet flow, node metrics, and gate decisions are synthetic, not a live feed off production."
              >
                Simulated data
              </span>
            </div>
          </div>

          {/* System Top Diagnostics metrics */}
          <div className="flex gap-4 sm:gap-6 text-[10px] font-mono leading-tight">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[8px] tracking-tight uppercase">SYSTEM_LATENCY</span>
              <span className="text-emerald-400 font-bold">12.4ms [NOMINAL]</span>
            </div>
            <div className="flex flex-col items-end border-l border-slate-800 pl-4">
              <span className="text-slate-500 text-[8px] tracking-tight uppercase">ACTIVE_NODES</span>
              <span className="text-white font-bold">1,248 / 1,250</span>
            </div>
            <div className="flex flex-col items-end border-l border-slate-800 pl-4 hidden md:flex">
              <span className="text-slate-500 text-[8px] tracking-tight uppercase">UTC CLOCK</span>
              <span className="text-cyan-450 font-bold">{activeClock || '2026-05-23 20:49:10 UTC'}</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container Core workspace panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 space-y-4">
        
        {/* Navigation Tabs bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-1.5 gap-4">
          <div className="flex flex-wrap gap-0.5">
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'topology'
                  ? 'border-b-cyan-400 text-cyan-400 bg-cyan-950/10'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              1. Topology Mesh
            </button>
            <button
              onClick={() => setActiveTab('specification')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'specification'
                  ? 'border-b-cyan-400 text-cyan-400 bg-cyan-950/10'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              2. Spec Playground
            </button>
            <button
              onClick={() => setActiveTab('audit_stream')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'audit_stream'
                  ? 'border-b-cyan-400 text-cyan-400 bg-cyan-950/10'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              3. Auditstream Spine
            </button>
            <button
              onClick={() => setActiveTab('aeo_stack')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'aeo_stack'
                  ? 'border-b-cyan-400 text-cyan-400 bg-cyan-950/10'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              4. AEO Reference Stack
            </button>
            <button
              onClick={() => setActiveTab('mcp_dashboard')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'mcp_dashboard'
                  ? 'border-b-cyan-400 text-cyan-400 bg-cyan-950/10'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              5. MCP Tool Shield
            </button>
            <button
              onClick={() => setActiveTab('operator_dashboard')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'operator_dashboard'
                  ? 'border-b-cyan-400 text-cyan-400 bg-cyan-950/10'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              6. Operator Dashboard
            </button>
          </div>

          <div className="text-[9px] text-slate-600 font-mono hidden lg:block uppercase tracking-widest">
            Operator Console Core | Security policy: <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
        </div>

        {/* Dynamic Inner Tab routing blocks */}
        <div className="z-10 relative">
          {activeTab === 'topology' && (
            <TopologyDiagram 
              onSelectSpec={(spec) => {
                setSelectedSpecId(spec);
                setActiveTab('specification');
              }}
              onAddLog={handleAddLiveLog}
            />
          )}

          {activeTab === 'specification' && (
            <SpecExplorer 
              selectedSpecId={selectedSpecId}
              onSelectSpec={setSelectedSpecId}
              onAddLog={handleAddLiveLog}
            />
          )}

          {activeTab === 'audit_stream' && (
            <AuditStream 
              logs={logs}
              setLogs={setLogs}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              onSelectSpec={(spec) => {
                setSelectedSpecId(spec);
                setActiveTab('specification');
              }}
              onAddLog={handleAddLiveLog}
            />
          )}

          {activeTab === 'aeo_stack' && (
            <AeoReferenceStack 
              onAddLog={handleAddLiveLog}
            />
          )}

          {activeTab === 'mcp_dashboard' && (
            <McpServerDashboard 
              onAddLog={handleAddLiveLog}
            />
          )}

          {activeTab === 'operator_dashboard' && (
            <OperatorDashboard 
              onAddLog={handleAddLiveLog}
            />
          )}
        </div>

      </main>

      {/* Dynamic running bottom status diagnostic ticker feeds */}
      <footer className="border-t border-slate-800 bg-black py-3 px-4 shrink-0 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          <div className="flex justify-between items-center text-[9px] text-slate-500 tracking-wider">
            <span>SYSTEM_EVENT_LOG</span>
            <span className="text-slate-700 uppercase">Console v2.4.0-stable</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            {/* Diagnostic Ticker */}
            <div className="flex-1 flex items-center gap-2 font-mono text-[10px] w-full max-w-[850px] overflow-hidden">
              <div className="px-1.5 py-0.5 bg-[#090b10] text-cyan-400 rounded-sm border border-slate-800 shrink-0 font-bold uppercase tracking-widest">
                SYS_FEEDS
              </div>
              <div className="truncate text-slate-400 flex gap-1.5 leading-none">
                {diagnosticFeeds.length > 0 ? (
                  <>
                    <span className="text-cyan-600 font-bold shrink-0">&gt;&gt;</span>
                    <span className="truncate text-slate-350">{diagnosticFeeds[diagnosticFeeds.length - 1]}</span>
                  </>
                ) : (
                  <span className="italic text-slate-600">Listening for instruction at [PORT 3000]...</span>
                )}
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-600 text-right w-full md:w-auto shrink-0 leading-none">
              KINETIC GAIN PROTOCOL OPERATOR // BUILD VERIFIED OK
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
