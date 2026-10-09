import React, { useState } from 'react';
import {
  Smile,
  Frown,
  Meh,
  Heart,
  Flame,
  Star,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Monitor,
  Layers,
  Wifi,
  Wind,
  Coffee,
  DollarSign,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export interface CustomerSatisfactionBreakdown {
  id: string;
  customerName: string;
  customerType: 'Học Sinh' | 'Game Thủ' | 'Khách VIP';
  stationName: string;
  baseScore: number;
  computerQualityScore: number;
  ramLevel: number;
  vgaLevel: number;
  monitorLevel: number;
  priceScore: number;
  waitTimePenalty: number;
  internetBonus: number;
  acBonus: number;
  foodBonus: number;
  expectationScore?: number;
  finalScore: number;
  tier: 'VeryHappy' | 'Happy' | 'Normal' | 'Unhappy' | 'VeryUnhappy';
  emoji: string;
  tierLabel: string;
  stars: number;
  returnChance: number;
  reviewComment: string;
  timestamp: string;
}

interface SatisfactionDashboardProps {
  activeCustomers?: CustomerSatisfactionBreakdown[];
  recentReviews?: CustomerSatisfactionBreakdown[];
  onApplyEnvironmentChange?: (settings: {
    internetPlan: 'gigabit' | 'normal' | 'laggy';
    acEnabled: boolean;
    foodService: boolean;
    pricingTier: 'cheap' | 'standard' | 'expensive';
  }) => void;
}

export const SatisfactionDashboard: React.FC<SatisfactionDashboardProps> = ({
  activeCustomers = [],
  recentReviews = [],
}) => {
  // Interactive Formula Sandbox state
  const [ramLevel, setRamLevel] = useState<number>(3);
  const [vgaLevel, setVgaLevel] = useState<number>(4);
  const [monitorLevel, setMonitorLevel] = useState<number>(2);
  const [priceTier, setPriceTier] = useState<'cheap' | 'standard' | 'expensive'>('standard');
  const [hasWaited, setHasWaited] = useState<boolean>(false);
  const [internetQuality, setInternetQuality] = useState<'gigabit' | 'normal' | 'laggy'>('gigabit');
  const [acEnabled, setAcEnabled] = useState<boolean>(true);
  const [foodServed, setFoodServed] = useState<boolean>(true);

  // Formula Calculations:
  // Base: 70
  const baseScore = 70;
  // RAM: L1=+2, L2=+4, L3=+6, L4=+8, L5=+10
  const ramPoints = ramLevel * 2;
  // VGA: L1=+3, L2=+6, L3=+9, L4=+12, L5=+15
  const vgaPoints = vgaLevel * 3;
  // Monitor: L1=+2, L2=+4, L3=+6, L4=+8, L5=+10
  const monitorPoints = monitorLevel * 2;
  const computerQuality = ramPoints + vgaPoints + monitorPoints;

  // Price factor: cheap = +10, standard = +5, expensive = -10
  const priceScore = priceTier === 'cheap' ? 10 : priceTier === 'standard' ? 5 : -10;

  // Wait time penalty: -10 if waited in queue
  const waitPenalty = hasWaited ? -10 : 0;

  // Internet: gigabit = +10, normal = +5, laggy = -15
  const internetScore = internetQuality === 'gigabit' ? 10 : internetQuality === 'normal' ? 5 : -15;

  // AC: +8 if on, -10 if off
  const acScore = acEnabled ? 8 : -10;

  // Food: +10 if served, 0 if not
  const foodScore = foodServed ? 10 : 0;

  // Final Score Clamped 0-100
  const rawSum = baseScore + computerQuality + priceScore + waitPenalty + internetScore + acScore + foodScore;
  const finalScore = Math.max(0, Math.min(100, rawSum));

  // Determine Tier
  let tierInfo = {
    tier: 'VeryHappy',
    label: 'Very Happy',
    emoji: '😍',
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    stars: 5,
    returnChance: 95,
    desc: 'Khách cực kỳ hài lòng, đánh giá 5 sao tuyệt đối và chắc chắn sẽ quay lại quán!',
  };

  if (finalScore >= 80) {
    tierInfo = {
      tier: 'VeryHappy',
      label: 'Very Happy',
      emoji: '😍',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      stars: 5,
      returnChance: 95,
      desc: 'Khách cực kỳ hài lòng, đánh giá 5 sao tuyệt đối và có 95% tỷ lệ quay lại!',
    };
  } else if (finalScore >= 60) {
    tierInfo = {
      tier: 'Happy',
      label: 'Happy',
      emoji: '🙂',
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      stars: 4,
      returnChance: 75,
      desc: 'Khách hài lòng với trải nghiệm chơi net, cho 4 sao và 75% sẽ quay lại.',
    };
  } else if (finalScore >= 40) {
    tierInfo = {
      tier: 'Normal',
      label: 'Normal',
      emoji: '😐',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      stars: 3,
      returnChance: 45,
      desc: 'Trải nghiệm bình thường, 3 sao, tỷ lệ quay lại trung bình 45%.',
    };
  } else if (finalScore >= 20) {
    tierInfo = {
      tier: 'Unhappy',
      label: 'Unhappy',
      emoji: '😕',
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      stars: 2,
      returnChance: 15,
      desc: 'Khách cảm thấy không thoải mái, cho 2 sao và nguy cơ cao không quay lại.',
    };
  } else {
    tierInfo = {
      tier: 'VeryUnhappy',
      label: 'Very Unhappy',
      emoji: '😡',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      stars: 1,
      returnChance: 2,
      desc: 'Khách tức giận, đánh giá 1 sao và bỏ đi, hầu như không bao giờ quay lại quán!',
    };
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Smile className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ Thống Mức Độ Hài Lòng Khách Hàng (Customer Satisfaction)</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Mô Hình Điểm Số Khởi Điểm 70 &amp; Đánh Giá Sao Chuẩn
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Mỗi khách hàng bước vào quán khởi đầu với <strong className="text-emerald-400">70 điểm</strong>. Trải nghiệm tại quán
            (cấu hình máy RAM/VGA/Màn hình, giá thuê, hàng đợi, mạng internet, điều hòa, đồ ăn) sẽ cộng hoặc trừ điểm để ra{' '}
            <strong className="text-white">FINAL SATISFACTION (0 - 100)</strong>, quyết định số sao đánh giá và tỷ lệ quay lại!
          </p>
        </div>
      </div>

      {/* 2. 5 TIERS REFERENCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            range: '80 - 100',
            name: 'Very Happy',
            emoji: '😍',
            stars: 5,
            chance: '95%',
            color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
            desc: 'Đánh giá 5 sao, rất dễ quay lại',
          },
          {
            range: '60 - 79',
            name: 'Happy',
            emoji: '🙂',
            stars: 4,
            chance: '75%',
            color: 'border-sky-500/40 bg-sky-950/20 text-sky-300',
            desc: 'Đánh giá 4 sao, có khả năng quay lại',
          },
          {
            range: '40 - 59',
            name: 'Normal',
            emoji: '😐',
            stars: 3,
            chance: '45%',
            color: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
            desc: 'Đánh giá 3 sao, trung bình',
          },
          {
            range: '20 - 39',
            name: 'Unhappy',
            emoji: '😕',
            stars: 2,
            chance: '15%',
            color: 'border-orange-500/40 bg-orange-950/20 text-orange-300',
            desc: 'Đánh giá 2 sao, thất vọng',
          },
          {
            range: '0 - 19',
            name: 'Very Unhappy',
            emoji: '😡',
            stars: 1,
            chance: '2%',
            color: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
            desc: 'Đánh giá 1 sao, tức giận bỏ về',
          },
        ].map(item => (
          <div
            key={item.name}
            className={`rounded-xl border p-4 transition-all hover:scale-[1.02] flex flex-col justify-between ${item.color}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-200">
                  {item.range} đ
                </span>
              </div>
              <div className="font-bold text-sm text-white">{item.name}</div>
              <div className="text-xs opacity-80 mt-1">{item.desc}</div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-400">{'★'.repeat(item.stars)}</span>
              <span className="text-[11px] text-slate-400">Quay lại: {item.chance}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. INTERACTIVE FORMULA CALCULATOR SANDBOX */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span>Trình Tính Toán &amp; Thử Nghiệm Điểm Số Hài Lòng</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Thay đổi các thông số cấu hình và môi trường để xem điểm Final Satisfaction thay đổi tức thì
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              Khởi điểm: 70đ
            </div>
          </div>

          {/* Machine Quality Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-sky-400" />
                1. Chất Lượng Linh Kiện Máy Tính (Computer Quality Score)
              </span>
              <span className="text-xs font-mono font-bold text-sky-400">
                +{computerQuality} Điểm (RAM +{ramPoints}, VGA +{vgaPoints}, Màn +{monitorPoints})
              </span>
            </div>

            {/* RAM Slider */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Bộ nhớ RAM (Cấp {ramLevel}):</span>
                <span className="font-mono text-emerald-400 font-bold">
                  Level {ramLevel} &times; 2 = +{ramPoints} điểm
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={ramLevel}
                onChange={e => setRamLevel(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Lvl 1 (+2đ)</span>
                <span>Lvl 2 (+4đ)</span>
                <span>Lvl 3 (+6đ)</span>
                <span>Lvl 4 (+8đ)</span>
                <span>Lvl 5 (+10đ)</span>
              </div>
            </div>

            {/* VGA Slider */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Card Đồ Họa VGA (Cấp {vgaLevel}):</span>
                <span className="font-mono text-purple-400 font-bold">
                  Level {vgaLevel} &times; 3 = +{vgaPoints} điểm
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={vgaLevel}
                onChange={e => setVgaLevel(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Lvl 1 (+3đ)</span>
                <span>Lvl 2 (+6đ)</span>
                <span>Lvl 3 (+9đ)</span>
                <span>Lvl 4 (+12đ)</span>
                <span>Lvl 5 (+15đ)</span>
              </div>
            </div>

            {/* Monitor Slider */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Màn Hình (Cấp {monitorLevel}):</span>
                <span className="font-mono text-cyan-400 font-bold">
                  Level {monitorLevel} &times; 2 = +{monitorPoints} điểm
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={monitorLevel}
                onChange={e => setMonitorLevel(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Lvl 1 (+2đ)</span>
                <span>Lvl 2 (+4đ)</span>
                <span>Lvl 3 (+6đ)</span>
                <span>Lvl 4 (+8đ)</span>
                <span>Lvl 5 (+10đ)</span>
              </div>
            </div>
          </div>

          {/* Pricing & Queue Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Price Tier */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>2. Giá Thuê Máy:</span>
                <span className="font-mono text-emerald-400">{priceScore >= 0 ? `+${priceScore}` : priceScore}đ</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['cheap', 'standard', 'expensive'] as const).map(tier => (
                  <button
                    key={tier}
                    onClick={() => setPriceTier(tier)}
                    className={`py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                      priceTier === tier
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier === 'cheap' ? 'Rẻ (+10)' : tier === 'standard' ? 'Chuẩn (+5)' : 'Đắt (-10)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Waiting Queue penalty */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>3. Thời Gian Chờ (Queue):</span>
                <span className="font-mono text-rose-400">{waitPenalty}đ</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setHasWaited(false)}
                  className={`py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    !hasWaited ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Có máy ngay (0đ)
                </button>
                <button
                  onClick={() => setHasWaited(true)}
                  className={`py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    hasWaited ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Chờ lâu (-10đ)
                </button>
              </div>
            </div>
          </div>

          {/* Shop Amenities: Internet, AC, Food */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Internet */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                  Mạng Net:
                </span>
                <span className="font-mono text-sky-400">{internetScore >= 0 ? `+${internetScore}` : internetScore}đ</span>
              </div>
              <select
                value={internetQuality}
                onChange={e => setInternetQuality(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white"
              >
                <option value="gigabit">Cáp 1Gbps (+10đ)</option>
                <option value="normal">Mạng Thường (+5đ)</option>
                <option value="laggy">Mạng Lag (-15đ)</option>
              </select>
            </div>

            {/* Điều hòa */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-teal-400" />
                  Điều Hòa:
                </span>
                <span className="font-mono text-teal-400">{acScore >= 0 ? `+${acScore}` : acScore}đ</span>
              </div>
              <button
                onClick={() => setAcEnabled(!acEnabled)}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  acEnabled ? 'bg-teal-600 text-white' : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}
              >
                {acEnabled ? 'Bật 22°C (+8đ)' : 'Tắt (Nóng -10đ)'}
              </button>
            </div>

            {/* Đồ ăn */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  Đồ Ăn/Uống:
                </span>
                <span className="font-mono text-amber-400">{foodScore > 0 ? `+${foodScore}` : '0'}đ</span>
              </div>
              <button
                onClick={() => setFoodServed(!foodServed)}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  foodServed ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {foodServed ? 'Phục Vụ (+10đ)' : 'Không (0đ)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-time Satisfaction Receipt & Tier Result (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Phiếu Trải Nghiệm Khách Hàng (Receipt)
              </span>
              <span className="text-2xl">{tierInfo.emoji}</span>
            </div>

            {/* Detailed math lines */}
            <div className="mt-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Điểm khởi điểm (Base):</span>
                <span className="text-white font-bold">{baseScore}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">
                  Chất lượng máy (RAM {ramLevel}, VGA {vgaLevel}, Màn {monitorLevel}):
                </span>
                <span className="text-sky-400 font-bold">+{computerQuality}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Giá thuê máy:</span>
                <span className={priceScore >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {priceScore >= 0 ? `+${priceScore}` : priceScore}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Thời gian chờ (Wait Time):</span>
                <span className={waitPenalty < 0 ? 'text-rose-400 font-bold' : 'text-slate-500 font-bold'}>
                  {waitPenalty}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Chất lượng mạng Internet:</span>
                <span className={internetScore >= 0 ? 'text-sky-400 font-bold' : 'text-rose-400 font-bold'}>
                  {internetScore >= 0 ? `+${internetScore}` : internetScore}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Điều hòa nhiệt độ quán:</span>
                <span className={acScore >= 0 ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                  {acScore >= 0 ? `+${acScore}` : acScore}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Đồ ăn &amp; Nước giải khát:</span>
                <span className={foodScore > 0 ? 'text-amber-400 font-bold' : 'text-slate-500 font-bold'}>
                  {foodScore > 0 ? `+${foodScore}` : '+0'}
                </span>
              </div>

              {/* Total Final Score Big Display */}
              <div className="flex items-center justify-between pt-3 text-sm font-bold">
                <span className="text-white uppercase font-sans tracking-wide">TỔNG ĐIỂM (FINAL):</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {finalScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </span>
              </div>
            </div>

            {/* Tier Badge & Review Box */}
            <div className={`mt-5 p-4 rounded-xl border ${tierInfo.color} space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="text-xl">{tierInfo.emoji}</span>
                  <span>{tierInfo.label}</span>
                </div>
                <div className="flex text-amber-400 font-bold text-sm">
                  {'★'.repeat(tierInfo.stars)}
                  <span className="text-slate-600">{'★'.repeat(5 - tierInfo.stars)}</span>
                </div>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">{tierInfo.desc}</p>
              <div className="pt-2 border-t border-current/20 flex items-center justify-between text-xs font-semibold">
                <span>Tỷ lệ quay lại quán:</span>
                <span className="font-mono text-sm font-bold">{tierInfo.returnChance}%</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            💡 <strong>Quy luật Tycoon:</strong> Cấu hình máy tính cao kết hợp mạng Internet gigabit và điều hòa mát mẻ là chìa khóa để giữ điểm hài lòng luôn trên <strong>80đ (Very Happy 😍)</strong>, giúp quán luôn đông khách VIP và nhận đánh giá 5 sao!
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME CUSTOMERS IN SHOP & WAITING QUEUE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Danh Sách Khách Hàng Đang Trong Quán (Live Satisfaction Tracker)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Dữ liệu được cập nhật thời gian thực từ trình mô phỏng 3D
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            Đang phục vụ: <span className="text-emerald-400 font-bold">{activeCustomers.length}</span> khách
          </div>
        </div>

        {activeCustomers.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Chưa có khách nào trong quán. Hãy bấm <strong>&quot;Gọi Khách&quot;</strong> hoặc đợi khách tự bước vào quán trong tab <strong>Mô Phỏng 3D</strong>!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeCustomers.map(cust => (
              <div
                key={cust.id}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cust.emoji}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{cust.customerName}</div>
                      <div className="text-[10px] text-slate-400">
                        {cust.customerType} • {cust.stationName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-emerald-400">
                      {cust.finalScore} <span className="text-[10px] text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-amber-400">{'★'.repeat(cust.stars)}</div>
                  </div>
                </div>

                {/* Score breakdown mini pills */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-400">
                    Máy: <span className="text-sky-400 font-bold">+{cust.computerQualityScore}đ</span>
                  </div>
                  <div className="text-slate-400">
                    Giá: <span className="text-emerald-400 font-bold">+{cust.priceScore}đ</span>
                  </div>
                  <div className="text-slate-400">
                    Chờ: <span className={cust.waitTimePenalty < 0 ? 'text-rose-400 font-bold' : 'text-slate-500 font-bold'}>{cust.waitTimePenalty}đ</span>
                  </div>
                  <div className="text-slate-400">
                    Mạng: <span className="text-sky-400 font-bold">+{cust.internetBonus}đ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <span className="font-semibold text-slate-300">{cust.tierLabel}</span>
                  <span className="text-emerald-400 font-mono">Quay lại: {cust.returnChance}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. RECENT REVIEWS FEED */}
      {recentReviews.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Đánh Giá Khách Hàng Gần Đây (Customer Reviews)</span>
            </h3>
            <span className="text-xs text-slate-400">{recentReviews.length} lượt đánh giá</span>
          </div>

          <div className="space-y-3">
            {recentReviews.slice(0, 5).map(rev => (
              <div
                key={rev.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{rev.emoji}</span>
                    <span className="font-bold text-white">{rev.customerName}</span>
                    <span className="text-slate-500">({rev.customerType})</span>
                    <span className="text-amber-400 font-bold">{'★'.repeat(rev.stars)}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({rev.finalScore} điểm)</span>
                  </div>
                  <p className="text-slate-300 italic">&ldquo;{rev.reviewComment}&rdquo;</p>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  {rev.stationName} • {rev.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
