import { useState } from 'react';
import { Flame, ArrowRight } from 'lucide-react';

export default function CarnotCycle() {
  const [tHot, setTHot] = useState('');
  const [tCold, setTCold] = useState('');
  const [efficiency, setEfficiency] = useState<number | null>(null);
  const [work, setWork] = useState<number | null>(null);
  const [heatIn, setHeatIn] = useState('');

  const calculate = () => {
    const Th = parseFloat(tHot);
    const Tc = parseFloat(tCold);
    const Qh = parseFloat(heatIn);
    
    if (Th && Tc) {
      const eff = 1 - Tc / Th;
      setEfficiency(eff);
      
      if (Qh && !isNaN(eff)) {
        setWork(eff * Qh);
      }
    }
  };

  const reset = () => {
    setTHot('');
    setTCold('');
    setHeatIn('');
    setEfficiency(null);
    setWork(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/30 to-transparent" />
        <h2 className="text-sm font-mono text-neon-orange tracking-widest" style={{ textShadow: '0 0 10px rgba(255, 102, 0, 0.8)' }}>
          CARNOT CYCLE
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/30 to-transparent" />
      </div>

      {/* Visual Diagram */}
      <div className="bg-panel border border-orange-500/30 rounded-lg p-6">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center p-6 bg-red-900/20 rounded-lg border border-red-500/30">
            <Flame size={32} className="text-red-500 mx-auto mb-2" />
            <div className="text-sm font-mono text-red-400">HOT RESERVOIR</div>
            <div className="text-2xl font-bold font-mono text-red-400 mt-2">
              {tHot ? `${tHot} K` : 'T_H'}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-mono text-orange-400">Q_H</div>
            <ArrowRight size={24} className="text-orange-500" />
          </div>
          
          <div className="text-center p-6 bg-orange-900/20 rounded-lg border border-orange-500/30">
            <div className="text-4xl font-bold font-mono text-orange-400">ENGINE</div>
            <div className="text-[10px] font-mono text-orange-400/70 mt-2">CARNOT</div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-mono text-orange-400">W</div>
            <ArrowRight size={24} className="text-orange-500" />
          </div>
          
          <div className="text-center p-6 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <Flame size={32} className="text-blue-500 mx-auto mb-2" />
            <div className="text-sm font-mono text-blue-400">COLD RESERVOIR</div>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-2">
              {tCold ? `${tCold} K` : 'T_L'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-panel border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Flame size={14} className="text-neon-orange" />
            <span className="text-xs font-mono text-neon-orange tracking-wider">PARAMETERS</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                HOT RESERVOIR TEMPERATURE (K)
              </label>
              <input
                type="number"
                value={tHot}
                onChange={(e) => setTHot(e.target.value)}
                className="w-full px-4 py-3 bg-cyber-dark border border-red-500/30 rounded font-mono text-red-400 focus:outline-none focus:border-red-500 transition-colors"
                placeholder="e.g., 500"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                COLD RESERVOIR TEMPERATURE (K)
              </label>
              <input
                type="number"
                value={tCold}
                onChange={(e) => setTCold(e.target.value)}
                className="w-full px-4 py-3 bg-cyber-dark border border-blue-500/30 rounded font-mono text-blue-400 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g., 300"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                HEAT INPUT Q_H (J) [OPTIONAL]
              </label>
              <input
                type="number"
                value={heatIn}
                onChange={(e) => setHeatIn(e.target.value)}
                className="w-full px-4 py-3 bg-cyber-dark border border-cyber-border rounded font-mono text-text-primary focus:outline-none focus:border-neon-orange transition-colors"
                placeholder="e.g., 1000"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-orange-500/20 border border-orange-500 rounded font-mono text-sm text-orange-400 hover:bg-orange-500/30 transition-colors"
            >
              CALCULATE
            </button>
            <button
              onClick={reset}
              className="px-4 py-3 bg-cyber-dark border border-cyber-border rounded font-mono text-sm text-text-secondary hover:border-neon-orange/30 transition-colors"
            >
              RESET
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-panel border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-mono text-neon-orange tracking-wider">RESULTS</span>
          </div>

          {efficiency !== null ? (
            <div className="space-y-6">
              {/* Efficiency */}
              <div className="text-center p-6 bg-cyber-dark/50 rounded-lg border border-cyber-border/50">
                <div className="text-[10px] font-mono text-text-dim tracking-widest mb-2">CARNOT EFFICIENCY</div>
                <div className="text-4xl font-bold font-mono text-orange-400" style={{ textShadow: '0 0 10px rgba(255, 102, 0, 0.8)' }}>
                  {(efficiency * 100).toFixed(2)}%
                </div>
                <div className="text-xs font-mono text-text-dim mt-2">η = 1 - T_L/T_H</div>
              </div>

              {/* Work Output */}
              {work !== null && (
                <div className="text-center p-6 bg-cyber-dark/50 rounded-lg border border-cyber-border/50">
                  <div className="text-[10px] font-mono text-text-dim tracking-widest mb-2">WORK OUTPUT</div>
                  <div className="text-3xl font-bold font-mono text-neon-cyan">
                    {work.toFixed(2)} J
                  </div>
                </div>
              )}

              {/* Formula Breakdown */}
              <div className="p-4 bg-cyber-dark/30 rounded border border-cyber-border/30">
                <div className="text-[10px] font-mono text-text-dim tracking-widest mb-3">CALCULATION</div>
                <div className="font-mono text-xs text-text-secondary space-y-1">
                  <div>η = 1 - {tCold}/{tHot}</div>
                  <div>η = 1 - {(parseFloat(tCold) / parseFloat(tHot)).toFixed(4)}</div>
                  <div className="text-orange-400">η = {efficiency.toFixed(4)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-dim font-mono text-sm">
              Enter temperatures to calculate efficiency
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
