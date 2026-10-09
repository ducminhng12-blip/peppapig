import React from 'react';
import { TycoonEngine } from '../game/tycoonEngine';
import { useTycoon } from '../game/useTycoon';
import { ZONES } from '../game/tycoonData';

/**
 * Bản đồ mặt bằng 2D: mỗi khu là 1 ô có diện tích tỷ lệ với m².
 * Thêm khu mới = thêm 1 phần tử vào ZONES (tycoonData.ts), bản đồ tự cập nhật.
 */
export const FloorPlan: React.FC<{ engine: TycoonEngine }> = ({ engine }) => {
  const game = useTycoon(engine);
  const loc = engine.location;
  const used = engine.usedArea();
  const free = Math.max(0, loc.area - used);
  const overflow = used > loc.area;

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="font-bold text-white">
          🗺️ Mặt bằng {loc.emoji} {loc.name}
        </div>
        <div className={`font-mono ${overflow ? 'text-rose-400' : 'text-slate-300'}`}>
          {used} / {loc.area}m² (còn trống {free}m²)
        </div>
      </div>
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-lg border-2 border-slate-700 bg-slate-900/60"
        style={{ minHeight: 120 }}
      >
        {ZONES.map(z => {
          const open = game.zones[z.id];
          return (
            <div
              key={z.id}
              title={`${z.name} • ${z.area}m²`}
              className="rounded-md flex flex-col items-center justify-center text-center p-1.5 text-[10px] leading-tight"
              style={{
                flexGrow: z.area,
                flexBasis: `${Math.max(70, z.area * 4)}px`,
                minHeight: 64,
                background: open ? `${z.color}33` : 'transparent',
                border: `1.5px ${open ? 'solid' : 'dashed'} ${open ? z.color : '#475569'}`,
                color: open ? '#e2e8f0' : '#64748b',
              }}
            >
              <div className="text-base">{z.emoji}</div>
              <div className="font-bold">{z.name}</div>
              <div className="font-mono opacity-80">{z.area}m²</div>
              {!open && <div>🔒 {z.unlockCost > 0 ? `${(z.unlockCost / 1000).toLocaleString('vi-VN')}k` : ''}</div>}
            </div>
          );
        })}
        {free > 0 && (
          <div
            className="rounded-md flex items-center justify-center text-[10px] text-slate-600 border border-dotted border-slate-700"
            style={{ flexGrow: free, flexBasis: `${Math.max(50, free * 3)}px`, minHeight: 64 }}
          >
            Trống {free}m²
          </div>
        )}
      </div>
    </div>
  );
};
