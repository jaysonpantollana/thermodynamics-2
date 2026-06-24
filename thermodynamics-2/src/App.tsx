import {useState, useCallback} from 'react';
import {Scene3D, Sidebar, InfoPanel, Controls} from './thermo';

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowEnabled, setFlowEnabled] = useState(true);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a1a]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-[50px] bg-[rgba(10,10,30,0.85)] border-b border-[rgba(0,240,255,0.2)] flex items-center px-5 z-[100]">
        <h1 className="text-neon-cyan text-sm font-medium tracking-[1px] text-glow-cyan">
          SINTER HEAT RECOVERY POWER PLANT
        </h1>
        <span className="text-[rgba(255,255,255,0.4)] text-[11px] ml-4 tracking-[0.5px]">
          Interactive 3D Process Visualization
        </span>
      </div>

      {/* Main Layout */}
      <div className="flex h-full pt-[50px]">
        <Sidebar selectedId={selectedId} onSelect={handleSelect} />
        <div className="flex-1 relative">
          <Scene3D
            selectedId={selectedId}
            onSelect={handleSelect}
            flowEnabled={flowEnabled}
          />
        </div>
      </div>

      <InfoPanel selectedId={selectedId} onClose={() => setSelectedId(null)} />
      <Controls
        flowEnabled={flowEnabled}
        onToggleFlow={() => setFlowEnabled(!flowEnabled)}
      />
    </div>
  );
}
