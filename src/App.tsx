import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  Play, 
  Download, 
  Trash2, 
  Settings2, 
  Layers, 
  ChevronRight,
  FileJson,
  MapPin,
  Maximize,
  Minimize,
  Combine,
  Filter,
  Scissors,
  CircleDot,
  Hexagon,
  ArrowRightLeft,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { WorkflowStep, OperationType, GISFile, MapLayer } from './types';
import { convertToGeoJSON } from './services/fileService';
import { processWorkflow } from './services/gisService';
import Map from './components/Map';
import tokml from 'tokml';
import togpx from 'togpx';

const OPERATIONS: { type: OperationType; label: string; icon: any; description: string }[] = [
  { type: 'buffer', label: 'Buffer', icon: CircleDot, description: 'Create a zone around features' },
  { type: 'simplify', label: 'Simplify', icon: Minimize, description: 'Reduce vertices for performance' },
  { type: 'dissolve', label: 'Dissolve', icon: Combine, description: 'Merge overlapping features' },
  { type: 'centroid', label: 'Centroid', icon: MapPin, description: 'Find central point of features' },
  { type: 'convexHull', label: 'Convex Hull', icon: Hexagon, description: 'Smallest convex shape enclosing features' },
  { type: 'polygonToLine', label: 'Polygon to Line', icon: ArrowRightLeft, description: 'Convert polygons to boundaries' },
  { type: 'lineToPolygon', label: 'Line to Polygon', icon: ArrowRightLeft, description: 'Close lines into polygons' },
  { type: 'explode', label: 'Explode', icon: Scissors, description: 'Break complex features into points' },
  { type: 'flatten', label: 'Flatten', icon: Maximize, description: 'Convert multi-features to single' },
  { type: 'combine', label: 'Combine', icon: Combine, description: 'Merge all features into one' },
  { type: 'filter', label: 'Filter', icon: Filter, description: 'Keep features matching criteria' },
];

const LAYER_COLORS = [
  '#141414', // Black
  '#F27D26', // Orange
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EF4444', // Red
  '#8B5CF6', // Purple
];

export default function App() {
  const [file, setFile] = useState<GISFile | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [exportFormat, setExportFormat] = useState<'geojson' | 'kml' | 'gpx' | 'csv'>('geojson');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (uploadedFile: File) => {
    try {
      const geojson = await convertToGeoJSON(uploadedFile);
      const newFile = {
        name: uploadedFile.name,
        data: geojson,
        type: uploadedFile.name.split('.').pop() || 'unknown'
      };
      setFile(newFile);
      
      // Add as initial layer
      const newLayer: MapLayer = {
        id: Math.random().toString(36).substr(2, 9),
        name: uploadedFile.name,
        data: geojson,
        visible: true,
        color: LAYER_COLORS[layers.length % LAYER_COLORS.length]
      };
      setLayers([newLayer]);
    } catch (err) {
      console.error(err);
      alert('Error processing file: ' + (err as Error).message);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const addStep = (type: OperationType) => {
    const newStep: WorkflowStep = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      params: type === 'buffer' ? { distance: 1, units: 'kilometers' } : 
              type === 'simplify' ? { tolerance: 0.01 } : {}
    };
    setSteps([...steps, newStep]);
    setShowAddStep(false);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateStepParams = (id: string, params: any) => {
    setSteps(steps.map(s => s.id === id ? { ...s, params: { ...s.params, ...params } } : s));
  };

  const runWorkflow = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      // Artificial delay for UI feedback
      await new Promise(r => setTimeout(r, 800));
      const result = processWorkflow(file.data, steps);
      
      // Add result as a new layer
      const newLayer: MapLayer = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Processed: ${file.name.split('.')[0]}`,
        data: result,
        visible: true,
        color: LAYER_COLORS[(layers.length + 1) % LAYER_COLORS.length]
      };
      setLayers([...layers, newLayer]);
    } catch (err) {
      console.error(err);
      alert('Error running workflow: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const removeLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const downloadLayer = (layer: MapLayer) => {
    let content: string;
    let filename: string;
    let mimeType: string;

    try {
      if (exportFormat === 'kml') {
        content = tokml(layer.data);
        filename = `${layer.name.replace(/\s+/g, '_')}.kml`;
        mimeType = 'application/vnd.google-earth.kml+xml';
      } else if (exportFormat === 'gpx') {
        content = togpx(layer.data);
        filename = `${layer.name.replace(/\s+/g, '_')}.gpx`;
        mimeType = 'application/gpx+xml';
      } else if (exportFormat === 'csv') {
        const features = layer.data.features || [layer.data];
        if (features.length > 0) {
          const props = features[0].properties || {};
          const keys = Object.keys(props);
          const header = [...keys, 'longitude', 'latitude'].join(',');
          const rows = features.map((f: any) => {
            const p = f.properties || {};
            const coords = f.geometry && f.geometry.type === 'Point' ? f.geometry.coordinates : [0, 0];
            return [...keys.map(k => p[k]), coords[0], coords[1]].join(',');
          });
          content = [header, ...rows].join('\n');
        } else {
          content = 'longitude,latitude\n';
        }
        filename = `${layer.name.replace(/\s+/g, '_')}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(layer.data);
        filename = `${layer.name.replace(/\s+/g, '_')}.geojson`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export in this format: ' + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] text-[#E4E3E0] flex items-center justify-center rounded-sm">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic font-serif">Geospatial Zone</h1>
            <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">Geospatial Processing Engine v1.1</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center gap-2 px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
            >
              Format: {exportFormat.toUpperCase()} <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showExportOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full right-0 mt-1 bg-white border border-[#141414] shadow-xl z-[60] min-w-[120px]"
                >
                  <button 
                    onClick={() => { setExportFormat('geojson'); setShowExportOptions(false); }}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                  >
                    GeoJSON
                  </button>
                  <button 
                    onClick={() => { setExportFormat('kml'); setShowExportOptions(false); }}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                  >
                    KML
                  </button>
                  <button 
                    onClick={() => { setExportFormat('gpx'); setShowExportOptions(false); }}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                  >
                    GPX
                  </button>
                  <button 
                    onClick={() => { setExportFormat('csv'); setShowExportOptions(false); }}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                  >
                    CSV
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={runWorkflow}
            disabled={!file || steps.length === 0 || isProcessing}
            className={cn(
              "flex items-center gap-2 px-6 py-2 bg-[#141414] text-[#E4E3E0] text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none",
              isProcessing && "animate-pulse"
            )}
          >
            {isProcessing ? 'Processing...' : <><Play size={14} fill="currentColor" /> Run Workflow</>}
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 border-x border-[#141414] min-h-[calc(100vh-89px)]">
        {/* Left Column: Map & Upload */}
        <div className="relative flex flex-col border-r border-[#141414]">
          {!file ? (
            <div className="flex-1 p-8">
              <div 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-full min-h-[400px] border-2 border-dashed border-[#141414]/20 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all hover:bg-white/40",
                  dragActive && "bg-white border-[#141414] scale-[0.99]"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  accept=".geojson,.json,.zip,.kml,.gpx"
                />
                <div className="w-20 h-20 border border-[#141414] flex items-center justify-center rounded-full">
                  <Upload size={32} className={cn("transition-transform", dragActive && "animate-bounce")} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-serif italic mb-1">Drop any vector file here or click to browse</p>
                  <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">
                    Accepts: GeoJSON, Shapefile (.zip), GeoPackage, KML, GPX
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative flex flex-col">
              {/* Map View */}
              <div className="flex-1 min-h-[500px] relative z-0">
                <Map layers={layers} />
                
                {/* Layer Control Overlay */}
                <div className="absolute top-4 left-4 z-[1000] w-64 bg-white/90 backdrop-blur-md border border-[#141414] shadow-2xl">
                  <div className="p-3 border-b border-[#141414] flex justify-between items-center bg-[#E4E3E0]/50">
                    <span className="text-[9px] font-bold uppercase tracking-widest">Map Layers</span>
                    <MapIcon size={12} />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-[#141414]/10">
                    {layers.map((layer) => (
                      <div key={layer.id} className="p-3 group hover:bg-white transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 border border-[#141414]" style={{ backgroundColor: layer.color }}></div>
                          <span className="text-[10px] font-bold truncate flex-1">{layer.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toggleLayerVisibility(layer.id)}
                              className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                            >
                              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button 
                              onClick={() => downloadLayer(layer)}
                              className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                            >
                              <Download size={12} />
                            </button>
                            <button 
                              onClick={() => removeLayer(layer.id)}
                              className="p-1 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between text-[8px] font-mono opacity-40">
                          <span>{layer.data.features?.length || 1} FEATURES</span>
                          <span>{layer.visible ? 'VISIBLE' : 'HIDDEN'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Source Info Bar */}
              <div className="p-4 bg-white border-t border-[#141414] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#141414]/5 flex items-center justify-center">
                    <FileJson size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] opacity-50 uppercase tracking-widest font-mono">Active Source</p>
                    <p className="text-xs font-bold">{file.name}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[9px] opacity-50 uppercase tracking-widest font-mono">Format</p>
                    <p className="text-xs font-bold uppercase">{file.type}</p>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setLayers([]); setSteps([]); }}
                    className="px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Workflow Steps */}
        <div className="bg-white flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-[#141414] flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Workflow Steps</h2>
            <span className="text-[10px] font-mono opacity-40">{steps.length} STEPS</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {steps.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-40 flex flex-col items-center justify-center text-center opacity-40"
                >
                  <p className="text-xs italic font-serif">No steps added yet.</p>
                  <p className="text-[10px] uppercase tracking-widest font-mono">Use the button below to add operations.</p>
                </motion.div>
              ) : (
                steps.map((step, index) => {
                  const op = OPERATIONS.find(o => o.type === step.type)!;
                  return (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group relative border border-[#141414] bg-[#E4E3E0]/20 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-3 p-4 border-b border-[#141414]/10">
                        <div className="w-8 h-8 bg-[#141414] text-[#E4E3E0] flex items-center justify-center text-[10px] font-mono">
                          0{index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <op.icon size={14} />
                            <h3 className="text-xs font-bold uppercase tracking-wider">{op.label}</h3>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeStep(step.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="p-4 space-y-3">
                        {step.type === 'buffer' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] uppercase font-mono opacity-50">Distance</label>
                              <input 
                                type="number" 
                                value={step.params.distance}
                                onChange={(e) => updateStepParams(step.id, { distance: parseFloat(e.target.value) })}
                                className="w-full bg-transparent border-b border-[#141414] text-xs py-1 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-mono opacity-50">Units</label>
                              <select 
                                value={step.params.units}
                                onChange={(e) => updateStepParams(step.id, { units: e.target.value })}
                                className="w-full bg-transparent border-b border-[#141414] text-xs py-1 focus:outline-none"
                              >
                                <option value="kilometers">KM</option>
                                <option value="meters">Meters</option>
                                <option value="miles">Miles</option>
                              </select>
                            </div>
                          </div>
                        )}
                        {step.type === 'simplify' && (
                          <div>
                            <label className="text-[9px] uppercase font-mono opacity-50">Tolerance</label>
                            <input 
                              type="number" 
                              step="0.001"
                              value={step.params.tolerance}
                              onChange={(e) => updateStepParams(step.id, { tolerance: parseFloat(e.target.value) })}
                              className="w-full bg-transparent border-b border-[#141414] text-xs py-1 focus:outline-none"
                            />
                          </div>
                        )}
                        {step.type === 'filter' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] uppercase font-mono opacity-50">Property</label>
                              <input 
                                type="text" 
                                placeholder="e.g. name"
                                value={step.params.property || ''}
                                onChange={(e) => updateStepParams(step.id, { property: e.target.value })}
                                className="w-full bg-transparent border-b border-[#141414] text-xs py-1 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-mono opacity-50">Value</label>
                              <input 
                                type="text" 
                                placeholder="e.g. London"
                                value={step.params.value || ''}
                                onChange={(e) => updateStepParams(step.id, { value: e.target.value })}
                                className="w-full bg-transparent border-b border-[#141414] text-xs py-1 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {step.type === 'centroid' && (
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              id={`centroid-${step.id}`}
                              checked={step.params.perFeature}
                              onChange={(e) => updateStepParams(step.id, { perFeature: e.target.checked })}
                              className="accent-[#141414]"
                            />
                            <label htmlFor={`centroid-${step.id}`} className="text-[10px] uppercase font-mono">Per Feature</label>
                          </div>
                        )}
                        {['buffer', 'simplify', 'filter', 'centroid'].indexOf(step.type) === -1 && (
                          <p className="text-[10px] italic opacity-40">No parameters required for this operation.</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 border-t border-[#141414] relative">
            <button 
              onClick={() => setShowAddStep(!showAddStep)}
              className="w-full py-3 border border-[#141414] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
            >
              <Plus size={14} /> Add Step
            </button>

            <AnimatePresence>
              {showAddStep && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-[#141414] shadow-2xl z-[70] max-h-[400px] overflow-y-auto"
                >
                  <div className="p-3 border-b border-[#141414] flex justify-between items-center bg-[#E4E3E0]/20">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Select Operation</span>
                    <button onClick={() => setShowAddStep(false)}><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-[#141414]/10">
                    {OPERATIONS.map((op) => (
                      <button
                        key={op.type}
                        onClick={() => addStep(op.type)}
                        className="flex items-start gap-3 p-4 text-left hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors group"
                      >
                        <div className="mt-0.5"><op.icon size={16} /></div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">{op.label}</p>
                          <p className="text-[10px] opacity-60 group-hover:opacity-80">{op.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141414] p-4 bg-white/50 backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center text-[10px] font-mono uppercase tracking-widest opacity-40">
          <span>&copy; 2026 Geospatial Zone</span>
          <div className="flex gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Documentation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
