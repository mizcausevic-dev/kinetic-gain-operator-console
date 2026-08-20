/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Sliders, 
  Save, 
  Trash2, 
  Play, 
  Pause, 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  LayoutGrid, 
  Shuffle, 
  Eye, 
  ArrowRight, 
  Settings, 
  Zap, 
  Radio, 
  Wrench, 
  Terminal, 
  Clock, 
  TrendingUp, 
  AlertOctagon,
  Download,
  GripVertical,
  MoreVertical,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { SpecType } from '../types';
import { specsData } from '../data';

interface DashboardPreset {
  name: string;
  enabledWidgets: Record<string, boolean>;
  widgetOrder: string[];
  simulationSpeed: number; // 1 to 10
  channelLatencies: Record<string, number>; // channelName -> latencyMs
  layoutColumns: 'grid' | 'split' | 'vertical';
}

const DEFAULT_PRESETS: DashboardPreset[] = [
  {
    name: 'Standard SRE Overview',
    enabledWidgets: {
      flowVis: true,
      healthMatrix: true,
      complianceJitter: true,
      liveAlerts: true
    },
    widgetOrder: ['flowVis', 'healthMatrix', 'liveAlerts', 'complianceJitter'],
    simulationSpeed: 4,
    channelLatencies: {
      'pub-agent': 45,
      'agent-search': 80,
      'search-auditor': 120,
      'class-agent': 60,
      'agent-auditor': 95
    },
    layoutColumns: 'grid'
  },
  {
    name: 'High-Latency Debug Pane',
    enabledWidgets: {
      flowVis: true,
      liveAlerts: true,
      healthMatrix: true,
      complianceJitter: false
    },
    widgetOrder: ['flowVis', 'liveAlerts', 'healthMatrix', 'complianceJitter'],
    simulationSpeed: 8,
    channelLatencies: {
      'pub-agent': 480, // High latency trigger!
      'agent-search': 90,
      'search-auditor': 150,
      'class-agent': 620, // High latency trigger!
      'agent-auditor': 80
    },
    layoutColumns: 'split'
  },
  {
    name: 'Compliance Only Monitor',
    enabledWidgets: {
      flowVis: false,
      healthMatrix: true,
      complianceJitter: true,
      liveAlerts: true
    },
    widgetOrder: ['complianceJitter', 'healthMatrix', 'liveAlerts', 'flowVis'],
    simulationSpeed: 2,
    channelLatencies: {
      'pub-agent': 30,
      'agent-search': 45,
      'search-auditor': 75,
      'class-agent': 40,
      'agent-auditor': 50
    },
    layoutColumns: 'vertical'
  }
];

const getRelativeTimeStr = (triggeredAt: number): string => {
  const diffMs = Date.now() - triggeredAt;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return `${Math.max(1, diffSec)}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
};

interface OperatorDashboardProps {
  onAddLog: (text: string, spec: SpecType, status: 'valid' | 'warning' | 'invalid') => void;
}

export default function OperatorDashboard({ onAddLog }: OperatorDashboardProps) {
  // Widget structure state
  const [widgets, setWidgets] = useState<Record<string, { label: string; desc: string }>>({
    flowVis: { label: 'Kinetic Data-Flow Visualizer', desc: 'Graphical real-time network path, volume particles and latency indicators.' },
    healthMatrix: { label: 'VPC Resource Metrics Matrix', desc: 'System resources, CPU throughput scales, and hardware registers.' },
    complianceJitter: { label: 'Protocol Jitter Line Analyzer', desc: 'Simulated compliance telemetry trends per verification spec.' },
    liveAlerts: { label: 'Interactive SRE Alerts Portal', desc: 'Real-time incident streams, protocol overflows, and diagnostic controls.' }
  });

  const [enabledWidgets, setEnabledWidgets] = useState<Record<string, boolean>>({
    flowVis: true,
    healthMatrix: true,
    complianceJitter: true,
    liveAlerts: true
  });

  const [widgetOrder, setWidgetOrder] = useState<string[]>(['flowVis', 'healthMatrix', 'liveAlerts', 'complianceJitter']);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(4);
  const [channelLatencies, setChannelLatencies] = useState<Record<string, number>>({
    'pub-agent': 45,
    'agent-search': 80,
    'search-auditor': 120,
    'class-agent': 60,
    'agent-auditor': 95
  });

  const [layoutColumns, setLayoutColumns] = useState<'grid' | 'split' | 'vertical'>('grid');

  // LocalStorage layout preset states
  const [presets, setPresets] = useState<DashboardPreset[]>(DEFAULT_PRESETS);
  const [activePresetName, setActivePresetName] = useState<string>('Standard SRE Overview');
  const [customPresetName, setCustomPresetName] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Live simulation states
  const [simulatedThroughput, setSimulatedThroughput] = useState<number>(312);
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; msg: string; type: 'warning' | 'invalid'; timestamp: string; triggeredAt: number; channel?: string; observedLatency?: number; threshold?: number; acknowledged?: boolean }[]>([
    { id: 'al_01', msg: 'AEO crawling signature verification latency exceeded 200ms', type: 'warning', timestamp: '21:02:11', triggeredAt: Date.now() - 175000, channel: 'pub-agent', observedLatency: 220, threshold: 180 },
    { id: 'al_02', msg: 'Audit pipeline handshake warning in classroom sector', type: 'warning', timestamp: '21:04:14', triggeredAt: Date.now() - 320000, channel: 'class-agent', observedLatency: 195, threshold: 180 }
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [latencyThresholds, setLatencyThresholds] = useState<Record<string, number>>({
    'pub-agent': 180,
    'agent-search': 200,
    'search-auditor': 250,
    'class-agent': 180,
    'agent-auditor': 150
  });
  const [latencyHistory, setLatencyHistory] = useState<number[]>([120, 115, 140, 160, 110, 130, 240, 180, 120, 130, 110, 105, 125, 145, 135]);
  const [particleTick, setParticleTick] = useState<number>(0);
  const [activeDebugNode, setActiveDebugNode] = useState<string | null>(null);
  const [hoveredJitterIndex, setHoveredJitterIndex] = useState<number | null>(null);
  const [alertsSearchQuery, setAlertsSearchQuery] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [mutedLinks, setMutedLinks] = useState<Record<string, boolean>>({});
  const [activeDropdownAlertId, setActiveDropdownAlertId] = useState<string | null>(null);
  const [autoHideDelaySec, setAutoHideDelaySec] = useState<number>(10);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStartX, setPanStartX] = useState<number>(0);
  const [showPrediction, setShowPrediction] = useState<boolean>(true);
  const [hoveredProjectedIndex, setHoveredProjectedIndex] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('raw');

  // Load presets from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kinetic_gain_dashboard_presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DashboardPreset[];
        setPresets(parsed);
      } catch (err) {
        console.warn('Could not parse stored operator presets, using defaults', err);
      }
    }
  }, []);

  // Sync animation timer based on simulation speed
  useEffect(() => {
    const timer = setInterval(() => {
      setParticleTick(t => (t + 1) % 100);
      
      // Gradually evolve network stats & history
      setSimulatedThroughput(prev => {
        const factor = simulationSpeed * 40;
        const offset = Math.floor(Math.random() * 20) - 10;
        const next = Math.max(50, factor + offset + 120);
        return next;
      });

      // Update compliance history graph
      setLatencyHistory(prev => {
        // Compute average latency
        const avgLat = Object.keys(channelLatencies).map(k => channelLatencies[k]).reduce((a, b) => a + b, 0) / Object.keys(channelLatencies).length;
        const fuzz = Math.floor(Math.random() * 30) - 15;
        const next = Math.max(30, Math.floor(avgLat + fuzz));
        return [...prev.slice(1), next];
      });
    }, 400);

    return () => clearInterval(timer);
  }, [simulationSpeed, channelLatencies]);

  // Monitor latencies to inject alerts dynamically
  useEffect(() => {
    const alertChecks = [
      { key: 'pub-agent', label: 'Egress Publisher link', limit: latencyThresholds['pub-agent'] ?? 180 },
      { key: 'agent-search', label: 'Search Coordinator Link', limit: latencyThresholds['agent-search'] ?? 200 },
      { key: 'search-auditor', label: 'Governance auditor router', limit: latencyThresholds['search-auditor'] ?? 250 },
      { key: 'class-agent', label: 'Classroom academia vault Link', limit: latencyThresholds['class-agent'] ?? 180 }
    ];

    alertChecks.forEach(chk => {
      const lat = channelLatencies[chk.key] || 0;
      if (lat >= chk.limit && !mutedLinks[chk.key]) {
        // Check if alert already exists for this channel
        const exists = activeAlerts.find(a => a.channel === chk.key && !a.acknowledged);
        if (!exists) {
          const newAlert = {
            id: `al_${Date.now()}_${chk.key}`,
            msg: `CRITICAL DELAY: ${chk.label} registered high latency ${lat}ms (SLA is ${chk.limit}ms)`,
            type: lat > (chk.limit + 100) ? 'invalid' as const : 'warning' as const,
            timestamp: new Date().toLocaleTimeString(),
            triggeredAt: Date.now(),
            channel: chk.key,
            observedLatency: lat,
            threshold: chk.limit
          };
          setActiveAlerts(prev => [newAlert, ...prev]);
          onAddLog(`Latency Degradation alert for ${chk.key} triggered at ${lat}ms`, 'prompt_provenance', lat > (chk.limit + 100) ? 'invalid' : 'warning');
        }
      }
    });
  }, [channelLatencies, latencyThresholds, activeAlerts, mutedLinks]);

  // Handle Preset Loading
  const handleLoadPreset = (presetName: string) => {
    const target = presets.find(p => p.name === presetName);
    if (target) {
      setActivePresetName(presetName);
      setEnabledWidgets(target.enabledWidgets);
      
      // Sanity check order to support new widgets if added
      const safeOrder = target.widgetOrder.filter(id => widgets[id]);
      Object.keys(widgets).forEach(id => {
        if (!safeOrder.includes(id)) safeOrder.push(id);
      });
      setWidgetOrder(safeOrder);
      
      setSimulationSpeed(target.simulationSpeed);
      setChannelLatencies(target.channelLatencies);
      setLayoutColumns(target.layoutColumns);
      
      setSaveSuccessMsg(`LOADED: "${presetName}" dashboard layout and simulation constants.`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      onAddLog(`Operator loaded preset "${presetName}"`, 'aeo', 'valid');
    }
  };

  // Handle Preset Saving
  const handleSavePreset = (e: FormEvent) => {
    e.preventDefault();
    const nameToSave = customPresetName.trim();
    if (!nameToSave) return;

    const newPreset: DashboardPreset = {
      name: nameToSave,
      enabledWidgets,
      widgetOrder,
      simulationSpeed,
      channelLatencies,
      layoutColumns
    };

    // Remove existing if has same name, then append
    const updated = presets.filter(p => p.name !== nameToSave);
    const finalPresets = [...updated, newPreset];
    
    setPresets(finalPresets);
    localStorage.setItem('kinetic_gain_dashboard_presets', JSON.stringify(finalPresets));
    setActivePresetName(nameToSave);
    setCustomPresetName('');
    
    setSaveSuccessMsg(`SUCCESS: Dashboard preset "${nameToSave}" persisted in workspace storage.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
    onAddLog(`Operator saved custom layout preset "${nameToSave}"`, 'aeo', 'valid');
  };

  // Clean custom presets back to defaults
  const handleWipePresets = () => {
    setPresets(DEFAULT_PRESETS);
    localStorage.removeItem('kinetic_gain_dashboard_presets');
    handleLoadPreset('Standard SRE Overview');
    
    setSaveSuccessMsg('REVERTED: Presets restored to enterprise factory defaults.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
    onAddLog('Reverted dashboard workspace metrics to default layout template.', 'aeo', 'warning');
  };

  // Move widget layout up/down
  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const idx = widgetOrder.indexOf(id);
    if (idx < 0) return;
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= widgetOrder.length) return;

    const orderCopy = [...widgetOrder];
    const item = orderCopy[idx];
    orderCopy.splice(idx, 1);
    orderCopy.splice(nextIdx, 0, item);
    setWidgetOrder(orderCopy);
  };

  // Export Latency History as JSON file
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: "Protocol Jitter Line Analyzer",
      history: latencyHistory,
      average: Math.floor(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length),
    }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `protocol-jitter-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    onAddLog(`Exported latency history JSON frame containing ${latencyHistory.length} delay datapoints.`, 'aeo', 'valid');
  };

  // Dismiss alert
  const acknowledgeAlert = (id: string) => {
    setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true, resolvedAt: Date.now() } : a));
    onAddLog('Alert cleared by operator SRE action.', 'prompt_provenance', 'valid');
  };

  const handleCopyAlert = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      onAddLog(`Copied alert register coordinates to SRE clipboard`, 'prompt_provenance', 'valid');
      setTimeout(() => setCopiedId(null), 1550);
    }).catch((err) => {
      console.error('Error writing to clipboard:', err);
    });
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    setActiveAlerts(prev => prev.map(a => a.acknowledged ? a : { ...a, acknowledged: true, resolvedAt: Date.now() }));
    onAddLog('Operator wiped active incident queues.', 'prompt_provenance', 'valid');
  };

  // Linear projection solver
  const getProjection = (history: number[]): number[] => {
    const subset = history.slice(-5);
    if (subset.length < 2) return Array(5).fill(history[history.length - 1] || 100);
    
    const n = subset.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += subset[i];
      sumXY += i * subset[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const projection: number[] = [];
    for (let step = 1; step <= 5; step++) {
      const val = intercept + slope * (n - 1 + step);
      projection.push(Math.max(20, Math.min(800, Math.round(val))));
    }
    return projection;
  };

  // Simple Moving Average Filter
  const movingAverage = (data: number[], windowSize: number): number[] => {
    const result: number[] = [];
    const half = Math.floor(windowSize / 2);
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      for (let w = -half; w <= half; w++) {
        const idx = i + w;
        if (idx >= 0 && idx < data.length) {
          sum += data[idx];
          count++;
        }
      }
      result.push(Math.round(sum / count));
    }
    return result;
  };

  // Savitzky-Golay (5-point quadratic smoothing filter coefficients)
  const savitzkyGolay5 = (data: number[]): number[] => {
    if (data.length < 5) return data;
    const result: number[] = [...data];
    // Apply smoothing weights internally
    for (let i = 2; i < data.length - 2; i++) {
      const raw = (-3 * data[i-2] + 12 * data[i-1] + 17 * data[i] + 12 * data[i+1] - 3 * data[i+2]) / 35;
      result[i] = Math.max(20, Math.min(800, Math.round(raw)));
    }
    // Handle boundaries nicely with simple 3-point moving average
    for (let i = 0; i < 2; i++) {
      result[i] = Math.round((data[i] + data[i+1] + data[i+2]) / 3);
    }
    for (let i = data.length - 2; i < data.length; i++) {
      result[i] = Math.round((data[i] + data[i-1] + data[i-2]) / 3);
    }
    return result;
  };

  // Routing helper to compute and return filtered latency data
  const getFilteredData = (data: number[]): number[] => {
    if (filterType === 'ma3') {
      return movingAverage(data, 3);
    } else if (filterType === 'ma5') {
      return movingAverage(data, 5);
    } else if (filterType === 'sg5') {
      return savitzkyGolay5(data);
    }
    return data;
  };

  // Generate and Download PDF Report
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Page canvas background fill style
    doc.setFillColor(11, 12, 16); // very dark midnight bg matching app theme
    doc.rect(0, 0, 210, 297, "F");
    
    // Header box outline and styling accents
    doc.setDrawColor(102, 252, 241); // cyan 400
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 42);
    
    doc.setFillColor(102, 252, 241);
    doc.rect(10, 10, 190, 4, "F");
    
    doc.setTextColor(234, 246, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KINETIC-GAIN OPERATOR TELEMETRY", 16, 23);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(153, 163, 173); // slate 500
    doc.text("SYSTEM JITTER METRIC STATUS REPORT // SIMULATED DEMONSTRATION DATA, NOT LIVE", 16, 29);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(220, 228, 231); // slate 200
    doc.text(`REPORTING TIME: ${new Date().toLocaleString()}`, 16, 38);
    doc.text(`SRE WORKSPACE TARGET: DOCKER CONTAINER CONTAINER-PORT: 3000`, 16, 44);
    
    // Section divider lines
    doc.setDrawColor(43, 58, 70); // slate 800
    doc.setLineWidth(0.5);
    doc.line(10, 62, 200, 62);
    
    // Section header and key measurements
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(102, 252, 241);
    doc.text("SLA DEVIATION PERFORMANCE METRICS SUMMARY (ROLLING)", 14, 72);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(234, 246, 245);
    
    const avg = Math.floor(latencyHistory.reduce((a,b)=>a+b,0)/latencyHistory.length);
    const max = Math.max(...latencyHistory);
    const min = Math.min(...latencyHistory);
    const thresh = latencyThresholds['pub-agent'] ?? 180;
    const breachPercentage = Math.floor((latencyHistory.filter(v => v > thresh).length / latencyHistory.length) * 100);
    
    let metricY = 84;
    const drawStat = (label: string, value: string, desc: string) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(173, 183, 191); // slate 400
      doc.text(`${label}:`, 16, metricY);
      doc.setTextColor(234, 246, 245);
      doc.text(value, 72, metricY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(153, 163, 173);
      doc.text(`(${desc})`, 112, metricY);
      doc.setFontSize(10);
      metricY += 10;
    };
    
    drawStat("AVERAGE TRANSIT DELAY", `${avg} ms`, "Compliance limit baseline is 180ms");
    drawStat("HIGHEST PEAK RECORDED", `${max} ms`, "Maximum jitter spike overhead in rolling view");
    drawStat("OPTIMAL NOMINAL TRANSIT", `${min} ms`, "Best performance speed observed in the logs");
    drawStat("CRITICAL SLA OVERRUNS", `${breachPercentage}%`, "Fraction of time intervals exceeding limits");
    drawStat("ALARM GATE STATUS", avg > thresh ? "THRESHOLD EXCEEDED (SIMULATED)" : "NOMINAL (SIMULATED)", "Automatic SRE status classification");
    
    // Mid Divider
    doc.setLineWidth(0.5);
    doc.setDrawColor(43, 58, 70);
    doc.line(10, 142, 200, 142);
    
    // Performance Line Chart header inside PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(102, 252, 241);
    doc.text("ROLLING LATENCY JITTER HISTOGRAM WAVEFORM", 14, 154);
    
    doc.setLineWidth(0.3);
    doc.setDrawColor(95, 106, 117);
    doc.rect(14, 162, 182, 60);
    
    // Draw gridlines in pdf
    for (let i = 1; i <= 3; i++) {
      const gy = 162 + (i * 15);
      doc.line(14, gy, 196, gy);
    }
    
    // Plot variables
    const chartX = 14;
    const chartY = 162;
    const chartW = 182;
    const chartH = 60;
    const maxScale = 400;
    const numPts = latencyHistory.length;
    
    // Plot historical data path lines
    const pts = latencyHistory.map((val, idx) => {
      const px = chartX + (idx / (numPts - 1)) * chartW;
      const py = (chartY + chartH) - (Math.min(val, maxScale) / maxScale) * chartH;
      return { x: px, y: py };
    });
    
    doc.setLineWidth(0.8);
    doc.setDrawColor(69, 162, 158); // cyan line
    for (let i = 0; i < pts.length - 1; i++) {
      doc.line(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    }
    
    // Plot predicted values extension in PDF as standard compliance
    const predictions = getProjection(latencyHistory);
    const predPts = predictions.map((val, idx) => {
      const step = idx + 1;
      const px = chartX + ((numPts - 1 + step) / (numPts - 1 + 5)) * chartW; // scale accounting for future indices
      const py = (chartY + chartH) - (Math.min(val, maxScale) / maxScale) * chartH;
      return { x: px, y: py };
    });
    
    // Adjust historical scaling on x-axis if printing both history and prediction mapped relative together
    // Let's print predicting lines in beautiful dotted/dashed style
    doc.setLineWidth(0.5);
    doc.setDrawColor(168, 85, 247); // purple prediction
    
    // Connect original last point to first prediction
    const lastHistPt = pts[pts.length - 1];
    
    // Map points with prediction scale to fit cleanly side-by-side
    const combinedPts = [
      ...latencyHistory.map((val, idx) => {
        const px = chartX + (idx / (numPts + 4)) * chartW;
        const py = (chartY + chartH) - (Math.min(val, maxScale) / maxScale) * chartH;
        return { x: px, y: py, isPred: false };
      }),
      ...predictions.map((val, idx) => {
        const px = chartX + ((numPts + idx) / (numPts + 4)) * chartW;
        const py = (chartY + chartH) - (Math.min(val, maxScale) / maxScale) * chartH;
        return { x: px, y: py, isPred: true };
      })
    ];
    
    // Draw combined path
    for (let i = 0; i < combinedPts.length - 1; i++) {
      if (combinedPts[i+1].isPred) {
        doc.setDrawColor(168, 85, 247); // violet
        doc.setLineWidth(0.5);
      } else {
        doc.setDrawColor(69, 162, 158); // cyan
        doc.setLineWidth(0.8);
      }
      doc.line(combinedPts[i].x, combinedPts[i].y, combinedPts[i+1].x, combinedPts[i+1].y);
    }
    
    // Draw threshold baseline in red
    doc.setDrawColor(242, 73, 92); // rose
    doc.setLineWidth(0.4);
    const baselineHeight = (chartY + chartH) - (thresh / maxScale) * chartH;
    doc.line(chartX, baselineHeight, chartX + chartW, baselineHeight);
    
    doc.setTextColor(242, 73, 92);
    doc.setFontSize(8);
    doc.text("SLA THRESHOLD BASELINE LIMIT", chartX + 3, baselineHeight - 2);
    
    // Print nodes circles
    combinedPts.forEach((pt) => {
      if (pt.isPred) {
        doc.setFillColor(168, 85, 247); // violet dot
        doc.circle(pt.x, pt.y, 1.0, "F");
      } else {
        doc.setFillColor(69, 162, 158); // cyan dot
        doc.circle(pt.x, pt.y, 1.2, "F");
      }
    });
    
    // Legends
    doc.setFillColor(69, 162, 158);
    doc.rect(14, 226, 4, 2, "F");
    doc.setTextColor(234, 246, 245);
    doc.setFontSize(8);
    doc.text("HISTORICAL OBSERVATION PATH (CYAN)", 20, 228);
    
    doc.setFillColor(168, 85, 247);
    doc.rect(94, 226, 4, 2, "F");
    doc.text("SRE TREND PROJECTION FORECAST (VIOLET)", 100, 228);
    
    // Footer notes
    doc.setTextColor(140, 152, 162);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("SIMULATED DATA FOR DEMONSTRATION. NOT A LIVE FEED OFF PRODUCTION -- SEE README \"HONEST FRAMING\".", 14, 275);
    doc.text("Kinetic Gain Operator Console v0.2 -- github.com/mizcausevic-dev/kinetic-gain-operator-console", 14, 281);

    doc.save(`kinetic-gain-console-demo-export-${Date.now()}.pdf`);
    onAddLog("Exported simulated demo PDF matching the active jitter waveform view.", "aeo", "valid");
  };

  // Stress-test manual burst
  const triggerManualBurst = () => {
    setSimulationSpeed(10);
    setChannelLatencies(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        copy[k] = Math.min(950, copy[k] * 2.8);
      });
      return copy;
    });
    
    setSaveSuccessMsg('STRESS BURST: VPC traffic queues flooded. Dynamic SLA alarms triggered.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
    onAddLog('Simulated high capacity DOS flood. Monitoring automatic compliance throttles.', 'mcp_tool_card', 'invalid');
  };

  // Reset metrics
  const resetAllChannels = () => {
    setChannelLatencies({
      'pub-agent': 45,
      'agent-search': 80,
      'search-auditor': 120,
      'class-agent': 60,
      'agent-auditor': 95
    });
    setSimulationSpeed(4);
    setActiveAlerts([]);
    
    setSaveSuccessMsg('HEALTHY: Latencies throttled down. Multi-node VPC channels synced.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
    onAddLog('Forced reset of network registers. Synced latency SLAs back to zero baseline.', 'aeo', 'valid');
  };

  // Get layout class
  const getLayoutClasses = () => {
    if (layoutColumns === 'split') return 'grid grid-cols-1 lg:grid-cols-12 gap-4';
    if (layoutColumns === 'vertical') return 'flex flex-col gap-4';
    return 'grid grid-cols-1 md:grid-cols-2 gap-4';
  };

  const getWidgetColSpan = (id: string) => {
    if (layoutColumns !== 'split') return '';
    if (id === 'flowVis') return 'lg:col-span-8';
    if (id === 'healthMatrix') return 'lg:col-span-4';
    if (id === 'liveAlerts') return 'lg:col-span-5';
    if (id === 'complianceJitter') return 'lg:col-span-7';
    return '';
  };

  // Connections mapping coordinates for animated data-flow diagram points
  // 5 modular nodes:
  // Node 1: Publisher (AEO Provider)
  // Node 2: AgentOrchestrator (Core Router)
  // Node 3: SearchAnswerEngine (Consumer)
  // Node 4: Governance-Shield (Auditor Verification)
  // Node 5: Classroom Hub (EdTech Coordinator)
  const nodePositions = {
    publisher: { x: 140, y: 70 },
    agent: { x: 380, y: 150 },
    search: { x: 620, y: 70 },
    auditor: { x: 500, y: 280 },
    classroom: { x: 200, y: 260 }
  };

  return (
    <div className="space-y-4">
      
      {/* Dynamic SRE Dashboard Preset Administration Board */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 select-none">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-cyan-400 animate-pulse" />
            <h2 className="text-xs font-bold text-white font-mono tracking-widest uppercase">Operator Layout Configurator</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Customize widget inclusions, drag/order hierarchy panels, and save runtime profiles dynamically.
          </p>
        </div>

        {/* Layout action bars */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Preset Selector dropdown */}
          <div className="flex items-center gap-1.5 bg-black border border-slate-800 px-2 py-1 rounded-sm">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">Profile:</span>
            <select
              value={activePresetName}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="bg-transparent text-slate-300 text-[10px] font-bold focus:outline-none focus:ring-0 border-0 cursor-pointer py-0 pr-6 pl-1 font-mono uppercase"
            >
              {presets.map(p => (
                <option key={p.name} value={p.name} className="bg-black text-slate-300">{p.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Form to save new preset */}
          <form onSubmit={handleSavePreset} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="SAVE NEW LAYOUT NAME..."
              value={customPresetName}
              onChange={(e) => setCustomPresetName(e.target.value)}
              className="bg-black border border-slate-800 text-slate-300 rounded-sm text-[10px] px-2 py-1 focus:outline-none focus:border-cyan-500/80 uppercase font-mono tracking-wider font-bold w-[180px]"
            />
            <button
              type="submit"
              disabled={!customPresetName.trim()}
              className="p-1 px-2.5 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 hover:text-white rounded-sm text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Commit active widgets config to LocalStorage"
            >
              <Save className="h-2.5 w-2.5" />
              SAVE
            </button>
          </form>

          {/* Reset factory default presets */}
          <button
            onClick={handleWipePresets}
            className="p-1 px-2 bg-black hover:bg-slate-900 border border-slate-850 text-slate-500 hover:text-rose-450 rounded-sm text-[9px] font-mono transition-colors uppercase font-bold"
            title="Reset preset registry back to factory default"
          >
            RESTORE SYSTEM TEMPLATE
          </button>
        </div>
      </div>

      {/* Preset Action Feedback Toasts and Status indicators */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-2.5 bg-cyan-950/25 border border-cyan-800 text-cyan-400 text-[10px] font-mono rounded-sm flex items-center justify-between shadow-[0_0_12px_rgba(69,162,158,0.1)]"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 animate-ping rounded-full inline-block"></span>
              <span>{saveSuccessMsg}</span>
            </div>
            <button onClick={() => setSaveSuccessMsg('')} className="hover:text-white uppercase font-bold tracking-widest text-[8px]">DISMISS</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid containing operator settings on side + layout panel outputs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        {/* Sidebar Options Panel: Toggle widgets & layouts */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded p-4 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Widget Toggles Block */}
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block mb-2 px-0.5">
                Widget Selection Toggle
              </span>
              <div className="space-y-1.5">
                {Object.keys(widgets).map(id => (
                  <label 
                    key={id} 
                    className={`flex items-start gap-2.5 p-2 rounded-sm border cursor-pointer select-none transition-all ${
                      enabledWidgets[id] 
                        ? 'bg-cyan-950/10 border-cyan-900/60 text-slate-200' 
                        : 'bg-black/20 border-slate-900 text-slate-600 hover:text-slate-500'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={enabledWidgets[id]} 
                      onChange={() => setEnabledWidgets(prev => ({ ...prev, [id]: !prev[id] }))}
                      className="mt-1 accent-cyan-500 rounded-sm h-3 w-3 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold tracking-wide uppercase leading-none truncate">{widgets[id].label}</p>
                      <p className="text-[9px] text-slate-500 mt-1 leading-snug font-sans">{widgets[id].desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Layout Columns Grid Structure presets selectors */}
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block mb-2 px-0.5">
                Layout Arrangement Structure
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'grid', label: 'BENTO GRID' },
                  { id: 'split', label: 'SRE SPLIT' },
                  { id: 'vertical', label: 'STACK FLOW' }
                ].map(struct => (
                  <button
                    key={struct.id}
                    onClick={() => setLayoutColumns(struct.id as any)}
                    className={`p-1.5 border rounded-sm text-[8px] font-bold text-center uppercase tracking-wide transition-all cursor-pointer ${
                      layoutColumns === struct.id
                        ? 'bg-cyan-950/35 border-cyan-600 text-cyan-400 font-extrabold'
                        : 'bg-black border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-900'
                    }`}
                  >
                    {struct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation speed Slider Control */}
            <div>
              <div className="flex justify-between items-center mb-1 px-0.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
                  Simulation Speed Throttle
                </span>
                <span className="text-[10px] text-cyan-400 font-bold font-mono">{simulationSpeed * 10}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={simulationSpeed} 
                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-black rounded"
              />
              <div className="flex justify-between text-[8px] text-slate-600 font-mono mt-1">
                <span>10% (QUIET FLOW)</span>
                <span>100% (STRESS TEST)</span>
              </div>
            </div>

            {/* Latency Channel Micro Sliders */}
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block mb-2 px-0.5">
                Sector Channel Latencies (ms)
              </span>
              <div className="space-y-2 bg-black/45 p-2 rounded-sm border border-slate-850">
                {[
                  { key: 'pub-agent', label: 'PUBLISHER → AGENT', limit: latencyThresholds['pub-agent'] ?? 180 },
                  { key: 'agent-search', label: 'AGENT → ANSWER', limit: latencyThresholds['agent-search'] ?? 200 },
                  { key: 'search-auditor', label: 'ANSWER → AUDITOR', limit: latencyThresholds['search-auditor'] ?? 250 },
                  { key: 'class-agent', label: 'CLASSROOM → AGENT', limit: latencyThresholds['class-agent'] ?? 180 }
                ].map(chn => {
                  const val = channelLatencies[chn.key] || 0;
                  const isDegraded = val >= chn.limit;
                  return (
                    <div key={chn.key} className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] font-mono">
                        <span className="text-slate-400">{chn.label}</span>
                        <span className={`font-bold ${isDegraded ? 'text-rose-450 animate-pulse' : 'text-slate-500'}`}>
                          {val}ms {isDegraded ? '⚠️ SLA!' : ''}
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="20" 
                        max="800" 
                        value={val} 
                        onChange={(e) => setChannelLatencies(prev => ({ ...prev, [chn.key]: Number(e.target.value) }))}
                        className={`w-full h-1 cursor-pointer bg-slate-900 rounded ${isDegraded ? 'accent-rose-500' : 'accent-cyan-500'}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Quick diagnostic execution console triggers */}
          <div className="pt-3 border-t border-slate-850 space-y-1.5">
            <button
              onClick={triggerManualBurst}
              className="w-full bg-rose-950/40 hover:bg-rose-900/30 border border-rose-800 text-rose-400 hover:text-white p-1.5 rounded-sm font-mono font-bold text-[9px] tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="h-3 w-3 fill-rose-500" />
              FORCE PACKET FLOOD
            </button>
            <button
              onClick={resetAllChannels}
              className="w-full bg-cyan-950/30 hover:bg-cyan-900/30 border border-cyan-800 text-cyan-400 hover:text-white p-1.5 rounded-sm font-mono font-bold text-[9px] tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              SYNC NOMINAL SLAS
            </button>
          </div>

        </div>

        {/* Customizable drag and drop/order layout display board */}
        <div className="xl:col-span-9 flex flex-col space-y-4">
          
          {/* Loop over widgetOrder and render if enabledWidgets[id] */}
          <div className={getLayoutClasses()}>
            {widgetOrder.filter(id => enabledWidgets[id]).map((id) => {
              
              {/* RENDER COMPONENT WIDGET A: Data Flow Visualizer */}
              if (id === 'flowVis') {
                return (
                  <div 
                    key={id} 
                    className={`${getWidgetColSpan(id)} bg-slate-900 border rounded p-4 flex flex-col justify-between transition-all duration-200 ${
                      draggingId === id ? 'opacity-30 border-dashed border-cyan-500 scale-[0.98]' : dragOverId === id ? 'border-cyan-500 bg-cyan-950/5' : 'border-slate-800'
                    }`}
                    style={{ minHeight: '380px' }}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId !== id) {
                        setDragOverId(id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === id) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
                      setDragOverId(null);
                      setDraggingId(null);
                      if (!sourceId || sourceId === id) return;
                      
                      const sourceIdx = widgetOrder.indexOf(sourceId);
                      const targetIdx = widgetOrder.indexOf(id);
                      if (sourceIdx < 0 || targetIdx < 0) return;

                      const updatedOrder = [...widgetOrder];
                      updatedOrder.splice(sourceIdx, 1);
                      updatedOrder.splice(targetIdx, 0, sourceId);
                      setWidgetOrder(updatedOrder);

                      const widgetNames: Record<string, string> = {
                        flowVis: 'Kinetic Data-Flow',
                        healthMatrix: 'SRE Diagnostics Matrix',
                        liveAlerts: 'SRE Interactive Incident Portal',
                        complianceJitter: 'Protocol Jitter Line Analyzer'
                      };
                      onAddLog(`Reordered dashboard widgets: moved [${widgetNames[sourceId] || sourceId}] to position ${targetIdx + 1}.`, 'aeo', 'valid');
                    }}
                  >
                    {/* Header bar controls */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3 select-none">
                      <div className="flex items-center gap-1.5">
                        <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 p-0.5 flex items-center justify-center rounded hover:bg-slate-900 transition-colors" title="Drag to rearrange widget">
                          <GripVertical className="h-4 w-4 shrink-0" />
                        </div>
                        <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse font-bold" />
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            Kinetic Data-Flow Visualizer
                          </h3>
                        </div>
                      </div>
                      
                      {/* Visual indicator handle message */}
                      <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-widest hidden sm:inline">
                        DRAG TO REARRANGE
                      </span>
                    </div>

                    {/* Operational overview metadata stats strip */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-black rounded border border-slate-850/80 mb-3 text-[9px] font-mono leading-relaxed">
                      <div>
                        <span className="text-slate-500 block">TOTAL THROUGHPUT</span>
                        <span className="font-bold text-emerald-400">{simulatedThroughput} KB/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ANIMATED PACKET DENSITY</span>
                        <span className="font-bold text-cyan-400">{simulationSpeed * 12} active particles</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">OUTGOING SYSTEM JITTER</span>
                        <span className={`font-bold ${Object.keys(channelLatencies).map(k => channelLatencies[k]).some((l: number) => l > 300) ? 'text-amber-500' : 'text-slate-400'}`}>
                          {Math.max(...Object.keys(channelLatencies).map(k => channelLatencies[k]))}ms Max
                        </span>
                      </div>
                    </div>

                    {/* Interactive Interactive SVG Flow Graph Arena */}
                    <div className="flex-1 bg-black/65 rounded border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-[220px]">
                      {/* Technical sector markings grid bounds overlay */}
                      <div className="absolute inset-0 bg-[radial-gradient(#2B3A46_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>

                      <svg width="100%" height="240" viewBox="0 0 760 310" className="z-10 select-none">
                        
                        {/* Define glowing cyan marker arrows */}
                        <defs>
                          <marker id="arrow" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#45A29E" opacity="0.65" />
                          </marker>
                          <marker id="arrow-warn" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#E0A43A" />
                          </marker>
                          <marker id="arrow-error" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#F2495C" className="animate-pulse" />
                          </marker>
                        </defs>

                        {/* RENDER NETWORK LINK CONNECTIONS WITH PARTICLE DOTS */}
                        {[
                          { key: 'pub-agent', from: 'publisher', to: 'agent', label: 'AEO Card Flow' },
                          { key: 'agent-search', from: 'agent', to: 'search', label: 'Prov Claims' },
                          { key: 'search-auditor', from: 'search', to: 'auditor', label: 'AI Attests' },
                          { key: 'class-agent', from: 'classroom', to: 'agent', label: 'AUP Sync' },
                          { key: 'agent-auditor', from: 'agent', to: 'auditor', label: 'Audits' }
                        ].map((chk) => {
                          const pStart = nodePositions[chk.from as keyof typeof nodePositions];
                          const pEnd = nodePositions[chk.to as keyof typeof nodePositions];
                          const lat = channelLatencies[chk.key] || 50;
                          
                          // Styling classes based on latency point SLA levels
                          let pathColor = 'stroke-cyan-500/35';
                          let markerStr = 'url(#arrow)';
                          let isSlaAlert = false;
                          let isCritical = false;

                          const limit = latencyThresholds[chk.key] ?? 180;

                          if (lat >= limit) {
                            pathColor = 'stroke-amber-500/70';
                            markerStr = 'url(#arrow-warn)';
                            isSlaAlert = true;
                          }
                          if (lat >= (limit + 100)) {
                            pathColor = 'stroke-rose-500/85';
                            markerStr = 'url(#arrow-error)';
                            isCritical = true;
                          }

                          // Calculate dynamic moving particle position offset along SVG path line for animations
                          const particleRatio = ((particleTick * (simulationSpeed * 0.4)) % 100) / 100;
                          const px = pStart.x + (pEnd.x - pStart.x) * particleRatio;
                          const py = pStart.y + (pEnd.y - pStart.y) * particleRatio;

                          return (
                            <g key={chk.key} className="cursor-pointer group">
                              {/* Overlay thick hidden bridge path for easier hovering click target */}
                              <line 
                                x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y}
                                stroke="transparent" strokeWidth="14"
                                className="pointer-events-auto"
                                onClick={() => {
                                  setActiveDebugNode(`Sector link: ${chk.label} (Current latency ${lat}ms)`);
                                  onAddLog(`Inspected network tunnel ${chk.label}. Latency coordinates: ${lat}ms`, 'mcp_tool_card', isCritical ? 'invalid' : isSlaAlert ? 'warning' : 'valid');
                                }}
                              />

                              {/* Visible connector line */}
                              <line 
                                x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y}
                                className={`transition-all ${pathColor}`}
                                strokeWidth={isCritical ? '2.5' : '1.5'}
                                strokeDasharray={isCritical ? 'none' : '4, 4'}
                                markerEnd={markerStr}
                              />

                              {/* Animated Data Packets Flowing particles along vector paths */}
                              <circle 
                                cx={px} cy={py} 
                                r={isCritical ? '3.5' : '2.5'} 
                                fill={isCritical ? '#F2495C' : isSlaAlert ? '#E0A43A' : '#66FCF1'}
                                className={`${isCritical ? 'animate-ping' : ''}`}
                                opacity="0.9"
                              />

                              {/* Label hover flag */}
                              <text 
                                x={(pStart.x + pEnd.x) / 2} y={(pStart.y + pEnd.y) / 2 - 6}
                                textAnchor="middle" 
                                className="text-[7.5px] fill-slate-500 font-mono tracking-tight font-bold opacity-30 group-hover:opacity-100 transition-opacity bg-black pointer-events-none"
                              >
                                {chk.label.toUpperCase()} ({lat}ms)
                              </text>
                            </g>
                          );
                        })}

                        {/* RENDER NETWORK NODES AS COLORFUL DETAILED RECTANGLES */}
                        {[
                          { key: 'publisher', label: 'FactPublisher', sub: 'AEO EDGE', icon: Radio, code: 'VPC_SEC_01', type: 'publisher' },
                          { key: 'agent', label: 'AgentOrchestrator', sub: 'CORE MCP', icon: Wrench, code: 'VPC_CTR_02', type: 'agent' },
                          { key: 'search', label: 'SearchEngine', sub: 'AEO CONSUMER', icon: Eye, code: 'VPC_SEC_03', type: 'search' },
                          { key: 'auditor', label: 'Governance auditor', sub: 'SHIELD VAULT', icon: Terminal, code: 'VPC_AUD_04', type: 'auditor' },
                          { key: 'classroom', label: 'AcademiaHub', sub: 'EDTECH TRIO', icon: Info, code: 'VPC_EDU_05', type: 'classroom' }
                        ].map((nodeObj) => {
                          const pos = nodePositions[nodeObj.key as keyof typeof nodePositions];
                          const isActiveDebug = activeDebugNode?.includes(nodeObj.label);

                          // Gauge if any linking channel connected to this node is degraded
                          let isLinkDegraded = false;
                          let isLinkCritical = false;

                          if (nodeObj.key === 'publisher' && (channelLatencies['pub-agent'] >= (latencyThresholds['pub-agent'] ?? 180))) isLinkDegraded = true;
                          if (nodeObj.key === 'classroom' && (channelLatencies['class-agent'] >= (latencyThresholds['class-agent'] ?? 180))) isLinkDegraded = true;
                          if (nodeObj.key === 'agent' && (Object.keys(channelLatencies).some(k => (channelLatencies[k] ?? 0) >= (latencyThresholds[k] ?? 180)))) isLinkDegraded = true;
                          
                          if (nodeObj.key === 'publisher' && (channelLatencies['pub-agent'] >= ((latencyThresholds['pub-agent'] ?? 180) + 100))) isLinkCritical = true;
                          if (nodeObj.key === 'classroom' && (channelLatencies['class-agent'] >= ((latencyThresholds['class-agent'] ?? 180) + 100))) isLinkCritical = true;
                          if (nodeObj.key === 'agent' && (Object.keys(channelLatencies).some(k => (channelLatencies[k] ?? 0) >= ((latencyThresholds[k] ?? 180) + 100)))) isLinkCritical = true;

                          let borderColor = 'stroke-slate-800';
                          let fillBg = 'fill-slate-950/95';
                          let textColor = 'fill-slate-300';
                          let accentColor = 'fill-cyan-400';

                          if (isLinkDegraded) {
                            borderColor = 'stroke-yellow-500/70';
                            fillBg = 'fill-amber-950/95';
                            textColor = 'fill-yellow-200';
                            accentColor = 'fill-yellow-400';
                          }
                          if (isLinkCritical) {
                            borderColor = 'stroke-rose-500/90';
                            fillBg = 'fill-rose-950/95';
                            textColor = 'fill-rose-200';
                            accentColor = 'fill-rose-450';
                          }
                          if (isActiveDebug) {
                            borderColor = 'stroke-cyan-500/90';
                            fillBg = 'fill-cyan-950/20';
                          }

                          return (
                            <g 
                              key={nodeObj.key} 
                              className="cursor-pointer select-none"
                              onClick={() => {
                                setActiveDebugNode(`System Node: ${nodeObj.label} (${nodeObj.code}) | Subsystem: ${nodeObj.sub}`);
                                onAddLog(`Inspected operational node register ${nodeObj.label}`, 'aeo', isLinkCritical ? 'invalid' : isLinkDegraded ? 'warning' : 'valid');
                              }}
                            >
                              {/* Box wrapper */}
                              <rect 
                                x={pos.x - 65} y={pos.y - 24} rx="3" ry="3" width="130" height="48"
                                className={`transition-all ${borderColor}`}
                                fillOpacity="1"
                                strokeWidth="1.5"
                                fill={fillBg.replace('fill-[', '').replace(']', '')}
                              />

                              {/* Tiny active node blinker */}
                              <circle 
                                cx={pos.x - 52} cy={pos.y + 11} r="2" 
                                className={`${isLinkCritical ? 'fill-rose-500 animate-ping' : isLinkDegraded ? 'fill-yellow-500 animate-pulse' : 'fill-emerald-400 animate-pulse'}`} 
                              />

                              {/* Node Code micro numeric text */}
                              <text x={pos.x + 55} y={pos.y - 12} textAnchor="end" className="text-[6.5px] fill-slate-500 font-mono tracking-tight font-bold">
                                {nodeObj.code}
                              </text>

                              {/* Core Display name */}
                              <text x={pos.x - 54} y={pos.y - 2} className={`text-[9.5px] font-mono font-bold tracking-tight ${textColor}`}>
                                {nodeObj.label.slice(0, 16)}
                              </text>

                              {/* Sub category descriptor label */}
                              <text x={pos.x - 45} y={pos.y + 13} className="text-[7.5px] fill-slate-500 font-sans tracking-wider uppercase font-extrabold pb-1">
                                {nodeObj.sub}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Micro inline instructions node detail overlay when clicked */}
                      {activeDebugNode ? (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 p-2 bg-black/95 rounded border border-slate-800 text-[10px] font-mono flex items-center justify-between select-none animate-fadeIn">
                          <div className="flex items-center gap-1.5 text-slate-350 shrink-0">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-sm inline-block"></span>
                            <span className="truncate">{activeDebugNode}</span>
                          </div>
                          <button 
                            onClick={() => setActiveDebugNode(null)}
                            className="text-slate-500 hover:text-white text-[8px] tracking-widest uppercase ml-4"
                          >
                            [CLOSE]
                          </button>
                        </div>
                      ) : (
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 p-1 px-2.5 bg-black/60 rounded border border-slate-900 text-[8px] text-slate-500 tracking-wider font-mono text-center select-none pointer-events-none">
                          CLICK ON NODES OR ENHANCED FLOW LINKS TO ENGAGE MICROPANELS
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              {/* RENDER COMPONENT WIDGET B: VPC Resource Metrics Grid */}
              if (id === 'healthMatrix') {
                return (
                  <div 
                    key={id} 
                    className={`${getWidgetColSpan(id)} bg-slate-900 border rounded p-4 flex flex-col justify-between transition-all duration-200 ${
                      draggingId === id ? 'opacity-30 border-dashed border-cyan-500 scale-[0.98]' : dragOverId === id ? 'border-cyan-500 bg-cyan-950/5' : 'border-slate-800'
                    }`}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId !== id) {
                        setDragOverId(id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === id) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
                      setDragOverId(null);
                      setDraggingId(null);
                      if (!sourceId || sourceId === id) return;
                      
                      const sourceIdx = widgetOrder.indexOf(sourceId);
                      const targetIdx = widgetOrder.indexOf(id);
                      if (sourceIdx < 0 || targetIdx < 0) return;

                      const updatedOrder = [...widgetOrder];
                      updatedOrder.splice(sourceIdx, 1);
                      updatedOrder.splice(targetIdx, 0, sourceId);
                      setWidgetOrder(updatedOrder);

                      const widgetNames: Record<string, string> = {
                        flowVis: 'Kinetic Data-Flow',
                        healthMatrix: 'SRE Diagnostics Matrix',
                        liveAlerts: 'SRE Interactive Incident Portal',
                        complianceJitter: 'Protocol Jitter Line Analyzer'
                      };
                      onAddLog(`Reordered dashboard widgets: moved [${widgetNames[sourceId] || sourceId}] to position ${targetIdx + 1}.`, 'aeo', 'valid');
                    }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3 select-none">
                      <div className="flex items-center gap-1.5">
                        <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 p-0.5 flex items-center justify-center rounded hover:bg-slate-900 transition-colors" title="Drag to rearrange widget">
                          <GripVertical className="h-4 w-4 shrink-0" />
                        </div>
                        <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          VPC Resource Metrics Matrix
                        </h3>
                      </div>
                      
                      {/* Visual indicator handle message */}
                      <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-widest hidden sm:inline">
                        DRAG TO REARRANGE
                      </span>
                    </div>

                    {/* Resources Progress Meters grids */}
                    <div className="space-y-3.5">
                      
                      {/* Meter 1: Active CPU allocation */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>CORE WORKLOAD CPU THREADING</span>
                          <span className="font-bold text-slate-200">
                            {simulationSpeed * 7 + 24}% LOAD
                          </span>
                        </div>
                        <div className="w-full bg-black h-2 rounded overflow-hidden border border-slate-850">
                          <div 
                            className="bg-cyan-500 h-full transition-all duration-300" 
                            style={{ width: `${simulationSpeed * 7 + 24}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Meter 2: Ledger Verification Cache */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>SIGNATURE LEDGER CACHE VRAM</span>
                          <span className="font-bold text-slate-200">
                            4.2 GB / 12 GB [OK]
                          </span>
                        </div>
                        <div className="w-full bg-black h-2 rounded overflow-hidden border border-slate-850">
                          <div 
                            className="bg-cyan-500 h-full transition-all duration-350" 
                            style={{ width: '35%' }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>HANDSHAKE COMPLIANCE SLO BALANCE</span>
                          <span className={`font-bold ${Object.keys(channelLatencies).map(k => channelLatencies[k]).some((l: number) => l > 300) ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`}>
                            {Object.keys(channelLatencies).map(k => channelLatencies[k]).some((l: number) => l > 300) ? '91.8% [DEGRADED]' : '99.4% [SLA NOMINAL]'}
                          </span>
                        </div>
                        <div className="w-full bg-black h-2 rounded overflow-hidden border border-slate-850">
                          <div 
                            className={`h-full transition-all duration-300 ${Object.keys(channelLatencies).map(k => channelLatencies[k]).some((l: number) => l > 300) ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                            style={{ width: Object.keys(channelLatencies).map(k => channelLatencies[k]).some((l: number) => l > 300) ? '91.8%' : '99.4%' }}
                          ></div>
                        </div>
                      </div>

                    </div>

                    {/* Compact diagnostic specifications registry summary counts */}
                    <div className="mt-4 p-2.5 bg-black rounded border border-slate-850/80 font-mono text-[9px] leading-relaxed text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>SYNC STATUS:</span>
                        <span className="text-emerald-400 font-bold uppercase">FULLY CONVERGED</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CORE SPECIFICATIONS ACTS:</span>
                        <span className="text-slate-350 font-bold">5 REGS DEPLOYED</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EDTECH POLICY DISCLOSURES:</span>
                        <span className="text-slate-350 font-bold">3 REGS ENFORCED</span>
                      </div>
                    </div>

                  </div>
                );
              }

              {/* RENDER COMPONENT WIDGET C: Interactive Alerts Incident portal */}
              if (id === 'liveAlerts') {
                return (
                  <div 
                    key={id} 
                    className={`${getWidgetColSpan(id)} bg-slate-900 border rounded p-4 flex flex-col justify-between transition-all duration-200 ${
                      draggingId === id ? 'opacity-30 border-dashed border-cyan-500 scale-[0.98]' : dragOverId === id ? 'border-cyan-500 bg-cyan-950/5' : 'border-slate-800'
                    }`}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId !== id) {
                        setDragOverId(id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === id) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
                      setDragOverId(null);
                      setDraggingId(null);
                      if (!sourceId || sourceId === id) return;
                      
                      const sourceIdx = widgetOrder.indexOf(sourceId);
                      const targetIdx = widgetOrder.indexOf(id);
                      if (sourceIdx < 0 || targetIdx < 0) return;

                      const updatedOrder = [...widgetOrder];
                      updatedOrder.splice(sourceIdx, 1);
                      updatedOrder.splice(targetIdx, 0, sourceId);
                      setWidgetOrder(updatedOrder);

                      const widgetNames: Record<string, string> = {
                        flowVis: 'Kinetic Data-Flow',
                        healthMatrix: 'SRE Diagnostics Matrix',
                        liveAlerts: 'SRE Interactive Incident Portal',
                        complianceJitter: 'Protocol Jitter Line Analyzer'
                      };
                      onAddLog(`Reordered dashboard widgets: moved [${widgetNames[sourceId] || sourceId}] to position ${targetIdx + 1}.`, 'aeo', 'valid');
                    }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3 select-none">
                      <div className="flex items-center gap-1.5">
                        <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 p-0.5 flex items-center justify-center rounded hover:bg-slate-900 transition-colors" title="Drag to rearrange widget">
                          <GripVertical className="h-4 w-4 shrink-0" />
                        </div>
                        <AlertTriangle className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Interactive SRE Alerts Portal
                        </h3>
                      </div>
                      
                      {/* Visual indicator handle message */}
                      <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-widest hidden sm:inline">
                        DRAG TO REARRANGE
                      </span>
                    </div>

                    {/* Alerts action bar and dynamic lists output */}
                    {(() => {
                      const filtered = activeAlerts.filter(a => {
                        if (a.acknowledged) {
                          if (autoHideDelaySec === 0) return false;
                          const elapsedMs = Date.now() - (a.resolvedAt ?? Date.now());
                          if (elapsedMs >= autoHideDelaySec * 1000) return false;
                        }
                        if (!alertsSearchQuery.trim()) return true;
                        
                        const q = alertsSearchQuery.toLowerCase();
                        const msgMatches = a.msg.toLowerCase().includes(q);
                        const chMatches = a.channel ? a.channel.toLowerCase().includes(q) : false;
                        return msgMatches || chMatches;
                      });

                      return (
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[9px] font-mono select-none">
                            <span className="text-slate-500 font-bold uppercase">Active Live Incident streams ({filtered.length})</span>
                            {activeAlerts.some(a => !a.acknowledged) && (
                              <button 
                                onClick={clearAllAlerts}
                                className="text-cyan-400 hover:text-white uppercase font-bold text-[8.5px] tracking-wide"
                              >
                                [WIPE ALL DISMISSALS]
                              </button>
                            )}
                          </div>

                          {/* SLA Alert Trigger Threshold Tuning Module */}
                          <div className="bg-slate-950/75 border border-slate-900 px-2 py-1.5 rounded space-y-1.5 font-mono">
                            <div className="flex justify-between items-center text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                              <span className="flex items-center gap-1">
                                <Sliders className="h-3 w-3 text-cyan-400 animate-pulse" />
                                SLO THRESHOLD REGISTERS CONTROLS
                              </span>
                              <span className="text-cyan-400 px-1 py-[1px] bg-slate-900 border border-slate-800 rounded">MANUAL METRIC ENFORCER</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-0.5">
                              {[
                                { key: 'pub-agent', label: 'Egress Pub Link', min: 50, max: 500, default: 180 },
                                { key: 'agent-search', label: 'Search Coord Link', min: 50, max: 500, default: 200 },
                                { key: 'search-auditor', label: 'Gov Auditor Router', min: 50, max: 500, default: 250 },
                                { key: 'class-agent', label: 'Classroom Vault Link', min: 50, max: 500, default: 180 }
                              ].map(t => {
                                const currentVal = latencyThresholds[t.key] ?? t.default;
                                return (
                                  <div key={t.key} className="space-y-0.5">
                                    <div className="flex justify-between text-[7px] font-mono leading-none mb-0.5">
                                      <span className="text-slate-400 font-semibold truncate max-w-[90px]">{t.label.toUpperCase()}</span>
                                      <span className="text-cyan-400 font-extrabold">{currentVal}ms</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="range"
                                        min={t.min}
                                        max={t.max}
                                        step={10}
                                        value={currentVal}
                                        onChange={(e) => {
                                          const newVal = parseInt(e.target.value, 10);
                                          setLatencyThresholds(prev => ({
                                            ...prev,
                                            [t.key]: newVal
                                          }));
                                          onAddLog(`Operator manually tuned threshold for ${t.label} to ${newVal}ms`, 'prompt_provenance', 'valid');
                                        }}
                                        className="w-full h-1 bg-slate-900 accent-cyan-500 rounded appearance-none cursor-pointer hover:accent-cyan-400 transition-colors"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Search Input Box */}
                          <div className="relative">
                            <input
                              type="text"
                              value={alertsSearchQuery}
                              onChange={(e) => setAlertsSearchQuery(e.target.value)}
                              placeholder="Search alerts by message or channel (e.g. pub-agent)..."
                              className="w-full bg-black/80 text-[8.5px] font-mono text-cyan-400 placeholder-slate-650 border border-slate-850 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded p-1.5 uppercase transition-all"
                            />
                            {alertsSearchQuery && (
                              <button
                                onClick={() => setAlertsSearchQuery('')}
                                className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 font-mono text-[8px] font-bold"
                              >
                                [CLEAR]
                              </button>
                            )}
                          </div>

                          <div className="border border-slate-850 p-1.5 rounded-sm bg-black/55 max-h-[145px] overflow-y-auto min-h-[120px] font-mono text-[9px] divide-y divide-slate-900 space-y-1.5">
                            {filtered.length > 0 ? (
                              filtered.map((al) => {
                                const currentThresh = latencyThresholds[al.channel || ''] ?? al.threshold ?? 180;
                                const observed = al.observedLatency ?? 190;
                                const variance = observed - currentThresh;
                                const isAcked = !!al.acknowledged;

                                // Calculating low, medium, critical based on configured thresholds
                                let sevLabel = "LOW";
                                let badgeColorStyle = "bg-emerald-950/40 text-emerald-400 border-emerald-500/30";
                                
                                if (isAcked) {
                                  const elapsedMs = Date.now() - (al.resolvedAt ?? Date.now());
                                  const remainingSec = Math.max(0, Math.ceil((autoHideDelaySec * 1000 - elapsedMs) / 1000));
                                  sevLabel = `RESOLVED (HIDING IN ${remainingSec}S)`;
                                  badgeColorStyle = "bg-emerald-950/20 text-emerald-400 border-emerald-500/20 border-dashed text-[6px]";
                                } else if (variance >= 80) {
                                  sevLabel = "CRITICAL";
                                  badgeColorStyle = "bg-rose-950/40 text-rose-400 border-rose-500/30 font-bold animate-pulse";
                                } else if (variance > 15) {
                                  sevLabel = "MEDIUM";
                                  badgeColorStyle = "bg-amber-950/40 text-amber-400 border-amber-500/30";
                                }

                                return (
                                  <div 
                                    key={al.id} 
                                    className={`pt-2 pb-2 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-slate-350 pr-4 break-words ${
                                      isAcked ? 'opacity-35 line-through text-slate-550 border-l border-emerald-800 bg-emerald-950/5 pl-1 rounded' : ''
                                    }`}
                                  >
                                    <div className="flex gap-2.5 min-w-0 flex-1">
                                      {/* Left side actions and controls */}
                                      <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                                        <div className="flex items-center gap-1.5">
                                          {/* Alert Triangle Icon */}
                                          <AlertTriangle 
                                            className={`h-3.5 w-3.5 shrink-0 select-none ${
                                              variance >= 80 
                                                ? 'border-rose-500 animate-pulse text-rose-400 h-3.5 w-3.5 AlertTriangle' 
                                                : 'AlertTriangle h-3.5 w-3.5 text-cyan-400 animate-pulse'
                                            }`} 
                                            style={{
                                              filter: variance >= 80 
                                                ? 'drop-shadow(0 0 8px rgba(242, 73, 92, 0.95))' 
                                                : 'drop-shadow(0 0 3px rgba(102, 252, 241, 0.4))'
                                            }}
                                            title={`Current Variance: +${variance}ms`}
                                          />

                                          {/* Dropdown Menu Trigger Icon */}
                                          <div className="relative">
                                            <button
                                              onClick={() => setActiveDropdownAlertId(activeDropdownAlertId === al.id ? null : al.id)}
                                              className="p-0.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all text-slate-500 hover:text-cyan-400 flex items-center justify-center cursor-pointer"
                                              title="Quick SRE Actions Menu"
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
                                            </button>

                                            {/* Dropdown Options Popup */}
                                            {activeDropdownAlertId === al.id && (
                                              <>
                                                <div 
                                                  className="fixed inset-0 z-40 bg-transparent" 
                                                  onClick={() => setActiveDropdownAlertId(null)}
                                                />
                                                <div className="absolute left-0 mt-1 w-36 bg-slate-850 border border-slate-800 rounded shadow-2xl py-1 z-50 text-[8px] font-mono text-slate-300 divide-y divide-slate-900 select-none">
                                                  <button
                                                    onClick={() => {
                                                      acknowledgeAlert(al.id);
                                                      setActiveDropdownAlertId(null);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-cyan-950/30 hover:text-cyan-400 transition-colors uppercase font-bold text-slate-300"
                                                  >
                                                    ✓ Acknowledge Incident
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      if (al.channel) {
                                                        setMutedLinks(prev => ({
                                                          ...prev,
                                                          [al.channel!]: !prev[al.channel!]
                                                        }));
                                                        onAddLog(`Toggled mute state for link channel: ${al.channel}`, 'mcp_tool_card', 'warning');
                                                        acknowledgeAlert(al.id);
                                                      }
                                                      setActiveDropdownAlertId(null);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-amber-950/30 hover:text-amber-400 transition-colors uppercase font-bold text-slate-300"
                                                  >
                                                    Ø {al.channel && mutedLinks[al.channel] ? 'Unmute Alerts' : 'Mute Alerts'}
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      onAddLog(`Executing active diagnostics on link ${al.channel || 'unassigned'}... STATUS check OK. All channels registered.`, 'aeo', 'valid');
                                                      setActiveDropdownAlertId(null);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-emerald-950/30 hover:text-emerald-400 transition-colors uppercase font-bold text-slate-300"
                                                  >
                                                    ⚡ Run Diagnostics
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {/* SLA Threshold Slider Control inline display alongside alert icon */}
                                        {al.channel && (
                                          <div className="flex flex-col items-center bg-black/40 border border-slate-900 rounded p-1 space-y-0.5 max-w-[72px]">
                                            <span className="text-[6.5px] text-slate-500 font-mono scale-[0.9] font-bold tracking-tight uppercase leading-none text-center">
                                              SLA: {currentThresh}ms
                                            </span>
                                            <input
                                              type="range"
                                              min={50}
                                              max={500}
                                              step={10}
                                              value={currentThresh}
                                              onChange={(e) => {
                                                const newVal = parseInt(e.target.value, 10);
                                                setLatencyThresholds(prev => ({
                                                  ...prev,
                                                  [al.channel!]: newVal
                                                }));
                                                onAddLog(`Tuned threshold limit for ${al.channel} to ${newVal}ms via inline slider.`, 'prompt_provenance', 'valid');
                                              }}
                                              className="w-12 h-1 bg-slate-950 accent-cyan-500 rounded appearance-none cursor-pointer hover:accent-cyan-400 transition-colors"
                                              title="Inline SLA Threshold Tuner Slider"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Alert texts and badgings */}
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5 font-bold">
                                          <span className="text-slate-550 block">[{al.timestamp}]</span>
                                          {al.channel && (
                                            <span className="px-1 py-[1px] bg-slate-900 border border-slate-800 text-[6.5px] font-extrabold text-cyan-400 rounded">
                                              {al.channel}
                                            </span>
                                          )}
                                          {mutedLinks[al.channel || ''] && (
                                            <span className="px-1 py-[1px] bg-amber-950/40 border border-amber-900/30 text-[6.5px] font-extrabold text-amber-500 rounded uppercase">
                                              MUTED
                                            </span>
                                          )}

                                          {/* Dynamic Severity Badge */}
                                          <span 
                                            className={`inline-flex items-center px-1.5 py-[0.5px] text-[6.5px] font-black rounded border cursor-help tracking-widest ${badgeColorStyle}`} 
                                            title={`Latency overshoot of +${variance}ms over threshold (${currentThresh}ms)`}
                                          >
                                            {sevLabel}
                                          </span>

                                          {/* Real-Time Relative Time indicator */}
                                          <span 
                                            className="inline-flex items-center px-1 py-[0.2px] text-[6.5px] font-mono font-bold text-slate-500 border border-slate-900 bg-slate-950/40 rounded tracking-wider"
                                            title={`Incident Triggered: ${al.timestamp}`}
                                          >
                                            {getRelativeTimeStr(al.triggeredAt || Date.now() - 60000)}
                                          </span>
                                        </div>
                                        <p className="leading-snug text-slate-350 pr-4 break-words flex items-center gap-2 group/msg">
                                          <span className="flex-1">{al.msg}</span>
                                          <button
                                            onClick={() => handleCopyAlert(al.id, al.msg)}
                                            className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Copy Incident details to clipboard"
                                          >
                                            {copiedId === al.id ? (
                                              <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </button>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action dismiss */}
                                    <div className="flex items-center shrink-0 self-start sm:self-center">
                                      {isAcked ? (
                                        <span className="px-1.5 py-0.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-500 font-bold rounded-sm text-[8px] uppercase font-mono leading-none">
                                          CLEARED
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => acknowledgeAlert(al.id)}
                                          className="px-1.5 py-0.5 bg-black border border-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-500 font-bold tracking-tight rounded-sm transition-colors text-[8px] uppercase font-mono cursor-pointer"
                                        >
                                          DISMISS
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-10 text-slate-600 uppercase tracking-widest leading-relaxed select-none">
                                <CheckCircle className="h-4 w-4 text-slate-800 mx-auto mb-1 animate-bounce" />
                                {alertsSearchQuery ? 'No matching incidents' : 'ALL VPC SECTORS NOMINAL'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bottom stats overview for operator guidance logs */}
                    <div className="text-[8.5px] font-mono text-slate-600 mt-2 select-none border-t border-slate-900 pt-2 flex justify-between">
                      <span>MONITORED SYSTEM SLO BOUNDS: 180ms</span>
                      <span>ENTERPRISE CODESYSTEM</span>
                    </div>

                  </div>
                );
              }

              {/* RENDER COMPONENT WIDGET D: Protocol Compliance Jitter Analyzer Area Line Graph */}
              if (id === 'complianceJitter') {
                return (
                  <div 
                    key={id} 
                    className={`${getWidgetColSpan(id)} bg-slate-900 border rounded p-4 flex flex-col justify-between transition-all duration-200 ${
                      draggingId === id ? 'opacity-30 border-dashed border-cyan-500 scale-[0.98]' : dragOverId === id ? 'border-cyan-500 bg-cyan-950/5' : 'border-slate-800'
                    }`}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId !== id) {
                        setDragOverId(id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === id) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
                      setDragOverId(null);
                      setDraggingId(null);
                      if (!sourceId || sourceId === id) return;
                      
                      const sourceIdx = widgetOrder.indexOf(sourceId);
                      const targetIdx = widgetOrder.indexOf(id);
                      if (sourceIdx < 0 || targetIdx < 0) return;

                      const updatedOrder = [...widgetOrder];
                      updatedOrder.splice(sourceIdx, 1);
                      updatedOrder.splice(targetIdx, 0, sourceId);
                      setWidgetOrder(updatedOrder);

                      const widgetNames: Record<string, string> = {
                        flowVis: 'Kinetic Data-Flow',
                        healthMatrix: 'SRE Diagnostics Matrix',
                        liveAlerts: 'SRE Interactive Incident Portal',
                        complianceJitter: 'Protocol Jitter Line Analyzer'
                      };
                      onAddLog(`Reordered dashboard widgets: moved [${widgetNames[sourceId] || sourceId}] to position ${targetIdx + 1}.`, 'aeo', 'valid');
                    }}
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-2 border-b border-slate-800 pb-2 mb-3 select-none">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 p-0.5 flex items-center justify-center rounded hover:bg-slate-900 transition-colors" title="Drag to rearrange widget">
                            <GripVertical className="h-4 w-4 shrink-0" />
                          </div>
                          <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            Protocol Jitter Line Analyzer
                          </h3>
                        </div>
                        
                        <div className="text-[7px] font-mono text-cyan-500 bg-cyan-950/20 border border-cyan-800/20 px-1.5 py-[1px] rounded">
                          TELEMETRY ANALYTICS GATE
                        </div>
                      </div>

                      {/* Controller toolbar buttons */}
                      <div className="flex flex-wrap items-center gap-2 bg-black/90 p-1 rounded border border-slate-850">
                        {/* Auto-Hide Delay setting */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded text-slate-450 font-mono text-[8px] font-medium">
                          <span className="text-slate-500 uppercase select-none">AUTO-HIDE:</span>
                          <select
                            value={autoHideDelaySec}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAutoHideDelaySec(val);
                              onAddLog(`Updated user-defined alert auto-hide delay configuration: ${val === -1 ? 'manual persistent' : val + 's'}`, 'prompt_provenance', 'valid');
                            }}
                            className="bg-black text-cyan-400 border border-slate-800 text-[8px] py-0.5 px-1 rounded-sm cursor-pointer hover:border-cyan-500 hover:text-cyan-300 font-bold focus:outline-none"
                            title="Automatically hides resolved/dismissed incident badges after a user-defined timeout period"
                          >
                            <option value={0}>0s (IMMEDIATE)</option>
                            <option value={3}>3 SECONDS</option>
                            <option value={5}>5 SECONDS</option>
                            <option value={10}>10 SECONDS</option>
                            <option value={30}>30 SECONDS</option>
                            <option value={-1}>NEVER HIDE</option>
                          </select>
                        </div>

                        {/* Forecast Prediction toggle checkbox */}
                        <label 
                          className="flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded text-slate-450 font-mono text-[8px] font-bold cursor-pointer select-none hover:bg-slate-900 transition-colors"
                          title="Generate a dynamic 5-tick linear projection trend overlay prediction"
                        >
                          <input 
                            type="checkbox" 
                            checked={showPrediction}
                            onChange={(e) => {
                              setShowPrediction(e.target.checked);
                              onAddLog(`Toggled trend prediction metric series overlay: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`, 'prompt_provenance', 'valid');
                            }}
                            className="accent-purple-500 w-2.5 h-2.5 cursor-pointer"
                          />
                          <span className={showPrediction ? 'text-purple-400 font-extrabold' : 'text-slate-500'}>FORECAST</span>
                        </label>

                        {/* Jitter Wave Smoothing Signal Filter */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded text-slate-450 font-mono text-[8px] font-medium" title="Apply signal filtering algorithms to reduce high-frequency noise and highlight structural SLA breach trends">
                          <span className="text-slate-500 uppercase select-none">FILTER:</span>
                          <select
                            value={filterType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFilterType(val);
                              const filterNames: Record<string, string> = {
                                raw: 'RAW SIGNAL',
                                ma3: 'MOVING AVERAGE (3-PT)',
                                ma5: 'MOVING AVERAGE (5-PT)',
                                sg5: 'SAVITZKY-GOLAY (5-PT)'
                              };
                              onAddLog(`Configured Protocol Jitter smoothing wave filter: [${filterNames[val] || val}].`, 'prompt_provenance', 'valid');
                            }}
                            className="bg-black text-cyan-400 border border-slate-800 text-[8px] py-0.5 px-1 rounded-sm cursor-pointer hover:border-cyan-500 hover:text-cyan-300 font-bold focus:outline-none"
                          >
                            <option value="raw">RAW WAVE</option>
                            <option value="ma3">MOVING AVG (3-PT)</option>
                            <option value="ma5">MOVING AVG (5-PT)</option>
                            <option value="sg5">SAVITZKY-GOLAY (5-PT)</option>
                          </select>
                        </div>

                        {/* Export JSON Button */}
                        <button 
                          onClick={handleExportJSON}
                          className="hover:bg-slate-900 shadow px-2 py-[3px] rounded text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[8px] font-bold border border-slate-850 hover:border-cyan-500/30 transition-all cursor-pointer"
                          title="Export Jitter History as JSON telemetry array log"
                        >
                          <Download className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span>EXPORT JSON</span>
                        </button>

                        {/* PDF Metric Report Button */}
                        <button 
                          onClick={handleDownloadPDF}
                          className="hover:bg-emerald-950 shadow px-2 py-[3px] bg-emerald-950/20 rounded text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[8px] font-bold border border-emerald-950/60 hover:border-emerald-500/30 transition-all cursor-pointer select-none"
                          title="Download high-contrast PDF telemetry & vector chart representation"
                        >
                          <FileText className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>PDF REPORT</span>
                        </button>
                      </div>
                    </div>

                    {/* SVG Performance Line Jitter Wave graph representation */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[9px] font-mono select-none">
                        <span className="text-slate-500 uppercase tracking-wide">Historical delay waves (preceding 15 ticks)</span>
                        <span className="text-cyan-450 font-bold">AVG JITTER: {Math.floor(latencyHistory.reduce((a,b)=>a+b,0)/latencyHistory.length)}ms</span>
                      </div>

                      <div className="bg-black/85 rounded border border-slate-800 p-1 flex flex-col items-center justify-center relative select-none">
                        <svg 
                          className="w-full h-24 select-none cursor-grab active:cursor-grabbing overflow-hidden" 
                          viewBox="0 0 540 100" 
                          preserveAspectRatio="none"
                          onWheel={(e) => {
                            e.preventDefault();
                            const direction = e.deltaY < 0 ? 1 : -1;
                            setZoomLevel(prev => {
                              const nextZoom = Math.min(8, Math.max(1, prev + direction * 0.25));
                              return parseFloat(nextZoom.toFixed(2));
                            });
                          }}
                          onMouseDown={(e) => {
                            setIsPanning(true);
                            setPanStartX(e.clientX - panOffset);
                          }}
                          onMouseMove={(e) => {
                            if (!isPanning) return;
                            const newOffset = e.clientX - panStartX;
                            const virtualW = 540 * zoomLevel;
                            const minOffset = 540 - virtualW;
                            setPanOffset(Math.min(0, Math.max(minOffset, newOffset)));
                          }}
                          onMouseUp={() => setIsPanning(false)}
                          onMouseLeave={() => setIsPanning(false)}
                        >
                          <defs>
                            <linearGradient id="jitterGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#45A29E" />
                              <stop offset="100%" stopColor="#0B0C10" />
                            </linearGradient>
                            
                            <clipPath id="graphClip">
                              <rect x={0} y={0} width={540} height={100} />
                            </clipPath>
                          </defs>

                          {/* Grid Background static layer */}
                          <g stroke="#1F2833" strokeWidth="0.5">
                            <line x1="0" y1="20" x2="540" y2="20" />
                            <line x1="0" y1="50" x2="540" y2="50" />
                            <line x1="0" y1="80" x2="540" y2="80" />
                          </g>

                          {/* Group content using clip path */}
                          <g clipPath="url(#graphClip)">
                            
                            {/* SLA baseline warning limit line */}
                            {(() => {
                              const maxVal = 400; // coordinate math height
                              const slaThreshold = latencyThresholds['pub-agent'] ?? 180;
                              const baselineY = 100 - Math.min(slaThreshold / maxVal * 100, 95);
                              return (
                                <g>
                                  <line x1="0" y1={baselineY} x2="540" y2={baselineY} stroke="#F2495C" strokeWidth="1.25" strokeDasharray="3, 3" opacity="0.75" />
                                  <text x="10" y={baselineY - 3} className="text-[6.5px] font-mono fill-rose-500 font-extrabold tracking-wider select-none uppercase">
                                    LIVE SLA GATE Limit ({slaThreshold}ms)
                                  </text>
                                </g>
                              );
                            })()}

                            {/* Dynamic Wave path coordinates computation */}
                            {(() => {
                              const xSpacing = (540 * zoomLevel) / (latencyHistory.length - 1);
                              const maxVal = 400; // max scale mapping height
                              
                              // Compute filtered values
                              const filteredLatency = getFilteredData(latencyHistory);

                              const histPoints = filteredLatency.map((val, i) => {
                                const px = i * xSpacing + panOffset;
                                const py = 100 - Math.min(val / maxVal * 100, 95);
                                return { px, py, val, i };
                              });

                              const polylineStr = histPoints.map(p => `${p.px},${p.py}`).join(' ');
                              
                              const firstPx = histPoints[0]?.px ?? 0;
                              const lastPx = histPoints[histPoints.length - 1]?.px ?? 540;
                              const fillAreaStr = `${firstPx},100 ${polylineStr} ${lastPx},100`;

                              // Also compute raw (unfiltered) line coordinates as a beautiful ghost guide path
                              const rawPoints = latencyHistory.map((val, i) => {
                                const px = i * xSpacing + panOffset;
                                const py = 100 - Math.min(val / maxVal * 100, 95);
                                return { px, py };
                              });
                              const rawPolylineStr = rawPoints.map(p => `${p.px},${p.py}`).join(' ');

                              // Forecast predictions pathing
                              const predictions = getProjection(latencyHistory);
                              const predPoints = predictions.map((val, idx) => {
                                const step = idx + 1;
                                const p_idx = latencyHistory.length - 1 + step;
                                const px = p_idx * xSpacing + panOffset;
                                const py = 100 - Math.min(val / maxVal * 100, 95);
                                return { px, py, val, index: p_idx };
                              });

                              const lastHistX = lastPx;
                              const lastHistY = histPoints[histPoints.length - 1]?.py ?? 50;
                              const predictionPolylineStr = [`${lastHistX},${lastHistY}`, ...predPoints.map(p => `${p.px},${p.py}`)].join(' ');

                              return (
                                <g>
                                  {/* If filtered, render the beautiful raw background ghost path first to visualize high-frequency noise comparison */}
                                  {filterType !== 'raw' && (
                                    <motion.polyline
                                      layout
                                      points={rawPolylineStr}
                                      fill="none"
                                      stroke="#2B3A46"
                                      strokeWidth="1"
                                      opacity="0.55"
                                      strokeDasharray="3,3"
                                      transition={{ duration: 0.45, ease: "easeInOut" }}
                                    />
                                  )}

                                  {/* Fill gradient area block underneath */}
                                  <motion.polygon 
                                    layout
                                    points={fillAreaStr} 
                                    fill="url(#jitterGradient)" 
                                    className="opacity-15"
                                    transition={{ duration: 0.45, ease: "easeInOut" }}
                                  />
                                  
                                  {/* Glowing stroke path */}
                                  <motion.polyline 
                                    layout
                                    points={polylineStr} 
                                    fill="none" 
                                    stroke="#45A29E" 
                                    strokeWidth="1.5" 
                                    transition={{ duration: 0.45, ease: "easeInOut" }}
                                  />

                                  {/* Forecast Prediction dynamic curve trace overlay */}
                                  {showPrediction && (
                                    <motion.polyline
                                      layout
                                      points={predictionPolylineStr}
                                      fill="none"
                                      stroke="#A855F7"
                                      strokeWidth="1.4"
                                      strokeDasharray="3,3"
                                      transition={{ duration: 0.45, ease: "easeInOut" }}
                                    />
                                  )}

                                  {/* Render dynamic point highlight bubbles on nodes */}
                                  {histPoints.map((p) => (
                                    <motion.circle 
                                      layout
                                      key={`circle-${p.i}`} 
                                      cx={p.px} cy={p.py} 
                                      r={hoveredJitterIndex === p.i ? 3.5 : 1.8} 
                                      fill={p.val > (latencyThresholds['pub-agent'] ?? 180) ? '#E0A43A' : '#45A29E'} 
                                      opacity={hoveredJitterIndex === p.i ? 1 : 0.85}
                                      transition={{ duration: 0.15 }}
                                    />
                                  ))}

                                  {/* Trend predictions node points styling */}
                                  {showPrediction && predPoints.map((p, idx) => (
                                    <motion.circle 
                                      layout
                                      key={`circle-pred-${idx}`} 
                                      cx={p.px} cy={p.py} 
                                      r={hoveredProjectedIndex === idx ? 3.5 : 1.8} 
                                      fill="#C084FC"
                                      opacity={hoveredProjectedIndex === idx ? 1 : 0.75}
                                      transition={{ duration: 0.15 }}
                                    />
                                  ))}

                                  {/* Hover guidelines and interactive hover columns */}
                                  {histPoints.map((p) => (
                                    <rect
                                      key={`hover-trigger-${p.i}`}
                                      x={p.px - xSpacing / 2}
                                      y={0}
                                      width={xSpacing}
                                      height={100}
                                      fill="transparent"
                                      className="cursor-crosshair"
                                      onMouseEnter={() => setHoveredJitterIndex(p.i)}
                                      onMouseMove={() => setHoveredJitterIndex(p.i)}
                                      onMouseLeave={() => setHoveredJitterIndex(null)}
                                    />
                                  ))}

                                  {/* Prediction hover regions mapping */}
                                  {showPrediction && predPoints.map((p, idx) => (
                                    <rect
                                      key={`hover-trigger-pred-${idx}`}
                                      x={p.px - xSpacing / 2}
                                      y={0}
                                      width={xSpacing}
                                      height={100}
                                      fill="transparent"
                                      className="cursor-crosshair"
                                      onMouseEnter={() => setHoveredProjectedIndex(idx)}
                                      onMouseMove={() => setHoveredProjectedIndex(idx)}
                                      onMouseLeave={() => setHoveredProjectedIndex(null)}
                                    />
                                  ))}

                                  {/* Tooltip dynamic hover overlays */}
                                  {hoveredJitterIndex !== null && (
                                    <g className="pointer-events-none select-none">
                                      {(() => {
                                        const hPoint = histPoints[hoveredJitterIndex];
                                        if (!hPoint) return null;
                                        const isLeftOfCenter = hPoint.px > 270;
                                        const tooltipX = isLeftOfCenter ? hPoint.px - 78 : hPoint.px + 10;
                                        const tooltipY = hPoint.py > 50 ? hPoint.py - 36 : hPoint.py + 10;

                                        return (
                                          <g>
                                            <line x1={hPoint.px} y1={0} x2={hPoint.px} y2={100} stroke="#66FCF1" strokeWidth="0.75" strokeDasharray="2,2" />
                                            <circle cx={hPoint.px} cy={hPoint.py} r="5" fill="none" stroke="#66FCF1" strokeWidth="1" className="animate-pulse" />
                                            
                                            {/* Tooltip background */}
                                            <rect 
                                              x={tooltipX} 
                                              y={tooltipY} 
                                              width="68" 
                                              height="28" 
                                              rx="2" 
                                              fill="#0B0C10" 
                                              stroke="#66FCF1" 
                                              strokeWidth="1" 
                                              filter="drop-shadow(0 2px 4px rgba(11, 12, 16,0.5))"
                                            />
                                            <text 
                                              x={tooltipX + 6} 
                                              y={tooltipY + 9} 
                                              className="text-[6px] font-mono fill-slate-500 font-bold uppercase"
                                            >
                                              Tick #{hoveredJitterIndex + 1}
                                            </text>
                                            <text 
                                              x={tooltipX + 6} 
                                              y={tooltipY + 21} 
                                              className="text-[9px] font-mono fill-white font-extrabold"
                                            >
                                              {hPoint.val}ms
                                            </text>
                                          </g>
                                        );
                                      })()}
                                    </g>
                                  )}

                                  {/* Trend prediction tooltip interactive */}
                                  {hoveredProjectedIndex !== null && showPrediction && (
                                    <g className="pointer-events-none select-none">
                                      {(() => {
                                        const p = predPoints[hoveredProjectedIndex];
                                        if (!p) return null;
                                        const isLeftOfCenter = p.px > 270;
                                        const tooltipX = isLeftOfCenter ? p.px - 78 : p.px + 10;
                                        const tooltipY = p.py > 50 ? p.py - 36 : p.py + 10;
                                        const isBreached = p.val > (latencyThresholds['pub-agent'] ?? 180);

                                        return (
                                          <g>
                                            <line x1={p.px} y1={0} x2={p.px} y2={100} stroke="#A855F7" strokeWidth="0.75" strokeDasharray="2,2" />
                                            <circle cx={p.px} cy={p.py} r="5" fill="none" stroke="#A855F7" strokeWidth="1" className="animate-pulse" />
                                            
                                            {/* Tooltip background */}
                                            <rect 
                                              x={tooltipX} 
                                              y={tooltipY} 
                                              width="68" 
                                              height="32" 
                                              rx="2" 
                                              fill="#1B1238" 
                                              stroke="#A855F7" 
                                              strokeWidth="1" 
                                              filter="drop-shadow(0 2px 4px rgba(11, 12, 16,0.5))"
                                            />
                                            <text 
                                              x={tooltipX + 6} 
                                              y={tooltipY + 9} 
                                              className="text-[6px] font-mono fill-purple-400 font-bold uppercase"
                                            >
                                              Proj Tick +{hoveredProjectedIndex + 1}
                                            </text>
                                            <text 
                                              x={tooltipX + 6} 
                                              y={tooltipY + 20} 
                                              className="text-[8.5px] font-mono fill-white font-extrabold"
                                            >
                                              {p.val}ms
                                            </text>
                                            <text 
                                              x={tooltipX + 6} 
                                              y={tooltipY + 28} 
                                              className={`text-[5px] font-mono font-black uppercase ${
                                                isBreached ? 'fill-rose-400 animate-pulse' : 'fill-emerald-400'
                                              }`}
                                            >
                                              {isBreached ? 'SLA OVERRUN RISK' : 'SLO NOMINAL'}
                                            </text>
                                          </g>
                                        );
                                      })()}
                                    </g>
                                  )}

                                </g>
                              );
                            })()}

                          </g>
                        </svg>

                        {/* Multi-colored Heat-map Status Legend Overlay */}
                        <div className="w-full mt-2 pt-2 border-t border-slate-900 flex flex-col gap-1.5 px-2">
                          <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500 font-bold select-none">
                            <span>0ms</span>
                            <span>{latencyThresholds['pub-agent'] ?? 180}ms (SLA Limit)</span>
                            <span>{(latencyThresholds['pub-agent'] ?? 180) + 80}ms (Critical Edge)</span>
                            <span>400ms+</span>
                          </div>
                          <div className="h-2 w-full rounded-full overflow-hidden flex shadow-inner bg-slate-950 border border-slate-900">
                            {/* Nominal segment */}
                            <div 
                              className="bg-gradient-to-r from-emerald-600/80 to-cyan-500/80 h-full relative border-r border-slate-950" 
                              style={{ width: `${(Math.min(400, latencyThresholds['pub-agent'] ?? 180) / 400) * 100}%` }}
                              title={`Nominal Range: 0ms to ${latencyThresholds['pub-agent'] ?? 180}ms`}
                            />
                            {/* Warning segment */}
                            <div 
                              className="bg-gradient-to-r from-cyan-400/80 to-amber-500/80 h-full relative border-r border-slate-950" 
                              style={{ width: `${(Math.min(400 - (latencyThresholds['pub-agent'] ?? 180), 80) / 400) * 100}%` }}
                              title={`Warning Range: ${latencyThresholds['pub-agent'] ?? 180}ms to ${(latencyThresholds['pub-agent'] ?? 180) + 80}ms`}
                            />
                            {/* Critical segment */}
                            <div 
                              className="bg-gradient-to-r from-amber-600/80 to-rose-600/80 h-full flex-1" 
                              title={`Critical Range: >${(latencyThresholds['pub-agent'] ?? 180) + 80}ms`}
                            />
                          </div>
                          <div className="flex flex-wrap justify-between items-center text-[7px] font-mono mt-0.5 select-none gap-2">
                            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              NOMINAL (0 - {latencyThresholds['pub-agent'] ?? 180}ms)
                            </span>
                            <span className="text-amber-400 font-extrabold flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              WARNING ({latencyThresholds['pub-agent'] ?? 180} - {(latencyThresholds['pub-agent'] ?? 180) + 80}ms)
                            </span>
                            <span className="text-rose-400 font-extrabold flex items-center gap-1 animate-pulse">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              CRITICAL ({`>=`} {(latencyThresholds['pub-agent'] ?? 180) + 80}ms)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Interactive Zoom & Pan SRE HUD Controls */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950/70 border border-slate-900 rounded p-1.5 text-[7.5px] font-mono font-bold text-slate-500 gap-2 select-none select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-500">VIEW CONSTRUCT:</span>
                          <span>ZOOM: {zoomLevel}x</span>
                          <span className="text-slate-700">|</span>
                          <span>PAN OFFSET: {Math.round(panOffset)}px</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setZoomLevel(prev => Math.max(1, prev - 0.5));
                            }}
                            className="px-1 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-cyan-400 font-extrabold cursor-pointer select-none"
                            title="Zoom Out"
                          >
                            ZOOM -
                          </button>
                          <button
                            onClick={() => {
                              setZoomLevel(prev => Math.min(8, prev + 0.5));
                            }}
                            className="px-1 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-cyan-400 font-extrabold cursor-pointer select-none"
                            title="Zoom In"
                          >
                            ZOOM +
                          </button>
                          {(zoomLevel > 1 || panOffset !== 0) && (
                            <button
                              onClick={() => {
                                setZoomLevel(1);
                                setPanOffset(0);
                              }}
                              className="px-1.5 py-0.5 bg-cyan-950/20 hover:bg-cyan-900/35 border border-cyan-500/30 rounded text-cyan-400 font-extrabold cursor-pointer select-none"
                              title="Reset graph zoom and pan constraints"
                            >
                              RESET
                            </button>
                          )}
                          <span className="text-slate-600 hidden md:inline">[WHEEL SCROLL TO ZOOM / DRAG LINE TO PAN]</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[8.5px] font-mono text-slate-550 border-t border-slate-900 pt-2 flex justify-between select-none">
                      <span>SAMPLE DEPTHS: 1.0Hz</span>
                      <span className="text-slate-600 block">DOCKER CONTAINER TELEMETRY</span>
                    </div>

                  </div>
                );
              }

              return null;
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
