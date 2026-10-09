using System.Collections.Generic;
using UnityEngine;

public class WaitingQueueManager : MonoBehaviour
{
    public static WaitingQueueManager Instance { get; private set; }

    [Header("Cấu Hình Hàng Đợi")]
    [SerializeField] private int maxQueueCapacity = 4;
    [SerializeField] private Transform[] queueSlots;

    private readonly List<CustomerAI> waitingCustomers = new List<CustomerAI>();

    public int CurrentWaitingCount => waitingCustomers.Count;
    public bool HasAvailableSlot => waitingCustomers.Count < maxQueueCapacity && (queueSlots == null || waitingCustomers.Count < queueSlots.Length);

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public bool TryJoinQueue(CustomerAI customer)
    {
        if (!HasAvailableSlot || customer == null) return false;

        waitingCustomers.Add(customer);
        int slotIndex = waitingCustomers.Count - 1;

        if (queueSlots != null && slotIndex < queueSlots.Length)
        {
            customer.SetTarget(queueSlots[slotIndex]);
        }
        return true;
    }

    public void LeaveQueue(CustomerAI customer)
    {
        if (waitingCustomers.Contains(customer))
        {
            waitingCustomers.Remove(customer);
            UpdateQueueSlots();
        }
    }

    public bool TryAssignEmptyStation(ComputerStation emptyPC)
    {
        if (waitingCustomers.Count == 0 || emptyPC == null || emptyPC.isOccupied) return false;

        CustomerAI nextCustomer = waitingCustomers[0];
        waitingCustomers.RemoveAt(0);

        nextCustomer.AssignToComputer(emptyPC);
        UpdateQueueSlots();
        return true;
    }

    private void UpdateQueueSlots()
    {
        if (queueSlots == null) return;

        for (int i = 0; i < waitingCustomers.Count; i++)
        {
            if (waitingCustomers[i] != null && i < queueSlots.Length)
            {
                waitingCustomers[i].SetTarget(queueSlots[i]);
            }
        }
    }
}