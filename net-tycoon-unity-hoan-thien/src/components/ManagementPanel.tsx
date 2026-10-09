import React, { useState } from 'react';
import { TycoonEngine, ActionResult, formatMoney } from '../game/tycoonEngine';
import { useTycoon } from '../game/useTycoon';
import {
  CATEGORY_LABEL,
  COSTS,
  CYBER_REQUIREMENTS,
  ItemCategory,
  KIND_LABEL,
  LOCATIONS,
  LOCATION_BY_ID,
  PRODUCTS,
  RELOCATE_FEE,
  SELLABLE_PRODUCTS,
  STAFF,
  WAREHOUSE_LEVELS,
  ZONES,
  unitProfit,
} from '../game/tycoonData';
import { FloorPlan } from './FloorPlan';

type SubTab = 'overview' | 'stock' | 'menu' | 'zones' | 'locations' | 'staff' | 'growth';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: '📊 Tổng quan' },
  { id: 'stock', label: '📦 Kho & Nhập hàng' },
  { id: 'menu', label: '🍜 Thực đơn' },
  { id: 'zones', label: '🗺️ Khu vực' },
  { id: 'locations', label: '📍 Mặt bằng' },
  { id: 'staff', label: '🧑‍💼 Nhân sự' },
  { id: 'growth', label: '🚀 Phát triển' },
];

const btn =
  'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-emerald-600 hover:bg-emerald-500 text-white`;
const btnBlue = `${btn} bg-indigo-600 hover:bg-indigo-500 text-white`;
const btnGhost = `${btn} bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700`;
const btnDanger = `${btn} bg-rose-700/80 hover:bg-rose-600 text-white`;

const Bar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = '#10b981' }) => (
  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full"
      style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`, background: color }}
    />
  </div>
);

interface Props {
  engine: TycoonEngine;
}

export const ManagementPanel: React.FC<Props> = ({ engine }) => {
  const game = useTycoon(engine);
  const [tab, setTab] = useState<SubTab>('overview');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const run = (r: ActionResult) => setToast({ ok: r.ok, msg: r.msg });

  const roadmap = engine.roadmap();
  const currentStepIndex = roadmap.findIndex(r => !r.done);
  const costs = engine.dailyCosts();
  const warnings = engine.stockWarnings();

  /* ------------------------------ TỔNG QUAN ------------------------------ */
  const renderOverview = () => {
    const t = game.today;
    const rating = engine.rating();
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { k: 'Tiền mặt', v: formatMoney(game.money), c: game.money >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            { k: 'Đánh giá', v: `${rating.toFixed(2)} ★`, c: 'text-amber-400' },
            { k: 'Thị phần', v: `${Math.round(engine.marketShare() * 100)}%`, c: 'text-sky-400' },
            { k: 'Chi phí cố định / ngày', v: formatMoney(costs.total), c: 'text-rose-400' },
          ].map(c => (
            <div key={c.k} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{c.k}</div>
              <div className={`text-lg font-black font-mono ${c.c}`}>{c.v}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Game loop */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-white">🔁 Lộ trình trở thành ông chủ Cyber Game</div>
            <div className="space-y-1.5">
              {roadmap.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-start gap-2 text-[11px] rounded-lg px-2 py-1.5 ${
                    i === currentStepIndex ? 'bg-emerald-900/30 border border-emerald-500/40' : ''
                  }`}
                >
                  <span className="mt-0.5">{r.done ? '✅' : i === currentStepIndex ? '👉' : '⬜'}</span>
                  <div>
                    <div className={r.done ? 'text-slate-500 line-through' : 'text-slate-200 font-semibold'}>
                      {i + 1}. {r.label}
                    </div>
                    {i === currentStepIndex && <div className="text-slate-400">{r.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Mục tiêu thắng */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-white">🏆 Điều kiện thắng game</div>
              {engine.winProgress().map(w => (
                <div key={w.label} className="text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">{w.label}</span>
                    <span className="font-mono text-slate-400">{w.text}</span>
                  </div>
                  <Bar value={w.now} max={w.need} color={w.now >= w.need ? '#10b981' : '#38bdf8'} />
                </div>
              ))}
              {game.won && <div className="text-amber-300 font-bold text-xs">🎉 Bạn đã chinh phục game!</div>}
            </div>

            {/* Hôm nay */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1 font-mono text-[11px]">
              <div className="text-xs font-bold text-white font-sans mb-1">📅 Hôm nay (ngày {game.day})</div>
              <div className="flex justify-between"><span className="text-slate-400">Khách đã phục vụ</span><span>{t.customers} (bỏ về {t.walkouts})</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Thuê máy</span><span className="text-emerald-400">{formatMoney(t.rentalRevenue)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Đồ ăn & nước ({t.ordersServed} món)</span><span className="text-amber-400">{formatMoney(t.foodRevenue)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Giá vốn</span><span className="text-rose-400">-{formatMoney(t.costOfGoods)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Đơn gọi thất bại (hết hàng)</span><span className={t.ordersFailed > 0 ? 'text-rose-400' : ''}>{t.ordersFailed}</span></div>
            </div>
          </div>
        </div>

        {/* Lịch sử */}
        {game.history.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <div className="text-xs font-bold text-white mb-2">🧾 Báo cáo các ngày gần nhất</div>
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="pr-3">Ngày</th><th className="pr-3">Khách</th><th className="pr-3">Thuê máy</th>
                  <th className="pr-3">Đồ ăn</th><th className="pr-3">Chi phí</th><th className="pr-3">Lợi nhuận</th><th>★</th>
                </tr>
              </thead>
              <tbody>
                {game.history.slice(0, 7).map(h => (
                  <tr key={h.day} className="border-t border-slate-800">
                    <td className="pr-3 py-1">{h.day}</td>
                    <td className="pr-3">{h.customers}</td>
                    <td className="pr-3 text-emerald-400">{formatMoney(h.rentalRevenue)}</td>
                    <td className="pr-3 text-amber-400">{formatMoney(h.foodRevenue)}</td>
                    <td className="pr-3 text-rose-400">{formatMoney(h.costOfGoods + h.rent + h.salaries + h.utilities + h.eventCost)}</td>
                    <td className={`pr-3 font-bold ${h.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(h.netProfit)}</td>
                    <td>{h.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold text-white mb-2">📰 Nhật ký tiệm</div>
          <div className="space-y-1 text-[11px] text-slate-400 max-h-40 overflow-y-auto">
            {game.log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className={btnDanger}
            onClick={() => {
              if (window.confirm('Xóa toàn bộ tiến trình và chơi lại từ đầu?')) engine.reset();
            }}
          >
            Chơi lại từ đầu
          </button>
        </div>
      </div>
    );
  };

  /* ------------------------------ KHO ------------------------------ */
  const renderStock = () => {
    const cats: ItemCategory[] = ['drink', 'food', 'part', 'supply'];
    const nextWh = WAREHOUSE_LEVELS[game.warehouseLevel];
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs">
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-bold">Kho cấp {game.warehouseLevel}</div>
            <div className="text-slate-300">
              Sức chứa ×{WAREHOUSE_LEVELS[game.warehouseLevel - 1].capacityMult} • Giá trị hàng tồn{' '}
              <span className="font-mono text-amber-400">{formatMoney(engine.stockValue())}</span>
            </div>
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button className={btnPrimary} onClick={() => run(engine.restockLow())} disabled={warnings.length === 0}>
              Nhập bù hàng sắp hết ({warnings.length})
            </button>
            <button className={btnBlue} disabled={!nextWh} onClick={() => run(engine.upgradeWarehouse())}>
              {nextWh ? `Nâng kho cấp ${nextWh.level} (${formatMoney(nextWh.upgradeCost)})` : 'Kho tối đa'}
            </button>
          </div>
        </div>

        {cats.map(cat => (
          <div key={cat} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-white">{CATEGORY_LABEL[cat]}</div>
            {PRODUCTS.filter(p => p.category === cat).map(p => {
              const status = engine.stockStatus(p.id);
              const cap = engine.stockCap(p);
              const n = game.stock[p.id] ?? 0;
              const color = status === 'out' ? '#f43f5e' : status === 'low' ? '#f59e0b' : '#10b981';
              return (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-center text-[11px]">
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-semibold text-slate-200">
                      {p.emoji} {engine.stockLabel(p.id)}
                    </div>
                    <Bar value={n} max={cap} color={color} />
                    {status !== 'ok' && (
                      <div className={status === 'out' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                        {status === 'out' ? '⛔ Hết hàng' : '⚠ Sắp hết hàng'}
                      </div>
                    )}
                  </div>
                  <div className="col-span-4 md:col-span-2 text-slate-400">
                    Nhập <span className="font-mono text-slate-200">{formatMoney(p.buyPrice)}</span>
                  </div>
                  <div className="col-span-8 md:col-span-6 flex flex-wrap gap-1.5 justify-end">
                    <button className={btnGhost} onClick={() => run(engine.buyStock(p.id, p.batchSize))}>
                      +{p.batchSize} ({formatMoney(p.batchSize * p.buyPrice)})
                    </button>
                    <button className={btnPrimary} onClick={() => run(engine.fillToMax(p.id))} disabled={n >= cap}>
                      Đầy kho ({formatMoney(Math.max(0, cap - n) * p.buyPrice)})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  /* ------------------------------ THỰC ĐƠN ------------------------------ */
  const renderMenu = () => (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 overflow-x-auto">
      <div className="text-xs font-bold text-white mb-1">🍜 Thực đơn & lợi nhuận</div>
      <p className="text-[11px] text-slate-400 mb-3">
        Khách gọi món dựa trên loại khách, giờ trong ngày (sáng bánh mì/cà phê, trưa & tối mì, khuya nước tăng lực) và thời
        gian họ chơi. Mỗi món tiêu hao thêm 1 ly/hộp đựng ({formatMoney(PRODUCTS.find(p => p.id === 'sup_cup')!.buyPrice)}).
      </p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-slate-500 text-left">
            <th>Món</th><th>Giá nhập</th><th>Giá bán</th><th>Lợi nhuận</th><th>Biên</th><th>Thời gian dùng</th><th>Tồn kho</th>
            <th>Học sinh</th><th>Game thủ</th><th>VIP</th>
          </tr>
        </thead>
        <tbody>
          {SELLABLE_PRODUCTS.map(p => {
            const status = engine.stockStatus(p.id);
            return (
              <tr key={p.id} className="border-t border-slate-800 font-mono">
                <td className="py-1.5 font-sans font-semibold text-slate-200">{p.emoji} {p.name}</td>
                <td>{formatMoney(p.buyPrice)}</td>
                <td>{formatMoney(p.sellPrice)}</td>
                <td className="text-emerald-400 font-bold">+{formatMoney(unitProfit(p))}</td>
                <td>{Math.round((unitProfit(p) / p.sellPrice) * 100)}%</td>
                <td>{p.useTimeSec}s</td>
                <td className={status === 'ok' ? '' : status === 'low' ? 'text-amber-400' : 'text-rose-400'}>
                  {engine.stockLabel(p.id).split(': ')[1]}
                </td>
                <td>{'●'.repeat(Math.round(p.weights.HocSinh))}</td>
                <td>{'●'.repeat(Math.round(p.weights.GameThu))}</td>
                <td>{'●'.repeat(Math.round(p.weights.VIP))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  /* ------------------------------ KHU VỰC ------------------------------ */
  const renderZones = () => {
    const loc = engine.location;
    return (
      <div className="space-y-4">
        <FloorPlan engine={engine} />
        <div className="grid md:grid-cols-2 gap-3">
          {ZONES.map(z => {
            const open = game.zones[z.id];
            const reason = engine.zoneBlockReason(z.id);
            return (
              <div
                key={z.id}
                className={`rounded-xl p-3 border text-xs space-y-1.5 ${
                  open ? 'bg-slate-950/70 border-slate-700' : 'bg-slate-950/40 border-dashed border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">{z.emoji} {z.name}</div>
                  <div className="font-mono text-slate-400">{z.area}m²</div>
                </div>
                <p className="text-slate-400">{z.description}</p>
                <div className="text-[10px] text-slate-500">Điều kiện: {z.requires.label}</div>
                {open ? (
                  <div className="text-emerald-400 font-bold">✅ Đang hoạt động</div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button className={btnPrimary} disabled={reason !== null || game.money < z.unlockCost} onClick={() => run(engine.unlockZone(z.id))}>
                      Mở khu ({formatMoney(z.unlockCost)})
                    </button>
                    {reason && <span className="text-amber-400 text-[11px]">{reason}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-500">
          Diện tích đang dùng {engine.usedArea()} / {loc.area}m² tại {loc.name}. Muốn thêm khu mới, hãy chuyển sang mặt bằng rộng hơn.
        </div>
      </div>
    );
  };

  /* ------------------------------ MẶT BẰNG ------------------------------ */
  const renderLocations = () => (
    <div className="grid md:grid-cols-2 gap-3">
      {LOCATIONS.map(l => {
        const owned = game.ownedLocations.includes(l.id);
        const active = game.activeLocation === l.id;
        const hasBranch = game.branches.some(b => b.locationId === l.id);
        return (
          <div key={l.id} className={`rounded-xl p-4 border text-xs space-y-2 ${active ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/70'}`}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-sm">{l.emoji} {l.name}</div>
              {active && <span className="text-emerald-400 font-bold">Tiệm chính</span>}
              {hasBranch && <span className="text-sky-400 font-bold">Có chi nhánh</span>}
              {owned && !active && !hasBranch && <span className="text-slate-400">Đã sở hữu</span>}
            </div>
            <p className="text-slate-400">{l.description}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
              <div className="flex justify-between"><span className="text-slate-500 font-sans">Rent</span><span className="text-rose-400">{formatMoney(l.rent)}/ngày</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-sans">Area</span><span>{l.area}m²</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-sans">Traffic</span><span className="text-emerald-400">×{l.traffic}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-sans">Competition</span><span className="text-amber-400">{l.competition}/100</span></div>
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500">CustomerType: </span>{l.customerType}
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              <div style={{ width: `${l.customerMix.HocSinh * 100}%`, background: '#facc15' }} title="Học sinh" />
              <div style={{ width: `${l.customerMix.GameThu * 100}%`, background: '#38bdf8' }} title="Game thủ" />
              <div style={{ width: `${l.customerMix.VIP * 100}%`, background: '#c084fc' }} title="VIP" />
            </div>
            <div className="text-[10px] text-slate-500">
              {(Object.keys(l.customerMix) as (keyof typeof l.customerMix)[]).map(k => `${KIND_LABEL[k]} ${Math.round(l.customerMix[k] * 100)}%`).join(' • ')}
              {l.growthPerDay > 0 ? ` • Tiềm năng: +${l.growthPerDay * 100}% khách/ngày (tối đa +${l.growthCap * 100}%)` : ''}
            </div>
            <div className="flex gap-2 pt-1 flex-wrap">
              {!owned && (
                <button className={btnPrimary} onClick={() => run(engine.unlockLocation(l.id))} disabled={game.money < l.unlockCost}>
                  Mua mặt bằng ({formatMoney(l.unlockCost)})
                </button>
              )}
              {owned && !active && !hasBranch && (
                <button className={btnBlue} onClick={() => run(engine.switchLocation(l.id))}>
                  Chuyển tiệm chính đến đây ({formatMoney(RELOCATE_FEE)})
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ------------------------------ NHÂN SỰ ------------------------------ */
  const renderStaff = () => (
    <div className="grid md:grid-cols-2 gap-3">
      {STAFF.map(s => {
        const n = game.staff[s.id];
        const reason = engine.staffBlockReason(s.id);
        return (
          <div key={s.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-sm">{s.emoji} {s.name}</div>
              <div className="font-mono text-slate-300">{n} / {s.maxCount}</div>
            </div>
            <p className="text-slate-400">{s.effect}</p>
            <div className="font-mono text-slate-400">
              Tuyển {formatMoney(s.hireFee)} • Lương {formatMoney(s.salaryPerDay)}/ngày/người
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className={btnPrimary} disabled={reason !== null || game.money < s.hireFee} onClick={() => run(engine.hire(s.id))}>
                Thuê thêm
              </button>
              <button className={btnGhost} disabled={n <= 0} onClick={() => run(engine.fire(s.id))}>
                Cho nghỉ
              </button>
              {reason && <span className="text-amber-400 text-[11px]">{reason}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ------------------------------ PHÁT TRIỂN ------------------------------ */
  const renderGrowth = () => {
    const cyberReason = engine.cyberBlockReason();
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-white text-sm">🏆 Giải đấu</div>
            <p className="text-slate-400">
              Kéo đông game thủ trong 5 giờ game và tăng danh tiếng. Cần Phòng Tournament, tiệm đang mở cửa. Giải thưởng{' '}
              {formatMoney(COSTS.tournament)}, nghỉ {COSTS.tournamentCooldownDays} ngày giữa 2 giải.
            </p>
            <button className={btnPrimary} onClick={() => run(engine.startTournament())}>
              {engine.tournamentActive() ? 'Đang diễn ra...' : 'Tổ chức giải đấu'}
            </button>
            <div className="text-slate-500">Danh tiếng: {game.fame.toFixed(0)}/100</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-white text-sm">📣 Khuyến mãi</div>
            <p className="text-slate-400">
              2 ngày: +25% khách, sức ép đối thủ giảm một nửa. Chi phí {formatMoney(COSTS.promotion)}.
            </p>
            <button className={btnPrimary} onClick={() => run(engine.runPromotion())}>
              {game.promoDaysLeft > 0 ? `Còn ${game.promoDaysLeft} ngày` : 'Chạy khuyến mãi'}
            </button>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-white text-sm">⚔️ Đối thủ cạnh tranh</div>
          {game.rivals.length === 0 ? (
            <p className="text-slate-400">Chưa có đối thủ. Họ sẽ xuất hiện khi tiệm bạn nổi tiếng (từ ngày 4).</p>
          ) : (
            game.rivals.map(r => (
              <div key={r.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 md:col-span-5">
                  <div className="font-semibold text-slate-200">{r.name}</div>
                  <Bar value={r.strength} max={75} color="#f43f5e" />
                </div>
                <div className="col-span-6 md:col-span-3 font-mono text-slate-400">Sức mạnh {r.strength.toFixed(0)}</div>
                <div className="col-span-6 md:col-span-4 text-right">
                  <button className={btnBlue} onClick={() => run(engine.buyOutRival(r.id))}>
                    Mua lại ({formatMoney(engine.buyoutCost(r))})
                  </button>
                </div>
              </div>
            ))
          )}
          <div className="text-slate-500">
            Sức ép lên lượng khách tại mặt bằng này: -{Math.round(engine.rivalPressure() * 100)}%. Mua lại cần Quản Lý.
          </div>
        </div>

        <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-amber-300 text-sm">🚀 Cyber Gaming</div>
          <p className="text-slate-400">
            Nâng tiệm chính thành trung tâm eSports: game thủ +25% lượng khách, giá thuê +15%, danh tiếng +20. Yêu cầu:{' '}
            {CYBER_REQUIREMENTS.zones.join(' + ')} và ≥{CYBER_REQUIREMENTS.minRating}★. Chi phí {formatMoney(COSTS.cyberGaming)}.
          </p>
          {game.cyberGaming ? (
            <div className="text-emerald-400 font-bold">✅ Đã khai trương Cyber Gaming</div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button className={btnPrimary} disabled={cyberReason !== null || game.money < COSTS.cyberGaming} onClick={() => run(engine.unlockCyberGaming())}>
                Khai trương Cyber Gaming
              </button>
              {cyberReason && <span className="text-amber-400">{cyberReason}</span>}
            </div>
          )}
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
          <div className="font-bold text-white text-sm">🏢 Chi nhánh</div>
          <p className="text-slate-400">
            Xây tại mặt bằng đã mua (khác tiệm chính). Mỗi chi nhánh cần 1 Quản Lý và tự chạy mỗi ngày. Chi phí xây{' '}
            {formatMoney(COSTS.branchBuild)}.
          </p>
          {game.branches.map(b => {
            const l = LOCATION_BY_ID[b.locationId];
            const up = engine.branchUpgradeCost(b);
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-3 bg-slate-900/60 rounded-lg p-2">
                <div className="font-semibold text-slate-200">{l.emoji} {l.name} (cấp {b.level})</div>
                <div className="font-mono text-slate-400">
                  Hôm qua: <span className={b.lastNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatMoney(b.lastNet)}</span> • Dự kiến{' '}
                  {formatMoney(engine.branchExpectedNet(b))}/ngày
                </div>
                <button className={`${btnBlue} ml-auto`} disabled={b.level >= 3} onClick={() => run(engine.upgradeBranch(b.id))}>
                  {b.level >= 3 ? 'Tối đa' : `Nâng cấp (${formatMoney(up)})`}
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map(l => {
              const reason = engine.branchBlockReason(l.id);
              if (reason === 'Đã có chi nhánh' || reason === 'Đây là tiệm chính') return null;
              return (
                <div key={l.id} className="flex items-center gap-2">
                  <button className={btnPrimary} disabled={reason !== null || game.money < COSTS.branchBuild} onClick={() => run(engine.openBranch(l.id))}>
                    Mở chi nhánh {l.name}
                  </button>
                  {reason && <span className="text-amber-400 text-[11px]">{reason}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="management-panel" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-white">🏪 Quản Lý Tiệm Net</h2>
          <p className="text-[11px] text-slate-400">
            Game vẫn chạy khi bạn quản lý ở đây. Tiền: <span className="font-mono text-emerald-400">{formatMoney(game.money)}</span> • Ngày {game.day} •{' '}
            {game.phase === 'open' ? 'Đang mở cửa' : game.phase === 'bankrupt' ? 'Phá sản' : 'Đang đóng cửa'}
          </p>
        </div>
        {warnings.length > 0 && (
          <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-900/60 text-amber-200" onClick={() => setTab('stock')}>
            {warnings[0].label} {warnings[0].text}
            {warnings.length > 1 ? ` (+${warnings.length - 1} món)` : ''}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {toast && (
        <div
          className={`text-xs rounded-lg px-3 py-2 flex justify-between items-center ${
            toast.ok ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/40' : 'bg-rose-900/40 text-rose-300 border border-rose-600/40'
          }`}
        >
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {tab === 'overview' && renderOverview()}
      {tab === 'stock' && renderStock()}
      {tab === 'menu' && renderMenu()}
      {tab === 'zones' && renderZones()}
      {tab === 'locations' && renderLocations()}
      {tab === 'staff' && renderStaff()}
      {tab === 'growth' && renderGrowth()}
    </section>
  );
};
