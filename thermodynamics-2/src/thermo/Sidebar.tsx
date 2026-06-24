import {componentData} from './data';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const categories = {
  power: {title: 'Power Generation', ids: ['sinterMachine', 'turbine', 'generator']},
  boiler: {title: 'Boiler System', ids: ['boiler', 'superheater', 'evaporator', 'economizer', 'steamDrum', 'feedPump']},
  cooling: {title: 'Cooling System', ids: ['condenser', 'condensatePump', 'seaWaterPump']},
  process: {title: 'Process Flow', ids: ['inducedFan']},
};

export default function Sidebar({selectedId, onSelect}: Props) {
  return (
    <div className="w-[260px] h-full bg-[rgba(10,10,30,0.9)] border-r border-[rgba(0,240,255,0.15)] overflow-y-auto p-4 scrollbar-cyber flex-shrink-0">
      {Object.entries(categories).map(([cat, {title, ids}]) => (
        <div key={cat} className="mb-4">
          <div className="text-neon-cyan text-[10px] uppercase tracking-[2px] mb-2 pb-1 border-b border-[rgba(0,240,255,0.15)] font-mono">
            {title}
          </div>
          {ids.map(id => {
            const data = componentData[id];
            if (!data) return null;
            const hex = data.color.toString(16).padStart(6, '0');
            const isActive = selectedId === id;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`w-full px-3 py-2 mb-1 text-left text-xs rounded-md flex items-center gap-2.5 transition-all duration-200 border ${
                  isActive
                    ? 'bg-[rgba(0,240,255,0.2)] border-neon-cyan text-neon-cyan'
                    : 'bg-[rgba(0,240,255,0.05)] border-[rgba(0,240,255,0.1)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(0,240,255,0.15)] hover:border-[rgba(0,240,255,0.3)] hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: `#${hex}`}} />
                {data.name}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
