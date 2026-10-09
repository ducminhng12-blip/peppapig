using System;
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
    public const float OpenHour = 6f;
    public const float CloseHour = 24f;
    public const float SecondsPerGameHour = 10f;
    public const long StartMoney = 200000;

    public const float LowStockRatio = 0.25f;
    public static readonly float[] WarehouseCapacityMult = { 1f, 1.5f, 2f, 3f };
    public static readonly long[] WarehouseUpgradeCost = { 0, 400000, 1000000, 2500000 };

    // Chi phí vận hành
    public const long UtilitiesBase = 20000;
    public const long UtilitiesPerStation = 4000;
    public const long InternetGigabit = 30000;
    public const long InternetNormal = 15000;
    public const long AirConditioner = 20000;
    public const long PromotionCost = 300000;
    public const long TournamentCost = 400000;
    public const int TournamentCooldownDays = 2;
    public const long BranchBuildCost = 3000000;
    public static readonly long[] BranchUpgradeCost = { 0, 0, 2000000, 5000000 };
    public const long CyberGamingCost = 10000000;
    public const long BankruptcyFloor = -300000;
    public const long RelocateFee = 100000;

    // Điểm hài lòng
    public static readonly int[] KindExpectation = { -28, -45, -62 }; // [HocSinh, GameThu, VIP]
    public const int FoodServedBonus = 2;
    public const int FoodServedBonusCap = 6;
    public const int FoodFailedPenalty = -15;
    public const int FoodPenaltyFloor = -45;

    // Mục tiêu cuối game
    public const float WinMinMarketShare = 0.5f;
    public const int WinMinShops = 3;
    public const float WinMinRating = 4.2f;
    public const float CyberMinRating = 4f;
}

public static class GameData
{
    public static readonly ProductData[] Products =
    {
        new ProductData("coca", "Coca", ProductCategory.Drink, 8000, 15000, 6f, 50, 12, 24, new float[] { 3f, 3f, 1.5f }, new PeakWindow[] { new PeakWindow(12f, 16f, 1.4f) }),
        new ProductData("orange", "Nước cam", ProductCategory.Drink, 9000, 18000, 6f, 40, 12, 16, new float[] { 1f, 1f, 2.5f }, new PeakWindow[] { new PeakWindow(6f, 11f, 1.6f) }),
        new ProductData("coffee", "Cà phê", ProductCategory.Drink, 6000, 15000, 8f, 40, 12, 16, new float[] { 0.3f, 1.5f, 3f }, new PeakWindow[] { new PeakWindow(6f, 10f, 2f), new PeakWindow(22f, 24f, 1.6f) }),
        new ProductData("noodle", "Mì", ProductCategory.Food, 12000, 25000, 14f, 40, 10, 16, new float[] { 2.5f, 3f, 1.5f }, new PeakWindow[] { new PeakWindow(11f, 13f, 1.9f), new PeakWindow(18f, 20f, 1.9f) }),
        new ProductData("fries", "Khoai tây", ProductCategory.Food, 10000, 22000, 10f, 30, 10, 12, new float[] { 1.2f, 2f, 2.5f }, new PeakWindow[] { new PeakWindow(15f, 19f, 1.3f) }),
        new ProductData("bread", "Bánh mì", ProductCategory.Food, 9000, 20000, 9f, 30, 10, 12, new float[] { 2f, 1f, 1.5f }, new PeakWindow[] { new PeakWindow(6f, 9f, 2f), new PeakWindow(16f, 18f, 1.5f) }),
        new ProductData("snack", "Snack", ProductCategory.Food, 5000, 12000, 7f, 60, 20, 30, new float[] { 3f, 1.5f, 1f }, new PeakWindow[] { new PeakWindow(13f, 18f, 1.2f) }),
        new ProductData("energy", "Nước tăng lực", ProductCategory.Drink, 11000, 20000, 6f, 40, 12, 12, new float[] { 0.4f, 3f, 2f }, new PeakWindow[] { new PeakWindow(20f, 24f, 2f) }),
        new ProductData("part_ram", "Bộ RAM nâng cấp", ProductCategory.Part, 20000, 0, 0f, 10, 2, 4, new float[] { 0f, 0f, 0f }, new PeakWindow[] {  }),
        new ProductData("part_vga", "Bộ VGA nâng cấp", ProductCategory.Part, 60000, 0, 0f, 8, 1, 3, new float[] { 0f, 0f, 0f }, new PeakWindow[] {  }),
        new ProductData("part_monitor", "Bộ Màn hình nâng cấp", ProductCategory.Part, 35000, 0, 0f, 8, 1, 3, new float[] { 0f, 0f, 0f }, new PeakWindow[] {  }),
        new ProductData("sup_clean", "Bộ vệ sinh máy & ghế", ProductCategory.Supply, 6000, 0, 0f, 60, 20, 40, new float[] { 0f, 0f, 0f }, new PeakWindow[] {  }),
        new ProductData("sup_cup", "Ly / hộp đựng", ProductCategory.Supply, 1500, 0, 0f, 150, 50, 80, new float[] { 0f, 0f, 0f }, new PeakWindow[] {  }),
    };

    public static readonly ZoneData[] Zones =
    {
        new ZoneData(ZoneType.Regular, "Khu Máy Thường", 24, 0, true, 0, 0f, 0, new ZoneType[] {  }),
        new ZoneData(ZoneType.Eating, "Khu Ăn Uống", 12, 0, true, 0, 0f, 0, new ZoneType[] {  }),
        new ZoneData(ZoneType.Counter, "Quầy Thanh Toán", 6, 0, true, 0, 0f, 0, new ZoneType[] {  }),
        new ZoneData(ZoneType.Storage, "Kho", 8, 0, true, 0, 0f, 0, new ZoneType[] {  }),
        new ZoneData(ZoneType.Tech, "Phòng Kỹ Thuật", 8, 250000, false, 0, 0f, 0, new ZoneType[] {  }),
        new ZoneData(ZoneType.Gaming, "Khu Gaming", 20, 1200000, false, 2, 3.2f, 0, new ZoneType[] {  }),
        new ZoneData(ZoneType.VIP, "Phòng VIP", 16, 2500000, false, 0, 3.6f, 1, new ZoneType[] {  }),
        new ZoneData(ZoneType.Tournament, "Phòng Tournament", 24, 3500000, false, 0, 0f, 0, new ZoneType[] { ZoneType.Gaming, ZoneType.VIP }),
    };

    public static readonly LocationData[] Locations =
    {
        new LocationData(LocationId.Alley, "Hẻm Nhỏ", 50000, 0, 0.6f, 60, 20, "Học sinh – sinh viên khu dân cư", new float[] { 0.65f, 0.28f, 0.07f }, 0.9f, 0f, 0f),
        new LocationData(LocationId.Street, "Mặt Đường", 150000, 1500000, 1f, 100, 45, "Học sinh, game thủ, người đi đường", new float[] { 0.45f, 0.38f, 0.17f }, 1f, 0f, 0f),
        new LocationData(LocationId.Downtown, "Trung Tâm", 280000, 5000000, 1.5f, 150, 70, "Dân văn phòng, game thủ", new float[] { 0.3f, 0.4f, 0.3f }, 1.1f, 0f, 0f),
        new LocationData(LocationId.Mall, "Khu Thương Mại", 450000, 12000000, 2f, 220, 85, "Khách VIP, du khách, dân văn phòng", new float[] { 0.15f, 0.35f, 0.5f }, 1.25f, 0.02f, 0.5f),
    };

    public static readonly StaffData[] Staff =
    {
        new StaffData(StaffRole.Cashier, "Thu Ngân", 200000, 40000, 3, (int)ZoneType.Counter, 0f),
        new StaffData(StaffRole.Waiter, "Nhân Viên Phục Vụ", 150000, 40000, 3, (int)ZoneType.Eating, 0f),
        new StaffData(StaffRole.Technician, "Kỹ Thuật Viên", 300000, 60000, 2, (int)ZoneType.Tech, 0f),
        new StaffData(StaffRole.Manager, "Quản Lý", 600000, 100000, 3, -1, 3.5f),
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
