import { useState } from 'react';
import { Snowflake, ArrowRight } from 'lucide-react';

type CalcType = 'reversible' | 'irreversible' | 'phase';

export default function EntropyCalc() {
  const [calcType, setCalcType] = useState<CalcType>('reversible');
  const [values, setValues] = useState({
    q: '',
    t: '',
    m: '',
    l: '',
    tf: '',
    ti: '',
  });
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const { q, t, m, l, tf, ti } = values;
    
    switch (calcType) {
      case 'reversible':
        if (q && t) setResult(parseFloat(q) / parseFloat(t));
        break;
      case 'phase':
        if (m && l && t) setResult((parseFloat(m) * parseFloat(l)) / parseFloat(t));
        break;
      case 'irreversible':
        if (m && tf && ti) {
          // Assuming specific heat capacity of water: 4186 J/(kg·K)
          const cp = 4186;
          setResult(parseFloat(m) * cp * Math.log(parseFloat(tf) / parseFloat(ti)));
        }
        break;
    }
  };

  const reset = () => {
    setValues({ q: '', t: '', m: '', l: '', tf: '', ti: '' });
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
        <h2 className="text-sm font-mono text-neon-purple tracking-widest text-glow-purple">ENTROPY CALCULATOR</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
      </div>

      {/* Calculation Type Selector */}
      <div className="bg-panel border-glow-purple rounded-lg p-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'reversible' as CalcType, label: 'REVERSIBLE', formula: 'ΔS = Q/T' },
            { id: 'phase' as CalcType, label: 'PHASE CHANGE', formula: 'ΔS = mL/T' },
            { id: 'irreversible' as CalcType, label: 'TEMP CHANGE', formula: 'ΔS = mC·ln(Tf/Ti)' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setCalcType(type.id);
                setResult(null);
              }}
              className={`
                p-4 rounded text-center transition-all
                ${calcType === type.id
                  ? 'bg-purple-900/30 border border-purple-500/50'
                  : 'bg-cyber-dark/50 border border-cyber-border/50 hover:border-purple-500/30'
                }
              `}
            >
              <div className={`text-xs font-mono ${calcType === type.id ? 'text-purple-400' : 'text-text-secondary'}`}>
                {type.label}
              </div>
              <div className="text-[10px] font-mono text-text-dim mt-1">{type.formula}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-panel border-glow-purple rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Snowflake size={14} className="text-neon-purple" />
            <span className="text-xs font-mono text-neon-purple tracking-wider">INPUT VALUES</span>
          </div>

          <div className="space-y-4">
            {calcType === 'reversible' && (
              <>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    HEAT TRANSFER Q (J)
                  </label>
                  <input
                    type="number"
                    value={values.q}
                    onChange={(e) => setValues({ ...values, q: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter heat transfer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    TEMPERATURE T (K)
                  </label>
                  <input
                    type="number"
                    value={values.t}
                    onChange={(e) => setValues({ ...values, t: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter temperature"
                  />
                </div>
              </>
            )}

            {calcType === 'phase' && (
              <>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    MASS m (kg)
                  </label>
                  <input
                    type="number"
                    value={values.m}
                    onChange={(e) => setValues({ ...values, m: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter mass"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    LATENT HEAT L (J/kg)
                  </label>
                  <input
                    type="number"
                    value={values.l}
                    onChange={(e) => setValues({ ...values, l: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter latent heat"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    TEMPERATURE T (K)
                  </label>
                  <input
                    type="number"
                    value={values.t}
                    onChange={(e) => setValues({ ...values, t: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter phase change temperature"
                  />
                </div>
              </>
            )}

            {calcType === 'irreversible' && (
              <>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    MASS m (kg)
                  </label>
                  <input
                    type="number"
                    value={values.m}
                    onChange={(e) => setValues({ ...values, m: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter mass"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    INITIAL TEMPERATURE T_i (K)
                  </label>
                  <input
                    type="number"
                    value={values.ti}
                    onChange={(e) => setValues({ ...values, ti: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter initial temperature"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                    FINAL TEMPERATURE T_f (K)
                  </label>
                  <input
                    type="number"
                    value={values.tf}
                    onChange={(e) => setValues({ ...values, tf: e.target.value })}
                    className="w-full px-4 py-3 bg-cyber-dark border border-purple-500/30 rounded font-mono text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter final temperature"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-purple-500/20 border border-purple-500 rounded font-mono text-sm text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              CALCULATE
            </button>
            <button
              onClick={reset}
              className="px-4 py-3 bg-cyber-dark border border-cyber-border rounded font-mono text-sm text-text-secondary hover:border-purple-500/30 transition-colors"
            >
              RESET
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="bg-panel border-glow-purple rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-mono text-neon-purple tracking-wider">RESULT</span>
          </div>

          {result !== null ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-[10px] font-mono text-text-dim tracking-widest mb-4">
                  ENTROPY CHANGE
                </div>
                <div className="text-5xl font-bold font-mono text-purple-400 text-glow-purple">
                  {result.toFixed(4)}
                </div>
                <div className="text-lg font-mono text-purple-400/70 mt-2">J/K</div>
              </div>

              {/* Second Law Check */}
              <div className={`
                p-4 rounded-lg border
                ${result >= 0
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-red-900/20 border-red-500/30'
                }
              `}>
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className={result >= 0 ? 'text-green-400' : 'text-red-400'} />
                  <span className={`text-xs font-mono ${result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result >= 0 ? 'ENTROPY INCREASES (ISOLATED SYSTEM)' : 'ENTROPY DECREASES (NON-ISOLATED)'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-text-dim mt-2">
                  ΔS ≥ 0 for irreversible processes (Second Law)
                </div>
              </div>

              {/* Formula */}
              <div className="p-4 bg-cyber-dark/30 rounded border border-cyber-border/30">
                <div className="text-[10px] font-mono text-text-dim tracking-widest mb-2">FORMULA</div>
                <div className="font-mono text-sm text-purple-400">
                  {calcType === 'reversible' && 'ΔS = Q / T'}
                  {calcType === 'phase' && 'ΔS = mL / T'}
                  {calcType === 'irreversible' && 'ΔS = mC·ln(Tf/Ti)'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-dim font-mono text-sm">
              Select calculation type and enter values
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
