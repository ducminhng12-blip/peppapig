/**
 * Sinh file GameData.cs từ src/game/tycoonData.ts để số liệu C# Unity luôn khớp bản mô phỏng.
 * Chạy:  npx tsx tools/genUnity.ts
 */
import { writeFileSync } from 'node:fs';
import {
  PRODUCTS, ZONES, LOCATIONS, STAFF, WAREHOUSE_LEVELS, COSTS, GAME_CLOCK, WIN_CONDITION,
  CYBER_REQUIREMENTS, KIND_EXPECTATION, FOOD_SATISFACTION, RELOCATE_FEE, LOW_STOCK_RATIO,
} from '../src/game/tycoonData';

const kindIdx = ['HocSinh', 'GameThu', 'VIP'] as const;
const cat = { drink: 'Drink', food: 'Food', part: 'Part', supply: 'Supply' } as const;
const zoneEnum: Record<string, string> = {
  regular: 'Regular', eating: 'Eating', counter: 'Counter', storage: 'Storage',
  tech: 'Tech', gaming: 'Gaming', vip: 'VIP', tournament: 'Tournament',
};
const locEnum: Record<string, string> = { alley: 'Alley', street: 'Street', downtown: 'Downtown', mall: 'Mall' };
const staffEnum: Record<string, string> = { cashier: 'Cashier', waiter: 'Waiter', technician: 'Technician', manager: 'Manager' };
const f = (n: number) => `${n}f`;
const q = (s: string) => JSON.stringify(s);

const products = PRODUCTS.map(p => {
  const peaks = p.peaks.map(([a, b, k]) => `new PeakWindow(${f(a)}, ${f(b)}, ${f(k)})`).join(', ');
  const w = kindIdx.map(k => f(p.weights[k])).join(', ');
  return `        new ProductData("${p.id}", ${q(p.name)}, ProductCategory.${cat[p.category]}, ${p.buyPrice}, ${p.sellPrice}, ${f(p.useTimeSec)}, ${p.maxStock}, ${p.batchSize}, ${p.startStock}, new float[] { ${w} }, new PeakWindow[] { ${peaks} }),`;
}).join('\n');

const zones = ZONES.map(z => {
  const req = (z.requires.zones ?? []).map(r => `ZoneType.${zoneEnum[r]}`).join(', ');
  return `        new ZoneData(ZoneType.${zoneEnum[z.id]}, ${q(z.name)}, ${z.area}, ${z.unlockCost}, ${z.initial ? 'true' : 'false'}, ${z.extraStations}, ${f(z.requires.minRating ?? 0)}, ${z.requires.minStaff ?? 0}, new ZoneType[] { ${req} }),`;
}).join('\n');

const locs = LOCATIONS.map(l =>
  `        new LocationData(LocationId.${locEnum[l.id]}, ${q(l.name)}, ${l.rent}, ${l.unlockCost}, ${f(l.traffic)}, ${l.area}, ${l.competition}, ${q(l.customerType)}, new float[] { ${kindIdx.map(k => f(l.customerMix[k])).join(', ')} }, ${f(l.spendMult)}, ${f(l.growthPerDay)}, ${f(l.growthCap)}),`
).join('\n');

const staff = STAFF.map(s =>
  `        new StaffData(StaffRole.${staffEnum[s.id]}, ${q(s.name)}, ${s.hireFee}, ${s.salaryPerDay}, ${s.maxCount}, ${s.requiresZone ? `(int)ZoneType.${zoneEnum[s.requiresZone]}` : '-1'}, ${f(s.minRating ?? 0)}),`
).join('\n');

const cs = `using System;
using UnityEngine;

// ============================================================================
// GameData.cs - DỮ LIỆU CÂN BẰNG GAME (tự sinh từ bản mô phỏng, đừng sửa tay số liệu)
// Muốn thêm sản phẩm / khu vực / mặt bằng mới: thêm 1 phần tử vào mảng tương ứng.
// ============================================================================

public enum ProductCategory { Drink, Food, Part, Supply }
public enum CustomerKind { HocSinh, GameThu, VIP }
public enum ZoneType { Regular, Eating, Counter, Storage, Tech, Gaming, VIP, Tournament }
public enum LocationId { Alley, Street, Downtown, Mall }
public enum StaffRole { Cashier, Waiter, Technician, Manager }

[Serializable]
public struct PeakWindow
{
    public float fromHour, toHour, multiplier;
    public PeakWindow(float from, float to, float mult) { fromHour = from; toHour = to; multiplier = mult; }
}

[Serializable]
public class ProductData
{
    public string id;
    public string displayName;
    public ProductCategory category;
    public long buyPrice;      // Giá nhập
    public long sellPrice;     // Giá bán (0 = không bán cho khách)
    public float useTimeSec;   // Thời gian khách dùng món (giây trong game)
    public int maxStock;       // Sức chứa kho cấp 1
    public int batchSize;      // 1 lần nhập = 1 lô
    public int startStock;
    public float[] weights;    // Trọng số gọi món: [HocSinh, GameThu, VIP]
    public PeakWindow[] peaks; // Khung giờ gọi nhiều hơn

    public long Profit => sellPrice - buyPrice;
    public bool IsSellable => sellPrice > 0;

    public ProductData(string id, string name, ProductCategory category, long buy, long sell, float useTime,
        int maxStock, int batch, int start, float[] weights, PeakWindow[] peaks)
    {
        this.id = id; displayName = name; this.category = category; buyPrice = buy; sellPrice = sell;
        useTimeSec = useTime; this.maxStock = maxStock; batchSize = batch; startStock = start;
        this.weights = weights; this.peaks = peaks;
    }
}

[Serializable]
public class ZoneData
{
    public ZoneType type;
    public string displayName;
    public int area;            // m2 chiếm dụng
    public long unlockCost;
    public bool initial;        // Có sẵn từ đầu game
    public int extraStations;   // Số máy thêm vào khi mở khu
    public float minRating;
    public int minStaff;
    public ZoneType[] requiredZones;

    public ZoneData(ZoneType type, string name, int area, long cost, bool initial, int extraStations,
        float minRating, int minStaff, ZoneType[] requiredZones)
    {
        this.type = type; displayName = name; this.area = area; unlockCost = cost; this.initial = initial;
        this.extraStations = extraStations; this.minRating = minRating; this.minStaff = minStaff;
        this.requiredZones = requiredZones;
    }
}

[Serializable]
public class LocationData
{
    public LocationId id;
    public string displayName;
    public long rent;           // Tiền thuê / ngày
    public long unlockCost;     // Giá mở khóa mặt bằng
    public float traffic;       // Lưu lượng khách (1.0 = chuẩn)
    public int area;            // m2
    public int competition;     // 0..100
    public string customerType; // Nhóm khách chính
    public float[] customerMix; // [HocSinh, GameThu, VIP]
    public float spendMult;
    public float growthPerDay;  // Tiềm năng tăng trưởng
    public float growthCap;

    public LocationData(LocationId id, string name, long rent, long unlockCost, float traffic, int area,
        int competition, string customerType, float[] mix, float spendMult, float growthPerDay, float growthCap)
    {
        this.id = id; displayName = name; this.rent = rent; this.unlockCost = unlockCost; this.traffic = traffic;
        this.area = area; this.competition = competition; this.customerType = customerType; customerMix = mix;
        this.spendMult = spendMult; this.growthPerDay = growthPerDay; this.growthCap = growthCap;
    }
}

[Serializable]
public class StaffData
{
    public StaffRole role;
    public string displayName;
    public long hireFee;
    public long salaryPerDay;
    public int maxCount;
    public int requiredZone;    // (int)ZoneType hoặc -1
    public float minRating;

    public StaffData(StaffRole role, string name, long hireFee, long salary, int maxCount, int requiredZone, float minRating)
    {
        this.role = role; displayName = name; this.hireFee = hireFee; salaryPerDay = salary;
        this.maxCount = maxCount; this.requiredZone = requiredZone; this.minRating = minRating;
    }
}

public static class GameBalance
{
    public const float OpenHour = ${GAME_CLOCK.openHour}f;
    public const float CloseHour = ${GAME_CLOCK.closeHour}f;
    public const float SecondsPerGameHour = ${GAME_CLOCK.secondsPerGameHour}f;
    public const long StartMoney = 200000;

    public const float LowStockRatio = ${LOW_STOCK_RATIO}f;
    public static readonly float[] WarehouseCapacityMult = { ${WAREHOUSE_LEVELS.map(w => f(w.capacityMult)).join(', ')} };
    public static readonly long[] WarehouseUpgradeCost = { ${WAREHOUSE_LEVELS.map(w => w.upgradeCost).join(', ')} };

    // Chi phí vận hành
    public const long UtilitiesBase = ${COSTS.utilitiesBase};
    public const long UtilitiesPerStation = ${COSTS.utilitiesPerStation};
    public const long InternetGigabit = ${COSTS.internet.gigabit};
    public const long InternetNormal = ${COSTS.internet.normal};
    public const long AirConditioner = ${COSTS.ac};
    public const long PromotionCost = ${COSTS.promotion};
    public const long TournamentCost = ${COSTS.tournament};
    public const int TournamentCooldownDays = ${COSTS.tournamentCooldownDays};
    public const long BranchBuildCost = ${COSTS.branchBuild};
    public static readonly long[] BranchUpgradeCost = { ${COSTS.branchUpgrade.join(', ')} };
    public const long CyberGamingCost = ${COSTS.cyberGaming};
    public const long BankruptcyFloor = ${COSTS.bankruptcyFloor};
    public const long RelocateFee = ${RELOCATE_FEE};

    // Điểm hài lòng
    public static readonly int[] KindExpectation = { ${kindIdx.map(k => KIND_EXPECTATION[k]).join(', ')} }; // [HocSinh, GameThu, VIP]
    public const int FoodServedBonus = ${FOOD_SATISFACTION.served};
    public const int FoodServedBonusCap = ${FOOD_SATISFACTION.servedCap};
    public const int FoodFailedPenalty = ${FOOD_SATISFACTION.failed};
    public const int FoodPenaltyFloor = ${FOOD_SATISFACTION.floor};

    // Mục tiêu cuối game
    public const float WinMinMarketShare = ${f(WIN_CONDITION.minMarketShare)};
    public const int WinMinShops = ${WIN_CONDITION.minShops};
    public const float WinMinRating = ${f(WIN_CONDITION.minRating)};
    public const float CyberMinRating = ${f(CYBER_REQUIREMENTS.minRating)};
}

public static class GameData
{
    public static readonly ProductData[] Products =
    {
${products}
    };

    public static readonly ZoneData[] Zones =
    {
${zones}
    };

    public static readonly LocationData[] Locations =
    {
${locs}
    };

    public static readonly StaffData[] Staff =
    {
${staff}
    };

    public static ProductData GetProduct(string id)
    {
        foreach (var p in Products) if (p.id == id) return p;
        return null;
    }

    public static ZoneData GetZone(ZoneType t)
    {
        foreach (var z in Zones) if (z.type == t) return z;
        return null;
    }

    public static LocationData GetLocation(LocationId id)
    {
        foreach (var l in Locations) if (l.id == id) return l;
        return null;
    }

    public static StaffData GetStaff(StaffRole r)
    {
        foreach (var s in Staff) if (s.role == r) return s;
        return null;
    }
}
`;
writeFileSync('src/data/unity/GameData.cs', cs);
console.log('GameData.cs OK', cs.split('\n').length, 'dòng');
