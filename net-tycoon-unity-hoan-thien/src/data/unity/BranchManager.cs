using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class Branch
{
    public int id;
    public LocationId location;
    public int level = 1;       // 1..3
    public int openedDay;
    public long lastNet;
}

/// <summary>
/// CYBER GAMING + CHI NHÁNH.
/// - Cyber Gaming: nâng tiệm chính thành trung tâm eSports (cần Gaming + VIP + Tournament, đánh giá >= 4 sao).
/// - Chi nhánh: xây ở mặt bằng đã mua (khác tiệm chính), mỗi chi nhánh cần 1 Quản lý, tự chạy mỗi ngày.
/// - Thắng game: Cyber Gaming + đủ số cơ sở + đánh giá cao + thị phần >= 50%.
/// </summary>
public class BranchManager : MonoBehaviour
{
    public static BranchManager Instance { get; private set; }

    [SerializeField] private bool cyberGamingOpen;
    [SerializeField] private List<Branch> branches = new List<Branch>();
    private int nextId = 1;

    public bool CyberGamingOpen => cyberGamingOpen;
    public int BranchCount => branches.Count;
    public int ShopCount => 1 + branches.Count; // tiệm chính + chi nhánh
    public IReadOnlyList<Branch> Branches => branches;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public bool HasBranchAt(LocationId id)
    {
        return branches.Exists(b => b.location == id);
    }

    public string GetCyberBlockReason()
    {
        if (cyberGamingOpen) return "Đã mở";
        ZoneType[] needs = { ZoneType.Gaming, ZoneType.VIP, ZoneType.Tournament };
        foreach (var z in needs)
        {
            if (ZoneManager.Instance == null || !ZoneManager.Instance.IsUnlocked(z))
                return "Cần mở " + GameData.GetZone(z).displayName;
        }
        if (GameLoopManager.Instance != null && GameLoopManager.Instance.Rating < GameBalance.CyberMinRating)
            return "Cần đánh giá từ " + GameBalance.CyberMinRating.ToString("0.0") + " sao";
        return null;
    }

    public bool TryUnlockCyberGaming()
    {
        if (GetCyberBlockReason() != null) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(GameBalance.CyberGamingCost)) return false;

        cyberGamingOpen = true;
        if (GameLoopManager.Instance != null) GameLoopManager.Instance.AddFame(20f);
        Debug.Log("[Cyber Gaming] Khai trương! Game thủ +25% lượng khách, giá thuê +15%.");
        return true;
    }

    public string GetBranchBlockReason(LocationId id)
    {
        if (!cyberGamingOpen) return "Cần mở Cyber Gaming trước";
        if (LocationManager.Instance == null || !LocationManager.Instance.IsOwned(id)) return "Cần mua mặt bằng này trước";
        if (LocationManager.Instance.ActiveId == id) return "Đây là tiệm chính";
        if (HasBranchAt(id)) return "Đã có chi nhánh";
        int managers = StaffManager.Instance != null ? StaffManager.Instance.Count(StaffRole.Manager) : 0;
        if (managers < branches.Count + 1) return "Cần thuê thêm 1 Quản lý cho chi nhánh mới";
        return null;
    }

    public bool TryOpenBranch(LocationId id)
    {
        if (GetBranchBlockReason(id) != null) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(GameBalance.BranchBuildCost)) return false;

        int day = GameLoopManager.Instance != null ? GameLoopManager.Instance.Day : 1;
        branches.Add(new Branch { id = nextId++, location = id, openedDay = day });
        Debug.Log("[Chi nhánh] Khai trương chi nhánh tại " + GameData.GetLocation(id).displayName);
        return true;
    }

    public bool TryUpgradeBranch(int branchId)
    {
        Branch b = branches.Find(x => x.id == branchId);
        if (b == null || b.level >= 3) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(GameBalance.BranchUpgradeCost[b.level + 1])) return false;
        b.level++;
        return true;
    }

    /// <summary>Lợi nhuận ước tính / ngày của chi nhánh (chưa tính lương quản lý).</summary>
    public long ExpectedNet(Branch b, float noise = 1f)
    {
        LocationData loc = GameData.GetLocation(b.location);
        GameLoopManager loop = GameLoopManager.Instance;
        float rating = loop != null ? loop.Rating : 3.5f;
        float fame = loop != null ? loop.Fame : 0f;
        float pressure = CompetitorManager.Instance != null ? CompetitorManager.Instance.Pressure(b.location) : 0f;

        float flow = loc.traffic * (0.5f + rating / 5f * 0.7f) * (1f - pressure) * (1f + fame / 200f);
        float revenue = 900000f * flow * (0.5f + 0.2f * b.level) * loc.spendMult * noise;
        float cost = loc.rent + 40000f + revenue * 0.28f;
        return Mathf.RoundToInt(revenue - cost);
    }

    /// <summary>Gọi cuối ngày: tính lãi/lỗ của mọi chi nhánh và trả về tổng.</summary>
    public long SettleDay()
    {
        long total = 0;
        foreach (var b in branches)
        {
            b.lastNet = ExpectedNet(b, UnityEngine.Random.Range(0.9f, 1.1f));
            total += b.lastNet;
        }
        return total;
    }
}
