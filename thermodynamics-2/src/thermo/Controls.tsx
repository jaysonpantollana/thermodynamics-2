interface Props {
  flowEnabled: boolean;
  onToggleFlow: () => void;
}

export default function Controls({flowEnabled, onToggleFlow}: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      <button
        onClick={onToggleFlow}
        className="px-4 py-2.5 bg-[rgba(10,10,30,0.85)] border border-[rgba(0,240,255,0.3)] rounded-md text-neon-cyan text-xs transition-all duration-200 hover:bg-[rgba(0,240,255,0.15)]"
      >
        Flow: {flowEnabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
