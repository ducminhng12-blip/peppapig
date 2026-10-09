import React, { useState } from 'react';
import { ScriptConfig } from '../data/csharpScripts';
import { Eye, ChevronDown, CheckSquare, Square, Disc, CircleDot, HelpCircle } from 'lucide-react';

interface UnityInspectorMockupProps {
  config: ScriptConfig;
}

export const UnityInspectorMockup: React.FC<UnityInspectorMockupProps> = ({ config }) => {
  const [selectedComponent, setSelectedComponent] = useState<'satisfaction' | 'station' | 'player' | 'money' | 'mobile_button'>('satisfaction');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>Mô Phỏng Giao Diện Unity Editor Inspector Thật</span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white mt-1">
            Minh Họa Trực Quan Cửa Sổ Inspector Trong Unity
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Xem trước chính xác từng ô nhập liệu, danh sách kéo thả và cấu hình cần điền trong Unity.
          </p>
        </div>

        {/* Tab switcher for components */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          {[
            { id: 'satisfaction', label: 'CustomerSatisfaction (Điểm Hài Lòng)' },
            { id: 'station', label: 'Bàn Máy (ComputerStation)' },
            { id: 'player', label: 'Camera Player (PlayerInteraction)' },
            { id: 'money', label: 'MoneyManager' },
            { id: 'mobile_button', label: 'Nút Mobile Button OnClick' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedComponent(tab.id as typeof selectedComponent)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedComponent === tab.id
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Realistic Unity Dark Theme Inspector Container */}
      <div className="max-w-xl mx-auto bg-[#2b2b2b] text-[#dcdcdc] rounded-xl border border-[#3e3e3e] shadow-2xl overflow-hidden font-sans text-xs select-none">
        {/* Unity Inspector Title Bar */}
        <div className="bg-[#3c3c3c] px-3 py-2 border-b border-[#202020] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#e0e0e0]">Inspector</span>
          </div>
          <div className="flex items-center gap-2 text-[#8a8a8a]">
            <span>Normal</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#505050]" />
          </div>
        </div>

        {/* GameObject Header (Name, Tag, Layer, Static checkbox) */}
        <div className="p-3 bg-[#383838] border-b border-[#282828] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#4a90e2] rounded flex items-center justify-center text-[10px] text-white font-bold">
              3D
            </div>
            <input
              type="text"
              readOnly
              value={
                selectedComponent === 'satisfaction'
                  ? 'Customer_Prefab (Clone)'
                  : selectedComponent === 'station'
                  ? 'BanMayTinh_01'
                  : selectedComponent === 'player'
                  ? 'Main Camera (Player)'
                  : selectedComponent === 'money'
                  ? 'MoneyManager'
                  : 'Btn_MobileInteract'
              }
              className="bg-[#2a2a2a] border border-[#202020] px-2 py-1 rounded text-[#ffffff] font-bold text-xs flex-1"
            />
            <div className="flex items-center gap-1 text-[#a0a0a0] text-[11px]">
              <Square className="w-3.5 h-3.5 text-[#606060]" />
              <span>Static</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1 bg-[#2e2e2e] border border-[#202020] px-2 py-1 rounded">
              <span className="text-[#808080]">Tag:</span>
              <span className="text-[#dcdcdc] font-semibold">
                {selectedComponent === 'satisfaction' ? 'Customer' : selectedComponent === 'station' ? 'ComputerStation' : 'Untagged'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#2e2e2e] border border-[#202020] px-2 py-1 rounded">
              <span className="text-[#808080]">Layer:</span>
              <span className="text-[#dcdcdc] font-semibold">
                {selectedComponent === 'satisfaction' ? 'Customer' : selectedComponent === 'station' ? 'Interactable' : 'Default'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Component Content Based On Selected Tab */}
        <div className="p-3 space-y-3">
          {/* COMPONENT: CustomerSatisfaction */}
          {selectedComponent === 'satisfaction' && (
            <div className="space-y-3">
              <div className="bg-[#383838] border border-pink-500/50 rounded p-2.5 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-[#444] pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-pink-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Customer Satisfaction (Script)</span>
                  </div>
                  <span className="text-[10px] text-pink-300 font-mono">😍 Base 70</span>
                </div>

                <div className="space-y-2 pl-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#aaa]">Script</span>
                    <div className="bg-[#242424] px-2 py-0.5 rounded border border-[#1e1e1e] text-[#4a90e2] font-mono">
                      CustomerSatisfaction
                    </div>
                  </div>

                  <div className="text-[10px] uppercase font-bold text-pink-400 tracking-wider pt-1">
                    Điểm Khởi Điểm &amp; Thành Phần
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Base Score</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-emerald-400 font-bold">
                      70
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Computer Quality Score</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-sky-400 font-bold">
                      22 (RAM 3*2 + VGA 4*3 + Màn 2*2)
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Price Score</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-emerald-400 font-bold">
                      5
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Wait Time Penalty</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-slate-400 font-bold">
                      0
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Internet Bonus</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-sky-400 font-bold">
                      10
                    </div>
                  </div>

                  <div className="text-[10px] uppercase font-bold text-pink-400 tracking-wider pt-1">
                    Kết Quả Đánh Giá Cuối Cùng
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Final Score</span>
                    <div className="bg-[#1e1e1e] px-2 py-0.5 rounded border border-emerald-500/50 font-mono text-emerald-400 font-black">
                      97 / 100
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Current Tier</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-semibold text-pink-300">
                      VeryHappy (😍 5 Sao)
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPONENT: Customer Visuals & Limbs */}
              <div className="bg-[#383838] border border-indigo-500/50 rounded p-2.5 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-[#444] pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Customer Visuals &amp; Limbs (Script)</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono">3D Humanoid</span>
                </div>

                <div className="space-y-2 pl-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#aaa]">Outfit Preset</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-indigo-300 font-semibold">
                      Student / Gamer / VIP
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#aaa]">Arm &amp; Leg Limbs</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-emerald-400 font-mono">
                      Rigged (Shoulder, Elbow, Hip, Knee, Shoes)
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#aaa]">Active Accessories</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-amber-300">
                      Backpack / RGB Headset / Gold Watch
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* COMPONENT: ComputerStation */}
          {selectedComponent === 'station' && (
            <div className="space-y-3">
              {/* Box Collider Box */}
              <div className="bg-[#383838] border border-[#444] rounded p-2.5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#e6e6e6]">
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Box Collider</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-4 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-[#999]">Is Trigger:</span>
                    <Square className="w-3.5 h-3.5 text-[#777]" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#999]">Size:</span>
                    <span className="text-[#ccc] font-mono">X:1.6 Y:1.2 Z:1.0</span>
                  </div>
                </div>
              </div>

              {/* ComputerStation Script Component */}
              <div className="bg-[#383838] border border-emerald-500/50 rounded p-2.5 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-[#444] pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Computer Station (Script)</span>
                  </div>
                  <span className="text-[10px] text-[#888] font-mono">v1.0</span>
                </div>

                <div className="space-y-2 pl-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#aaa]">Script</span>
                    <div className="bg-[#242424] px-2 py-0.5 rounded border border-[#1e1e1e] text-[#4a90e2] font-mono">
                      ComputerStation
                    </div>
                  </div>

                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider pt-1">
                    Cấu Hình Doanh Thu
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Revenue Per Tick</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-emerald-400 font-bold">
                      {config.revenuePerTick}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Tick Interval</span>
                    <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-sky-400 font-bold">
                      {config.tickInterval}
                    </div>
                  </div>

                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider pt-1">
                    Hiệu Ứng Hình Ảnh &amp; Ánh Sáng
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Screen Renderer</span>
                    <div className="flex items-center gap-1 bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-[#dcdcdc]">
                      <span>Screen_Monitor (MeshRenderer)</span>
                      <CircleDot className="w-3 h-3 text-[#777]" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#ccc]">Screen Light</span>
                    <div className="flex items-center gap-1 bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-[#dcdcdc]">
                      <span>Light_Glow (Light)</span>
                      <CircleDot className="w-3 h-3 text-[#777]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPONENT: PlayerInteraction */}
          {selectedComponent === 'player' && (
            <div className="bg-[#383838] border border-emerald-500/50 rounded p-2.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#444] pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Player Interaction (Script)</span>
                </div>
              </div>

              <div className="space-y-2.5 pl-2 text-[11px]">
                <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Cấu Hình Khoảng Cách
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#ccc]">Max Interact Distance</span>
                  <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-amber-300 font-bold">
                    {config.interactDistance}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#ccc]">Interactable Layer</span>
                  <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-[#dcdcdc] font-semibold">
                    Interactable (hoặc Everything)
                  </div>
                </div>

                <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider pt-1">
                  Tham Chiếu Camera
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#ccc]">Player Camera</span>
                  <div className="flex items-center gap-1 bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-[#dcdcdc]">
                    <span>Main Camera (Camera)</span>
                    <CircleDot className="w-3 h-3 text-[#777]" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#ccc]">PC Interact Key</span>
                  <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] text-purple-400 font-bold font-mono">
                    {config.interactKey}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPONENT: MoneyManager */}
          {selectedComponent === 'money' && (
            <div className="bg-[#383838] border border-emerald-500/50 rounded p-2.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#444] pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Money Manager (Script)</span>
                </div>
              </div>

              <div className="space-y-2.5 pl-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#ccc]">Current Money</span>
                  <div className="bg-[#202020] px-2 py-0.5 rounded border border-[#1e1e1e] font-mono text-emerald-400 font-bold">
                    50000
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#ccc]">Auto Save</span>
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>
          )}

          {/* COMPONENT: Mobile Button OnClick */}
          {selectedComponent === 'mobile_button' && (
            <div className="bg-[#383838] border border-emerald-500/50 rounded p-2.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#444] pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Button (Component) - On Click ()</span>
                </div>
              </div>

              <div className="space-y-2 pl-2 text-[11px]">
                <div className="text-[10px] text-[#aaa]">
                  Danh sách sự kiện khi chạm ngón tay vào màn hình điện thoại:
                </div>

                <div className="bg-[#242424] border border-[#1e1e1e] rounded p-2 space-y-1.5">
                  <div className="text-[10px] text-emerald-400 font-bold">Runtime Only</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-[#1c1c1c] p-1 rounded border border-[#333] text-[10px] truncate text-[#ddd]">
                      Player (PlayerInteraction)
                    </div>
                    <div className="bg-[#1c1c1c] p-1 rounded border border-[#333] text-[10px] text-amber-300 font-semibold truncate">
                      PlayerInteraction.OnMobileInteractClicked
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[#888] italic">
                  * Kéo GameObject Player vào ô bên trái, sau đó bấm menu chọn: PlayerInteraction &gt; OnMobileInteractClicked().
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
