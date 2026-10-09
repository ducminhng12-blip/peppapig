using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// KHÁCH GỌI ĐỒ ĂN / NƯỚC UỐNG KHI ĐANG CHƠI.
/// Gắn lên prefab khách (cùng CustomerAI + CustomerSatisfaction).
/// - Số lần gọi phụ thuộc loại khách, số giờ chơi, nhân viên phục vụ, phòng VIP.
/// - Món được chọn ngẫu nhiên theo trọng số của loại khách x khung giờ trong ngày.
/// - Hết hàng: khách có 40% đổi món khác, nếu không sẽ bị trừ điểm hài lòng.
/// </summary>
public class FoodOrderSystem : MonoBehaviour
{
    [Header("Trạng thái buổi chơi")]
    [SerializeField] private CustomerKind kind = CustomerKind.HocSinh;
    [SerializeField] private int ordersServed;
    [SerializeField] private int ordersFailed;
    [SerializeField] private long moneySpent;

    private CustomerSatisfaction satisfaction;
    private readonly List<float> orderFractions = new List<float>();

    public int OrdersServed => ordersServed;
    public int OrdersFailed => ordersFailed;
    public long MoneySpent => moneySpent;

    private void Awake()
    {
        satisfaction = GetComponent<CustomerSatisfaction>();
    }

    /// <summary>Gọi khi khách bắt đầu ngồi máy: lên lịch các lần gọi đồ.</summary>
    public void BeginSession(CustomerKind customerKind, float hours)
    {
        kind = customerKind;
        ordersServed = 0;
        ordersFailed = 0;
        moneySpent = 0;
        orderFractions.Clear();

        GameLoopManager loop = GameLoopManager.Instance;
        if (loop == null || !loop.FoodServiceEnabled) return;
        if (ZoneManager.Instance != null && !ZoneManager.Instance.IsUnlocked(ZoneType.Eating)) return;

        float rate = customerKind == CustomerKind.HocSinh ? 0.55f : customerKind == CustomerKind.GameThu ? 0.7f : 0.8f;
        float spend = LocationManager.Instance != null ? LocationManager.Instance.Current.spendMult : 1f;
        float expected = rate * hours * spend;

        if (StaffManager.Instance != null) expected *= 1f + 0.3f * StaffManager.Instance.Efficiency(StaffRole.Waiter) * 1.8f;
        if (customerKind == CustomerKind.VIP && ZoneManager.Instance != null && ZoneManager.Instance.IsUnlocked(ZoneType.VIP)) expected *= 1.25f;

        int count = Mathf.FloorToInt(expected + Random.value);
        for (int i = 0; i < count; i++) orderFractions.Add(Random.Range(0.08f, 0.92f));
        orderFractions.Sort();

        if (satisfaction != null && InventoryManager.Instance != null)
        {
            // Hết bộ vệ sinh -> khách khó chịu ngay từ đầu
            int hygiene = InventoryManager.Instance.GetStock("sup_clean") > 0 ? 0 : -4;
            satisfaction.SetFoodExtra(hygiene);
        }
    }

    /// <summary>Gọi mỗi frame khi Playing. progress01 = phần trăm buổi chơi đã trôi qua (0..1).</summary>
    public void UpdateProgress(float progress01)
    {
        while (orderFractions.Count > 0 && orderFractions[0] <= progress01)
        {
            orderFractions.RemoveAt(0);
            PlaceOrder();
        }
    }

    private void PlaceOrder()
    {
        InventoryManager inv = InventoryManager.Instance;
        if (inv == null) return;

        ProductData wanted = PickProduct(false);
        if (wanted == null) return;

        ProductData chosen = wanted;
        if (inv.GetStock(wanted.id) <= 0)
        {
            chosen = Random.value < 0.4f ? PickProduct(true) : null;
            if (chosen == null)
            {
                Fail("Hết " + wanted.displayName + "!");
                return;
            }
        }

        // Mỗi món cần 1 ly/hộp đựng
        if (inv.GetStock("sup_cup") <= 0)
        {
            Fail("Hết ly/hộp đựng!");
            return;
        }

        inv.TryConsume(chosen.id, 1);
        inv.TryConsume("sup_cup", 1);
        if (MoneyManager.Instance != null) MoneyManager.Instance.AddMoney(chosen.sellPrice);

        ProductData cup = GameData.GetProduct("sup_cup");
        if (GameLoopManager.Instance != null) GameLoopManager.Instance.RecordOrderServed(chosen, cup.buyPrice);

        ordersServed++;
        moneySpent += chosen.sellPrice;
        Debug.Log("[" + name + "] gọi " + chosen.displayName + " (+" + chosen.sellPrice.ToString("N0") + "đ, lãi " + chosen.Profit.ToString("N0") + "đ). Kho: " + inv.GetStockLabel(chosen.id) + " " + inv.GetWarningText(chosen.id));
        RefreshSatisfaction();
    }

    private void Fail(string reason)
    {
        ordersFailed++;
        if (GameLoopManager.Instance != null) GameLoopManager.Instance.RecordOrderFailed();
        Debug.LogWarning("[" + name + "] " + reason + " Khách bực mình! (" + GameBalance.FoodFailedPenalty + " điểm hài lòng)");
        RefreshSatisfaction();
    }

    private void RefreshSatisfaction()
    {
        if (satisfaction == null) return;
        int extra = Mathf.Min(GameBalance.FoodServedBonusCap, ordersServed * GameBalance.FoodServedBonus)
                  + Mathf.Max(GameBalance.FoodPenaltyFloor, ordersFailed * GameBalance.FoodFailedPenalty);

        if (ordersServed > 0 && StaffManager.Instance != null && StaffManager.Instance.Count(StaffRole.Waiter) > 0) extra += 2;
        if (InventoryManager.Instance != null && InventoryManager.Instance.GetStock("sup_clean") <= 0) extra -= 4;
        satisfaction.SetFoodExtra(extra);
    }

    private ProductData PickProduct(bool onlyInStock)
    {
        float hour = GameLoopManager.Instance != null ? GameLoopManager.Instance.CurrentHour : 12f;
        var candidates = new List<ProductData>();
        var weights = new List<float>();
        float total = 0f;

        foreach (var p in GameData.Products)
        {
            if (!p.IsSellable) continue;
            if (onlyInStock && InventoryManager.Instance.GetStock(p.id) <= 0) continue;

            float w = p.weights[(int)kind];
            foreach (var peak in p.peaks)
            {
                if (hour >= peak.fromHour && hour < peak.toHour) w *= peak.multiplier;
            }
            candidates.Add(p);
            weights.Add(w);
            total += w;
        }

        if (total <= 0f) return null;
        float r = Random.value * total;
        for (int i = 0; i < candidates.Count; i++)
        {
            r -= weights[i];
            if (r <= 0f) return candidates[i];
        }
        return candidates[candidates.Count - 1];
    }
}
