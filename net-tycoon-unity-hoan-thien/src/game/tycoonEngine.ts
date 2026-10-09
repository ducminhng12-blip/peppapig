/**
 * TYCOON ENGINE - bộ não kinh tế của Net Tycoon.
 * Thuần TypeScript (không phụ thuộc React/Three) nên chạy được trong mô phỏng 3D,
 * trong bảng quản lý, và cả trong bài test chạy không giao diện.
 *
 * Vòng lặp game:
 *  Mở tiệm → Khách đến → Thuê máy → Chơi → Gọi đồ → Hài lòng/không → Rời đi → Đánh giá
 *  → Doanh thu → Trừ chi phí → Lợi nhuận → Nâng cấp → Mở rộng → Nhân viên → VIP
 *  → Đối thủ → Cyber Gaming → Chi nhánh → Ông chủ Cyber Game lớn nhất.
 */

import {
  CATEGORY_LABEL,
  COSTS,
  CustomerKind,
  CYBER_REQUIREMENTS,
  GAME_CLOCK,
  LOCATIONS,
  LOCATION_BY_ID,
  LocationId,
  LOW_STOCK_RATIO,
  PRODUCTS,
  PRODUCT_BY_ID,
  ProductDef,
  RELOCATE_FEE,
  RIVAL_NAMES,
  SELLABLE_PRODUCTS,
  STAFF,
  STAFF_BY_ID,
  StaffId,
  WAREHOUSE_LEVELS,
  WIN_CONDITION,
  ZONES,
  ZONE_BY_ID,
  ZoneId,
} from './tycoonData';

export type Phase = 'closed' | 'open' | 'bankrupt';
export type InternetPlan = 'gigabit' | 'normal' | 'laggy';
export type PricingPolicy = 'standard' | 'cheap' | 'expensive';

export interface Environment {
  internetPlan: InternetPlan;
  acEnabled: boolean;
  foodService: boolean;
  pricingPolicy: PricingPolicy;
}

export interface DayStats {
  customers: number;
  walkouts: number;
  rentalRevenue: number;
  foodRevenue: number;
  /** Giá vốn hàng đã bán + vật dụng đã dùng */
  costOfGoods: number;
  ordersServed: number;
  ordersFailed: number;
  starsSum: number;
  starsCount: number;
  /** Chi cho giải đấu + khuyến mãi */
  eventCost: number;
  upgradeSpend: number;
}

export interface DayReport extends DayStats {
  day: number;
  rent: number;
  salaries: number;
  utilities: number;
  branchNet: number;
  /** Lợi nhuận ròng của ngày (kế toán: doanh thu - giá vốn - chi phí cố định) */
  netProfit: number;
  rating: number;
  marketShare: number;
  moneyAfter: number;
}

export interface Rival {
  id: number;
  name: string;
  strength: number;
  appearedDay: number;
}

export interface Branch {
  id: number;
  locationId: LocationId;
  level: number;
  openedDay: number;
  lastNet: number;
}

export interface Lifetime {
  customers: number;
  reviews: number;
  orders: number;
  upgrades: number;
  revenue: number;
  bestNetProfit: number;
  rivalsAppeared: number;
  hasOpened: boolean;
}

export interface GameState {
  version: number;
  day: number;
  hour: number;
  phase: Phase;
  money: number;
  stock: Record<string, number>;
  warehouseLevel: number;
  ownedLocations: LocationId[];
  activeLocation: LocationId;
  locationAge: Record<string, number>;
  zones: Record<ZoneId, boolean>;
  staff: Record<StaffId, number>;
  env: Environment;
  recentStars: number[];
  fame: number;
  today: DayStats;
  history: DayReport[];
  lifetime: Lifetime;
  rivals: Rival[];
  nextRivalId: number;
  rivalCooldownDays: number;
  promoDaysLeft: number;
  tournamentUntilHour: number;
  tournamentCooldown: number;
  cyberGaming: boolean;
  branches: Branch[];
  nextBranchId: number;
  fleetStations: number;
  fleetQuality: number;
  won: boolean;
  log: string[];
}

export interface ActionResult {
  ok: boolean;
  msg: string;
}

export type OrderResult =
  | { status: 'none' }
  | { status: 'served'; product: ProductDef; price: number; profit: number }
  | { status: 'soldout'; product: ProductDef }
  | { status: 'nopack'; product: ProductDef };

export interface RoadmapStep {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

export type StockStatus = 'ok' | 'low' | 'out';

const SAVE_KEY = 'nettycoon.save.v2';
const SAVE_VERSION = 2;
export const START_MONEY = 200000;

const emptyDay = (): DayStats => ({
  customers: 0,
  walkouts: 0,
  rentalRevenue: 0,
  foodRevenue: 0,
  costOfGoods: 0,
  ordersServed: 0,
  ordersFailed: 0,
  starsSum: 0,
  starsCount: 0,
  eventCost: 0,
  upgradeSpend: 0,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Nhu cầu khách theo giờ trong ngày (1.0 = trung bình) */
const demandByHour = (h: number): number => {
  if (h < 8) return 0.5;
  if (h < 11) return 0.7;
  if (h < 14) return 0.9;
  if (h < 17) return 1.15;
  if (h < 22) return 1.5;
  return 1.1;
};

export const formatHour = (h: number): string => {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export const formatMoney = (n: number): string => `${Math.round(n).toLocaleString('vi-VN')}đ`;

export interface EngineOptions {
  rand?: () => number;
  useStorage?: boolean;
}

export class TycoonEngine {
  state: GameState;
  private snap: GameState;
  private listeners = new Set<() => void>();
  private dirty = false;
  private emitAccum = 0;
  private saveAccum = 0;
  private rand: () => number;
  private useStorage: boolean;

  constructor(opts: EngineOptions = {}) {
    this.rand = opts.rand ?? Math.random;
    this.useStorage = opts.useStorage ?? false;
    this.state = this.freshState();
    if (this.useStorage) this.load();
    this.snap = this.clone();
  }

  /* ------------------------------ nền tảng ------------------------------ */

  private freshState(): GameState {
    const stock: Record<string, number> = {};
    for (const p of PRODUCTS) stock[p.id] = p.startStock;
    const zones = {} as Record<ZoneId, boolean>;
    for (const z of ZONES) zones[z.id] = z.initial;
    return {
      version: SAVE_VERSION,
      day: 1,
      hour: GAME_CLOCK.openHour,
      phase: 'closed',
      money: START_MONEY,
      stock,
      warehouseLevel: 1,
      ownedLocations: ['alley'],
      activeLocation: 'alley',
      locationAge: { alley: 0 },
      zones,
      staff: { cashier: 0, waiter: 0, technician: 0, manager: 0 },
      env: { internetPlan: 'gigabit', acEnabled: true, foodService: true, pricingPolicy: 'standard' },
      recentStars: [],
      fame: 0,
      today: emptyDay(),
      history: [],
      lifetime: {
        customers: 0, reviews: 0, orders: 0, upgrades: 0, revenue: 0,
        bestNetProfit: -Infinity, rivalsAppeared: 0, hasOpened: false,
      },
      rivals: [],
      nextRivalId: 1,
      rivalCooldownDays: 0,
      promoDaysLeft: 0,
      tournamentUntilHour: -1,
      tournamentCooldown: 0,
      cyberGaming: false,
      branches: [],
      nextBranchId: 1,
      fleetStations: 6,
      fleetQuality: 7,
      won: false,
      log: ['Chào mừng ông chủ! Hãy nhập hàng, kiểm tra giá rồi bấm "Mở tiệm".'],
    };
  }

  private clone(): GameState {
    const s = JSON.parse(
      JSON.stringify(this.state, (_k, v) => (v === -Infinity ? '-inf' : v))
    ) as GameState;
    if ((s.lifetime.bestNetProfit as unknown) === '-inf') s.lifetime.bestNetProfit = -Infinity;
    return s;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): GameState => this.snap;

  private emit(): void {
    this.dirty = false;
    this.emitAccum = 0;
    this.snap = this.clone();
    this.listeners.forEach(l => l());
  }

  private touch(): void {
    this.dirty = true;
  }

  private note(msg: string): void {
    const s = this.state;
    s.log = [`Ngày ${s.day} ${formatHour(s.hour)} • ${msg}`, ...s.log].slice(0, 14);
    this.touch();
  }

  /** Gọi mỗi frame từ vòng lặp mô phỏng. dt tính bằng giây thật. */
  tick(dt: number): void {
    const s = this.state;
    if (s.phase === 'open') {
      s.hour += dt / GAME_CLOCK.secondsPerGameHour;
      this.dirty = true;
      if (s.hour >= GAME_CLOCK.closeHour) {
        this.endDay('Hết giờ, tiệm tự đóng cửa.');
        return;
      }
    }
    this.emitAccum += dt;
    this.saveAccum += dt;
    if (this.dirty && this.emitAccum >= 0.25) this.emit();
    if (this.useStorage && this.saveAccum >= 15) {
      this.saveAccum = 0;
      this.save();
    }
  }

  /* ------------------------------ lưu / tải ------------------------------ */

  save(): void {
    if (!this.useStorage || typeof localStorage === 'undefined') return;
    try {
      const raw = JSON.stringify(this.state, (_k, v) => (v === -Infinity ? '-inf' : v));
      localStorage.setItem(SAVE_KEY, raw);
    } catch {
      /* bỏ qua lỗi lưu */
    }
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as GameState;
      if (!saved || saved.version !== SAVE_VERSION) return;
      const base = this.freshState();
      this.state = {
        ...base,
        ...saved,
        stock: { ...base.stock, ...saved.stock },
        zones: { ...base.zones, ...saved.zones },
        staff: { ...base.staff, ...saved.staff },
        env: { ...base.env, ...saved.env },
        today: { ...base.today, ...saved.today },
        lifetime: { ...base.lifetime, ...saved.lifetime },
      };
      if ((this.state.lifetime.bestNetProfit as unknown) === '-inf') {
        this.state.lifetime.bestNetProfit = -Infinity;
      }
      // Khách ngoài đời thực không lưu: luôn quay lại đầu ngày
      if (this.state.phase === 'open') {
        this.state.phase = 'closed';
        this.state.hour = GAME_CLOCK.openHour;
        this.state.today = emptyDay();
      }
      this.state.log = ['Đã tải game đã lưu. Chúc ông chủ một ngày bội thu!', ...(saved.log ?? [])].slice(0, 14);
    } catch {
      /* file lưu hỏng thì chơi mới */
    }
  }

  reset(): void {
    this.state = this.freshState();
    if (this.useStorage && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* bỏ qua */
      }
    }
    this.emit();
  }

  continueAfterWin(): void {
    this.note('Ông chủ tiếp tục mở rộng đế chế Cyber Game!');
    this.emit();
  }

  /* ------------------------------ truy vấn ------------------------------ */

  get location() {
    return LOCATION_BY_ID[this.state.activeLocation];
  }

  isOpen(): boolean {
    return this.state.phase === 'open';
  }

  usedArea(): number {
    return ZONES.filter(z => this.state.zones[z.id]).reduce((a, z) => a + z.area, 0);
  }

  stockCap(p: ProductDef): number {
    const mult = WAREHOUSE_LEVELS[this.state.warehouseLevel - 1]?.capacityMult ?? 1;
    return Math.round(p.maxStock * mult);
  }

  stockStatus(id: string): StockStatus {
    const p = PRODUCT_BY_ID[id];
    const n = this.state.stock[id] ?? 0;
    if (n <= 0) return 'out';
    if (n <= Math.max(1, Math.floor(this.stockCap(p) * LOW_STOCK_RATIO))) return 'low';
    return 'ok';
  }

  /** Ví dụ: "Coca: 3 / 50" */
  stockLabel(id: string): string {
    const p = PRODUCT_BY_ID[id];
    return `${p.name}: ${this.state.stock[id] ?? 0} / ${this.stockCap(p)}`;
  }

  stockWarnings(): { product: ProductDef; status: StockStatus; label: string; text: string }[] {
    const out: { product: ProductDef; status: StockStatus; label: string; text: string }[] = [];
    for (const p of PRODUCTS) {
      const status = this.stockStatus(p.id);
      if (status === 'ok') continue;
      out.push({
        product: p,
        status,
        label: this.stockLabel(p.id),
        text: status === 'out' ? '⛔ Hết hàng' : '⚠ Sắp hết hàng',
      });
    }
    return out.sort((a, b) => (a.status === b.status ? 0 : a.status === 'out' ? -1 : 1));
  }

  stockValue(): number {
    return PRODUCTS.reduce((a, p) => a + (this.state.stock[p.id] ?? 0) * p.buyPrice, 0);
  }

  rating(): number {
    const r = this.state.recentStars;
    if (r.length === 0) return 3.5;
    return r.reduce((a, b) => a + b, 0) / r.length;
  }

  /** Hiệu quả nhân viên: 1 người = 45%, 2 người = 70%, 3 người = 83% */
  staffEff(id: StaffId): number {
    return 1 - Math.pow(0.55, this.state.staff[id] ?? 0);
  }

  staffTotal(): number {
    return STAFF.reduce((a, s) => a + (this.state.staff[s.id] ?? 0), 0);
  }

  shopCount(): number {
    return 1 + this.state.branches.length;
  }

  growthBonus(): number {
    const loc = this.location;
    const age = this.state.locationAge[loc.id] ?? 0;
    return Math.min(loc.growthCap, age * loc.growthPerDay);
  }

  rivalPressure(locationId: LocationId = this.state.activeLocation): number {
    const s = this.state;
    const comp = LOCATION_BY_ID[locationId].competition / 100;
    const total = s.rivals.reduce((a, r) => a + r.strength, 0) / 100;
    let p = total * comp * 0.5;
    p *= 1 - 0.15 * this.staffEff('manager');
    if (s.promoDaysLeft > 0) p *= 0.5;
    return clamp(p, 0, 0.6);
  }

  power(): number {
    const s = this.state;
    const zonesOwned = ZONES.filter(z => s.zones[z.id]).length;
    return (
      (this.rating() / 5) * 35 +
      (s.fleetQuality / 35) * 25 +
      Math.min(24, zonesOwned * 3) +
      (s.cyberGaming ? 10 : 0) +
      Math.min(20, s.branches.length * 5) +
      s.fame * 0.15
    );
  }

  marketShare(): number {
    const mine = this.power();
    const rivals = this.state.rivals.reduce((a, r) => a + r.strength * 0.6, 0);
    return mine / (mine + rivals);
  }

  tournamentActive(): boolean {
    return this.state.phase === 'open' && this.state.hour < this.state.tournamentUntilHour;
  }

  trafficMultiplier(): number {
    const s = this.state;
    // Danh tiếng (đánh giá sao) và chất lượng máy đều kéo thêm khách
    const ratingFactor = 0.5 + (this.rating() / 5) * 0.7;
    const qualityFactor = 0.9 + (s.fleetQuality / 35) * 0.5;
    let m = this.location.traffic * (1 + this.growthBonus()) * ratingFactor * qualityFactor;
    m *= 1 - this.rivalPressure();
    m *= 1 + s.fame / 200;
    m *= demandByHour(s.hour);
    if (this.tournamentActive()) m *= 1.8;
    if (s.promoDaysLeft > 0) m *= 1.25;
    return Math.max(0.05, m);
  }

  /** Số giây giữa 2 lượt khách đến */
  spawnIntervalSec(): number {
    return clamp(8 / this.trafficMultiplier(), 2.5, 40);
  }

  /** Số giây khách chịu xếp hàng chờ máy */
  queuePatience(): number {
    return 18 + 6 * this.staffEff('cashier') * 1.5;
  }

  dailyCosts() {
    const s = this.state;
    const rent = this.location.rent;
    const salaries = STAFF.reduce((a, d) => a + d.salaryPerDay * (s.staff[d.id] ?? 0), 0);
    const utilities =
      COSTS.utilitiesBase +
      COSTS.utilitiesPerStation * s.fleetStations +
      COSTS.internet[s.env.internetPlan] +
      (s.env.acEnabled ? COSTS.ac : 0);
    return { rent, salaries, utilities, total: rent + salaries + utilities };
  }

  /* ------------------------------ ngày mở / đóng ------------------------------ */

  openShop(): ActionResult {
    const s = this.state;
    if (s.phase === 'bankrupt') return { ok: false, msg: 'Tiệm đã phá sản. Hãy chơi lại.' };
    if (s.phase === 'open') return { ok: false, msg: 'Tiệm đang mở cửa.' };
    s.phase = 'open';
    s.hour = GAME_CLOCK.openHour;
    s.today = emptyDay();
    s.lifetime.hasOpened = true;
    this.note(`Mở tiệm ngày ${s.day} tại ${this.location.name}.`);
    this.emit();
    return { ok: true, msg: 'Đã mở tiệm!' };
  }

  closeShop(): ActionResult {
    if (this.state.phase !== 'open') return { ok: false, msg: 'Tiệm chưa mở cửa.' };
    const r = this.endDay('Ông chủ đóng cửa sớm.');
    return { ok: true, msg: `Đã chốt ngày ${r.day}.` };
  }

  private endDay(reason: string): DayReport {
    const s = this.state;
    const t = s.today;
    const costs = this.dailyCosts();

    s.money -= costs.total;

    // Chi nhánh chạy tự động
    let branchNet = 0;
    for (const b of s.branches) {
      const net = this.branchDailyNet(b);
      b.lastNet = net;
      branchNet += net;
    }
    s.money += branchNet;

    const accrual =
      t.rentalRevenue + t.foodRevenue - t.costOfGoods - costs.total - t.eventCost + branchNet;
    const revenueToday = t.rentalRevenue + t.foodRevenue;

    // Đối thủ, danh tiếng, tuổi mặt bằng
    this.evolveRivals();
    s.fame = Math.max(0, s.fame - 0.5);
    s.locationAge[s.activeLocation] = (s.locationAge[s.activeLocation] ?? 0) + 1;
    if (s.promoDaysLeft > 0) s.promoDaysLeft -= 1;
    if (s.tournamentCooldown > 0) s.tournamentCooldown -= 1;
    if (s.rivalCooldownDays > 0) s.rivalCooldownDays -= 1;
    s.tournamentUntilHour = -1;

    const report: DayReport = {
      ...t,
      day: s.day,
      rent: costs.rent,
      salaries: costs.salaries,
      utilities: costs.utilities,
      branchNet,
      netProfit: accrual,
      rating: this.rating(),
      marketShare: this.marketShare(),
      moneyAfter: s.money,
    };
    s.history = [report, ...s.history].slice(0, 14);
    s.lifetime.revenue += revenueToday + Math.max(0, branchNet);
    s.lifetime.bestNetProfit = Math.max(s.lifetime.bestNetProfit, accrual);

    this.note(
      `${reason} Lợi nhuận ngày ${s.day}: ${accrual >= 0 ? '+' : ''}${formatMoney(accrual)}.`
    );

    if (s.money < COSTS.bankruptcyFloor) {
      s.phase = 'bankrupt';
      this.note('💀 Nợ nần chồng chất, tiệm phá sản!');
    } else {
      s.phase = 'closed';
      s.day += 1;
      s.hour = GAME_CLOCK.openHour;
      s.today = emptyDay();
    }
    this.checkWin();
    this.save();
    this.emit();
    return report;
  }

  private checkWin(): void {
    const s = this.state;
    if (s.won || s.phase === 'bankrupt') return;
    if (
      s.cyberGaming &&
      this.shopCount() >= WIN_CONDITION.minShops &&
      this.rating() >= WIN_CONDITION.minRating &&
      this.marketShare() >= WIN_CONDITION.minMarketShare
    ) {
      s.won = true;
      this.note('🏆 BẠN ĐÃ TRỞ THÀNH ÔNG CHỦ CYBER GAME LỚN NHẤT THÀNH PHỐ!');
    }
  }

  winProgress() {
    const s = this.state;
    return [
      { label: 'Cyber Gaming', now: s.cyberGaming ? 1 : 0, need: 1, text: s.cyberGaming ? 'Đã mở' : 'Chưa mở' },
      { label: 'Số cơ sở', now: this.shopCount(), need: WIN_CONDITION.minShops, text: `${this.shopCount()} / ${WIN_CONDITION.minShops}` },
      { label: 'Đánh giá', now: this.rating(), need: WIN_CONDITION.minRating, text: `${this.rating().toFixed(2)} / ${WIN_CONDITION.minRating}★` },
      { label: 'Thị phần', now: this.marketShare(), need: WIN_CONDITION.minMarketShare, text: `${Math.round(this.marketShare() * 100)}% / ${Math.round(WIN_CONDITION.minMarketShare * 100)}%` },
    ];
  }

  /* ------------------------------ kho & nhập hàng ------------------------------ */

  buyStock(id: string, qty: number): ActionResult {
    const s = this.state;
    const p = PRODUCT_BY_ID[id];
    if (!p) return { ok: false, msg: 'Không có sản phẩm này.' };
    if (!s.zones.storage) return { ok: false, msg: 'Cần có Kho để nhập hàng.' };
    const room = this.stockCap(p) - (s.stock[id] ?? 0);
    const n = Math.min(Math.floor(qty), room);
    if (n <= 0) return { ok: false, msg: `Kho đã đầy: ${this.stockLabel(id)}.` };
    const cost = n * p.buyPrice;
    if (s.money < cost) return { ok: false, msg: `Không đủ tiền nhập ${n} ${p.name} (${formatMoney(cost)}).` };
    s.money -= cost;
    s.stock[id] = (s.stock[id] ?? 0) + n;
    this.note(`Nhập ${n} ${p.name} (-${formatMoney(cost)}).`);
    this.emit();
    return { ok: true, msg: `Đã nhập ${n} ${p.name}.` };
  }

  fillToMax(id: string): ActionResult {
    const p = PRODUCT_BY_ID[id];
    if (!p) return { ok: false, msg: 'Không có sản phẩm này.' };
    const room = this.stockCap(p) - (this.state.stock[id] ?? 0);
    return this.buyStock(id, room);
  }

  /** Nhập bù các mặt hàng đang thấp lên khoảng 70% sức chứa, trong khả năng tiền có */
  restockLow(): ActionResult {
    const s = this.state;
    let spent = 0;
    let items = 0;
    for (const p of PRODUCTS) {
      if (this.stockStatus(p.id) === 'ok') continue;
      const target = Math.ceil(this.stockCap(p) * 0.7);
      const need = target - (s.stock[p.id] ?? 0);
      const afford = Math.floor(s.money / p.buyPrice);
      const n = Math.min(need, afford);
      if (n <= 0) continue;
      s.money -= n * p.buyPrice;
      s.stock[p.id] = (s.stock[p.id] ?? 0) + n;
      spent += n * p.buyPrice;
      items += 1;
    }
    if (items === 0) return { ok: false, msg: 'Không có mặt hàng nào cần nhập (hoặc không đủ tiền).' };
    this.note(`Nhập bù ${items} mặt hàng sắp hết (-${formatMoney(spent)}).`);
    this.emit();
    return { ok: true, msg: `Đã nhập bù ${items} mặt hàng, chi ${formatMoney(spent)}.` };
  }

  upgradeWarehouse(): ActionResult {
    const s = this.state;
    const next = WAREHOUSE_LEVELS[s.warehouseLevel];
    if (!next) return { ok: false, msg: 'Kho đã đạt cấp tối đa.' };
    if (s.money < next.upgradeCost) return { ok: false, msg: `Cần ${formatMoney(next.upgradeCost)} để nâng kho.` };
    s.money -= next.upgradeCost;
    s.warehouseLevel = next.level;
    this.note(`Nâng kho lên cấp ${next.level} (sức chứa ×${next.capacityMult}).`);
    this.emit();
    return { ok: true, msg: `Kho cấp ${next.level}!` };
  }

  /* ------------------------------ khu vực ------------------------------ */

  zoneBlockReason(id: ZoneId): string | null {
    const s = this.state;
    const z = ZONE_BY_ID[id];
    if (s.zones[id]) return 'Đã mở';
    if (z.requires.zones) {
      for (const r of z.requires.zones) if (!s.zones[r]) return `Cần mở ${ZONE_BY_ID[r].name} trước`;
    }
    if (z.requires.minRating !== undefined && this.rating() < z.requires.minRating) {
      return `Cần đánh giá ≥ ${z.requires.minRating}★ (hiện ${this.rating().toFixed(1)}★)`;
    }
    if (z.requires.minStaff !== undefined && this.staffTotal() < z.requires.minStaff) {
      return `Cần thuê ít nhất ${z.requires.minStaff} nhân viên`;
    }
    if (this.usedArea() + z.area > this.location.area) {
      return `Thiếu diện tích: cần ${z.area}m², còn ${this.location.area - this.usedArea()}m² (chuyển sang mặt bằng lớn hơn)`;
    }
    return null;
  }

  unlockZone(id: ZoneId): ActionResult {
    const s = this.state;
    const z = ZONE_BY_ID[id];
    const reason = this.zoneBlockReason(id);
    if (reason) return { ok: false, msg: reason };
    if (s.money < z.unlockCost) return { ok: false, msg: `Cần ${formatMoney(z.unlockCost)} để mở ${z.name}.` };
    s.money -= z.unlockCost;
    s.zones[id] = true;
    this.note(`Mở rộng: ${z.emoji} ${z.name} (-${formatMoney(z.unlockCost)}).`);
    this.emit();
    return { ok: true, msg: `Đã mở ${z.name}!` };
  }

  extraStationsUnlocked(): number {
    return ZONES.filter(z => this.state.zones[z.id]).reduce((a, z) => a + z.extraStations, 0);
  }

  /* ------------------------------ mặt bằng ------------------------------ */

  unlockLocation(id: LocationId): ActionResult {
    const s = this.state;
    const loc = LOCATION_BY_ID[id];
    if (s.ownedLocations.includes(id)) return { ok: false, msg: 'Đã sở hữu mặt bằng này.' };
    if (s.money < loc.unlockCost) return { ok: false, msg: `Cần ${formatMoney(loc.unlockCost)} để mua ${loc.name}.` };
    s.money -= loc.unlockCost;
    s.ownedLocations.push(id);
    s.locationAge[id] = 0;
    this.note(`Mua mặt bằng ${loc.emoji} ${loc.name} (-${formatMoney(loc.unlockCost)}).`);
    this.emit();
    return { ok: true, msg: `Đã mua ${loc.name}!` };
  }

  switchLocation(id: LocationId): ActionResult {
    const s = this.state;
    const loc = LOCATION_BY_ID[id];
    if (s.phase === 'open') return { ok: false, msg: 'Hãy đóng cửa tiệm trước khi chuyển mặt bằng.' };
    if (!s.ownedLocations.includes(id)) return { ok: false, msg: 'Chưa sở hữu mặt bằng này.' };
    if (id === s.activeLocation) return { ok: false, msg: 'Đang kinh doanh tại đây rồi.' };
    if (s.branches.some(b => b.locationId === id)) {
      return { ok: false, msg: 'Mặt bằng này đang có chi nhánh. Hãy chọn nơi khác.' };
    }
    if (this.usedArea() > loc.area) {
      return { ok: false, msg: `Diện tích ${loc.area}m² không đủ cho các khu đang dùng (${this.usedArea()}m²).` };
    }
    if (s.money < RELOCATE_FEE) return { ok: false, msg: `Cần ${formatMoney(RELOCATE_FEE)} phí chuyển tiệm.` };
    s.money -= RELOCATE_FEE;
    s.activeLocation = id;
    this.note(`Chuyển tiệm chính sang ${loc.emoji} ${loc.name}.`);
    this.emit();
    return { ok: true, msg: `Đã chuyển sang ${loc.name}.` };
  }

  /* ------------------------------ nhân viên ------------------------------ */

  staffBlockReason(id: StaffId): string | null {
    const s = this.state;
    const d = STAFF_BY_ID[id];
    if ((s.staff[id] ?? 0) >= d.maxCount) return 'Đã đạt số lượng tối đa';
    if (d.requiresZone && !s.zones[d.requiresZone]) return `Cần mở ${ZONE_BY_ID[d.requiresZone].name}`;
    if (d.minRating !== undefined && this.rating() < d.minRating) return `Cần đánh giá ≥ ${d.minRating}★`;
    return null;
  }

  hire(id: StaffId): ActionResult {
    const s = this.state;
    const d = STAFF_BY_ID[id];
    const reason = this.staffBlockReason(id);
    if (reason) return { ok: false, msg: reason };
    if (s.money < d.hireFee) return { ok: false, msg: `Cần ${formatMoney(d.hireFee)} phí tuyển dụng.` };
    s.money -= d.hireFee;
    s.staff[id] += 1;
    this.note(`Thuê ${d.emoji} ${d.name} (lương ${formatMoney(d.salaryPerDay)}/ngày).`);
    this.emit();
    return { ok: true, msg: `Đã thuê ${d.name}.` };
  }

  fire(id: StaffId): ActionResult {
    const s = this.state;
    if ((s.staff[id] ?? 0) <= 0) return { ok: false, msg: 'Không có nhân viên này.' };
    if (id === 'manager' && s.staff.manager <= s.branches.length) {
      return { ok: false, msg: 'Mỗi chi nhánh cần 1 quản lý, không thể cho nghỉ.' };
    }
    s.staff[id] -= 1;
    this.note(`Cho nghỉ việc 1 ${STAFF_BY_ID[id].name}.`);
    this.emit();
    return { ok: true, msg: 'Đã cho nghỉ việc.' };
  }

  /* ------------------------------ giải đấu & khuyến mãi ------------------------------ */

  startTournament(): ActionResult {
    const s = this.state;
    if (!s.zones.tournament) return { ok: false, msg: 'Cần mở Phòng Tournament.' };
    if (s.phase !== 'open') return { ok: false, msg: 'Chỉ tổ chức giải đấu khi tiệm đang mở cửa.' };
    if (this.tournamentActive()) return { ok: false, msg: 'Giải đấu đang diễn ra.' };
    if (s.tournamentCooldown > 0) return { ok: false, msg: `Cần nghỉ ${s.tournamentCooldown} ngày nữa.` };
    if (s.money < COSTS.tournament) return { ok: false, msg: `Cần ${formatMoney(COSTS.tournament)} tiền giải thưởng.` };
    s.money -= COSTS.tournament;
    s.today.eventCost += COSTS.tournament;
    s.tournamentUntilHour = s.hour + 5;
    s.tournamentCooldown = COSTS.tournamentCooldownDays;
    s.fame = Math.min(100, s.fame + (s.cyberGaming ? 14 : 8));
    this.note('🏆 Giải đấu khai mạc! Game thủ kéo đến đông nghịt.');
    this.emit();
    return { ok: true, msg: 'Giải đấu bắt đầu trong 5 giờ game!' };
  }

  runPromotion(): ActionResult {
    const s = this.state;
    if (s.promoDaysLeft > 0) return { ok: false, msg: 'Đang có khuyến mãi.' };
    if (s.money < COSTS.promotion) return { ok: false, msg: `Cần ${formatMoney(COSTS.promotion)} chi phí quảng cáo.` };
    s.money -= COSTS.promotion;
    s.today.eventCost += COSTS.promotion;
    s.promoDaysLeft = 2;
    this.note('📣 Chạy khuyến mãi 2 ngày: nhiều khách hơn, đối thủ bị lu mờ.');
    this.emit();
    return { ok: true, msg: 'Khuyến mãi bắt đầu!' };
  }

  /* ------------------------------ đối thủ ------------------------------ */

  private evolveRivals(): void {
    const s = this.state;
    const comp = this.location.competition;
    for (const r of s.rivals) {
      const grow = this.rating() < 4 ? 0.8 + this.rand() * 1.4 : 0.1 + this.rand() * 0.6;
      r.strength = clamp(r.strength + grow, 5, 75);
    }
    const n = s.rivals.length;
    const canSpawn =
      s.rivalCooldownDays <= 0 &&
      ((n === 0 && s.day >= 4) || (n === 1 && s.day >= 10 && comp >= 40) || (n === 2 && s.day >= 18 && comp >= 60));
    if (canSpawn) {
      const used = new Set(s.rivals.map(r => r.name));
      const name = RIVAL_NAMES.find(x => !used.has(x)) ?? `Net Đối Thủ ${s.nextRivalId}`;
      s.rivals.push({
        id: s.nextRivalId++,
        name,
        strength: 18 + Math.floor(this.rand() * 12) + comp / 10,
        appearedDay: s.day,
      });
      s.lifetime.rivalsAppeared += 1;
      this.note(`⚔️ Đối thủ "${name}" khai trương gần tiệm của bạn!`);
    }
  }

  buyoutCost(r: Rival): number {
    return Math.round(r.strength * 60000);
  }

  buyOutRival(id: number): ActionResult {
    const s = this.state;
    const r = s.rivals.find(x => x.id === id);
    if (!r) return { ok: false, msg: 'Không tìm thấy đối thủ.' };
    if (s.staff.manager < 1) return { ok: false, msg: 'Cần thuê Quản lý để đàm phán mua lại.' };
    const cost = this.buyoutCost(r);
    if (s.money < cost) return { ok: false, msg: `Cần ${formatMoney(cost)} để mua lại ${r.name}.` };
    s.money -= cost;
    s.rivals = s.rivals.filter(x => x.id !== id);
    s.rivalCooldownDays = 6;
    s.fame = Math.min(100, s.fame + 6);
    this.note(`🤝 Mua lại "${r.name}" (-${formatMoney(cost)}). Đối thủ biến mất!`);
    this.emit();
    return { ok: true, msg: `Đã mua lại ${r.name}.` };
  }

  /* ------------------------------ Cyber Gaming & chi nhánh ------------------------------ */

  cyberBlockReason(): string | null {
    const s = this.state;
    if (s.cyberGaming) return 'Đã mở';
    for (const z of CYBER_REQUIREMENTS.zones) {
      if (!s.zones[z]) return `Cần mở ${ZONE_BY_ID[z].name}`;
    }
    if (this.rating() < CYBER_REQUIREMENTS.minRating) {
      return `Cần đánh giá ≥ ${CYBER_REQUIREMENTS.minRating}★ (hiện ${this.rating().toFixed(1)}★)`;
    }
    return null;
  }

  unlockCyberGaming(): ActionResult {
    const s = this.state;
    const reason = this.cyberBlockReason();
    if (reason) return { ok: false, msg: reason };
    if (s.money < COSTS.cyberGaming) return { ok: false, msg: `Cần ${formatMoney(COSTS.cyberGaming)} để nâng cấp Cyber Gaming.` };
    s.money -= COSTS.cyberGaming;
    s.cyberGaming = true;
    s.fame = Math.min(100, s.fame + 20);
    this.note('🚀 Khai trương CYBER GAMING! Thương hiệu lên một tầm mới.');
    this.checkWin();
    this.emit();
    return { ok: true, msg: 'Cyber Gaming đã khai trương!' };
  }

  branchBlockReason(id: LocationId): string | null {
    const s = this.state;
    if (!s.cyberGaming) return 'Cần mở Cyber Gaming trước';
    if (!s.ownedLocations.includes(id)) return 'Cần mua mặt bằng này trước';
    if (id === s.activeLocation) return 'Đây là tiệm chính';
    if (s.branches.some(b => b.locationId === id)) return 'Đã có chi nhánh';
    if (s.staff.manager < s.branches.length + 1) return 'Cần thuê thêm 1 Quản lý cho chi nhánh mới';
    return null;
  }

  openBranch(id: LocationId): ActionResult {
    const s = this.state;
    const reason = this.branchBlockReason(id);
    if (reason) return { ok: false, msg: reason };
    if (s.money < COSTS.branchBuild) return { ok: false, msg: `Cần ${formatMoney(COSTS.branchBuild)} để xây chi nhánh.` };
    s.money -= COSTS.branchBuild;
    s.branches.push({ id: s.nextBranchId++, locationId: id, level: 1, openedDay: s.day, lastNet: 0 });
    this.note(`🏢 Khai trương chi nhánh tại ${LOCATION_BY_ID[id].name}!`);
    this.checkWin();
    this.emit();
    return { ok: true, msg: `Chi nhánh ${LOCATION_BY_ID[id].name} đã mở.` };
  }

  upgradeBranch(branchId: number): ActionResult {
    const s = this.state;
    const b = s.branches.find(x => x.id === branchId);
    if (!b) return { ok: false, msg: 'Không tìm thấy chi nhánh.' };
    if (b.level >= 3) return { ok: false, msg: 'Chi nhánh đã đạt cấp tối đa.' };
    const cost = COSTS.branchUpgrade[b.level + 1];
    if (s.money < cost) return { ok: false, msg: `Cần ${formatMoney(cost)} để nâng cấp chi nhánh.` };
    s.money -= cost;
    b.level += 1;
    this.note(`Nâng chi nhánh ${LOCATION_BY_ID[b.locationId].name} lên cấp ${b.level}.`);
    this.emit();
    return { ok: true, msg: `Chi nhánh cấp ${b.level}!` };
  }

  branchUpgradeCost(b: Branch): number {
    return b.level >= 3 ? 0 : COSTS.branchUpgrade[b.level + 1];
  }

  /** Lợi nhuận ước tính mỗi ngày của chi nhánh (không tính lương quản lý) */
  branchExpectedNet(b: Branch, noise = 1): number {
    const loc = LOCATION_BY_ID[b.locationId];
    const flow =
      loc.traffic * (0.5 + (this.rating() / 5) * 0.7) * (1 - this.rivalPressure(b.locationId)) * (1 + this.state.fame / 200);
    const revenue = 900000 * flow * (0.5 + 0.2 * b.level) * loc.spendMult * noise;
    const cost = loc.rent + 40000 + revenue * 0.28;
    return Math.round(revenue - cost);
  }

  private branchDailyNet(b: Branch): number {
    return this.branchExpectedNet(b, 0.9 + this.rand() * 0.2);
  }

  /* ------------------------------ móc cho mô phỏng 3D ------------------------------ */

  setEnvironment(env: Partial<Environment>): void {
    this.state.env = { ...this.state.env, ...env };
    this.touch();
  }

  reportFleet(stations: number, avgQuality: number): void {
    const s = this.state;
    if (s.fleetStations === stations && Math.abs(s.fleetQuality - avgQuality) < 0.01) return;
    s.fleetStations = stations;
    s.fleetQuality = avgQuality;
    this.touch();
  }

  upgradeCostMult(): number {
    return 1 - 0.15 * Math.min(2, this.state.staff.technician);
  }

  /** Nâng cấp linh kiện: tốn tiền + 1 bộ linh kiện trong kho */
  tryUpgrade(kind: 'ram' | 'gpu' | 'monitor', baseCost: number): ActionResult & { cost: number } {
    const s = this.state;
    const partId = kind === 'ram' ? 'part_ram' : kind === 'gpu' ? 'part_vga' : 'part_monitor';
    const part = PRODUCT_BY_ID[partId];
    const cost = Math.round(baseCost * this.upgradeCostMult());
    if ((s.stock[partId] ?? 0) <= 0) {
      return { ok: false, cost, msg: `Hết ${part.name}! Hãy nhập thêm trong Kho.` };
    }
    if (s.money < cost) return { ok: false, cost, msg: `Cần ${formatMoney(cost)} để nâng cấp.` };
    s.money -= cost;
    s.stock[partId] -= 1;
    s.today.upgradeSpend += cost;
    s.lifetime.upgrades += 1;
    this.touch();
    this.emit();
    return { ok: true, cost, msg: 'Nâng cấp thành công.' };
  }

  /** Loại khách tiếp theo + số giờ + giá thuê (đã gồm phụ thu khu Gaming/VIP/Cyber) */
  rollCustomer(): { type: CustomerKind; hours: number; pricePerHour: number } | null {
    const s = this.state;
    if (s.phase !== 'open') return null;
    const mix = { ...this.location.customerMix };
    const h = s.hour;
    // Thời gian trong ngày
    if (h >= 14 && h < 19) mix.HocSinh *= 1.4;
    if (h >= 22) mix.HocSinh *= 0.3;
    if (h >= 18) mix.GameThu *= 1.3;
    if (h >= 17 && h < 22) mix.VIP *= 1.2;
    // Cơ sở vật chất
    if (s.zones.gaming) mix.GameThu *= 1.25;
    mix.VIP *= s.zones.vip ? 1.3 : 0.6;
    if (s.cyberGaming) {
      mix.GameThu *= 1.25;
      mix.VIP *= 1.15;
    }
    if (this.tournamentActive()) mix.GameThu *= 2.5;

    const total = mix.HocSinh + mix.GameThu + mix.VIP;
    let r = this.rand() * total;
    let type: CustomerKind = 'HocSinh';
    if ((r -= mix.HocSinh) >= 0) {
      type = (r -= mix.GameThu) < 0 ? 'GameThu' : 'VIP';
    }

    let hours = 1;
    let price = 5000;
    if (type === 'HocSinh') {
      hours = 1 + this.rand() * 1.5;
      price = 5000;
    } else if (type === 'GameThu') {
      hours = 2.5 + this.rand() * 2;
      price = 10000 * (s.zones.gaming ? 1.25 : 1) * (s.cyberGaming ? 1.15 : 1);
    } else {
      hours = 4 + this.rand() * 3;
      price = 20000 * (s.zones.vip ? 1.5 : 1) * (s.cyberGaming ? 1.15 : 1);
    }
    return { type, hours: Math.round(hours * 10) / 10, pricePerHour: Math.round(price) };
  }

  /** Doanh thu thuê máy sau khi áp chính sách giá, khu vực và nhân viên */
  rentalRevenue(hours: number, pricePerHour: number): number {
    const s = this.state;
    const policy = s.env.pricingPolicy === 'cheap' ? 0.8 : s.env.pricingPolicy === 'expensive' ? 1.3 : 1;
    const staffBonus = 1 + 0.08 * this.staffEff('cashier') * 1.8 + 0.06 * this.staffEff('manager') * 1.8;
    return Math.round(hours * pricePerHour * policy * this.location.spendMult * staffBonus);
  }

  recordCustomerStart(revenue: number): void {
    const s = this.state;
    s.money += revenue;
    s.today.rentalRevenue += revenue;
    s.today.customers += 1;
    s.lifetime.customers += 1;
    this.touch();
  }

  recordWalkout(): void {
    this.state.today.walkouts += 1;
    this.touch();
  }

  /** Lên kế hoạch các lần gọi đồ (giây kể từ lúc ngồi máy) cho một khách */
  planOrders(type: CustomerKind, hours: number, sessionSeconds: number): number[] {
    const s = this.state;
    if (!s.env.foodService || !s.zones.eating) return [];
    const rate = type === 'HocSinh' ? 0.55 : type === 'GameThu' ? 0.7 : 0.8;
    let expected = rate * hours * this.location.spendMult;
    expected *= 1 + 0.3 * this.staffEff('waiter') * 1.8;
    if (type === 'VIP' && s.zones.vip) expected *= 1.25;
    const n = Math.floor(expected + this.rand());
    const times: number[] = [];
    for (let i = 0; i < n; i++) times.push(sessionSeconds * (0.08 + this.rand() * 0.84));
    return times.sort((a, b) => a - b);
  }

  private peakMult(p: ProductDef): number {
    let m = 1;
    for (const [from, to, k] of p.peaks) {
      if (this.state.hour >= from && this.state.hour < to) m *= k;
    }
    return m;
  }

  private pickProduct(type: CustomerKind, onlyInStock: boolean): ProductDef | null {
    const list = SELLABLE_PRODUCTS.filter(p => !onlyInStock || (this.state.stock[p.id] ?? 0) > 0);
    const weights = list.map(p => p.weights[type] * this.peakMult(p));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = this.rand() * total;
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  /** Một khách gọi đồ. Trừ kho, thu tiền, tính giá vốn. */
  processOrder(type: CustomerKind): OrderResult {
    const s = this.state;
    if (!s.env.foodService || !s.zones.eating) return { status: 'none' };
    const wanted = this.pickProduct(type, false);
    if (!wanted) return { status: 'none' };

    let chosen: ProductDef | null = wanted;
    if ((s.stock[wanted.id] ?? 0) <= 0) {
      // Khách muốn món này nhưng hết: 40% chịu đổi sang món khác còn hàng
      chosen = this.rand() < 0.4 ? this.pickProduct(type, true) : null;
      if (!chosen) {
        s.today.ordersFailed += 1;
        this.touch();
        return { status: 'soldout', product: wanted };
      }
    }
    if ((s.stock['sup_cup'] ?? 0) <= 0) {
      s.today.ordersFailed += 1;
      this.touch();
      return { status: 'nopack', product: chosen };
    }

    s.stock[chosen.id] -= 1;
    s.stock['sup_cup'] -= 1;
    const cupCost = PRODUCT_BY_ID['sup_cup'].buyPrice;
    s.money += chosen.sellPrice;
    s.today.foodRevenue += chosen.sellPrice;
    s.today.costOfGoods += chosen.buyPrice + cupCost;
    s.today.ordersServed += 1;
    s.lifetime.orders += 1;
    this.touch();
    return {
      status: 'served',
      product: chosen,
      price: chosen.sellPrice,
      profit: chosen.sellPrice - chosen.buyPrice - cupCost,
    };
  }

  /** Điểm cộng/trừ hài lòng ban đầu do vệ sinh (hết bộ vệ sinh -> -4) */
  hygieneModifier(): number {
    return (this.state.stock['sup_clean'] ?? 0) > 0 ? 0 : -4;
  }

  waiterSatisfactionBonus(): number {
    return this.state.staff.waiter > 0 ? 2 : 0;
  }

  /** Khách rời máy: dùng 1 bộ vệ sinh */
  recordCustomerLeft(): void {
    const s = this.state;
    if ((s.stock['sup_clean'] ?? 0) > 0) {
      s.stock['sup_clean'] -= 1;
      s.today.costOfGoods += PRODUCT_BY_ID['sup_clean'].buyPrice;
    }
    this.touch();
  }

  recordReview(stars: number): void {
    const s = this.state;
    s.recentStars = [...s.recentStars, stars].slice(-40);
    s.today.starsSum += stars;
    s.today.starsCount += 1;
    s.lifetime.reviews += 1;
    this.touch();
  }

  /* ------------------------------ lộ trình (game loop) ------------------------------ */

  roadmap(): RoadmapStep[] {
    const s = this.state;
    const anyZone = ZONES.some(z => !z.initial && s.zones[z.id]);
    return [
      { id: 'open', label: 'Mở tiệm', hint: 'Bấm "Mở tiệm" để bắt đầu ngày mới.', done: s.lifetime.hasOpened },
      { id: 'customer', label: 'Khách đến, thuê máy, chơi', hint: 'Chờ khách vào quán và ngồi máy.', done: s.lifetime.customers >= 1 },
      { id: 'order', label: 'Khách gọi đồ ăn & nước', hint: 'Giữ kho đủ hàng để phục vụ khách.', done: s.lifetime.orders >= 1 },
      { id: 'review', label: 'Nhận 10 đánh giá', hint: 'Mỗi khách rời đi để lại 1–5 sao.', done: s.lifetime.reviews >= 10 },
      { id: 'profit', label: 'Có ngày lãi (sau khi trừ chi phí)', hint: 'Doanh thu phải lớn hơn tiền thuê, lương, điện nước và giá vốn.', done: s.lifetime.bestNetProfit > 0 },
      { id: 'upgrade', label: 'Nâng cấp máy → khách hài lòng hơn', hint: 'Lại gần bàn máy và bấm E (cần linh kiện trong kho).', done: s.lifetime.upgrades >= 1 },
      { id: 'expand', label: 'Mở rộng tiệm (khu mới hoặc mặt bằng mới)', hint: 'Mở Phòng Kỹ Thuật, Khu Gaming... hoặc mua mặt bằng lớn hơn.', done: anyZone || s.ownedLocations.length > 1 },
      { id: 'staff', label: 'Thuê nhân viên', hint: 'Thu ngân, phục vụ, kỹ thuật, quản lý.', done: this.staffTotal() >= 1 },
      { id: 'vip', label: 'Mở khu VIP', hint: 'Cần ≥3.6★ và có nhân viên.', done: s.zones.vip },
      { id: 'rival', label: 'Đứng vững trước đối thủ (thị phần ≥ 40%)', hint: 'Đối thủ xuất hiện từ ngày 4. Khuyến mãi, nâng cấp, mua lại đối thủ.', done: s.lifetime.rivalsAppeared >= 1 && this.marketShare() >= 0.4 },
      { id: 'cyber', label: 'Mở Cyber Gaming', hint: 'Cần Gaming + VIP + Tournament và ≥4.0★.', done: s.cyberGaming },
      { id: 'branch', label: 'Mở thêm chi nhánh', hint: 'Cần Cyber Gaming, mặt bằng đã mua và 1 quản lý / chi nhánh.', done: s.branches.length >= 1 },
      { id: 'boss', label: 'Trở thành ông chủ Cyber Game lớn nhất', hint: `≥${WIN_CONDITION.minShops} cơ sở, ≥${WIN_CONDITION.minRating}★, thị phần ≥${WIN_CONDITION.minMarketShare * 100}%.`, done: s.won },
    ];
  }

  categoryLabel(p: ProductDef): string {
    return CATEGORY_LABEL[p.category];
  }

  allLocations() {
    return LOCATIONS;
  }
}
