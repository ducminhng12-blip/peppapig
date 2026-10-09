using UnityEngine;

/// <summary>
/// CUSTOMER AI (TÍCH HỢP HỆ THỐNG ĐIỂM HÀI LÒNG & HÀNG ĐỢI)
/// </summary>
public class CustomerAI : MonoBehaviour
{
    public enum CustomerState
    {
        Spawn,
        EnterShop,
        FindComputer,
        InWaitingQueue,
        WalkToSeatPoint,
        SitDown,
        Playing,
        FinishPlaying,
        LeaveShop
    }

    [Header("Cài Đặt Di Chuyển")]
    [SerializeField] private float moveSpeed = 3.0f;
    [SerializeField] private float stopDistance = 0.25f;

    [Header("Thời Gian Chờ & Hệ Thống Hài Lòng")]
    [SerializeField] private CustomerSatisfaction satisfactionSystem;
    [SerializeField] private float waitSeconds = 0f;

    [Header("Điểm Đến")]
    [SerializeField] private Transform targetPoint;
    [SerializeField] private Transform exitPoint;

    [Header("Trạng Thái Hiện Tại")]
    [SerializeField] private CustomerState currentState = CustomerState.Spawn;
    [SerializeField] private ComputerStation assignedPC;

    [Header("Loại Khách & Gọi Đồ")]
    [SerializeField] private CustomerKind kind = CustomerKind.HocSinh;
    [SerializeField] private float rentHours = 2f;
    [SerializeField] private float pricePerHour = 10000f;
    private FoodOrderSystem foodSystem;
    private float sessionSeconds = 20f;

    /// <summary>GameLoopManager gọi ngay sau khi tạo khách: loại khách, số giờ chơi, giá thuê/giờ.</summary>
    public void Configure(CustomerKind customerKind, float hours, float price)
    {
        kind = customerKind;
        rentHours = hours;
        pricePerHour = price;
    }

    private void Awake()
    {
        satisfactionSystem = GetComponent<CustomerSatisfaction>();
        if (satisfactionSystem == null)
        {
            satisfactionSystem = gameObject.AddComponent<CustomerSatisfaction>();
        }

        foodSystem = GetComponent<FoodOrderSystem>();
        if (foodSystem == null)
        {
            foodSystem = gameObject.AddComponent<FoodOrderSystem>();
        }
    }

    private void Start()
    {
        ChangeState(CustomerState.EnterShop);
    }

    private void Update()
    {
        switch (currentState)
        {
            case CustomerState.EnterShop:
                MoveTowards(targetPoint, onArrived: () => ChangeState(CustomerState.FindComputer));
                break;

            case CustomerState.FindComputer:
                LookForAvailableComputer();
                break;

            case CustomerState.InWaitingQueue:
                HandleWaitingQueue();
                break;

            case CustomerState.WalkToSeatPoint:
                MoveTowards(targetPoint, onArrived: () => ChangeState(CustomerState.SitDown));
                break;

            case CustomerState.SitDown:
                HandleSitDown();
                break;

            case CustomerState.Playing:
                MonitorRentSession();
                break;

            case CustomerState.FinishPlaying:
                StandUpAndLeave();
                break;

            case CustomerState.LeaveShop:
                MoveTowards(exitPoint, onArrived: () => Destroy(gameObject, 0.5f));
                break;
        }
    }

    public void ChangeState(CustomerState newState)
    {
        currentState = newState;

        if (newState == CustomerState.LeaveShop && exitPoint == null)
        {
            GameObject spawnPoint = GameObject.Find("CustomerSpawnPoint");
            if (spawnPoint != null) exitPoint = spawnPoint.transform;
        }
    }

    private void LookForAvailableComputer()
    {
        ComputerStation[] allPCs = FindObjectsOfType<ComputerStation>();
        ComputerStation chosen = null;

        foreach (var pc in allPCs)
        {
            if (pc != null && !pc.isOccupied)
            {
                chosen = pc;
                break;
            }
        }

        if (chosen != null)
        {
            AssignToComputer(chosen);
        }
        else
        {
            // Hết máy! Thử tham gia vào Hàng đợi
            if (WaitingQueueManager.Instance != null && WaitingQueueManager.Instance.TryJoinQueue(this))
            {
                ChangeState(CustomerState.InWaitingQueue);
                Debug.Log($"[{gameObject.name}] Hết máy! Khách vào hàng đợi chờ máy trống.");
            }
            else
            {
                // Hàng đợi cũng đầy -> Khách bực tức bỏ về
                if (satisfactionSystem != null)
                {
                    satisfactionSystem.ApplyWaitTimePenalty(20f);
                }
                if (GameLoopManager.Instance != null)
                {
                    GameLoopManager.Instance.RecordWalkout();
                    GameLoopManager.Instance.RecordReview(2);
                }
                Debug.LogWarning($"[{gameObject.name}] Quán và hàng đợi đều kín! Khách bỏ về.");
                ChangeState(CustomerState.LeaveShop);
            }
        }
    }

    public void AssignToComputer(ComputerStation pc)
    {
        assignedPC = pc;
        assignedPC.isOccupied = true;

        if (satisfactionSystem != null)
        {
            satisfactionSystem.ApplyWaitTimePenalty(waitSeconds);
            satisfactionSystem.ApplyComputerQuality(assignedPC);

            // Tiện ích quán (mạng, điều hòa, đồ ăn, chính sách giá) + kỳ vọng riêng của loại khách
            if (GameLoopManager.Instance != null) GameLoopManager.Instance.ApplyAmenities(satisfactionSystem);
            satisfactionSystem.SetExpectation(GameBalance.KindExpectation[(int)kind] + Random.Range(-8, 5));
        }

        targetPoint = assignedPC.sitPoint != null ? assignedPC.sitPoint : assignedPC.transform;
        ChangeState(CustomerState.WalkToSeatPoint);
    }

    private void HandleWaitingQueue()
    {
        waitSeconds += Time.deltaTime;

        // Chờ quá lâu mà không có máy -> Bực tức bỏ về (Thu ngân giúp khách kiên nhẫn hơn)
        float patience = StaffManager.Instance != null ? StaffManager.Instance.QueuePatienceSeconds() : 18f;
        if (waitSeconds > patience)
        {
            if (WaitingQueueManager.Instance != null)
            {
                WaitingQueueManager.Instance.LeaveQueue(this);
            }
            if (satisfactionSystem != null)
            {
                satisfactionSystem.ApplyWaitTimePenalty(waitSeconds);
            }
            if (GameLoopManager.Instance != null)
            {
                GameLoopManager.Instance.RecordWalkout();
                GameLoopManager.Instance.RecordReview(1);
            }
            Debug.Log($"[{gameObject.name}] Chờ quá lâu! Khách bỏ về với 1 sao 😡.");
            ChangeState(CustomerState.LeaveShop);
        }
    }

    private void HandleSitDown()
    {
        if (assignedPC != null && assignedPC.sitPoint != null)
        {
            transform.position = assignedPC.sitPoint.position;
            transform.rotation = assignedPC.sitPoint.rotation;
        }

        ChangeState(CustomerState.Playing);
        if (assignedPC != null)
        {
            assignedPC.RentComputer(rentHours, pricePerHour);
            sessionSeconds = rentHours * 10f; // 1 giờ chơi = 10 giây trong game
            if (foodSystem != null) foodSystem.BeginSession(kind, rentHours);
        }
    }

    private void MonitorRentSession()
    {
        // Khách gọi đồ ăn / nước theo tiến độ buổi chơi (0 -> 1)
        if (foodSystem != null && assignedPC != null && sessionSeconds > 0f)
        {
            foodSystem.UpdateProgress(1f - assignedPC.timeRemaining / sessionSeconds);
        }

        if (assignedPC == null || assignedPC.timeRemaining <= 0.05f || !assignedPC.isOccupied)
        {
            ChangeState(CustomerState.FinishPlaying);
        }
    }

    private void StandUpAndLeave()
    {
        // 1. Giải phóng bàn máy tính cho khách hàng tiếp theo
        if (assignedPC != null)
        {
            assignedPC.EndRent();
            assignedPC = null;
        }

        // 2. Kích hoạt Animator đứng dậy và bước đi
        Animator anim = GetComponentInChildren<Animator>();
        if (anim != null)
        {
            anim.SetBool("IsPlaying", false);
            anim.SetBool("IsWalking", true);
        }

        // 3. In báo cáo trải nghiệm & điểm đánh giá
        if (satisfactionSystem != null)
        {
            Debug.Log(satisfactionSystem.GenerateSummaryReport(gameObject.name));

            // Đánh giá của khách -> điểm uy tín của quán (ảnh hưởng lượng khách, mở khu VIP, Cyber Gaming...)
            if (GameLoopManager.Instance != null)
            {
                GameLoopManager.Instance.RecordReview(satisfactionSystem.GetReviewStars());
            }
        }

        // 4. Tìm điểm cửa ra vào để bước ra ngoài
        if (exitPoint == null)
        {
            GameObject exitObj = GameObject.Find("CustomerExitPoint");
            if (exitObj == null) exitObj = GameObject.Find("CustomerSpawnPoint");
            if (exitObj != null) exitPoint = exitObj.transform;
        }

        Debug.Log($"[{gameObject.name}] Chơi xong! Đứng dậy khỏi ghế và bước ra cửa về.");
        ChangeState(CustomerState.LeaveShop);
    }

    private void MoveTowards(Transform target, System.Action onArrived)
    {
        if (target == null) return;

        Vector3 direction = target.position - transform.position;
        direction.y = 0f;

        if (direction.magnitude <= stopDistance)
        {
            onArrived?.Invoke();
            return;
        }

        direction.Normalize();
        transform.position += direction * moveSpeed * Time.deltaTime;

        if (direction != Vector3.zero)
        {
            Quaternion rot = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(transform.rotation, rot, 10f * Time.deltaTime);
        }
    }

    public void SetTarget(Transform target) => targetPoint = target;
}