/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { specsData } from '../data';
import { 
  Layers, 
  HelpCircle, 
  BookOpen, 
  Search, 
  CheckCircle, 
  Activity, 
  CornerDownRight, 
  Cpu, 
  Terminal, 
  UserCheck, 
  Play, 
  Info,
  Network
} from 'lucide-react';

interface AeoReferenceStackProps {
  onAddLog: (logText: string, spec: 'aeo', status: 'valid' | 'warning' | 'invalid') => void;
}

export default function AeoReferenceStack({ onAddLog }: AeoReferenceStackProps) {
  const [activeLayer, setActiveLayer] = useState<number>(1);
  const [simulationStep, setSimulationStep] = useState<'idle' | 'crawling' | 'indexing' | 'generating' | 'completed'>('idle');
  const [activeLogs, setActiveLogs] = useState<string[]>([
    'AEO Reference Stack initialized at Core Level 5.',
    'System ready for crawler simulation sequence.'
  ]);

  const aeoSpec = specsData.find(s => s.id === 'aeo')!;

  // 5 Layers definitions
  const layers = [
    {
      level: 1,
      title: 'Layer 1: Canonical Fact Publisher',
      subtitle: 'Authoritative site declares ed25519 registered AEO JSON metadata cards.',
      description: 'The secure source domain exposes static files under https://domain.com/.well-known/aeo-card.json. This asset declares factual claims, copyright backlink parameters, and cryptographic publisher signing keys.',
      facts: aeoSpec.samplePayload.authoritative_facts,
      metrics: '2 Facts, Signed ed25519'
    },
    {
      level: 2,
      title: 'Layer 2: Compliant LLM Crawler',
      subtitle: 'Scrapers fetch JSON metadata directly without consuming brute tokens.',
      description: 'Search engines leverage AEO declarations to enforce rate-limits and parse clean facts without hallucinations. Standard engines parse tables as native nested JSON lists rather than tokenizing into raw flat strings.',
      rules: aeoSpec.samplePayload.llm_crawler_rules,
      metrics: 'Throttled at 60 RPM, Citation Forced'
    },
    {
      level: 3,
      title: 'Layer 3: Vector Embedding & Graph Registry',
      subtitle: 'Assertions mapped into semantic knowledge bases preserving sources.',
      description: 'Integrates vector dimensions with fixed source-keys. Claims are indexed paired with their exact "fact_id" registry fields to prevent context drift and ensure backlink metadata binds to derived vector dimensions.',
      metrics: '992 Dimensions, Source Linked'
    },
    {
      level: 4,
      title: 'Layer 4: Context Aggregation & RAG Hydration',
      subtitle: 'Prompts hydrated replacing bracketed template citations with source data.',
      description: 'The Answer Engine compiles citation templates. Braces e.g. {claim_fact_01_metric} are populated dynamically with authentic facts, generating high-fidelity response snippets for user UI models.',
      metrics: 'Variable Expansion: Dynamic'
    },
    {
      level: 5,
      title: 'Layer 5: Verified Citation Generation',
      subtitle: 'Model outputs cited, structured paragraphs matching AEO guidelines.',
      description: 'The end-user receives a synthesized, clean citation card. Generative layouts pair text with highlighted annotations, guaranteeing and certifying that models didn\'t lie about publisher statistics.',
      output_text: 'According to the Kinetic Gain report, multi-node throughput speeds scale by exactly 43.1%. Verification signature registers validly on official TPM certificates.',
      metrics: '100% Attested, Backlink Secure'
    }
  ];

  const handleRunSimulation = () => {
    setSimulationStep('crawling');
    setActiveLogs([
      'INIT: Initiated pipeline simulation from root Layer 1...',
      'LAYER 1: Read canonical Fact file from metadata: https://kineticgain.org/research/quantum-scaling'
    ]);
    onAddLog('Simulation Triggered: AEO 5-layer pipeline indexing start.', 'aeo', 'valid');

    setTimeout(() => {
      setSimulationStep('indexing');
      setActiveLogs(prev => [
        ...prev,
        'LAYER 2: Compliant Crawler parsed ruleset successfully. Citation mandatory constraints evaluated.',
        'LAYER 3: Fact mapped to 992 Vector embeddings. Signature link [sig_ed25519_aeo_9983f4b8...] registered in node ledger.'
      ]);
    }, 1500);

    setTimeout(() => {
      setSimulationStep('generating');
      setActiveLogs(prev => [
        ...prev,
        'LAYER 4: Formatting context templates. Replaced template variables {claim_fact_01_metric} with "43.1% in multi-node clusters".',
        'LAYER 5: Initializing TPM verification checks. Model weights certified.'
      ]);
    }, 3200);

    setTimeout(() => {
      setSimulationStep('completed');
      setActiveLogs(prev => [
        ...prev,
        'SUCCESS: Compiled cited markdown template. Response verified 100% compliant. Backlink validated.',
        '--- END OF WORKFLOW SEQUENCE ---'
      ]);
      onAddLog('Conformity Score Verified: AEO crawler compiled certified citation output block.', 'aeo', 'valid');
    }, 4800);
  };

  const getLayerButtonClass = (lvl: number) => {
    const isSelected = activeLayer === lvl;
    if (isSelected) {
      return 'bg-indigo-950 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/10';
    }
    return 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* 5 Stack Layer display rectangle grid */}
      <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between" style={{ minHeight: '520px' }}>
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-teal-400" />
                <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wider uppercase">AEO 5-Layer Reference Stack</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">Trace the pipeline of Answer Engine Optimization metadata from source to model output</p>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simulationStep === 'crawling' || simulationStep === 'indexing' || simulationStep === 'generating'}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs rounded transition-all flex items-center gap-2 border border-emerald-500 shadow-md shadow-emerald-500/10"
            >
              <Play className="h-3 w-3 fill-white" />
              {simulationStep === 'idle' ? 'RUN CRAWL WORKFLOW' : simulationStep.toUpperCase() + '...'}
            </button>
          </div>

          {/* Interactive Stack Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch flex-1">
            
            {/* Visual stacked layers */}
            <div className="flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block px-1">
                AEO Architecture Tiers
              </span>
              
              {layers.map(layer => {
                const isCurrent = activeLayer === layer.level;
                
                return (
                  <button
                    key={layer.level}
                    onClick={() => setActiveLayer(layer.level)}
                    className={`w-full text-left p-3.5 rounded-lg border font-mono transition-all flex items-center justify-between ${getLayerButtonClass(layer.level)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold w-5 h-5 rounded flex items-center justify-center ${
                        isCurrent ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        L{layer.level}
                      </span>
                      <div className="text-left">
                        <span className="text-xs font-semibold block leading-none">{layer.title.replace('Layer ' + layer.level + ': ', '')}</span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5 block truncate max-w-[210px]">{layer.subtitle}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 border border-slate-805 px-2 py-0.5 rounded bg-slate-950/40 font-semibold hidden sm:block">
                      {layer.metrics}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Layer detailed parameters Panel */}
            <div className="bg-slate-950/50 rounded-xl border border-slate-850 p-4 flex flex-col justify-between min-h-[290px]">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block border-b border-slate-900 pb-2 mb-3">
                  Layer Specifications Detail
                </span>

                <h3 className="text-sm font-semibold text-indigo-400 font-mono">
                  {layers[activeLayer - 1].title}
                </h3>
                <p className="text-xs text-slate-300 mt-2 font-sans leading-relaxed">
                  {layers[activeLayer - 1].description}
                </p>

                {/* Specific features display inside panels depending on selected layer */}
                {activeLayer === 1 && (
                  <div className="mt-4 space-y-2 font-mono">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Asserted Facts Payload:</span>
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                      {layers[0].facts?.map((f: any) => (
                        <div key={f.fact_id} className="text-[10px] bg-slate-900 border border-slate-850 p-2 rounded text-slate-300">
                          <span className="text-indigo-400 font-semibold block">{f.fact_id.toUpperCase()}:</span>
                          {f.claim}
                          <span className="text-slate-500 block text-[9px] mt-1 italic">Ref: {f.proof_reference}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeLayer === 2 && (
                  <div className="mt-4 space-y-2 font-mono text-[10px]">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Compliant Crawler Ruleset:</span>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded text-slate-300 space-y-1">
                      <div className="flex justify-between"><span>RATE LIMIT:</span><span className="text-amber-400">{layers[1].rules?.rate_limit_rpm} RPM</span></div>
                      <div className="flex justify-between"><span>CITATION FORCED:</span><span className="text-emerald-400">TRUE</span></div>
                      <div className="flex justify-between"><span>JSON PRESERVATION:</span><span className="text-cyan-400">TRUE (TABLES SAVED)</span></div>
                    </div>
                  </div>
                )}

                {activeLayer === 5 && (
                  <div className="mt-4 space-y-1.5 font-mono text-xs">
                    <span className="text-[9px] text-emerald-400 uppercase tracking-wider block font-bold">Derived Citations Interface:</span>
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded text-emerald-400 font-sans leading-relaxed text-[11px]">
                      {layers[4].output_text}
                      <span className="text-[9px] font-mono text-slate-500 block mt-1">Verification Backlink: <span className="text-indigo-400 hover:underline cursor-pointer">https://kineticgain.org/research/quantum-scaling</span></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stack information indicator */}
              <div className="flex gap-2 text-[10px] text-slate-500 p-2 mt-4 bg-slate-950 rounded border border-slate-900 leading-normal">
                <Info className="h-4 w-4 text-slate-500 shrink-0" />
                <span>
                  The layers enforce that model weights reference static publishing claims, preventing hallucination cascades.
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Simulator logs console panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wider uppercase">Reference Stack logs</h2>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Continuous debug logs detailing crawler status, vector bindings, and citation compilation workflows during transmission tests.
            </p>
          </div>

          {/* Running logs block */}
          <div className="flex-1 bg-slate-950 p-3.5 rounded-lg border border-slate-850 font-mono text-[10px] text-slate-300 space-y-2 overflow-y-auto max-h-[290px] min-h-[220px]">
            {activeLogs.map((log, idx) => {
              let colorClasses = 'text-slate-400';
              if (log.startsWith('INIT:')) colorClasses = 'text-indigo-400 font-bold';
              else if (log.startsWith('SUCCESS:')) colorClasses = 'text-emerald-400 font-bold';
              else if (log.startsWith('LAYER 1:')) colorClasses = 'text-teal-400';
              else if (log.startsWith('LAYER 2:')) colorClasses = 'text-cyan-400';
              else if (log.startsWith('LAYER 3:')) colorClasses = 'text-purple-400';
              else if (log.startsWith('LAYER 4:')) colorClasses = 'text-blue-400';
              else if (log.startsWith('LAYER 5:')) colorClasses = 'text-pink-400';

              return (
                <div key={idx} className="leading-relaxed border-b border-slate-900/30 pb-1 flex items-start gap-1">
                  <span className="text-indigo-650 font-bold shrink-0">&gt;</span>
                  <span className={colorClasses}>{log}</span>
                </div>
              );
            })}
          </div>

          {/* Core metadata stats */}
          <div className="text-[10px] text-slate-500 border border-slate-850 bg-slate-950/40 p-2.5 rounded-lg font-mono">
            <div className="flex justify-between">
              <span>LEDGER COMPLIANCE:</span>
              <span className="text-emerald-400 font-bold">100% OK</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-1 mt-1">
              <span>TPM CERTIFICATION:</span>
              <span className="text-indigo-400 font-semibold">sig_ecdsa_p256</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
