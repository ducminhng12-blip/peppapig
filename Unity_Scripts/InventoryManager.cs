using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// HỆ THỐNG KHO: đồ ăn, nước uống, linh kiện, vật dụng.
/// - Có giới hạn sức chứa (tăng khi nâng cấp kho).
/// - Người chơi phải nhập hàng bằng tiền của quán.
/// - Tồn kho thấp -> cảnh báo, ví dụ:  "Coca: 3 / 50"  +  "⚠ Sắp hết hàng".
/// Gắn script này lên GameObject "Managers" (cùng MoneyManager).
/// </summary>
public class InventoryManager : MonoBehaviour
{
    public static InventoryManager Instance { get; private set; }

    public enum StockStatus { Ok, Low, Out }

    [Header("Kho")]
    [SerializeField, Range(1, 4)] private int warehouseLevel = 1;

    private readonly Dictionary<string, int> stock = new Dictionary<string, int>();
    private readonly Dictionary<string, StockStatus> lastStatus = new Dictionary<string, StockStatus>();

    /// <summary>(mã sản phẩm, số lượng hiện có, sức chứa)</summary>
    public event Action<string, int, int> OnStockChanged;
    /// <summary>Phát khi một mặt hàng chuyển sang trạng thái Sắp hết / Hết hàng</summary>
    public event Action<ProductData, StockStatus> OnStockWarning;

    public int WarehouseLevel => warehouseLevel;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        foreach (var p in GameData.Products)
        {
            stock[p.id] = Mathf.Min(p.startStock, GetCapacity(p));
            lastStatus[p.id] = StockStatus.Ok;
        }
    }

    public int GetCapacity(ProductData p)
    {
        return Mathf.RoundToInt(p.maxStock * GameBalance.WarehouseCapacityMult[warehouseLevel - 1]);
    }

    public int GetStock(string id)
    {
        int n;
        return stock.TryGetValue(id, out n) ? n : 0;
    }

    public StockStatus GetStatus(string id)
    {
        ProductData p = GameData.GetProduct(id);
        if (p == null) return StockStatus.Out;
        int n = GetStock(id);
        if (n <= 0) return StockStatus.Out;
        int lowLine = Mathf.Max(1, Mathf.FloorToInt(GetCapacity(p) * GameBalance.LowStockRatio));
        return n <= lowLine ? StockStatus.Low : StockStatus.Ok;
    }

    /// <summary>Ví dụ: "Coca: 3 / 50"</summary>
    public string GetStockLabel(string id)
    {
        ProductData p = GameData.GetProduct(id);
        return p == null ? id : p.displayName + ": " + GetStock(id) + " / " + GetCapacity(p);
    }

    /// <summary>Ví dụ: "⚠ Sắp hết hàng" hoặc "⛔ Hết hàng"</summary>
    public string GetWarningText(string id)
    {
        switch (GetStatus(id))
        {
            case StockStatus.Low: return "⚠ Sắp hết hàng";
            case StockStatus.Out: return "⛔ Hết hàng";
            default: return string.Empty;
        }
    }

    public List<ProductData> GetWarningProducts()
    {
        var list = new List<ProductData>();
        foreach (var p in GameData.Products)
        {
            if (GetStatus(p.id) != StockStatus.Ok) list.Add(p);
        }
        return list;
    }

    public long GetStockValue()
    {
        long total = 0;
        foreach (var p in GameData.Products) total += GetStock(p.id) * p.buyPrice;
        return total;
    }

    /// <summary>Nhập hàng: trừ tiền quán, cộng kho (không vượt sức chứa).</summary>
    public bool TryPurchase(string id, int quantity)
    {
        ProductData p = GameData.GetProduct(id);
        if (p == null || quantity <= 0) return false;
        if (ZoneManager.Instance != null && !ZoneManager.Instance.IsUnlocked(ZoneType.Storage))
        {
            Debug.LogWarning("[Kho] Cần có khu Kho để nhập hàng.");
            return false;
        }

        int room = GetCapacity(p) - GetStock(id);
        int n = Mathf.Min(quantity, room);
        if (n <= 0)
        {
            Debug.Log("[Kho] Kho đã đầy: " + GetStockLabel(id));
            return false;
        }

        long cost = n * p.buyPrice;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(cost))
        {
            Debug.LogWarning("[Kho] Không đủ tiền nhập " + n + " " + p.displayName + " (" + cost.ToString("N0") + "đ)");
            return false;
        }

        stock[id] = GetStock(id) + n;
        NotifyChanged(p);
        Debug.Log("[Kho] Nhập " + n + " " + p.displayName + " (-" + cost.ToString("N0") + "đ) => " + GetStockLabel(id));
        return true;
    }

    public bool TryFillToMax(string id)
    {
        ProductData p = GameData.GetProduct(id);
        return p != null && TryPurchase(id, GetCapacity(p) - GetStock(id));
    }

    /// <summary>Nhập bù mọi mặt hàng đang thấp lên khoảng 70% sức chứa (trong khả năng tiền có).</summary>
    public int RestockLow()
    {
        int restocked = 0;
        foreach (var p in GameData.Products)
        {
            if (GetStatus(p.id) == StockStatus.Ok) continue;
            int target = Mathf.CeilToInt(GetCapacity(p) * 0.7f);
            int need = target - GetStock(p.id);
            if (need > 0 && TryPurchase(p.id, need)) restocked++;
        }
        return restocked;
    }

    /// <summary>Tiêu hao kho (khách gọi món, nâng cấp máy, dọn vệ sinh...).</summary>
    public bool TryConsume(string id, int quantity = 1)
    {
        ProductData p = GameData.GetProduct(id);
        if (p == null || GetStock(id) < quantity) return false;
        stock[id] = GetStock(id) - quantity;
        NotifyChanged(p);
        return true;
    }

    public bool TryUpgradeWarehouse()
    {
        if (warehouseLevel >= GameBalance.WarehouseCapacityMult.Length) return false;
        long cost = GameBalance.WarehouseUpgradeCost[warehouseLevel];
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(cost)) return false;
        warehouseLevel++;
        Debug.Log("[Kho] Nâng kho lên cấp " + warehouseLevel + " (sức chứa x" + GameBalance.WarehouseCapacityMult[warehouseLevel - 1] + ")");
        return true;
    }

    private void NotifyChanged(ProductData p)
    {
        if (OnStockChanged != null) OnStockChanged(p.id, GetStock(p.id), GetCapacity(p));

        StockStatus now = GetStatus(p.id);
        StockStatus before;
        lastStatus.TryGetValue(p.id, out before);
        if (now != before)
        {
            lastStatus[p.id] = now;
            if (now != StockStatus.Ok)
            {
                Debug.LogWarning("[Kho] " + GetStockLabel(p.id) + "  " + GetWarningText(p.id));
                if (OnStockWarning != null) OnStockWarning(p, now);
            }
        }
    }
}
