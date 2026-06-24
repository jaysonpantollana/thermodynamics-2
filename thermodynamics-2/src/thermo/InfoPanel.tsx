import {componentData} from './data';

interface Props {
  selectedId: string | null;
  onClose: () => void;
}

export default function InfoPanel({selectedId, onClose}: Props) {
  const data = selectedId ? componentData[selectedId] : null;
  if (!data) return null;

  return (
    <div className="fixed top-[50px] right-0 w-[320px] bottom-0 bg-[rgba(10,10,30,0.92)] border-l border-[rgba(0,240,255,0.15)] z-[90] p-5 overflow-y-auto animate-slide-in scrollbar-cyber">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-6 h-6 rounded-full border border-[rgba(255,255,255,0.2)] bg-transparent text-[rgba(255,255,255,0.5)] hover:border-neon-pink hover:text-neon-pink flex items-center justify-center text-xs transition-all duration-200"
      >
        &times;
      </button>
      <h2 className="text-neon-cyan text-lg font-medium mb-1">{data.name}</h2>
      <span className="inline-block px-2 py-0.5 bg-[rgba(0,240,255,0.15)] rounded-full text-neon-cyan text-[10px] mb-4">
        {data.category.toUpperCase()}
      </span>
      <p className="text-[rgba(255,255,255,0.6)] text-xs leading-relaxed mb-4">{data.desc}</p>
      <div className="text-neon-cyan text-[10px] uppercase tracking-[2px] mb-2 pb-1 border-b border-[rgba(0,240,255,0.15)] font-mono">
        Specifications
      </div>
      {Object.entries(data.specs).map(([k, v]) => (
        <div key={k} className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.05)]">
          <span className="text-[rgba(255,255,255,0.4)] text-[11px]">{k}</span>
          <span className="text-[rgba(255,255,255,0.8)] text-[11px]">{v}</span>
        </div>
      ))}
    </div>
  );
}
