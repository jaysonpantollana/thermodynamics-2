import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { BarChart3 } from 'lucide-react';

type Substance = 'water' | 'co2' | 'ammonia';

interface PhasePoint {
  temp: number;
  pressure: number;
}

const substances: Record<Substance, { name: string; triple: PhasePoint; critical: PhasePoint; color: string }> = {
  water: {
    name: 'Water (H\u2082O)',
    triple: { temp: 273.16, pressure: 0.611 },
    critical: { temp: 647.1, pressure: 22064 },
    color: '#00e5ff',
  },
  co2: {
    name: 'Carbon Dioxide (CO\u2082)',
    triple: { temp: 216.55, pressure: 517 },
    critical: { temp: 304.13, pressure: 7377 },
    color: '#d500f9',
  },
  ammonia: {
    name: 'Ammonia (NH\u2083)',
    triple: { temp: 195.42, pressure: 6.06 },
    critical: { temp: 405.4, pressure: 11333 },
    color: '#ff9100',
  },
};

const vaporPressureCoefficients: Record<Substance, [number, number, number, number, number]> = {
  water: [-7.76451e3, 8.32044e0, -7.63481e-3, 4.16768e-6, 3.60696e1],
  co2: [8.78509e2, -6.35297e0, 1.80786e-2, -2.21835e-5, -3.82334e1],
  ammonia: [4.42647e3, 4.77934e0, -3.98422e-3, 1.36937e-6, -8.25078e0],
};

function antoineVaporPressure(substance: Substance, tempC: number): number {
  const [a, b, c, d, e] = vaporPressureCoefficients[substance];
  const T = tempC;
  const logP = a / T + b + c * T + d * T * T + e * Math.log10(T);
  return Math.pow(10, logP);
}

export default function PhaseDiagram() {
  const [substance, setSubstance] = useState<Substance>('water');
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; phase: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = substances[substance];

  useEffect(() => {
    drawDiagram();
  }, [substance]);

  const drawDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 40, right: 40, bottom: 50, left: 80 };

    ctx.clearRect(0, 0, w, h);

    const maxTemp = data.critical.temp * 1.15;
    const minTemp = 0;
    const maxP = data.critical.pressure * 2.5;
    const minP = 0;

    const toX = (t: number) => padding.left + ((t - minTemp) / (maxTemp - minTemp)) * (w - padding.left - padding.right);
    const toY = (p: number) => h - padding.bottom - (Math.log10(p + 1) / Math.log10(maxP + 1)) * (h - padding.top - padding.bottom);

    const phases: Record<string, { r: number; g: number; b: number }> = {
      solid: { r: 0, g: 150, b: 255 },
      liquid: { r: 213, g: 0, b: 249 },
      gas: { r: 0, g: 230, b: 118 },
    };

    const drawPhaseRegions = () => {
      for (let px = 0; px < w; px++) {
        for (let py = 0; py < h; py++) {
          const t = minTemp + (px - padding.left) / (w - padding.left - padding.right) * (maxTemp - minTemp);
          const pFrac = (1 - (py - padding.top) / (h - padding.top - padding.bottom));
          const p = (Math.pow(10, pFrac * Math.log10(maxP + 1)) - 1);

          if (t < minTemp || t > maxTemp || p < minP || p > maxP) continue;
          if (px < padding.left || px > w - padding.right || py < padding.top || py > h - padding.bottom) continue;

          const vp = antoineVaporPressure(substance, t);
          const tripleP = data.triple.pressure;
          const critT = data.critical.temp;
          const critP = data.critical.pressure;

          let phase = 'gas';
          if (t < data.triple.temp) {
            phase = p > tripleP ? 'solid' : 'gas';
          } else if (t < critT) {
            const interpP = tripleP + (critP - tripleP) * ((t - data.triple.temp) / (critT - data.triple.temp));
            phase = p > interpP ? 'liquid' : 'gas';
          } else {
            phase = 'gas';
          }

          if (p > critP && t > critT) phase = 'gas';

          const c = phases[phase];
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    };

    drawPhaseRegions();

    ctx.strokeStyle = '#1a3a4a';
    ctx.lineWidth = 1;
    const gridCountX = 8;
    const gridCountY = 6;
    for (let i = 0; i <= gridCountX; i++) {
      const x = padding.left + (i / gridCountX) * (w - padding.left - padding.right);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, h - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = '#556677';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const tempVal = Math.round(minTemp + (i / gridCountX) * (maxTemp - minTemp));
      ctx.fillText(`${tempVal}`, x, h - padding.bottom + 18);
    }
    for (let i = 0; i <= gridCountY; i++) {
      const y = padding.top + (i / gridCountY) * (h - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#88aacc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature (K)', w / 2, h - 5);
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pressure (kPa)', 0, 0);
    ctx.restore();

    ctx.beginPath();
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = data.color;
    ctx.shadowBlur = 8;

    const step = 2;
    let started = false;
    for (let t = data.triple.temp; t <= data.critical.temp; t += step) {
      const vp = antoineVaporPressure(substance, t);
      const x = toX(t);
      const y = toY(vp);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;

    for (let t = 0; t <= data.triple.temp; t += step) {
      const p = data.triple.pressure;
      if (t === 0) {
        ctx.beginPath();
        ctx.moveTo(toX(t), toY(p));
      }
      ctx.lineTo(toX(t), toY(p));
    }
    ctx.stroke();

    for (let t = data.triple.temp; t <= data.triple.temp + 10; t += step) {
      const p = data.triple.pressure + 2;
    }

    ctx.beginPath();
    ctx.moveTo(toX(data.triple.temp), toY(data.triple.pressure));
    ctx.lineTo(toX(data.triple.temp), toY(maxP * 0.01));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(toX(data.triple.temp), toY(data.triple.pressure), 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(toX(data.critical.temp), toY(data.critical.pressure), 6, 0, Math.PI * 2);
    ctx.fillStyle = data.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('TP', toX(data.triple.temp) + 12, toY(data.triple.pressure) + 4);
    ctx.fillText('CP', toX(data.critical.temp) + 12, toY(data.critical.pressure) + 4);

    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    const solidCx = toX(data.triple.temp * 0.35);
    const solidCy = toY(data.critical.pressure * 1.2);
    ctx.fillStyle = 'rgba(0, 150, 255, 0.7)';
    ctx.fillText('SOLID', solidCx, solidCy);

    const liquidCx = toX(data.triple.temp + (data.critical.temp - data.triple.temp) * 0.45);
    const liquidCy = toY(data.critical.pressure * 1.5);
    ctx.fillStyle = 'rgba(213, 0, 249, 0.7)';
    ctx.fillText('LIQUID', liquidCx, liquidCy);

    const gasCx = toX(data.critical.temp * 0.7);
    const gasCy = toY(data.critical.pressure * 0.15);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.7)';
    ctx.fillText('GAS', gasCx, gasCy);

    ctx.fillStyle = '#aabbcc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Triple Point: ${data.triple.temp.toFixed(2)} K, ${data.triple.pressure.toFixed(2)} kPa`, padding.left + 10, padding.top + 15);
    ctx.fillText(`Critical Point: ${data.critical.temp.toFixed(2)} K, ${data.critical.pressure.toFixed(2)} kPa`, padding.left + 10, padding.top + 32);
  };

  const handleCanvasMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const padding = { top: 40, right: 40, bottom: 50, left: 80 };
    const maxTemp = data.critical.temp * 1.15;
    const maxP = data.critical.pressure * 2.5;

    const t = ((x - padding.left) / (canvas.width - padding.left - padding.right)) * maxTemp;
    const pFrac = 1 - (y - padding.top) / (canvas.height - padding.top - padding.bottom);
    const p = Math.pow(10, pFrac * Math.log10(maxP + 1)) - 1;

    if (t < 0 || p < 0) {
      setHoverPoint(null);
      return;
    }

    let phase = 'Gas';
    if (t < data.triple.temp) {
      phase = p > data.triple.pressure ? 'Solid' : 'Gas';
    } else if (t < data.critical.temp) {
      const vp = antoineVaporPressure(substance, t);
      phase = p > vp ? 'Liquid' : 'Gas';
    }

    if (p > data.critical.pressure && t > data.critical.temp) phase = 'Supercritical';

    setHoverPoint({ x: t, y: p, phase });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
        <h2 className="text-sm font-mono text-neon-cyan tracking-widest text-glow-cyan">PHASE DIAGRAM</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono text-text-dim tracking-widest">SUBSTANCE:</span>
        {(Object.keys(substances) as Substance[]).map((s) => (
          <button
            key={s}
            onClick={() => setSubstance(s)}
            className={`
              px-4 py-2 rounded font-mono text-xs tracking-wider transition-all duration-300
              border
              ${substance === s
                ? 'border-neon-cyan bg-cyber-dark/80 text-neon-cyan text-glow-cyan'
                : 'border-cyber-border text-text-secondary hover:border-neon-cyan/30'
              }
            `}
          >
            {substances[s].name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel border-glow rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-neon-cyan" />
            <span className="text-xs font-mono text-neon-cyan tracking-wider">P-T PHASE DIAGRAM</span>
          </div>
          <canvas
            ref={canvasRef}
            width={700}
            height={450}
            className="w-full rounded bg-cyber-dark/50 cursor-crosshair"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoverPoint(null)}
          />
          {hoverPoint && (
            <div className="mt-3 flex gap-6 font-mono text-xs">
              <span className="text-text-dim">T: <span className="text-neon-cyan">{hoverPoint.x.toFixed(1)} K</span></span>
              <span className="text-text-dim">P: <span className="text-neon-purple">{hoverPoint.y.toFixed(1)} kPa</span></span>
              <span className="text-text-dim">Phase: <span className="text-neon-green">{hoverPoint.phase}</span></span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-panel border-glow-purple rounded-lg p-4">
            <div className="text-xs font-mono text-neon-purple tracking-wider mb-3">PROPERTIES</div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-text-dim">Triple Point</span>
                <span className="text-text-primary">{data.triple.temp.toFixed(2)} K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Triple Pressure</span>
                <span className="text-text-primary">{data.triple.pressure.toFixed(2)} kPa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Critical Point</span>
                <span className="text-text-primary">{data.critical.temp.toFixed(2)} K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Critical Pressure</span>
                <span className="text-text-primary">{data.critical.pressure.toFixed(2)} kPa</span>
              </div>
            </div>
          </div>

          <div className="bg-panel border-glow rounded-lg p-4">
            <div className="text-xs font-mono text-neon-orange tracking-wider mb-3">LEGEND</div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(0, 150, 255, 0.6)' }} />
                <span className="text-text-secondary">Solid Phase</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(213, 0, 249, 0.6)' }} />
                <span className="text-text-secondary">Liquid Phase</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(0, 230, 118, 0.6)' }} />
                <span className="text-text-secondary">Gas Phase</span>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cyber-border/30">
                <div className="w-3 h-3 rounded-full bg-white" />
                <span className="text-text-secondary">Triple Point (TP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: data.color }} />
                <span className="text-text-secondary">Critical Point (CP)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
