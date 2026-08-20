/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { initialMcpTools } from '../data';
import { McpTool, SpecType } from '../types';
import { 
  Wrench, 
  Terminal, 
  Activity, 
  Layers, 
  Settings, 
  Cpu, 
  Play, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Info,
  Sliders,
  AlertTriangle
} from 'lucide-react';

interface McpServerDashboardProps {
  onAddLog: (logText: string, spec: SpecType, status: 'valid' | 'warning' | 'invalid') => void;
}

export default function McpServerDashboard({ onAddLog }: McpServerDashboardProps) {
  const [tools, setTools] = useState<McpTool[]>(initialMcpTools);
  const [selectedToolName, setSelectedToolName] = useState<string>(initialMcpTools[0].name);
  const [toolInputs, setToolInputs] = useState<Record<string, string>>({
    url: 'https://kineticgain.org',
    resolve_redirects: 'true'
  });
  const [executionLog, setExecutionLog] = useState<string[]>([
    'MCP Server booted at local VPC port IPC/3000.',
    '47 core tool schemas compiled. Registry synchronized.'
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([120, 310, 85, 450, 110, 240]);

  const activeTool = tools.find(t => t.name === selectedToolName) || tools[0];

  const handleToolSelect = (name: string) => {
    setSelectedToolName(name);
    const tool = tools.find(t => t.name === name)!;
    // Prepopulate default inputs
    const defaults: Record<string, string> = {};
    tool.inputs.forEach(inp => {
      defaults[inp.name] = inp.defaultValue || 'sample-parameter';
    });
    setToolInputs(defaults);
  };

  const handleInputChange = (key: string, val: string) => {
    setToolInputs(prev => ({ ...prev, [key]: val }));
  };

  const runMcpToolSimulation = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    
    // Set active tool status to running
    setTools(prev => prev.map(t => t.name === selectedToolName ? { ...t, status: 'running' } : t));
    
    const logsAdded = [
      `EXEC_INIT: Dispatched MCP request for function [${activeTool.name}]...`,
      `PARAMS: Verified parameters signature: ${JSON.stringify(toolInputs)}`
    ];
    setExecutionLog(prev => [...prev, ...logsAdded]);
    onAddLog(`MCP execution dispatched: [${activeTool.name}]`, 'mcp_tool_card', 'valid');

    // Simulate completion with random latency bounded by tool SLA
    const realLatency = Math.floor(Math.random() * (activeTool.latencySla - 100)) + 80;

    setTimeout(() => {
      // Revert tool status, increment counters
      setTools(prev => prev.map(t => {
        if (t.name === selectedToolName) {
          return {
            ...t,
            status: 'ready',
            executionCount: t.executionCount + 1
          };
        }
        return t;
      }));
      
      const compileOutputs = `OUTPUT: Action executed successfully. Output payload: {"status": "ok", "latency_ms": ${realLatency}, "attestation": "sha256_sig_mcp_99"}`;
      setExecutionLog(prev => [...prev, compileOutputs, '--- PROCESS CONCLUDED ---']);
      setLatencyHistory(prev => [...prev.slice(1), realLatency]);
      setIsExecuting(false);
      onAddLog(`MCP execution success: [${activeTool.name}] processed in ${realLatency}ms`, 'mcp_tool_card', 'valid');
    }, Math.min(2500, realLatency + 200));
  };

  const getStatusColor = (status: string) => {
    if (status === 'ready') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'running') return 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      
      {/* Bento listing of all MCP Tools */}
      <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between" style={{ minHeight: '520px' }}>
        <div className="flex-1 flex flex-col justify-between space-y-4">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-cyan-400 animate-pulse" />
                <h2 className="text-xs font-bold text-white font-mono tracking-widest uppercase">Simulated MCP Server Dashboard</h2>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Audit container deploying 47 specification tools securely through local VPC gates</p>
            </div>

            <div className="flex items-center gap-3.5 text-[10px] font-mono text-slate-500 bg-black px-2 py-0.5 rounded-sm border border-slate-800 font-bold">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                VPC STATUS: ONLINE
              </span>
              <span>PORT: IPC/3000</span>
            </div>
          </div>

          {/* Bento boxes Grid */}
          <div>
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block mb-2 px-0.5">
              Core Specifications Tool Registry
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {tools.map(tool => {
                const isSelected = tool.name === activeTool.name;
                
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolSelect(tool.name)}
                    className={`text-left p-2.5 rounded-sm border font-mono transition-all flex flex-col justify-between hover:bg-slate-900/60 ${
                      isSelected 
                        ? 'bg-cyan-950/15 border-cyan-600/50 text-slate-100 shadow-[0_0_8px_rgba(69,162,158,0.05)]' 
                        : 'bg-black/30 border-slate-850/80 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[11px] font-bold truncate leading-none ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {tool.name}
                        </span>
                        <span className={`px-1 rounded-sm text-[7.5px] font-bold uppercase leading-none ${getStatusColor(tool.status)}`}>
                          {tool.status}
                        </span>
                      </div>
                      <span className="text-[8.5px] font-sans text-slate-500 block mt-0.5 uppercase font-bold">{tool.category}</span>
                      <p className="text-[10px] font-sans text-slate-450 leading-relaxed mt-1.5 line-clamp-2">
                        {tool.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[8.5px] text-slate-500 border-t border-slate-850/50 pt-2 mt-2 leading-none">
                      <span className="flex items-center gap-0.5 font-bold">
                        <Clock className="h-2.5 w-2.5" /> SLA: {tool.latencySla}ms
                      </span>
                      <span className="font-bold">CALLS: {tool.executionCount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Latency historic chart monitor */}
          <div className="border border-slate-800 bg-black/40 rounded-sm p-2.5 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400 font-bold" />
              <div>
                <span className="text-white font-bold text-xs block">VPC Network Latency Analyzer</span>
                <span className="text-[9.5px] text-slate-500">Real-time dynamic execution delays mapped over preceding transactions</span>
              </div>
            </div>

            {/* Simulated mini-chart */}
            <div className="flex items-end h-7 gap-1 pl-4 pr-1.5">
              {latencyHistory.map((lat, idx) => {
                // Scale height based on latency (max SLA 1200)
                const pct = Math.min(100, Math.max(10, (lat / 1200) * 100));
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 group relative">
                    <div 
                      className={`w-3 rounded-t-sm transition-all duration-300 ${
                        lat > 600 ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ height: `${pct}%`, minHeight: '5px' }}
                    ></div>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-[8px] px-1 py-0.5 border border-slate-800 rounded opacity-0 group-hover:opacity-100 transition-all font-bold z-20 whitespace-nowrap">
                      {lat}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Inputs Tester and execution console side block */}
      <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between" style={{ minHeight: '520px' }}>
        <div className="flex-1 flex flex-col justify-between space-y-4">
          
          {/* Parameters settings header */}
          <div>
            <div className="flex items-center gap-1 pb-2.5 mb-2.5 border-b border-slate-800">
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block select-none">
                Parameter Console & Test
              </span>
            </div>

            <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 truncate">
              <Wrench className="h-3.5 w-3.5 text-cyan-400" />
              {activeTool.name}
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Test schema parameter hydration against active validations.
            </p>

            {/* Dynamically build form inputs */}
            <div className="space-y-2.5 mt-3 font-mono text-xs">
              {activeTool.inputs.map(inp => (
                <div key={inp.name} className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold">
                    <span className="text-slate-400 uppercase">{inp.name} <span className="text-cyan-400">({inp.type})</span></span>
                    <span className="text-slate-650 block truncate max-w-[120px]">{inp.desc}</span>
                  </div>
                  <input
                    type="text"
                    value={toolInputs[inp.name] || ''}
                    onChange={(e) => handleInputChange(inp.name, e.target.value)}
                    className="w-full bg-black border border-slate-800 rounded-sm p-1.5 text-[11px] font-sans text-slate-300 focus:outline-none focus:border-cyan-500/80"
                    placeholder={`e.g. ${inp.defaultValue || ''}`}
                  />
                </div>
              ))}
            </div>

            {/* Run Button trigger */}
            <button
              onClick={runMcpToolSimulation}
              disabled={isExecuting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 py-2 rounded-sm text-on-accent text-[10px] uppercase font-mono font-bold tracking-widest flex items-center justify-center gap-1.5 mt-4 shadow-lg shadow-cyan-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="h-3 w-3 fill-white" />
              {isExecuting ? 'EXECUTING MCP PORT...' : 'DEPLOY DOCK RUN'}
            </button>
          </div>

          {/* Execution details terminal */}
          <div className="flex-1 flex flex-col justify-end">
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block mb-1.5 px-0.5">
              Docker Sandbox CLI logs
            </span>
            <div className="bg-black border border-slate-800 p-2.5 rounded-sm font-mono text-[9px] leading-relaxed text-slate-400 space-y-1 max-h-[140px] overflow-y-auto min-h-[110px]">
              {executionLog.map((ln, i) => {
                let cl = 'text-slate-500';
                if (ln.startsWith('EXEC_INIT:')) cl = 'text-cyan-400 font-bold';
                else if (ln.startsWith('OUTPUT:')) cl = 'text-emerald-400 font-bold';
                else if (ln.startsWith('PARAMS:')) cl = 'text-slate-600';

                return (
                  <div key={i} className="flex gap-1 items-start border-b border-slate-900/10 pb-0.5">
                    <span className="text-slate-700 shrink-0 font-bold">&gt;</span>
                    <span className={cl}>{ln}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
