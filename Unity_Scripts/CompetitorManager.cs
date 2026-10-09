using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class Rival
{
    public int id;
    public string displayName;
    public float strength;      // 5..75
    public int appearedDay;
}

/// <summary>
/// CẠNH TRANH ĐỐI THỦ: tiệm net đối thủ khai trương gần bạn và cướp khách.
/// - Xuất hiện từ ngày 4 (ngày 10 và 18 cho đối thủ thứ 2, 3 tùy mức cạnh tranh của mặt bằng).
/// - Đánh giá của bạn dưới 4 sao thì đối thủ mạnh lên nhanh hơn.
/// - Cách đối phó: khuyến mãi, nâng cấp máy, giải đấu, hoặc mua lại đối thủ (cần Quản lý).
/// </summary>
public class CompetitorManager : MonoBehaviour
{
    public static CompetitorManager Instance { get; private set; }

    private static readonly string[] Names =
    {
        "Cyber Sao Việt", "Net Rồng Xanh", "GameZone 24h", "Esport Arena", "Thiên Long Cyber"
    };

    [SerializeField] private List<Rival> rivals = new List<Rival>();
    private int nextId = 1;
    private int cooldownDays;

    public IReadOnlyList<Rival> Rivals => rivals;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    /// <summary>Tổng sức mạnh đối thủ đã nhân hệ số 0.6 (dùng tính thị phần).</summary>
    public float TotalWeightedStrength()
    {
        float total = 0f;
        foreach (var r in rivals) total += r.strength * 0.6f;
        return total;
    }

    /// <summary>Tỷ lệ khách bị cướp tại một mặt bằng (0..0.6).</summary>
    public float Pressure(LocationId location)
    {
        float comp = GameData.GetLocation(location).competition / 100f;
        float sum = 0f;
        foreach (var r in rivals) sum += r.strength;

        float p = sum / 100f * comp * 0.5f;
        if (StaffManager.Instance != null) p *= 1f - 0.15f * StaffManager.Instance.Efficiency(StaffRole.Manager);
        if (GameLoopManager.Instance != null && GameLoopManager.Instance.PromotionDaysLeft > 0) p *= 0.5f;
        return Mathf.Clamp(p, 0f, 0.6f);
    }

    /// <summary>Gọi cuối mỗi ngày.</summary>
    public void OnDayEnded(int day, float playerRating, int locationCompetition)
    {
        foreach (var r in rivals)
        {
            float grow = playerRating < 4f ? Random.Range(0.8f, 2.2f) : Random.Range(0.1f, 0.7f);
            r.strength = Mathf.Clamp(r.strength + grow, 5f, 75f);
        }
        if (cooldownDays > 0) cooldownDays--;

        int n = rivals.Count;
        bool canSpawn = cooldownDays <= 0 &&
            ((n == 0 && day >= 4) ||
             (n == 1 && day >= 10 && locationCompetition >= 40) ||
             (n == 2 && day >= 18 && locationCompetition >= 60));
        if (!canSpawn) return;

        string name = Names[Mathf.Min(n, Names.Length - 1)];
        rivals.Add(new Rival
        {
            id = nextId++,
            displayName = name,
            strength = 18f + Random.Range(0, 12) + locationCompetition / 10f,
            appearedDay = day
        });
        Debug.LogWarning("[Đối thủ] \"" + name + "\" khai trương gần tiệm của bạn!");
    }

    public long BuyoutCost(Rival r)
    {
        return Mathf.RoundToInt(r.strength * 60000f);
    }

    public bool TryBuyOut(int rivalId)
    {
        Rival r = rivals.Find(x => x.id == rivalId);
        if (r == null) return false;
        if (StaffManager.Instance == null || StaffManager.Instance.Count(StaffRole.Manager) < 1) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(BuyoutCost(r))) return false;

        rivals.Remove(r);
        cooldownDays = 6;
        if (GameLoopManager.Instance != null) GameLoopManager.Instance.AddFame(6f);
        Debug.Log("[Đối thủ] Đã mua lại " + r.displayName);
        return true;
    }
}
