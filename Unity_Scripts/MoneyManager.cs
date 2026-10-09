using UnityEngine;

public class MoneyManager : MonoBehaviour
{
    public static MoneyManager Instance { get; private set; }

    [Header("Quỹ Tiền Của Quán")]
    [SerializeField] private long currentMoney = GameBalance.StartMoney; // 200.000đ (xem GameData.cs)

    public long CurrentMoney => currentMoney;

    public delegate void MoneyChangedDelegate(long newAmount);
    public event MoneyChangedDelegate OnMoneyChanged;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public void AddMoney(long amount)
    {
        if (amount <= 0) return;
        currentMoney += amount;
        OnMoneyChanged?.Invoke(currentMoney);
    }

    /// <summary>
    /// Chi phí bắt buộc cuối ngày (tiền thuê, lương, điện nước): cho phép âm tiền (nợ).
    /// Nợ vượt GameBalance.BankruptcyFloor thì phá sản.
    /// </summary>
    public void ForceSpend(long amount)
    {
        if (amount <= 0) return;
        currentMoney -= amount;
        OnMoneyChanged?.Invoke(currentMoney);
    }

    public bool TrySpendMoney(long amount)
    {
        if (amount < 0) return false;
        if (currentMoney >= amount)
        {
            currentMoney -= amount;
            OnMoneyChanged?.Invoke(currentMoney);
            return true;
        }
        return false;
    }
}