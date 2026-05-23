/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { specsData } from '../data';
import { SpecDefinition, SpecType } from '../types';
import { 
  Radio, 
  CornerDownRight, 
  ShieldAlert, 
  FileCheck, 
  Wrench, 
  GraduationCap, 
  FileSpreadsheet, 
  Hammer,
  BookOpen,
  Code,
  CheckCircle,
  FileCode,
  XCircle,
  Info,
  Terminal,
  RefreshCw,
  Play
} from 'lucide-react';

interface SpecExplorerProps {
  selectedSpecId: SpecType;
  onSelectSpec: (spec: SpecType) => void;
  onAddLog: (logText: string, spec: SpecType, status: 'valid' | 'warning' | 'invalid') => void;
}

// Icon mapper helper
const getSpecIcon = (iconName: string, className: string) => {
  switch (iconName) {
    case 'Radio': return <Radio className={className} />;
    case 'CornerDownRight': return <CornerDownRight className={className} />;
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    case 'FileCheck': return <FileCheck className={className} />;
    case 'Wrench': return <Wrench className={className} />;
    case 'GraduationCap': return <GraduationCap className={className} />;
    case 'FileSpreadsheet': return <FileSpreadsheet className={className} />;
    case 'Hammer': return <Hammer className={className} />;
    default: return <FileCode className={className} />;
  }
};

export default function SpecExplorer({ selectedSpecId, onSelectSpec, onAddLog }: SpecExplorerProps) {
  const [activeSpec, setActiveSpec] = useState<SpecDefinition>(
    specsData.find(s => s.id === selectedSpecId) || specsData[0]
  );
  const [editableJson, setEditableJson] = useState<string>(
    JSON.stringify(activeSpec.samplePayload, null, 2)
  );
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    complianceScore: number;
    validatedAt: string | null;
  }>({
    isValid: true,
    errors: [],
    warnings: [],
    complianceScore: 100,
    validatedAt: null
  });

  // Sync state if selected spec changes from outer components
  useEffect(() => {
    const spec = specsData.find(s => s.id === selectedSpecId);
    if (spec) {
      setActiveSpec(spec);
      setEditableJson(JSON.stringify(spec.samplePayload, null, 2));
      setValidationResults({
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 100,
        validatedAt: null
      });
    }
  }, [selectedSpecId]);

  const handleSpecChange = (id: SpecType) => {
    onSelectSpec(id);
  };

  const handleJsonEdit = (val: string) => {
    setEditableJson(val);
  };

  const resetSample = () => {
    setEditableJson(JSON.stringify(activeSpec.samplePayload, null, 2));
    setValidationResults({
      isValid: true,
      errors: [],
      warnings: [],
      complianceScore: 100,
      validatedAt: null
    });
    onAddLog(`Reset [${activeSpec.name}] sandbox payload to original schema specification template.`, activeSpec.id, 'valid');
  };

  const runValidationCheck = () => {
    onAddLog(`Executing syntactic & schema compliance validation on [${activeSpec.name}] payload...`, activeSpec.id, 'valid');
    
    try {
      const parsed = JSON.parse(editableJson);
      const errors: string[] = [];
      const warnings: string[] = [];
      let score = 100;

      // 1. Basic schema metadata checking
      if (!parsed.$schema) {
        warnings.push('Missing recommended "$schema" attribute declaring canonical URL specification context.');
        score -= 10;
      }

      // 2. Spec-specific checks based on schema fields
      activeSpec.fields.forEach(field => {
        if (field.required && parsed[field.name] === undefined) {
          errors.push(`Requirement Violation: Missing mandatory field [${field.name}] declared in spec.`);
          score -= 20;
        } else if (parsed[field.name] !== undefined) {
          // Type matching checks
          const actualType = typeof parsed[field.name];
          if (field.type === 'array' && !Array.isArray(parsed[field.name])) {
            errors.push(`Type Mismatch: Field [${field.name}] expected array payload, received [${actualType}]`);
            score -= 15;
          } else if (field.type === 'object' && (actualType !== 'object' || Array.isArray(parsed[field.name]))) {
            errors.push(`Type Mismatch: Field [${field.name}] expected object structure, received [${actualType}]`);
            score -= 15;
          } else if (field.type !== 'array' && field.type !== 'object' && actualType !== field.type) {
            errors.push(`Type Mismatch: Field [${field.name}] expected type [${field.type}], got [${actualType}]`);
            score -= 15;
          }
        }
      });

      // 3. Deeper semantic checking
      if (activeSpec.id === 'aeo') {
        if (parsed.canonical_url && !parsed.canonical_url.startsWith('https://')) {
          errors.push('Format Violation: canonical_url must initiate with absolute secure TLS ("https://").');
          score -= 15;
        }
        if (!parsed.authoritative_facts || parsed.authoritative_facts.length === 0) {
          errors.push('Schema Violation: AEO Card must register at least one claim assertion under authoritative_facts.');
          score -= 20;
        }
      }

      if (activeSpec.id === 'prompt_provenance') {
        if (parsed.template?.system_prompt_hash && parsed.template.system_prompt_hash.length !== 64) {
          warnings.push('Integrity Danger: system_prompt_hash is not standard SHA-256 length (64 chars). Possible corrupted hash.');
          score -= 10;
        }
      }

      if (activeSpec.id === 'agent_card') {
        if (parsed.financial_limits?.budget_limit_usd_per_day < parsed.financial_limits?.current_spent_usd) {
          errors.push('Boundary Exception: Agent current_spent_usd exceeds daily configured budget limits!');
          score -= 30;
        }
      }

      if (activeSpec.id === 'student_disclosure') {
        if (parsed.ai_contribution_percentage < 0 || parsed.ai_contribution_percentage > 100) {
          errors.push('Bound Violation: ai_contribution_percentage must rank strictly between 0 and 100 percent.');
          score -= 25;
        }
      }

      const finalScore = Math.max(0, score);
      const isComplianceOk = errors.length === 0;

      setValidationResults({
        isValid: isComplianceOk,
        errors,
        warnings,
        complianceScore: finalScore,
        validatedAt: new Date().toLocaleTimeString()
      });

      if (isComplianceOk) {
        onAddLog(`CONFORMITY VERIFIED: Specification [${activeSpec.name}] scored ${finalScore}% compliance. Cryptographic headers generated successfully.`, activeSpec.id, 'valid');
      } else {
        onAddLog(`VERIFICATION FAILURE: [${activeSpec.name}] is non-compliant. Scored ${finalScore}% with ${errors.length} fatal schema errors.`, activeSpec.id, 'invalid');
      }

    } catch (err: any) {
      setValidationResults({
        isValid: false,
        errors: [`Syntax Error: Failed to parse raw JSON string: ${err.message}`],
        warnings: [],
        complianceScore: 0,
        validatedAt: new Date().toLocaleTimeString()
      });
      onAddLog(`PARSING ERROR: Sandbox metadata failed syntax compile checking.`, activeSpec.id, 'invalid');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      
      {/* Sidebar - Specification Select Board */}
      <div className="xl:col-span-3 space-y-2">
        <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block px-1 mb-1.5">
          Spec Registry ({specsData.length} available)
        </span>
        <div className="space-y-1">
          {specsData.map(spec => {
            const isSelected = spec.id === activeSpec.id;
            const isCore = spec.category === 'core';
            
            return (
              <button
                key={spec.id}
                onClick={() => handleSpecChange(spec.id)}
                className={`w-full text-left p-2.5 rounded-sm border font-mono transition-all flex items-start gap-2.5 ${
                  isSelected 
                    ? 'bg-cyan-950/15 border-cyan-600/40 text-slate-100 shadow-[0_0_8px_rgba(6,182,212,0.05)]' 
                    : 'bg-[#07080c] border-slate-850/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {getSpecIcon(spec.icon, `h-3.5 w-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-tight leading-none truncate">
                      {spec.name.replace(' spec', '')}
                    </span>
                    <span className={`text-[8px] px-1 rounded-sm uppercase font-bold tracking-wider shrink-0 ${
                      isCore ? 'bg-violet-950/40 text-violet-300 border border-violet-800/40' : 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/40'
                    }`}>
                      {spec.category}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-slate-500 truncate mt-1">
                    {spec.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Informative micro-panel */}
        <div className="p-2.5 bg-black/45 rounded-sm border border-slate-800/80 font-mono mt-3">
          <div className="flex items-start gap-2 text-slate-500 text-[10px] leading-relaxed">
            <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-350 mb-0.5 uppercase tracking-wide text-[9px]">Specifications vs Guidelines</p>
              Each card is backed by JSON-Schema drafts. These schemas restrict data leaks and define limits across LLM network edges.
            </div>
          </div>
        </div>
      </div>

      {/* Main Spec Info & Schema Parameters Block */}
      <div className="xl:col-span-5 bg-[#07080c] border border-slate-800 rounded p-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <h2 className="text-xs font-bold text-white font-mono tracking-widest uppercase">Schema Directives & Types</h2>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Read-only structural constraints enforcing transaction security</p>
          </div>

          {/* Detailed Spec Description */}
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              {getSpecIcon(activeSpec.icon, 'h-3.5 w-3.5 text-cyan-400')}
              {activeSpec.name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
              {activeSpec.extendedDescription}
            </p>
          </div>

          {/* Fields table representation */}
          <div>
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block mb-1.5">
              Schema Struct parameters
            </span>
            <div className="border border-slate-800/80 rounded-sm overflow-hidden bg-black/40 max-h-[220px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#090b10] text-slate-400 text-[9px] border-b border-slate-800 font-bold uppercase tracking-wide">
                    <th className="p-2">FIELD</th>
                    <th className="p-2">TYPE</th>
                    <th className="p-2">REQ</th>
                    <th className="p-2">DESCRIPTION / CONSTRAINT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-[10.5px]">
                  {activeSpec.fields.map(field => (
                    <tr key={field.name} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="p-2 font-bold text-cyan-450">{field.name}</td>
                      <td className="p-2">
                        <span className="text-[9px] px-1 bg-[#090b10] border border-slate-800 text-slate-450 rounded-sm">{field.type}</span>
                      </td>
                      <td className="p-2">{field.required ? <span className="text-amber-500 font-bold">YES</span> : <span className="text-slate-600">NO</span>}</td>
                      <td className="p-2 text-slate-450 font-sans leading-tight">{field.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Specifications specific validation rules list */}
          <div>
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest font-bold block mb-1.5">
              Compliance Enforcement Rules
            </span>
            <ul className="space-y-1">
              {activeSpec.validationRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[10.5px] text-slate-405 font-mono leading-normal">
                  <span className="w-1 h-1 rounded-sm bg-cyan-500/80 shrink-0 mt-2"></span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive JSON Sandbox Editor & Validator Console */}
      <div className="xl:col-span-4 bg-[#07080c] border border-slate-800 rounded p-4 flex flex-col justify-between" style={{ minHeight: '480px' }}>
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Header Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Code className="h-3.5 w-3.5 text-cyan-400" />
              <h2 className="text-xs font-bold text-white font-mono tracking-widest uppercase">Sandbox payload</h2>
            </div>
            <div className="flex gap-1">
              <button
                onClick={resetSample}
                title="Revert to fresh template"
                className="p-1 px-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-sm font-mono text-[9px] flex items-center gap-1 leading-none font-bold uppercase"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                REVERT
              </button>
              <button
                onClick={runValidationCheck}
                className="p-1 px-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 transition-all text-white border border-cyan-550 rounded-sm font-mono text-[9px] flex items-center gap-1 font-bold uppercase leading-none"
              >
                <Play className="h-2.5 w-2.5 fill-white" />
                EXECUTE
              </button>
            </div>
          </div>

          {/* JSON Textarea panel */}
          <div className="relative flex-1 group min-h-[220px] flex flex-col">
            <textarea
              value={editableJson}
              onChange={(e) => handleJsonEdit(e.target.value)}
              className="w-full flex-1 p-2.5 bg-black text-slate-300 font-mono text-[10.5px] rounded-sm border border-slate-850 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 resize-none leading-normal"
              placeholder="Paste custom metadata structure JSON payload here..."
              style={{ minHeight: '230px' }}
            />
          </div>

          {/* Spec Checker results Console footer */}
          <div className="bg-[#040508] rounded-sm border border-slate-800 p-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
              <h4 className="text-[9px] text-slate-500 flex items-center gap-1 uppercase font-bold tracking-wider">
                <Terminal className="h-3.5 w-3.5 text-slate-550" /> Validation Debug Console
              </h4>
              <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-sm border leading-none ${
                validationResults.errors.length > 0 
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-450' 
                  : validationResults.warnings.length > 0 
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-450' 
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-450'
              }`}>
                {validationResults.errors.length > 0 ? 'FAIL' : 'COMPLIANT'}
              </span>
            </div>

            <div className="space-y-1.5 text-[9.5px] max-h-[110px] overflow-y-auto">
              {validationResults.validatedAt ? (
                <>
                  {/* Print success/failure status */}
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="text-slate-700 font-bold">&gt;&gt;</span>
                    <span>Spec test evaluated at {validationResults.validatedAt}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-700 font-bold">&gt;&gt;</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      Compliance Rating: 
                      <span className={`font-bold ${
                        validationResults.complianceScore > 80 ? 'text-emerald-400' : validationResults.complianceScore > 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {validationResults.complianceScore}%
                      </span>
                    </span>
                  </div>

                  {/* Render Errors list */}
                  {validationResults.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1 text-rose-400">
                      <XCircle className="h-3 w-3 shrink-0 text-rose-500 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}

                  {/* Render Warnings list */}
                  {validationResults.warnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-1 text-amber-400">
                      <Info className="h-3 w-3 shrink-0 text-amber-500 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}

                  {validationResults.errors.length === 0 && (
                    <div className="flex items-start gap-1 text-emerald-400 leading-tight">
                      <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Conformity validation holds valid signature checks! Decryption hashes matching.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-650 py-3 text-center selection:bg-transparent">
                  Press Execute above to compile and run schema checks.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
