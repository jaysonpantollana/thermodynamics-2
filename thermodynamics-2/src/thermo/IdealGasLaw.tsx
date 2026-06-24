import { useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';

type SolveFor = 'P' | 'V' | 'n' | 'T';

export default function IdealGasLaw() {
  const [solveFor, setSolveFor] = useState<SolveFor>('P');
  const [values, setValues] = useState({
    P: '',
    V: '',
    n: '',
    T: '',
  });
  const [result, setResult] = useState<number | null>(null);

  const R = 8.314;

  const calculate = () => {
    const { P, V, n, T } = values;
    switch (solveFor) {
      case 'P':
        if (V && n && T) setResult((parseFloat(n) * R * parseFloat(T)) / parseFloat(V));
        break;
      case 'V':
        if (P && n && T) setResult((parseFloat(n) * R * parseFloat(T)) / parseFloat(P));
        break;
      case 'n':
        if (P && V && T) setResult((parseFloat(P) * parseFloat(V)) / (R * parseFloat(T)));
        break;
      case 'T':
        if (P && V && n) setResult((parseFloat(P) * parseFloat(V)) / (parseFloat(n) * R));
        break;
    }
  };

  const reset = () => {
    setValues({ P: '', V: '', n: '', T: '' });
    setResult(null);
  };

  const units: Record<SolveFor, string> = {
    P: 'Pa',
    V: 'm³',
    n: 'mol',
    T: 'K',
  };

  const labels: Record<SolveFor, string> = {
    P: 'Pressure',
    V: 'Volume',
    n: 'Moles',
    T: 'Temperature',
  };

  const otherFields = (['P', 'V', 'n', 'T'] as SolveFor[]).filter(f => f !== solveFor);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
        <h2 className="text-sm font-mono text-neon-cyan tracking-widest text-glow-cyan">IDEAL GAS LAW</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
      </div>

      {/* Equation Display */}
      <div className="bg-panel border-glow rounded-lg p-6 text-center">
        <div className="text-3xl font-mono text-neon-cyan text-glow-cyan mb-2">PV = nRT</div>
        <div className="text-xs text-text-dim font-mono">
          R = {R} J/(mol·K) | Universal Gas Constant
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-panel border-glow rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calculator size={14} className="text-neon-cyan" />
            <span className="text-xs font-mono text-neon-cyan tracking-wider">CALCULATOR</span>
          </div>

          {/* Solve For Selector */}
          <div className="mb-6">
            <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">SOLVE FOR</label>
            <div className="grid grid-cols-4 gap-2">
              {(['P', 'V', 'n', 'T'] as SolveFor[]).map((field) => (
                <button
                  key={field}
                  onClick={() => {
                    setSolveFor(field);
                    setResult(null);
                  }}
                  className={`
                    py-2 rounded font-mono text-sm transition-all
                    ${solveFor === field
                      ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan'
                      : 'bg-cyber-dark border border-cyber-border text-text-secondary hover:border-neon-cyan/30'
                    }
                  `}
                >
                  {field}
                </button>
              ))}
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {otherFields.map((field) => (
              <div key={field}>
                <label className="text-[10px] font-mono text-text-dim tracking-widest block mb-2">
                  {labels[field]} ({units[field]})
                </label>
                <input
                  type="number"
                  value={values[field]}
                  onChange={(e) => setValues({ ...values, [field]: e.target.value })}
                  className="w-full px-4 py-3 bg-cyber-dark border border-cyber-border rounded font-mono text-text-primary focus:outline-none focus:border-neon-cyan transition-colors"
                  placeholder={`Enter ${labels[field].toLowerCase()}`}
                />
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={calculate}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-neon-cyan/20 border border-neon-cyan rounded font-mono text-sm text-neon-cyan hover:bg-neon-cyan/30 transition-colors"
            >
              <Calculator size={14} />
              CALCULATE
            </button>
            <button
              onClick={reset}
              className="px-4 py-3 bg-cyber-dark border border-cyber-border rounded font-mono text-sm text-text-secondary hover:border-neon-orange/30 hover:text-neon-orange transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="bg-panel border-glow-purple rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-mono text-neon-purple tracking-wider">RESULT</span>
          </div>

          {result !== null ? (
            <div className="text-center py-12">
              <div className="text-[10px] font-mono text-text-dim tracking-widest mb-4">
                {labels[solveFor]}
              </div>
              <div className="text-4xl font-bold font-mono text-neon-purple text-glow-purple">
                {result.toFixed(4)}
              </div>
              <div className="text-lg font-mono text-neon-purple/70 mt-2">{units[solveFor]}</div>
              
              <div className="mt-8 p-4 bg-cyber-dark/50 rounded border border-cyber-border/50">
                <div className="text-[10px] font-mono text-text-dim tracking-widest mb-2">EQUATION USED</div>
                <div className="font-mono text-sm text-text-secondary">
                  {solveFor} = {
                    solveFor === 'P' ? 'nRT / V' :
                    solveFor === 'V' ? 'nRT / P' :
                    solveFor === 'n' ? 'PV / RT' :
                    'PV / nR'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-dim font-mono text-sm">
              Enter values and click Calculate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
