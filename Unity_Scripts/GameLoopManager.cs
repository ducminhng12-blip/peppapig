using System;
using System.Collections.Generic;
using UnityEngine;

public enum GamePhase { Closed, Open, Bankrupt }
public enum InternetPlan { Gigabit, Normal, Laggy }
public enum PricingPolicy { Cheap, Standard, Expensive }

[Serializable]
public class DayStats
{
    public int customers, walkouts, ordersServed, ordersFailed;
    public long rentalRevenue, foodRevenue, costOfGoods, eventCost;
}

[Serializable]
public class DayReport
{
    public int day;
    public DayStats stats = new DayStats();
    public long rent, salaries, utilities, branchNet, netProfit, moneyAfter;
    public float rating, marketShare;
}

/// <summary>
/// GAME LOOP HOÀN CHỈNH - trung tâm điều phối toàn bộ tiệm net.
///
/// Mở tiệm -> Khách đến -> Tìm máy -> Thuê máy -> Chơi -> Gọi đồ ăn -> Tiêu tiền
/// -> Hài lòng/không -> Rời đi -> Đánh giá -> Doanh thu -> Trừ chi phí -> Lợi nhuận
/// -> Nâng cấp -> Thu hút nhiều khách hơn -> Mở rộng -> Thuê nhân viên -> Mở khu VIP
/// -> Cạnh tranh đối thủ -> Mở Cyber Gaming -> Chi nhánh -> Ông chủ Cyber Game lớn nhất.
///
/// Một ngày game chạy từ 06:00 đến 24:00. Cuối ngày: trừ tiền thuê, lương, điện nước/mạng,
/// cộng lãi chi nhánh, cho đối thủ phát triển, tổng kết lợi nhuận.
/// </summary>
public class GameLoopManager : MonoBehaviour
{
    public static GameLoopManager Instance { get; private set; }

    [Header("Cảnh & Prefab")]
    [SerializeField] private GameObject customerPrefab;
    [SerializeField] private Transform spawnPoint;

    [Header("Tiện ích quán (tác động chi phí & hài lòng)")]
    [SerializeField] private bool foodServiceEnabled = true;
    [SerializeField] private bool acEnabled = true;
    [SerializeField] private InternetPlan internetPlan = InternetPlan.Gigabit;
    [SerializeField] private PricingPolicy pricingPolicy = PricingPolicy.Standard;

    [Header("Trạng thái (chỉ đọc)")]
    [SerializeField] private int day = 1;
    [SerializeField] private float hour = GameBalance.OpenHour;
    [SerializeField] private GamePhase phase = GamePhase.Closed;
    [SerializeField] private float fame;
    [SerializeField] private int promotionDaysLeft;
    [SerializeField] private float tournamentUntilHour = -1f;
    [SerializeField] private int tournamentCooldown;
    [SerializeField] private bool won;

    private readonly List<int> recentStars = new List<int>();
    private readonly List<DayReport> history = new List<DayReport>();
    private DayStats today = new DayStats();
    private float spawnTimer;
    private float fleetCacheTimer;
    private float fleetQualityCache = 7f;
    private int fleetCountCache = 6;

    public event Action OnShopOpened;
    public event Action<DayReport> OnDayEnded;
    public event Action OnWin;

    public int Day => day;
    public float CurrentHour => hour;
    public GamePhase Phase => phase;
    public bool IsOpen => phase == GamePhase.Open;
    public bool FoodServiceEnabled => foodServiceEnabled;
    public float Fame => fame;
    public int PromotionDaysLeft => promotionDaysLeft;
    public bool Won => won;
    public PricingPolicy Policy => pricingPolicy;
    public IReadOnlyList<DayReport> History => history;
    public DayStats Today => today;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Update()
    {
        if (phase != GamePhase.Open) return;

        hour += Time.deltaTime / GameBalance.SecondsPerGameHour;
        if (hour >= GameBalance.CloseHour)
        {
            EndDay("Hết giờ, tiệm tự đóng cửa.");
            return;
        }

        spawnTimer += Time.deltaTime;
        if (spawnTimer >= SpawnIntervalSeconds())
        {
            spawnTimer = 0f;
            SpawnCustomer();
        }
    }

    // ------------------------------------------------------------------ MỞ / ĐÓNG TIỆM

    public bool OpenShop()
    {
        if (phase != GamePhase.Closed) return false;
        phase = GamePhase.Open;
        hour = GameBalance.OpenHour;
        today = new DayStats();
        spawnTimer = 0f;
        Debug.Log("[Game Loop] Mở tiệm ngày " + day + " tại " + LocationManager.Instance.Current.displayName);
        if (OnShopOpened != null) OnShopOpened();
        return true;
    }

    public void CloseShopEarly()
    {
        if (phase == GamePhase.Open) EndDay("Ông chủ đóng cửa sớm.");
    }

    // ------------------------------------------------------------------ KHÁCH ĐẾN

    private void SpawnCustomer()
    {
        CustomerKind kind;
        float hours, price;
        if (!TryRollCustomer(out kind, out hours, out price)) return;
        if (customerPrefab == null || spawnPoint == null) return;

        GameObject go = Instantiate(customerPrefab, spawnPoint.position, spawnPoint.rotation);
        CustomerAI ai = go.GetComponent<CustomerAI>();
        if (ai != null) ai.Configure(kind, hours, price);
    }

    /// <summary>Chọn loại khách, số giờ chơi và giá thuê/giờ (đã gồm phụ thu Gaming/VIP/Cyber).</summary>
    public bool TryRollCustomer(out CustomerKind kind, out float hours, out float pricePerHour)
    {
        kind = CustomerKind.HocSinh;
        hours = 1f;
        pricePerHour = 5000f;
        if (phase != GamePhase.Open) return false;

        float[] mix = (float[])LocationManager.Instance.Current.customerMix.Clone(); // [HS, GT, VIP]
        if (hour >= 14f && hour < 19f) mix[0] *= 1.4f;
        if (hour >= 22f) mix[0] *= 0.3f;
        if (hour >= 18f) mix[1] *= 1.3f;
        if (hour >= 17f && hour < 22f) mix[2] *= 1.2f;

        bool gaming = ZoneManager.Instance.IsUnlocked(ZoneType.Gaming);
        bool vip = ZoneManager.Instance.IsUnlocked(ZoneType.VIP);
        bool cyber = BranchManager.Instance != null && BranchManager.Instance.CyberGamingOpen;
        if (gaming) mix[1] *= 1.25f;
        mix[2] *= vip ? 1.3f : 0.6f;
        if (cyber) { mix[1] *= 1.25f; mix[2] *= 1.15f; }
        if (TournamentActive) mix[1] *= 2.5f;

        float total = mix[0] + mix[1] + mix[2];
        float r = UnityEngine.Random.value * total;
        int idx = r < mix[0] ? 0 : (r < mix[0] + mix[1] ? 1 : 2);
        kind = (CustomerKind)idx;

        float cyberMult = cyber ? 1.15f : 1f;
        if (kind == CustomerKind.HocSinh)
        {
            hours = UnityEngine.Random.Range(1f, 2.5f);
            pricePerHour = 5000f;
        }
        else if (kind == CustomerKind.GameThu)
        {
            hours = UnityEngine.Random.Range(2.5f, 4.5f);
            pricePerHour = 10000f * (gaming ? 1.25f : 1f) * cyberMult;
        }
        else
        {
            hours = UnityEngine.Random.Range(4f, 7f);
            pricePerHour = 20000f * (vip ? 1.5f : 1f) * cyberMult;
        }
        hours = Mathf.Round(hours * 10f) / 10f;
        pricePerHour = Mathf.Round(pricePerHour);
        return true;
    }

    /// <summary>Số giây giữa 2 lượt khách. Danh tiếng, chất lượng máy, mặt bằng, đối thủ, giờ cao điểm đều ảnh hưởng.</summary>
    public float SpawnIntervalSeconds()
    {
        return Mathf.Clamp(8f / TrafficMultiplier(), 2.5f, 40f);
    }

    public float TrafficMultiplier()
    {
        LocationData loc = LocationManager.Instance.Current;
        float ratingFactor = 0.5f + Rating / 5f * 0.7f;
        float qualityFactor = 0.9f + FleetQuality() / 35f * 0.5f; // Nâng cấp máy -> thu hút nhiều khách hơn
        float m = loc.traffic * (1f + LocationManager.Instance.GrowthBonus()) * ratingFactor * qualityFactor;

        if (CompetitorManager.Instance != null) m *= 1f - CompetitorManager.Instance.Pressure(loc.id);
        m *= 1f + fame / 200f;
        m *= DemandByHour(hour);
        if (TournamentActive) m *= 1.8f;
        if (promotionDaysLeft > 0) m *= 1.25f;
        return Mathf.Max(0.05f, m);
    }

    private static float DemandByHour(float h)
    {
        if (h < 8f) return 0.5f;
        if (h < 11f) return 0.7f;
        if (h < 14f) return 0.9f;
        if (h < 17f) return 1.15f;
        if (h < 22f) return 1.5f;
        return 1.1f;
    }

    // ------------------------------------------------------------------ DOANH THU & ĐÁNH GIÁ

    /// <summary>Tiền thuê máy sau chính sách giá, mặt bằng và nhân viên.</summary>
    public long RentalRevenue(float hours, float pricePerHour)
    {
        float policy = pricingPolicy == PricingPolicy.Cheap ? 0.8f : pricingPolicy == PricingPolicy.Expensive ? 1.3f : 1f;
        float staff = 1f;
        if (StaffManager.Instance != null)
        {
            staff += 0.08f * StaffManager.Instance.Efficiency(StaffRole.Cashier) * 1.8f;
            staff += 0.06f * StaffManager.Instance.Efficiency(StaffRole.Manager) * 1.8f;
        }
        float spend = LocationManager.Instance.Current.spendMult;
        return Mathf.RoundToInt(hours * pricePerHour * policy * spend * staff);
    }

    public void RecordCustomerStart(long revenue)
    {
        today.customers++;
        today.rentalRevenue += revenue;
        if (MoneyManager.Instance != null) MoneyManager.Instance.AddMoney(revenue);
    }

    public void RecordOrderServed(ProductData product, long cupCost)
    {
        today.ordersServed++;
        today.foodRevenue += product.sellPrice;
        today.costOfGoods += product.buyPrice + cupCost;
    }

    public void RecordOrderFailed() { today.ordersFailed++; }
    public void RecordWalkout() { today.walkouts++; }

    /// <summary>Khách rời đi để lại đánh giá 1-5 sao. Tính trung bình 40 khách gần nhất.</summary>
    public void RecordReview(int stars)
    {
        recentStars.Add(Mathf.Clamp(stars, 1, 5));
        if (recentStars.Count > 40) recentStars.RemoveAt(0);

        // Khách rời máy dùng 1 bộ vệ sinh
        if (InventoryManager.Instance != null && InventoryManager.Instance.TryConsume("sup_clean", 1))
        {
            today.costOfGoods += GameData.GetProduct("sup_clean").buyPrice;
        }
    }

    public float Rating
    {
        get
        {
            if (recentStars.Count == 0) return 3.5f;
            float sum = 0f;
            foreach (int s in recentStars) sum += s;
            return sum / recentStars.Count;
        }
    }

    public void AddFame(float amount) { fame = Mathf.Clamp(fame + amount, 0f, 100f); }

    /// <summary>Áp dụng mạng, điều hòa, dịch vụ đồ ăn và chính sách giá lên điểm hài lòng của một khách.</summary>
    public void ApplyAmenities(CustomerSatisfaction sat)
    {
        if (sat == null) return;
        int net = internetPlan == InternetPlan.Gigabit ? 10 : internetPlan == InternetPlan.Normal ? 5 : -15;
        int ac = acEnabled ? 8 : -10;
        int food = foodServiceEnabled ? 10 : 0;
        sat.SetAmenities(net, ac, food);
        sat.ApplyPricingPolicy(pricingPolicy);
    }

    // ------------------------------------------------------------------ SỨC MẠNH & THỊ PHẦN

    /// <summary>Chất lượng trung bình của các bàn máy (RAM*2 + VGA*3 + Màn*2), cache 2 giây.</summary>
    public float FleetQuality()
    {
        fleetCacheTimer -= Time.deltaTime;
        if (fleetCacheTimer > 0f) return fleetQualityCache;
        fleetCacheTimer = 2f;

        ComputerStation[] all = FindObjectsByType<ComputerStation>(FindObjectsSortMode.None);
        if (all.Length == 0) return fleetQualityCache;
        float sum = 0f;
        foreach (var pc in all) sum += pc.GetComputerQualityScore();
        fleetCountCache = all.Length;
        fleetQualityCache = sum / all.Length;
        return fleetQualityCache;
    }

    public int StationCount { get { FleetQuality(); return fleetCountCache; } }

    public float Power()
    {
        int zonesOwned = 0;
        foreach (var z in ZoneManager.Instance.Zones) if (ZoneManager.Instance.IsUnlocked(z.type)) zonesOwned++;
        bool cyber = BranchManager.Instance != null && BranchManager.Instance.CyberGamingOpen;
        int branches = BranchManager.Instance != null ? BranchManager.Instance.BranchCount : 0;

        return Rating / 5f * 35f
             + FleetQuality() / 35f * 25f
             + Mathf.Min(24, zonesOwned * 3)
             + (cyber ? 10f : 0f)
             + Mathf.Min(20, branches * 5)
             + fame * 0.15f;
    }

    public float MarketShare()
    {
        float mine = Power();
        float rivals = CompetitorManager.Instance != null ? CompetitorManager.Instance.TotalWeightedStrength() : 0f;
        return mine / (mine + rivals);
    }

    // ------------------------------------------------------------------ SỰ KIỆN: GIẢI ĐẤU, KHUYẾN MÃI

    public bool TournamentActive => phase == GamePhase.Open && hour < tournamentUntilHour;

    public bool TryStartTournament()
    {
        if (phase != GamePhase.Open || TournamentActive || tournamentCooldown > 0) return false;
        if (!ZoneManager.Instance.IsUnlocked(ZoneType.Tournament)) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(GameBalance.TournamentCost)) return false;

        today.eventCost += GameBalance.TournamentCost;
        tournamentUntilHour = hour + 5f;
        tournamentCooldown = GameBalance.TournamentCooldownDays;
        bool cyber = BranchManager.Instance != null && BranchManager.Instance.CyberGamingOpen;
        AddFame(cyber ? 14f : 8f);
        Debug.Log("[Giải đấu] Khai mạc! Game thủ kéo đến đông nghịt trong 5 giờ game.");
        return true;
    }

    public bool TryRunPromotion()
    {
        if (promotionDaysLeft > 0) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(GameBalance.PromotionCost)) return false;
        today.eventCost += GameBalance.PromotionCost;
        promotionDaysLeft = 2;
        return true;
    }

    // ------------------------------------------------------------------ CHI PHÍ & CUỐI NGÀY

    public void DailyCosts(out long rent, out long salaries, out long utilities)
    {
        rent = LocationManager.Instance.Current.rent;
        salaries = StaffManager.Instance != null ? StaffManager.Instance.TotalSalariesPerDay() : 0;
        utilities = GameBalance.UtilitiesBase + GameBalance.UtilitiesPerStation * StationCount;
        utilities += internetPlan == InternetPlan.Gigabit ? GameBalance.InternetGigabit : internetPlan == InternetPlan.Normal ? GameBalance.InternetNormal : 0;
        if (acEnabled) utilities += GameBalance.AirConditioner;
    }

    private void EndDay(string reason)
    {
        long rent, salaries, utilities;
        DailyCosts(out rent, out salaries, out utilities);
        long fixedCosts = rent + salaries + utilities;

        // Trừ chi phí cố định (cho phép nợ) và cộng lãi chi nhánh
        MoneyManager.Instance.ForceSpend(fixedCosts);
        long branchNet = BranchManager.Instance != null ? BranchManager.Instance.SettleDay() : 0;
        if (branchNet > 0) MoneyManager.Instance.AddMoney(branchNet);
        else if (branchNet < 0) MoneyManager.Instance.ForceSpend(-branchNet);

        long net = today.rentalRevenue + today.foodRevenue - today.costOfGoods - fixedCosts - today.eventCost + branchNet;
        var report = new DayReport
        {
            day = day, stats = today, rent = rent, salaries = salaries, utilities = utilities,
            branchNet = branchNet, netProfit = net, rating = Rating,
            moneyAfter = MoneyManager.Instance.CurrentMoney
        };

        // Đối thủ, danh tiếng, mặt bằng
        if (CompetitorManager.Instance != null)
            CompetitorManager.Instance.OnDayEnded(day, Rating, LocationManager.Instance.Current.competition);
        LocationManager.Instance.OnDayEnded();
        fame = Mathf.Max(0f, fame - 0.5f);
        if (promotionDaysLeft > 0) promotionDaysLeft--;
        if (tournamentCooldown > 0) tournamentCooldown--;
        tournamentUntilHour = -1f;
        report.marketShare = MarketShare();

        history.Insert(0, report);
        if (history.Count > 14) history.RemoveAt(history.Count - 1);
        Debug.Log("[Game Loop] " + reason + " Lợi nhuận ngày " + day + ": " + net.ToString("N0") + "đ");

        if (MoneyManager.Instance.CurrentMoney < GameBalance.BankruptcyFloor)
        {
            phase = GamePhase.Bankrupt;
            Debug.LogWarning("[Game Loop] Nợ nần chồng chất, tiệm phá sản!");
        }
        else
        {
            phase = GamePhase.Closed;
            day++;
            hour = GameBalance.OpenHour;
            today = new DayStats();
        }

        CheckWin();
        if (OnDayEnded != null) OnDayEnded(report);
    }

    // ------------------------------------------------------------------ THẮNG GAME

    public void CheckWin()
    {
        if (won || phase == GamePhase.Bankrupt) return;
        bool cyber = BranchManager.Instance != null && BranchManager.Instance.CyberGamingOpen;
        int shops = BranchManager.Instance != null ? BranchManager.Instance.ShopCount : 1;

        if (cyber && shops >= GameBalance.WinMinShops && Rating >= GameBalance.WinMinRating && MarketShare() >= GameBalance.WinMinMarketShare)
        {
            won = true;
            Debug.Log("[Game Loop] BẠN ĐÃ TRỞ THÀNH ÔNG CHỦ CYBER GAME LỚN NHẤT THÀNH PHỐ!");
            if (OnWin != null) OnWin();
        }
    }
}
