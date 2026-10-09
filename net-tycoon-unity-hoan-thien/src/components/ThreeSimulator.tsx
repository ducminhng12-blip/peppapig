import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { soundController } from '../utils/sound';
import { ScriptConfig } from '../data/csharpScripts';
import { CustomerSatisfactionBreakdown } from './SatisfactionDashboard';
import { TycoonEngine, formatHour, formatMoney } from '../game/tycoonEngine';
import { useTycoon } from '../game/useTycoon';
import { FOOD_SATISFACTION, KIND_EXPECTATION } from '../game/tycoonData';
import {
  Monitor,
  Smartphone,
  Laptop,
  RotateCcw,
  Sparkles,
  Users,
  Cpu,
  Layers,
  X,
  UserCheck,
  Smile,
  Wifi,
  Wind,
  Coffee,
  Shirt,
  Clock,
  Package,
  Store,
  DoorOpen,
  DoorClosed,
} from 'lucide-react';

export interface StationUpgradeState {
  id: number;
  name: string;
  position: THREE.Vector3;
  sitPoint: THREE.Vector3;
  isOccupied: boolean;
  timeRemaining: number;
  currentCustomerType: string;
  currentCustomerId?: number;
  totalEarnedFromStation: number;
  // Upgrade levels (1 -> 5)
  monitorLevel: number;
  gpuLevel: number;
  ramLevel: number;
  // Three.js meshes
  stationGroup?: THREE.Group;
  screenMesh?: THREE.Mesh;
  monitorFrameMesh?: THREE.Mesh;
  screenLight?: THREE.PointLight;
  pcCaseLedMesh?: THREE.Mesh;
  screenOnMat?: THREE.Material;
  screenOffMat?: THREE.Material;
  screenWingMeshes?: THREE.Mesh[];
}

export interface CustomerBodyLimbs {
  rootGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  walkCycle: number;
  type: 'HocSinh' | 'GameThu' | 'VIP';
}

export interface CustomerSimEntity {
  id: number;
  type: 'HocSinh' | 'GameThu' | 'VIP';
  name: string;
  color: number;
  hours: number;
  pricePerHour: number;
  position: THREE.Vector3;
  targetStationId: number | null;
  state: 'walking' | 'playing' | 'waiting' | 'leaving';
  mesh?: THREE.Group;
  bodyLimbs?: CustomerBodyLimbs;
  outfitName?: string;
  outfitDetails?: string;
  queueSlotIndex?: number;
  waitTimeSeconds: number;
  // Satisfaction breakdown
  baseScore: number;
  computerQualityScore: number;
  priceScore: number;
  waitTimePenalty: number;
  internetBonus: number;
  acBonus: number;
  foodBonus: number;
  finalScore: number;
  tier: 'VeryHappy' | 'Happy' | 'Normal' | 'Unhappy' | 'VeryUnhappy';
  emoji: string;
  tierLabel: string;
  stars: number;
  returnChance: number;
  /** Kỳ vọng của loại khách + tâm trạng riêng (điểm trừ) */
  expectationScore: number;
  /** Điểm cộng/trừ từ phục vụ đồ ăn & vệ sinh */
  foodExtra: number;
  /** Các thời điểm gọi đồ (tỷ lệ 0..1 của buổi chơi) */
  orderFractions: number[];
  ordersServed: number;
  ordersFailed: number;
  foodSpent: number;
}

interface FloatingPopup {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  color?: string;
}

interface ThreeSimulatorProps {
  config: ScriptConfig;
  engine: TycoonEngine;
  onOpenManagement?: () => void;
  onMoneyEarned?: (amount: number) => void;
  onSatisfactionUpdated?: (customers: CustomerSatisfactionBreakdown[], reviews: CustomerSatisfactionBreakdown[]) => void;
}

export const ThreeSimulator: React.FC<ThreeSimulatorProps> = ({
  config,
  engine,
  onOpenManagement,
  onMoneyEarned,
  onSatisfactionUpdated,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  // Trạng thái kinh tế nằm trong TycoonEngine (tiền, kho, ngày, nhân viên...)
  const game = useTycoon(engine);
  const engineRef = useRef(engine);
  const totalMoney = game.money;
  const [upgradeNotice, setUpgradeNotice] = useState<string>('');
  const buildStationRef = useRef<((id: number, name: string, x: number, z: number) => StationUpgradeState) | null>(null);
  const collidersRef = useRef<{ name: string; min: THREE.Vector3; max: THREE.Vector3 }[] | null>(null);
  const gamingBuiltRef = useRef<boolean>(false);
  const [sceneVersion, setSceneVersion] = useState<number>(0);
  const [wonDismissed, setWonDismissed] = useState<boolean>(false);
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);
  const [activeStationPrompt, setActiveStationPrompt] = useState<{
    stationId: number;
    distance: number;
  } | null>(null);
  const [floatingPopups, setFloatingPopups] = useState<FloatingPopup[]>([]);
  const [selectedUpgradeStation, setSelectedUpgradeStation] = useState<StationUpgradeState | null>(null);
  const [inspectCustomer, setInspectCustomer] = useState<CustomerSimEntity | null>(null);
  const [customerSpawnCountdown, setCustomerSpawnCountdown] = useState<number>(10);
  const [customerLogs, setCustomerLogs] = useState<string[]>([
    'Quán Net đã mở cửa. Điểm ban đầu khách: 70 điểm.',
  ]);

  // Environment Settings
  const [internetPlan, setInternetPlan] = useState<'gigabit' | 'normal' | 'laggy'>('gigabit');
  const [acEnabled, setAcEnabled] = useState<boolean>(true);
  const [foodService, setFoodService] = useState<boolean>(true);
  const [pricingPolicy, setPricingPolicy] = useState<'standard' | 'cheap' | 'expensive'>('standard');

  // Customer reviews feed
  const [recentReviews, setRecentReviews] = useState<CustomerSatisfactionBreakdown[]>([]);

  // DOM refs for direct overhead badges (Zero React state updates in loop)
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Refs for loop state
  const lastPromptStationIdRef = useRef<number | null>(null);
  const lastCountdownSecRef = useRef<number>(10);
  const selectedUpgradeStationRef = useRef<StationUpgradeState | null>(null);
  selectedUpgradeStationRef.current = selectedUpgradeStation;

  const configRef = useRef<ScriptConfig>(config);
  configRef.current = config;

  const internetPlanRef = useRef(internetPlan);
  internetPlanRef.current = internetPlan;

  const acEnabledRef = useRef(acEnabled);
  acEnabledRef.current = acEnabled;

  const foodServiceRef = useRef(foodService);
  foodServiceRef.current = foodService;

  const pricingPolicyRef = useRef(pricingPolicy);
  pricingPolicyRef.current = pricingPolicy;

  const onSatisfactionUpdatedRef = useRef(onSatisfactionUpdated);
  onSatisfactionUpdatedRef.current = onSatisfactionUpdated;

  const onMoneyEarnedRef = useRef(onMoneyEarned);
  onMoneyEarnedRef.current = onMoneyEarned;

  const recentReviewsRef = useRef(recentReviews);
  recentReviewsRef.current = recentReviews;

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stationsRef = useRef<StationUpgradeState[]>([]);
  const customersRef = useRef<CustomerSimEntity[]>([]);
  const waitingQueueSlotsRef = useRef<THREE.Vector3[]>([
    new THREE.Vector3(-3.55, 0, 2.6),
    new THREE.Vector3(-3.55, 0, 3.2),
    new THREE.Vector3(-3.55, 0, 3.8),
  ]);
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(-0.15, 1.62, 3.1));
  const playerYawRef = useRef<number>(-0.02);
  const playerPitchRef = useRef<number>(-0.06);
  const moveInputRef = useRef<{ forward: number; strafe: number }>({ forward: 0, strafe: 0 });
  const isPointerDownRef = useRef<boolean>(false);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number>(0);

  // Upgrade prices and names
  const baseUpgradePrices = {
    monitor: [0, 50000, 120000, 250000, 500000],
    gpu: [0, 80000, 200000, 450000, 900000],
    ram: [0, 30000, 75000, 150000, 300000],
  };
  // Giá hiển thị đã trừ ưu đãi Kỹ Thuật Viên
  const costMult = engine.upgradeCostMult();
  const upgradePrices = {
    monitor: baseUpgradePrices.monitor.map(v => Math.round(v * costMult)),
    gpu: baseUpgradePrices.gpu.map(v => Math.round(v * costMult)),
    ram: baseUpgradePrices.ram.map(v => Math.round(v * costMult)),
  };

  const monitorNames = [
    'Màn 60Hz Chuẩn (+2đ)',
    'Màn 144Hz IPS (+4đ)',
    'Màn 240Hz Cong (+6đ)',
    'Màn 360Hz QHD (+8đ)',
    'Màn 4K OLED 500Hz (+10đ)',
  ];

  const gpuNames = [
    'GTX 1050Ti 4GB (+3đ)',
    'RTX 3060 12GB (+6đ)',
    'RTX 4070 Super (+9đ)',
    'RTX 4080Ti OC (+12đ)',
    'RTX 4090 RogStrix (+15đ)',
  ];

  const ramNames = [
    '8GB DDR4 (+2đ)',
    '16GB DDR4 (+4đ)',
    '32GB DDR5 (+6đ)',
    '64GB DDR5 RGB (+8đ)',
    '128GB QuadChannel (+10đ)',
  ];

  // Pure Calculation of Customer Satisfaction (no side effects)
  const calculateSatisfactionCore = (
    pc: StationUpgradeState | null,
    waitSeconds: number,
    currentInternet: 'gigabit' | 'normal' | 'laggy',
    currentAc: boolean,
    currentFood: boolean,
    currentPrice: 'standard' | 'cheap' | 'expensive',
    foodExtra = 0,
    expectation = 0
  ) => {
    const base = 70;

    let compQuality = 0;
    if (pc) {
      compQuality = pc.ramLevel * 2 + pc.gpuLevel * 3 + pc.monitorLevel * 2;
    }

    let pScore = 5;
    if (currentPrice === 'cheap') pScore = 10;
    else if (currentPrice === 'standard') pScore = 5;
    else pScore = -10;

    let wPenalty = 0;
    if (waitSeconds > 8) wPenalty = -15;
    else if (waitSeconds > 3) wPenalty = -10;

    let netBonus = 10;
    if (currentInternet === 'gigabit') netBonus = 10;
    else if (currentInternet === 'normal') netBonus = 5;
    else netBonus = -15;

    const aBonus = currentAc ? 8 : -10;
    const fBonus = (currentFood ? 10 : 0) + foodExtra;

    const total = Math.max(0, Math.min(100, base + compQuality + pScore + wPenalty + netBonus + aBonus + fBonus + expectation));

    let tier: 'VeryHappy' | 'Happy' | 'Normal' | 'Unhappy' | 'VeryUnhappy' = 'Normal';
    let emoji = '😐';
    let tierLabel = 'Normal';
    let stars = 3;
    let returnChance = 45;

    if (total >= 80) {
      tier = 'VeryHappy';
      emoji = '😍';
      tierLabel = 'Very Happy';
      stars = 5;
      returnChance = 95;
    } else if (total >= 60) {
      tier = 'Happy';
      emoji = '🙂';
      tierLabel = 'Happy';
      stars = 4;
      returnChance = 75;
    } else if (total >= 40) {
      tier = 'Normal';
      emoji = '😐';
      tierLabel = 'Normal';
      stars = 3;
      returnChance = 45;
    } else if (total >= 20) {
      tier = 'Unhappy';
      emoji = '😕';
      tierLabel = 'Unhappy';
      stars = 2;
      returnChance = 15;
    } else {
      tier = 'VeryUnhappy';
      emoji = '😡';
      tierLabel = 'Very Unhappy';
      stars = 1;
      returnChance = 2;
    }

    return {
      baseScore: base,
      computerQualityScore: compQuality,
      priceScore: pScore,
      waitTimePenalty: wPenalty,
      internetBonus: netBonus,
      acBonus: aBonus,
      foodBonus: fBonus,
      expectationScore: expectation,
      finalScore: total,
      tier,
      emoji,
      tierLabel,
      stars,
      returnChance,
    };
  };

  const addLog = useCallback((msg: string) => {
    setCustomerLogs(prev => [msg, ...prev.slice(0, 3)]);
  }, []);

  const triggerPopup = useCallback((text: string, pos: THREE.Vector3, color = '#34d399') => {
    if (!cameraRef.current || !mountRef.current) return;
    const tempVec = pos.clone().add(new THREE.Vector3(0, 0.8, 0));
    tempVec.project(cameraRef.current);

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const x = ((tempVec.x + 1) * width) / 2;
    const y = ((-tempVec.y + 1) * height) / 2;

    const newPopup: FloatingPopup = {
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      opacity: 1,
      color,
    };

    setFloatingPopups(prev => [...prev.slice(-3), newPopup]);

    setTimeout(() => {
      setFloatingPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 1500);
  }, []);

  // Sync to parent callback helper
  const syncToParent = useCallback(() => {
    if (!onSatisfactionUpdatedRef.current) return;

    const activeList: CustomerSatisfactionBreakdown[] = customersRef.current
      .filter(c => c.state === 'playing' || c.state === 'waiting' || c.state === 'walking' || c.state === 'leaving')
      .map(c => {
        const st = stationsRef.current.find(s => s.id === c.targetStationId);
        return {
          id: String(c.id),
          customerName: c.name,
          customerType:
            c.type === 'HocSinh' ? 'Học Sinh' : c.type === 'GameThu' ? 'Game Thủ' : 'Khách VIP',
          stationName:
            c.state === 'waiting'
              ? 'Hàng Đợi (Ghế Chờ)'
              : c.state === 'leaving'
              ? 'Đang Đi Ra Cửa'
              : st
              ? st.name
              : 'Đang Tìm Máy',
          baseScore: c.baseScore,
          computerQualityScore: c.computerQualityScore,
          ramLevel: st ? st.ramLevel : 1,
          vgaLevel: st ? st.gpuLevel : 1,
          monitorLevel: st ? st.monitorLevel : 1,
          priceScore: c.priceScore,
          waitTimePenalty: c.waitTimePenalty,
          internetBonus: c.internetBonus,
          acBonus: c.acBonus,
          foodBonus: c.foodBonus,
          finalScore: c.finalScore,
          tier: c.tier,
          emoji: c.emoji,
          tierLabel: c.tierLabel,
          stars: c.stars,
          returnChance: c.returnChance,
          reviewComment: c.state === 'leaving' ? 'Đã chơi xong, đang bước ra cửa về...' : 'Đang trải nghiệm...',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      });

    onSatisfactionUpdatedRef.current(activeList, recentReviewsRef.current);
  }, []);

  // Khách đang chơi gọi đồ ăn / nước: trừ kho, thu tiền, đổi điểm hài lòng
  const handleCustomerOrder = (cust: CustomerSimEntity, st: StationUpgradeState) => {
    const eng = engineRef.current;
    const res = eng.processOrder(cust.type);
    if (res.status === 'none') return;

    if (res.status === 'served') {
      cust.ordersServed += 1;
      cust.foodSpent += res.price;
      soundController.playCashChime();
      triggerPopup(`${res.product.emoji} ${res.product.name} +${res.price.toLocaleString('vi-VN')}đ`, st.position, '#f59e0b');
      addLog(`[${st.name}] ${cust.name} gọi ${res.product.name} (lãi ${formatMoney(res.profit)}). Kho còn ${eng.stockLabel(res.product.id)}`);
      const status = eng.stockStatus(res.product.id);
      if (status !== 'ok') {
        triggerPopup(`⚠ ${eng.stockLabel(res.product.id)} ${status === 'out' ? '— HẾT HÀNG' : '— sắp hết'}`, playerPosRef.current, '#f43f5e');
      }
    } else {
      cust.ordersFailed += 1;
      const why = res.status === 'soldout' ? `Hết ${res.product.name}!` : `Hết ly/hộp đựng!`;
      triggerPopup(`${why} 😡`, st.position, '#f43f5e');
      addLog(`[${st.name}] ${cust.name} gọi ${res.product.name} nhưng ${why.toLowerCase()} (-${Math.abs(FOOD_SATISFACTION.failed)}đ hài lòng)`);
    }

    cust.foodExtra =
      eng.hygieneModifier() +
      Math.min(FOOD_SATISFACTION.servedCap, cust.ordersServed * FOOD_SATISFACTION.served) +
      Math.max(FOOD_SATISFACTION.floor, cust.ordersFailed * FOOD_SATISFACTION.failed) +
      (cust.ordersServed > 0 ? eng.waiterSatisfactionBonus() : 0);

    const sat = calculateSatisfactionCore(
      st,
      cust.waitTimeSeconds,
      internetPlanRef.current,
      acEnabledRef.current,
      foodServiceRef.current,
      pricingPolicyRef.current,
      cust.foodExtra,
      cust.expectationScore
    );
    Object.assign(cust, sat);
    syncToParent();
  };

  // Humanoid 3D Character Generator (Limbs, Outfits & Accessories)
  const buildHumanoidCustomer = (type: 'HocSinh' | 'GameThu' | 'VIP'): {
    group: THREE.Group;
    limbs: CustomerBodyLimbs;
    outfitName: string;
    outfitDetails: string;
  } => {
    const group = new THREE.Group();

    // Skin & Eye materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    let shirtMat: THREE.MeshStandardMaterial;
    let pantsMat: THREE.MeshStandardMaterial;
    let shoesMat: THREE.MeshStandardMaterial;
    let hairMat: THREE.MeshStandardMaterial;
    let outfitName = '';
    let outfitDetails = '';

    if (type === 'HocSinh') {
      shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }); // Áo sơ mi trắng
      pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }); // Quần âu xanh đen học sinh
      shoesMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); // Giày sneaker trắng
      hairMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8 }); // Tóc đen tự nhiên
      outfitName = 'Đồng Phục Học Sinh (Áo Sơ Mi & Quần Âu)';
      outfitDetails = 'Balo đeo lưng, cà vạt xanh, sneaker học đường, tay chân chuyển động linh hoạt';
    } else if (type === 'GameThu') {
      shirtMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5 }); // Áo hoodie gaming đen
      pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }); // Quần jogger xám tối
      shoesMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }); // Sneaker gaming neon
      hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }); // Tóc anime vuốt sáp
      outfitName = 'Áo Hoodie Gaming Cyber LED & Jogger';
      outfitDetails = 'Dải LED dạ quang, tai nghe gaming RGB over-ear, sneaker thể thao, tay gõ phím & rê chuột';
    } else {
      shirtMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.3, metalness: 0.1 }); // Áo vest tím hoàng gia
      pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4 }); // Quần vest cao cấp
      shoesMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.4 }); // Giày da bóng
      hairMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.4 }); // Tóc vuốt bóng lịch lãm
      outfitName = 'Bộ Vest Doanh Nhân VIP & Đồng Hồ Vàng';
      outfitDetails = 'Ve áo cà vạt gold, kính râm thời trang, đồng hồ mạ vàng, giày da bóng loáng';
    }

    // --- TORSO GROUP (Pelvis, Chest, Neck, Head, Shoulders, Arms) ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.70, 0); // Origin at hips
    group.add(torsoGroup);

    // 1. Pelvis / Hips & Thắt lưng
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const pelvisGeo = new THREE.BoxGeometry(0.32, 0.12, 0.20);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, beltMat);
    pelvisMesh.position.set(0, 0.05, 0);
    torsoGroup.add(pelvisMesh);

    if (type === 'VIP') {
      const buckleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });
      const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), buckleMat);
      buckleMesh.position.set(0, 0.05, 0.105);
      torsoGroup.add(buckleMesh);
    }

    // 2. Chest & Shirt (Thân áo)
    const chestGeo = new THREE.BoxGeometry(0.36, 0.38, 0.22);
    const chestMesh = new THREE.Mesh(chestGeo, shirtMat);
    chestMesh.position.set(0, 0.28, 0);
    torsoGroup.add(chestMesh);

    if (type === 'HocSinh') {
      // Cà vạt xanh
      const tieMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
      const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.03), tieMat);
      tieMesh.position.set(0, 0.32, 0.115);
      torsoGroup.add(tieMesh);

      // Cổ áo sơ mi
      const collarMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      const collarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), collarMat);
      collarMesh.position.set(0, 0.45, 0.10);
      torsoGroup.add(collarMesh);

      // Balo học sinh đeo sau lưng
      const packMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
      const packMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.15), packMat);
      packMesh.position.set(0, 0.28, -0.16);
      torsoGroup.add(packMesh);

      const strapMat = new THREE.MeshStandardMaterial({ color: 0x991b1b });
      const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.02), strapMat);
      strapL.position.set(-0.11, 0.28, 0.112);
      torsoGroup.add(strapL);
      const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.02), strapMat);
      strapR.position.set(0.11, 0.28, 0.112);
      torsoGroup.add(strapR);
    } else if (type === 'GameThu') {
      // Dải LED dạ quang trên ngực áo hoodie
      const neonMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.0,
        roughness: 0.2,
      });
      const neonStripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.02), neonMat);
      neonStripe.position.set(0, 0.34, 0.115);
      torsoGroup.add(neonStripe);

      const subStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), neonMat);
      subStripe.position.set(0, 0.26, 0.115);
      torsoGroup.add(subStripe);

      // Mũ trùm hoodie sau gáy
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.14), hoodMat);
      hoodMesh.position.set(0, 0.42, -0.12);
      torsoGroup.add(hoodMesh);
    } else if (type === 'VIP') {
      // Sơ mi trắng bên trong vest
      const innerShirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), innerShirtMat);
      innerShirt.position.set(0, 0.29, 0.112);
      torsoGroup.add(innerShirt);

      // Cà vạt vàng gold
      const goldTieMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
      const goldTie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.03), goldTieMat);
      goldTie.position.set(0, 0.31, 0.122);
      torsoGroup.add(goldTie);

      // Huy hiệu VIP vàng óng trên ngực trái
      const badgeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 8), badgeMat);
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0.11, 0.36, 0.115);
      torsoGroup.add(badge);
    }

    // 3. Neck (Cổ)
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.09, 8);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, 0.50, 0);
    torsoGroup.add(neckMesh);

    // 4. Head Group (Khuôn mặt, Tóc, Mắt, Tai nghe, Kính)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.64, 0);
    torsoGroup.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.14, 12, 10);
    headGeo.scale(1, 1.15, 1);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
    eyeL.position.set(-0.045, 0.02, 0.13);
    headGroup.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
    eyeR.position.set(0.045, 0.02, 0.13);
    headGroup.add(eyeR);

    const hairGeo = new THREE.BoxGeometry(0.30, 0.14, 0.30);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.10, -0.01);
    headGroup.add(hairMesh);

    if (type === 'GameThu') {
      // Tai nghe Gaming Over-ear RGB
      const headsetMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 });
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.2,
      });

      const headbandGeo = new THREE.TorusGeometry(0.16, 0.02, 6, 12, Math.PI);
      const headband = new THREE.Mesh(headbandGeo, headsetMat);
      headband.position.set(0, 0.04, 0);
      headGroup.add(headband);

      const earCupL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 8), headsetMat);
      earCupL.rotation.z = Math.PI / 2;
      earCupL.position.set(-0.16, 0.01, 0);
      headGroup.add(earCupL);
      const earRingL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.048, 8), ledMat);
      earRingL.rotation.z = Math.PI / 2;
      earRingL.position.set(-0.162, 0.01, 0);
      headGroup.add(earRingL);

      const earCupR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 8), headsetMat);
      earCupR.rotation.z = Math.PI / 2;
      earCupR.position.set(0.16, 0.01, 0);
      headGroup.add(earCupR);
      const earRingR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.048, 8), ledMat);
      earRingR.rotation.z = Math.PI / 2;
      earRingR.position.set(0.162, 0.01, 0);
      headGroup.add(earRingR);
    } else if (type === 'VIP') {
      // Kính râm sành điệu
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.8 });
      const goldRim = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.03), glassMat);
      glasses.position.set(0, 0.03, 0.138);
      headGroup.add(glasses);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.02), goldRim);
      bridge.position.set(0, 0.04, 0.14);
      headGroup.add(bridge);
    }

    // --- ARMS (Tay trái & Tay phải) ---
    const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.20, 8);
    const forearmGeo = new THREE.CylinderGeometry(0.042, 0.038, 0.18, 8);
    const forearmMat = type === 'HocSinh' ? skinMat : shirtMat;

    // Vai trái (Left Shoulder Joint)
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.23, 0.40, 0);
    torsoGroup.add(leftShoulder);

    const leftUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    leftUpperArm.position.set(0, -0.10, 0);
    leftShoulder.add(leftUpperArm);

    const leftForearm = new THREE.Group();
    leftForearm.position.set(0, -0.20, 0);
    leftShoulder.add(leftForearm);

    const leftForearmMesh = new THREE.Mesh(forearmGeo, forearmMat);
    leftForearmMesh.position.set(0, -0.09, 0);
    leftForearm.add(leftForearmMesh);

    const handGeo = new THREE.SphereGeometry(0.042, 8, 8);
    handGeo.scale(1, 1.2, 0.8);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.19, 0);
    leftForearm.add(leftHand);

    // Vai phải (Right Shoulder Joint)
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.23, 0.40, 0);
    torsoGroup.add(rightShoulder);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    rightUpperArm.position.set(0, -0.10, 0);
    rightShoulder.add(rightUpperArm);

    const rightForearm = new THREE.Group();
    rightForearm.position.set(0, -0.20, 0);
    rightShoulder.add(rightForearm);

    const rightForearmMesh = new THREE.Mesh(forearmGeo, forearmMat);
    rightForearmMesh.position.set(0, -0.09, 0);
    rightForearm.add(rightForearmMesh);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0, -0.19, 0);
    rightForearm.add(rightHand);

    if (type === 'VIP') {
      const watchMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });
      const watchMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.03, 8), watchMat);
      watchMesh.position.set(0, -0.16, 0);
      leftForearm.add(watchMesh);
    }

    // --- LEGS (Chân trái & Chân phải) ---
    const thighGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.32, 8);
    const calfGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.30, 8);
    const shoeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.20);

    // Khớp háng trái (Left Hip)
    const leftHip = new THREE.Group();
    leftHip.position.set(-0.11, 0.70, 0);
    group.add(leftHip);

    const leftThigh = new THREE.Mesh(thighGeo, pantsMat);
    leftThigh.position.set(0, -0.16, 0);
    leftHip.add(leftThigh);

    const leftKnee = new THREE.Group();
    leftKnee.position.set(0, -0.32, 0);
    leftHip.add(leftKnee);

    const leftCalf = new THREE.Mesh(calfGeo, pantsMat);
    leftCalf.position.set(0, -0.15, 0);
    leftKnee.add(leftCalf);

    const leftShoe = new THREE.Mesh(shoeGeo, shoesMat);
    leftShoe.position.set(0, -0.31, 0.04);
    leftKnee.add(leftShoe);

    // Khớp háng phải (Right Hip)
    const rightHip = new THREE.Group();
    rightHip.position.set(0.11, 0.70, 0);
    group.add(rightHip);

    const rightThigh = new THREE.Mesh(thighGeo, pantsMat);
    rightThigh.position.set(0, -0.16, 0);
    rightHip.add(rightThigh);

    const rightKnee = new THREE.Group();
    rightKnee.position.set(0, -0.32, 0);
    rightHip.add(rightKnee);

    const rightCalf = new THREE.Mesh(calfGeo, pantsMat);
    rightCalf.position.set(0, -0.15, 0);
    rightKnee.add(rightCalf);

    const rightShoe = new THREE.Mesh(shoeGeo, shoesMat);
    rightShoe.position.set(0, -0.31, 0.04);
    rightKnee.add(rightShoe);

    const limbs: CustomerBodyLimbs = {
      rootGroup: group,
      torsoGroup,
      headGroup,
      leftShoulder,
      rightShoulder,
      leftForearm,
      rightForearm,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      walkCycle: Math.random() * 10,
      type,
    };

    return {
      group,
      limbs,
      outfitName,
      outfitDetails,
    };
  };

  // Humanoid Limbs Animation Procedural Logic
  const animateCustomerLimbs = (
    cust: CustomerSimEntity,
    delta: number,
    state: 'walking' | 'playing' | 'waiting' | 'leaving'
  ) => {
    const limbs = cust.bodyLimbs;
    if (!limbs) return;

    const now = performance.now();

    if (state === 'walking' || state === 'leaving') {
      const speedMult = state === 'leaving' ? 9.5 : 7.2;
      limbs.walkCycle += delta * speedMult;
      const swing = Math.sin(limbs.walkCycle);
      const cosSwing = Math.cos(limbs.walkCycle);

      // Hips & Legs
      limbs.leftHip.position.set(-0.11, 0.70, 0);
      limbs.rightHip.position.set(0.11, 0.70, 0);
      limbs.torsoGroup.position.set(0, 0.70 + Math.abs(swing) * 0.025, 0);

      limbs.leftHip.rotation.set(swing * 0.55, 0, 0);
      limbs.rightHip.rotation.set(-swing * 0.55, 0, 0);

      limbs.leftKnee.rotation.set(Math.max(0, -swing * 0.5), 0, 0);
      limbs.rightKnee.rotation.set(Math.max(0, swing * 0.5), 0, 0);

      // Arms & Shoulders (opposite swing to legs)
      const armSwing = state === 'leaving' ? 0.65 : 0.45;
      limbs.leftShoulder.rotation.set(-swing * armSwing, 0, -0.05);
      limbs.rightShoulder.rotation.set(swing * armSwing, 0, 0.05);

      limbs.leftForearm.rotation.set(-0.25 - Math.max(0, -swing * 0.2), 0, 0);
      limbs.rightForearm.rotation.set(-0.25 - Math.max(0, swing * 0.2), 0, 0);

      // Torso & Head natural sway
      limbs.torsoGroup.rotation.set(state === 'leaving' ? 0.08 : 0.03, 0, cosSwing * 0.04);
      limbs.headGroup.rotation.set(0, cosSwing * 0.05, 0);
    } else if (state === 'playing') {
      // Sitting on Gaming Chair playing on PC
      limbs.leftHip.position.set(-0.11, 0.52, 0);
      limbs.rightHip.position.set(0.11, 0.52, 0);
      limbs.torsoGroup.position.set(0, 0.52, 0);

      limbs.leftHip.rotation.set(-Math.PI / 2 + 0.08, 0.05, 0);
      limbs.rightHip.rotation.set(-Math.PI / 2 + 0.08, -0.05, 0);
      limbs.leftKnee.rotation.set(Math.PI / 2 - 0.08, 0, 0);
      limbs.rightKnee.rotation.set(Math.PI / 2 - 0.08, 0, 0);

      // Torso leans slightly forward to gaming desk
      limbs.torsoGroup.rotation.set(0.12, 0, 0);

      // Left arm: on Keyboard (WASD)
      limbs.leftShoulder.rotation.set(-0.85, 0.28, -0.15);
      limbs.leftForearm.rotation.set(-0.45 + Math.sin(now * 0.012) * 0.04, 0, 0);

      // Right arm: on Mouse (moving and clicking)
      limbs.rightShoulder.rotation.set(-0.85, -0.28, 0.15);
      limbs.rightForearm.rotation.set(
        -0.42 + Math.sin(now * 0.016) * 0.02,
        Math.sin(now * 0.007) * 0.06,
        0
      );

      // Head: watching screen & minimap
      limbs.headGroup.rotation.set(-0.08, Math.sin(now * 0.002) * 0.12, 0);
    } else if (state === 'waiting') {
      // Sitting on Waiting Bench
      limbs.leftHip.position.set(-0.11, 0.44, 0);
      limbs.rightHip.position.set(0.11, 0.44, 0);
      limbs.torsoGroup.position.set(0, 0.44, 0);

      limbs.leftHip.rotation.set(-Math.PI / 2 + 0.05, 0.06, 0);
      limbs.rightHip.rotation.set(-Math.PI / 2 + 0.05, -0.06, 0);
      limbs.leftKnee.rotation.set(Math.PI / 2 - 0.05, 0, 0);
      limbs.rightKnee.rotation.set(Math.PI / 2 - 0.05, 0, 0);

      // Torso relaxed on bench
      limbs.torsoGroup.rotation.set(-0.04, 0, 0);

      // Arms resting on thighs
      limbs.leftShoulder.rotation.set(-0.35, 0.1, -0.1);
      limbs.leftForearm.rotation.set(-0.35, 0, 0);
      limbs.rightShoulder.rotation.set(-0.35, -0.1, 0.1);
      limbs.rightForearm.rotation.set(-0.35, 0, 0);

      // Head looking around waiting for PC
      limbs.headGroup.rotation.set(0, Math.sin(now * 0.0012) * 0.35, 0);
    }
  };

  // Spawn customer logic
  const spawnCustomer = useCallback(() => {
    if (!sceneRef.current) return;

    const eng = engineRef.current;
    if (!eng.isOpen()) {
      triggerPopup('Tiệm đang đóng cửa! Bấm "Mở tiệm" trước.', playerPosRef.current, '#f43f5e');
      return;
    }
    // Loại khách, số giờ chơi và giá thuê do TycoonEngine quyết định
    // (phụ thuộc mặt bằng, giờ trong ngày, khu Gaming/VIP, Cyber Gaming, giải đấu...)
    const roll = eng.rollCustomer();
    if (!roll) return;
    const type: 'HocSinh' | 'GameThu' | 'VIP' = roll.type;
    const hours = roll.hours;
    const pricePerHour = roll.pricePerHour;
    const colorHex = type === 'HocSinh' ? 0xfacc15 : type === 'GameThu' ? 0x38bdf8 : 0xc084fc;
    const typeName = type === 'HocSinh' ? 'Học Sinh' : type === 'GameThu' ? 'Game Thủ' : 'Khách VIP';
    // Kỳ vọng theo loại khách + tâm trạng riêng của từng người
    const expectation = KIND_EXPECTATION[type] + Math.round(-8 + Math.random() * 12);

    let targetPC: StationUpgradeState | null = null;
    if (type === 'VIP') {
      let maxScore = -1;
      for (const st of stationsRef.current) {
        if (!st.isOccupied) {
          const score = st.monitorLevel * 2 + st.gpuLevel * 3 + st.ramLevel * 2;
          if (score > maxScore) {
            maxScore = score;
            targetPC = st;
          }
        }
      }
    } else if (type === 'GameThu') {
      // Game thủ thích máy Gaming (Máy 07, 08) nếu còn trống
      const freeList = stationsRef.current.filter(st => !st.isOccupied);
      targetPC = freeList.find(st => st.id > 6) || freeList[0] || null;
    } else {
      targetPC = stationsRef.current.find(st => !st.isOccupied) || null;
    }

    const initFoodExtra = eng.hygieneModifier();
    const initSat = calculateSatisfactionCore(
      targetPC,
      0,
      internetPlanRef.current,
      acEnabledRef.current,
      foodServiceRef.current,
      pricingPolicyRef.current,
      initFoodExtra,
      expectation
    );

    const { group: customerGroup, limbs, outfitName, outfitDetails } = buildHumanoidCustomer(type);
    const spawnPos = new THREE.Vector3(0, 0, 4.2);
    customerGroup.position.copy(spawnPos);
    sceneRef.current.add(customerGroup);

    const custId = Date.now() + Math.random();

    const newCust: CustomerSimEntity = {
      id: custId,
      type,
      name: typeName,
      color: colorHex,
      hours,
      pricePerHour,
      position: spawnPos.clone(),
      targetStationId: targetPC ? targetPC.id : null,
      state: targetPC ? 'walking' : 'waiting',
      mesh: customerGroup,
      bodyLimbs: limbs,
      outfitName,
      outfitDetails,
      waitTimeSeconds: 0,
      foodExtra: initFoodExtra,
      orderFractions: [],
      ordersServed: 0,
      ordersFailed: 0,
      foodSpent: 0,
      ...initSat,
    };

    if (targetPC) {
      targetPC.isOccupied = true;
      targetPC.currentCustomerId = custId;
      addLog(`[Cửa] 1 ${typeName} bước vào & chọn ${targetPC.name} (${initSat.emoji} ${initSat.finalScore}đ)`);
    } else {
      const currentWaitingCount = customersRef.current.filter(c => c.state === 'waiting').length;
      if (currentWaitingCount < waitingQueueSlotsRef.current.length) {
        newCust.state = 'waiting';
        newCust.queueSlotIndex = currentWaitingCount;
        const waitingSlot = waitingQueueSlotsRef.current[currentWaitingCount];
        customerGroup.position.copy(waitingSlot);
        customerGroup.rotation.set(0, Math.PI / 2, 0);
        animateCustomerLimbs(newCust, 0, 'waiting');

        addLog(`[Hàng Đợi] Hết máy! 1 ${typeName} vào ghế chờ (${initSat.emoji} 70đ)`);
        triggerPopup('Vào hàng đợi...', waitingSlot, '#f59e0b');
      } else {
        newCust.state = 'leaving';
        eng.recordWalkout();
        eng.recordReview(2);
        addLog(`[Cửa] Quán & hàng đợi đã đầy! 1 ${typeName} quay lưng bước ra cửa (😡)`);
        triggerPopup('Quán đầy rồi! 😡', spawnPos, '#f43f5e');
        if (newCust.mesh) {
          newCust.mesh.lookAt(0, 0, 4.8);
        }
        animateCustomerLimbs(newCust, 0, 'leaving');
      }
    }

    customersRef.current.push(newCust);
    syncToParent();
  }, [addLog, triggerPopup, syncToParent]);

  // Environment Toggles (Updates customer scores immediately)
  const updateEnvironment = (type: 'internet' | 'ac' | 'food' | 'price') => {
    let nextInternet = internetPlan;
    let nextAc = acEnabled;
    let nextFood = foodService;
    let nextPrice = pricingPolicy;

    if (type === 'internet') {
      nextInternet = internetPlan === 'gigabit' ? 'normal' : internetPlan === 'normal' ? 'laggy' : 'gigabit';
      setInternetPlan(nextInternet);
      triggerPopup(
        nextInternet === 'gigabit' ? 'Mạng 1Gbps: +10đ' : nextInternet === 'normal' ? 'Mạng Thường: +5đ' : 'Mạng Lag: -15đ!',
        playerPosRef.current,
        nextInternet === 'laggy' ? '#f43f5e' : '#38bdf8'
      );
    } else if (type === 'ac') {
      nextAc = !acEnabled;
      setAcEnabled(nextAc);
      triggerPopup(nextAc ? 'Bật điều hòa 22°C: +8đ' : 'Tắt điều hòa (Nóng): -10đ', playerPosRef.current, nextAc ? '#14b8a6' : '#f43f5e');
    } else if (type === 'food') {
      nextFood = !foodService;
      setFoodService(nextFood);
      triggerPopup(nextFood ? 'Phục vụ đồ ăn/nước: +10đ' : 'Ngừng phục vụ đồ ăn: 0đ', playerPosRef.current, '#f59e0b');
    } else if (type === 'price') {
      nextPrice = pricingPolicy === 'standard' ? 'cheap' : pricingPolicy === 'cheap' ? 'expensive' : 'standard';
      setPricingPolicy(nextPrice);
      triggerPopup(
        nextPrice === 'cheap' ? 'Giá Rẻ: +10đ' : nextPrice === 'standard' ? 'Giá Chuẩn: +5đ' : 'Giá Đắt: -10đ',
        playerPosRef.current,
        nextPrice === 'expensive' ? '#f43f5e' : '#10b981'
      );
    }

    // Recalculate all active customers with new values
    for (const cust of customersRef.current) {
      const pc = stationsRef.current.find(s => s.id === cust.targetStationId) || null;
      const sat = calculateSatisfactionCore(pc, cust.waitTimeSeconds, nextInternet, nextAc, nextFood, nextPrice, cust.foodExtra, cust.expectationScore);
      Object.assign(cust, sat);
    }
    syncToParent();
  };

  // Upgrade handler
  const handleUpgrade = (component: 'monitor' | 'gpu' | 'ram') => {
    if (!selectedUpgradeStation) return;
    const st = stationsRef.current.find(s => s.id === selectedUpgradeStation.id);
    if (!st) return;

    let currentLvl = 1;
    let cost = 0;

    if (component === 'monitor') {
      currentLvl = st.monitorLevel;
      if (currentLvl >= 5) return;
      const res = engineRef.current.tryUpgrade('monitor', baseUpgradePrices.monitor[currentLvl]);
      if (!res.ok) { setUpgradeNotice(res.msg); addLog(res.msg); return; }
      cost = res.cost;
      st.monitorLevel++;
      if (st.monitorFrameMesh) {
        const scaleX = 1.0 + (st.monitorLevel - 1) * 0.18;
        st.monitorFrameMesh.scale.set(scaleX, 1, 1);
      }
      if (st.screenMesh) {
        const scaleX = 1.0 + (st.monitorLevel - 1) * 0.18;
        st.screenMesh.scale.set(scaleX, 1, 1);
      }
    } else if (component === 'gpu') {
      currentLvl = st.gpuLevel;
      if (currentLvl >= 5) return;
      const res = engineRef.current.tryUpgrade('gpu', baseUpgradePrices.gpu[currentLvl]);
      if (!res.ok) { setUpgradeNotice(res.msg); addLog(res.msg); return; }
      cost = res.cost;
      st.gpuLevel++;
      if (st.pcCaseLedMesh) {
        const ledMat = st.pcCaseLedMesh.material as THREE.MeshStandardMaterial;
        if (ledMat) {
          const colors = [0x06b6d4, 0x3b82f6, 0xa855f7, 0xec4899, 0xf59e0b];
          ledMat.emissive = new THREE.Color(colors[st.gpuLevel - 1]);
          ledMat.emissiveIntensity = 2.5;
        }
      }
    } else if (component === 'ram') {
      currentLvl = st.ramLevel;
      if (currentLvl >= 5) return;
      const res = engineRef.current.tryUpgrade('ram', baseUpgradePrices.ram[currentLvl]);
      if (!res.ok) { setUpgradeNotice(res.msg); addLog(res.msg); return; }
      cost = res.cost;
      st.ramLevel++;
    }

    setUpgradeNotice('');
    soundController.playPowerSwitch(true);

    const qualityPoints = st.ramLevel * 2 + st.gpuLevel * 3 + st.monitorLevel * 2;
    triggerPopup(`Nâng cấp! Chất lượng máy: +${qualityPoints}đ`, st.position, '#38bdf8');
    addLog(`Đã nâng cấp ${component.toUpperCase()} cho ${st.name}! Điểm máy: +${qualityPoints}đ (-${formatMoney(cost)}, -1 linh kiện)`);

    const currentCust = customersRef.current.find(c => c.targetStationId === st.id);
    if (currentCust) {
      const sat = calculateSatisfactionCore(
        st,
        currentCust.waitTimeSeconds,
        internetPlanRef.current,
        acEnabledRef.current,
        foodServiceRef.current,
        pricingPolicyRef.current,
        currentCust.foodExtra,
        currentCust.expectationScore
      );
      Object.assign(currentCust, sat);
      triggerPopup(`Hài lòng tăng: ${sat.emoji} ${sat.finalScore}đ`, st.position, '#10b981');
    }

    setSelectedUpgradeStation({ ...st });
    syncToParent();
  };

  // THREE.JS SCENE INITIALIZATION (Strictly empty dependency array [])
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    scene.fog = new THREE.Fog(0x111827, 18, 48);
    sceneRef.current = scene;

    // Wide-angle panoramic perspective camera (FOV 72) with optimized depth buffer precision (camera.near = 0.05)
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.05, 50);
    camera.near = 0.05;
    camera.far = 50;
    camera.updateProjectionMatrix();
    camera.position.copy(playerPosRef.current);
    cameraRef.current = camera;

    // Unity HDRP Style Renderer Settings
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- CINEMATIC ATMOSPHERIC LIGHTING ---
    // 1. Global Ambient Light (dark grey/blueish, intensity: 1.0) as requested
    const globalAmbient = new THREE.AmbientLight(0x6b7c96, 1.0);
    scene.add(globalAmbient);

    // 2. Directional Light pointing downwards with low intensity to illuminate the floor
    const floorDirLight = new THREE.DirectionalLight(0xcfd8dc, 0.65);
    floorDirLight.position.set(0, 8, -0.5);
    floorDirLight.target.position.set(0, 0, -0.5);
    scene.add(floorDirLight);
    scene.add(floorDirLight.target);

    // 3. Subtle Hemisphere Light for environmental fill
    const hemiLight = new THREE.HemisphereLight(0x8fa3bf, 0x334155, 0.45);
    scene.add(hemiLight);

    // Parallel Dual Neon Ceiling Strips (Straight down the central aisle)
    // Left: Electric Cyan/Blue neon strip (running z: -5.5 to 5.0 at x: -0.6, y: 3.65)
    const neonBlueGeo = new THREE.CylinderGeometry(0.03, 0.03, 10.5, 12);
    const neonBlueMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonBlueStrip = new THREE.Mesh(neonBlueGeo, neonBlueMat);
    neonBlueStrip.rotation.x = Math.PI / 2;
    neonBlueStrip.position.set(-0.6, 3.65, -0.25);
    scene.add(neonBlueStrip);

    // Right: Ultraviolet Purple/Magenta neon strip (running z: -5.5 to 5.0 at x: 0.6, y: 3.65)
    const neonPurpleGeo = new THREE.CylinderGeometry(0.03, 0.03, 10.5, 12);
    const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
    const neonPurpleStrip = new THREE.Mesh(neonPurpleGeo, neonPurpleMat);
    neonPurpleStrip.rotation.x = Math.PI / 2;
    neonPurpleStrip.position.set(0.6, 3.65, -0.25);
    scene.add(neonPurpleStrip);

    // Neon wash lights along central aisle
    const neonLight1 = new THREE.PointLight(0x00f0ff, 1.4, 9);
    neonLight1.position.set(-0.6, 3.4, -2.5);
    scene.add(neonLight1);

    const neonLight2 = new THREE.PointLight(0xd946ef, 1.4, 9);
    neonLight2.position.set(0.6, 3.4, -0.5);
    scene.add(neonLight2);

    const neonLight3 = new THREE.PointLight(0x00f0ff, 1.4, 9);
    neonLight3.position.set(-0.6, 3.4, 1.8);
    scene.add(neonLight3);

    const neonLight4 = new THREE.PointLight(0xd946ef, 1.4, 9);
    neonLight4.position.set(0.6, 3.4, 3.8);
    scene.add(neonLight4);

    // --- REALISTIC POLISHED TILED / EPOXY GAMING FLOOR (Visible dark-grey PBR) ---
    const createFloorCanvasTexture = () => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const ctx = c.getContext('2d');
      if (ctx) {
        // Dark polished charcoal base tile (NOT pure black)
        ctx.fillStyle = '#222b38';
        ctx.fillRect(0, 0, 1024, 1024);

        // Large 4x4 tile grid with distinct slate/charcoal tones & subtle wear
        const tileSize = 256;
        for (let tx = 0; tx < 1024; tx += tileSize) {
          for (let ty = 0; ty < 1024; ty += tileSize) {
            const isAlt = ((tx / tileSize + ty / tileSize) % 2 === 0);
            ctx.fillStyle = isAlt ? '#273242' : '#2f3b4e';
            ctx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);

            // Subtle epoxy sheen gradient
            const grad = ctx.createLinearGradient(tx, ty, tx + tileSize, ty + tileSize);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.06)');
            ctx.fillStyle = grad;
            ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);

            // Subtle inner tile bevel highlight
            ctx.strokeStyle = '#3e4d66';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(tx + 4, ty + 4, tileSize - 8, tileSize - 8);

            // Grout lines (Crisp dark seams)
            ctx.strokeStyle = '#151c26';
            ctx.lineWidth = 4;
            ctx.strokeRect(tx, ty, tileSize, tileSize);

            // Natural wear & fine scuff marks
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx + 30, ty + 45);
            ctx.lineTo(tx + 85, ty + 65);
            ctx.moveTo(tx + 120, ty + 160);
            ctx.lineTo(tx + 175, ty + 180);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.moveTo(tx + 50, ty + 110);
            ctx.lineTo(tx + 110, ty + 130);
            ctx.stroke();
          }
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 4);
      return tex;
    };

    const floorTex = createFloorCanvasTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.24,
      metalness: 0.22,
      color: 0xffffff,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -0.5);
    scene.add(floor);

    // Cable Management Covers / Wire Paths (Nẹp dây điện sàn) running parallel to desks
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x222a38, roughness: 0.6, metalness: 0.2 });
    const cableCoverL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 11), cableMat);
    cableCoverL.position.set(-1.35, 0.012, -0.5);
    scene.add(cableCoverL);

    const cableCoverR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 11), cableMat);
    cableCoverR.position.set(1.35, 0.012, -0.5);
    scene.add(cableCoverR);

    // Lateral branch wire covers under desks
    for (const bz of [-2.8, -0.9, 1.0]) {
      const branchL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), cableMat);
      branchL.position.set(-1.75, 0.01, bz);
      scene.add(branchL);

      const branchR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), cableMat);
      branchR.position.set(1.75, 0.01, bz);
      scene.add(branchR);
    }

    // --- INDUSTRIAL DARK CEILING & ARCHITECTURE ---
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e2736, roughness: 0.8 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.8, -0.5);
    scene.add(ceiling);

    // Exposed structural steel I-beams running across ceiling
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.4 });
    const beamPositionsZ = [-4.8, -2.5, 0.0, 2.5, 4.8];
    for (const bz of beamPositionsZ) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.18, 0.22), beamMat);
      beam.position.set(0, 3.71, bz);
      scene.add(beam);
    }

    // Exposed longitudinal industrial ventilation pipes / spiral ducts
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.28 });
    const ductL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 16), ductMat);
    ductL.rotation.x = Math.PI / 2;
    ductL.position.set(-1.6, 3.45, -0.5);
    scene.add(ductL);

    const ductR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 16), ductMat);
    ductR.rotation.x = Math.PI / 2;
    ductR.position.set(1.6, 3.45, -0.5);
    scene.add(ductR);

    // AC Units (Commercial suspended ceiling units)
    const acMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.5 });
    const acLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-1.8, 1.8].forEach(acX => {
      const acUnit = new THREE.Group();
      acUnit.position.set(acX, 3.48, -0.5);

      const acBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.7), acMat);
      acUnit.add(acBody);

      const acGrill = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
      acGrill.position.set(0, -0.12, 0);
      acUnit.add(acGrill);

      const acLed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), acLedMat);
      acLed.position.set(0.5, -0.1, 0.3);
      acUnit.add(acLed);

      scene.add(acUnit);
    });

    // Spinning Industrial Ceiling Fans along Central Aisle
    const ceilingFansList: THREE.Group[] = [];
    const fanMat = new THREE.MeshStandardMaterial({ color: 0x222a38, metalness: 0.8, roughness: 0.3 });
    [-2.8, 0.0, 2.8].forEach(fz => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, 3.52, fz);

      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), fanMat);
      rod.position.set(0, 0.15, 0);
      fanGroup.add(rod);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), fanMat);
      fanGroup.add(hub);

      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.015, 0.14), fanMat);
        blade.position.set(0.48, 0, 0);
        blade.rotation.x = 0.12;
        const bladeArm = new THREE.Group();
        bladeArm.rotation.y = (b * Math.PI) / 2;
        bladeArm.add(blade);
        fanGroup.add(bladeArm);
      }

      scene.add(fanGroup);
      ceilingFansList.push(fanGroup);
    });

    // --- LEFT WALL: ACOUSTIC SOUNDPROOFING PANELS & VERTICAL NEON STRIPS ---
    const leftWallGroup = new THREE.Group();
    leftWallGroup.position.set(-4.18, 1.9, -0.5);

    // Visible dark-grey acoustic soundproofing base wall texture
    const createAcousticWallTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#262f3f';
        ctx.fillRect(0, 0, 512, 512);

        // Acoustic dampening micro-perforations
        ctx.fillStyle = '#1c2432';
        for (let x = 0; x < 512; x += 16) {
          for (let y = 0; y < 512; y += 16) {
            ctx.beginPath();
            ctx.arc(x + 8, y + 8, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Vertical acoustic fabric seams
        ctx.strokeStyle = '#18202d';
        ctx.lineWidth = 2;
        for (let x = 0; x < 512; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 512);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 2);
      return tex;
    };

    const acousticWallTex = createAcousticWallTexture();
    const wallAcousticMat = new THREE.MeshStandardMaterial({
      map: acousticWallTex,
      color: 0xffffff,
      roughness: 0.75,
    });
    const leftWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.2), wallAcousticMat);
    leftWallMesh.rotation.y = Math.PI / 2;
    leftWallGroup.add(leftWallMesh);

    // Vertical slatted acoustic soundproofing panels & Inset vertical neon strips
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x333f54, roughness: 0.65 });
    const neonVerticalColors = [0x00f0ff, 0xd946ef, 0x00f0ff, 0xd946ef, 0x00f0ff];

    for (let pIdx = 0; pIdx < 5; pIdx++) {
      const pZ = -4.2 + pIdx * 2.1;

      // Acoustic slatted panel box
      const panelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.4, 1.6), slatMat);
      panelMesh.position.set(0.03, 0, pZ);
      leftWallGroup.add(panelMesh);

      // Inset vertical LED strip light between panels
      const vNeonMat = new THREE.MeshBasicMaterial({ color: neonVerticalColors[pIdx] });
      const vNeonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.2, 0.04), vNeonMat);
      vNeonMesh.position.set(0.07, 0, pZ + 0.95);
      leftWallGroup.add(vNeonMesh);

      // Soft vertical neon light wash
      const vNeonLight = new THREE.PointLight(neonVerticalColors[pIdx], 0.65, 4.2);
      vNeonLight.position.set(0.2, 0, pZ + 0.95);
      leftWallGroup.add(vNeonLight);
    }

    // Industrial Conduits & Electrical Wall Boxes on Left Wall
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.3 });
    const conduitL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 14, 8), conduitMat);
    conduitL1.rotation.x = Math.PI / 2;
    conduitL1.position.set(0.06, -0.65, 0);
    leftWallGroup.add(conduitL1);

    const conduitL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 14, 8), conduitMat);
    conduitL2.rotation.x = Math.PI / 2;
    conduitL2.position.set(0.06, 0.25, 0);
    leftWallGroup.add(conduitL2);

    // Wall-mounted double electrical sockets & light switches
    const outletMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    [-2.2, 0.5, 3.0].forEach(oz => {
      const outletBox = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.14), outletMat);
      outletBox.position.set(0.07, -0.65, oz);
      leftWallGroup.add(outletBox);

      // Small vertical conduit drop
      const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), conduitMat);
      drop.position.set(0.06, -0.9, oz);
      leftWallGroup.add(drop);
    });

    scene.add(leftWallGroup);

    // --- FRAMED ESPORTS POSTERS ON LEFT WALL (League of Legends, Valorant, etc.) ---
    const createEsportsPoster = (
      game: 'lol' | 'lol2' | 'valorant' | 'csgo',
      pos: THREE.Vector3
    ) => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 384;
      pCanvas.height = 512;
      const ctx = pCanvas.getContext('2d');
      if (ctx) {
        if (game === 'lol') {
          // League of Legends poster (Akali / KDA dark blue & gold theme)
          ctx.fillStyle = '#091428';
          ctx.fillRect(0, 0, 384, 512);

          // Golden crest border
          ctx.strokeStyle = '#c89b3c';
          ctx.lineWidth = 8;
          ctx.strokeRect(12, 12, 360, 488);

          // Mystic champion art background
          const grad = ctx.createLinearGradient(0, 0, 384, 512);
          grad.addColorStop(0, '#0a323c');
          grad.addColorStop(0.5, '#005a82');
          grad.addColorStop(1, '#091428');
          ctx.fillStyle = grad;
          ctx.fillRect(24, 24, 336, 464);

          // Champion silhouette / stylized emblem
          ctx.fillStyle = '#c8aa6e';
          ctx.beginPath();
          ctx.arc(192, 190, 75, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#091428';
          ctx.font = 'black 54px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('L', 192, 210);

          ctx.fillStyle = '#f0e6d2';
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText('LEAGUE OF', 192, 320);
          ctx.fillStyle = '#c89b3c';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText('LEGENDS', 192, 360);

          ctx.fillStyle = '#0ac8b9';
          ctx.font = 'bold 15px monospace';
          ctx.fillText('WORLDS CHAMPIONSHIP', 192, 420);
        } else if (game === 'lol2') {
          // Action Esports Champion poster
          ctx.fillStyle = '#0b0e1b';
          ctx.fillRect(0, 0, 384, 512);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 6;
          ctx.strokeRect(10, 10, 364, 492);

          ctx.fillStyle = '#0284c7';
          ctx.fillRect(20, 20, 344, 280);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('T1 FAKER', 192, 160);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('4X WORLD CHAMPION', 192, 200);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('IMMORTAL DEMON KING', 192, 360);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '16px monospace';
          ctx.fillText('ESPORTS HALL OF FAME', 192, 410);
        } else if (game === 'valorant') {
          // Valorant Poster (Red & Dark Violet theme)
          ctx.fillStyle = '#0f141f';
          ctx.fillRect(0, 0, 384, 512);

          ctx.fillStyle = '#ff4655';
          ctx.fillRect(0, 0, 384, 90);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'black 42px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VALORANT', 192, 62);

          // Agent artwork area
          ctx.fillStyle = '#1f2738';
          ctx.fillRect(24, 110, 336, 250);

          ctx.fillStyle = '#ff4655';
          ctx.beginPath();
          ctx.moveTo(192, 130);
          ctx.lineTo(260, 280);
          ctx.lineTo(124, 280);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ece8e1';
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText('DEFY THE LIMITS', 192, 400);

          ctx.fillStyle = '#ff4655';
          ctx.font = 'bold 16px monospace';
          ctx.fillText('VCT PACIFIC LEAGUE', 192, 445);
        } else {
          // CS:GO Major poster
          ctx.fillStyle = '#111827';
          ctx.fillRect(0, 0, 384, 512);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 6;
          ctx.strokeRect(10, 10, 364, 492);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('COUNTER-STRIKE', 192, 70);

          ctx.fillStyle = '#374151';
          ctx.fillRect(24, 110, 336, 250);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 48px sans-serif';
          ctx.fillText('MAJOR', 192, 250);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('GLOBAL ESPORTS TOUR', 192, 410);
        }
      }
      const pTex = new THREE.CanvasTexture(pCanvas);
      const posterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 1.55),
        new THREE.MeshBasicMaterial({
          map: pTex,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      posterMesh.position.set(pos.x, pos.y, pos.z);
      posterMesh.rotation.y = Math.PI / 2;

      // Heavy dark acrylic outer frame with distinct depth offset
      const frameMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.62, 1.22),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.2 })
      );
      frameMesh.position.set(pos.x - 0.04, pos.y, pos.z);

      // Spotlight fixture mounted above poster
      const spotHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, 0.14, 8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      );
      spotHousing.position.set(pos.x + 0.16, pos.y + 0.95, pos.z);
      spotHousing.rotation.z = Math.PI / 4;
      scene.add(spotHousing);

      const spotLight = new THREE.PointLight(0xfff7ed, 0.85, 3.2);
      spotLight.position.set(pos.x + 0.24, pos.y + 0.85, pos.z);
      scene.add(spotLight);

      scene.add(frameMesh);
      scene.add(posterMesh);
    };

    // Hang Large Framed Esports Posters on Left Wall with physical offset from wall
    createEsportsPoster('lol', new THREE.Vector3(-4.05, 2.25, 0.6));
    createEsportsPoster('lol2', new THREE.Vector3(-4.05, 2.25, -1.0));
    createEsportsPoster('valorant', new THREE.Vector3(-4.05, 2.25, -2.6));
    createEsportsPoster('csgo', new THREE.Vector3(-4.05, 2.25, -4.2));

    // --- 'HÀNG ĐỢI (WAITING)' ZONE ON LEFT WALL IN FOREGROUND ---
    // 1. Illuminated Wall Signboard: "HÀNG ĐỢI (WAITING)"
    const waitingSignCanvas = document.createElement('canvas');
    waitingSignCanvas.width = 512;
    waitingSignCanvas.height = 140;
    const wsCtx = waitingSignCanvas.getContext('2d');
    if (wsCtx) {
      wsCtx.fillStyle = '#0a1324';
      wsCtx.fillRect(0, 0, 512, 140);

      // Glowing gold/cyan border
      wsCtx.strokeStyle = '#00f0ff';
      wsCtx.lineWidth = 6;
      wsCtx.strokeRect(6, 6, 500, 128);

      wsCtx.fillStyle = '#f59e0b';
      wsCtx.font = 'bold 38px sans-serif';
      wsCtx.textAlign = 'center';
      wsCtx.fillText('HÀNG ĐỢI (WAITING)', 256, 82);
    }
    const waitingSignTex = new THREE.CanvasTexture(waitingSignCanvas);
    const waitingSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.44),
      new THREE.MeshBasicMaterial({
        map: waitingSignTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    waitingSignMesh.position.set(-4.05, 1.85, 3.1);
    waitingSignMesh.rotation.y = Math.PI / 2;
    scene.add(waitingSignMesh);

    const waitingSignBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.50, 1.66),
      new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.85 })
    );
    waitingSignBox.position.set(-4.10, 1.85, 3.1);
    scene.add(waitingSignBox);

    // Small framed team photo / queue guidelines next to signboard
    const photoCanvas = document.createElement('canvas');
    photoCanvas.width = 128;
    photoCanvas.height = 140;
    const phCtx = photoCanvas.getContext('2d');
    if (phCtx) {
      phCtx.fillStyle = '#1e293b';
      phCtx.fillRect(0, 0, 128, 140);
      phCtx.fillStyle = '#f59e0b';
      phCtx.font = 'bold 16px sans-serif';
      phCtx.textAlign = 'center';
      phCtx.fillText('VIP QUEUE', 64, 40);
      phCtx.fillStyle = '#38bdf8';
      phCtx.fillText('1-6 SLOTS', 64, 80);
    }
    const photoTex = new THREE.CanvasTexture(photoCanvas);
    const photoMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.44),
      new THREE.MeshBasicMaterial({
        map: photoTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    photoMesh.position.set(-4.05, 1.85, 4.25);
    photoMesh.rotation.y = Math.PI / 2;
    scene.add(photoMesh);

    // 2. Connected Dark Metallic/Plastic Waiting Chairs with Chrome Frame
    const waitingChairsGroup = new THREE.Group();
    waitingChairsGroup.position.set(-3.55, 0, 3.2);

    // Long horizontal chrome support beam
    const chromeBeamMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const chairBeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.1), chromeBeamMat);
    chairBeam.position.set(0, 0.38, 0);
    waitingChairsGroup.add(chairBeam);

    // Two Chrome Steel Upright Legs with Floor Footings
    [-0.8, 0.8].forEach(legZ => {
      const legPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), chromeBeamMat);
      legPost.position.set(0, 0.19, legZ);
      waitingChairsGroup.add(legPost);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.06), chromeBeamMat);
      foot.position.set(0, 0.01, legZ);
      waitingChairsGroup.add(foot);
    });

    // 4 Connected Dark Sculpted Waiting Bucket Seats
    const seatShellMat = new THREE.MeshStandardMaterial({ color: 0x111726, roughness: 0.45, metalness: 0.2 });
    const seatZPositions = [-0.75, -0.25, 0.25, 0.75];
    seatZPositions.forEach(sZ => {
      // Seat cushion (horizontal bucket pan)
      const seatPan = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.40), seatShellMat);
      seatPan.position.set(0, 0.42, sZ);
      waitingChairsGroup.add(seatPan);

      // Backrest (vertical contoured back)
      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.40), seatShellMat);
      seatBack.position.set(-0.19, 0.65, sZ);
      seatBack.rotation.z = -0.08;
      waitingChairsGroup.add(seatBack);

      // Chrome side armrest loop
      const armLoop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 16, Math.PI), chromeBeamMat);
      armLoop.rotation.y = Math.PI / 2;
      armLoop.position.set(0, 0.54, sZ + 0.21);
      waitingChairsGroup.add(armLoop);
    });

    scene.add(waitingChairsGroup);

    // --- RIGHT WALL: INDUSTRIAL CONCRETE STRUCTURE, BEAMS & 'NỘI QUY HOẠT ĐỘNG' ---
    const rightWallGroup = new THREE.Group();
    rightWallGroup.position.set(4.18, 1.9, -0.5);

    // Visible concrete industrial base wall texture
    const createConcreteWallTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(0, 0, 512, 512);

        // Concrete texture variations
        for (let i = 0; i < 400; i++) {
          const rx = (i * 37) % 512;
          const ry = (i * 73) % 512;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
          ctx.beginPath();
          ctx.arc(rx, ry, 3 + (i % 6), 0, Math.PI * 2);
          ctx.fill();
        }

        // Formwork panel seams
        ctx.strokeStyle = '#1e2634';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 512, 256);
        ctx.strokeRect(0, 256, 512, 256);

        // Formwork tie-holes
        [64, 448].forEach(hx => {
          [64, 192, 320, 448].forEach(hy => {
            ctx.fillStyle = '#171e29';
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3e4b5e';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
        });
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 2);
      return tex;
    };

    const concreteWallTex = createConcreteWallTexture();
    const wallConcreteMat = new THREE.MeshStandardMaterial({
      map: concreteWallTex,
      color: 0xffffff,
      roughness: 0.82,
    });
    const rightWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.2), wallConcreteMat);
    rightWallMesh.rotation.y = -Math.PI / 2;
    rightWallGroup.add(rightWallMesh);

    // Structural vertical pillars / steel columns along right wall
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x242e3f, metalness: 0.6, roughness: 0.4 });
    [-4.5, -1.8, 1.2, 4.2].forEach(pZ => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.2, 0.25), pillarMat);
      pillar.position.set(-0.08, 0, pZ);
      rightWallGroup.add(pillar);
    });

    // Silver metal conduit pipes running horizontally along right wall
    const conduitR1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 14, 8), conduitMat);
    conduitR1.rotation.x = Math.PI / 2;
    conduitR1.position.set(-0.06, -0.65, 0);
    rightWallGroup.add(conduitR1);

    const conduitR2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 14, 8), conduitMat);
    conduitR2.rotation.x = Math.PI / 2;
    conduitR2.position.set(-0.06, 0.35, 0);
    rightWallGroup.add(conduitR2);

    // Wall-mounted Electrical Breaker Box (Tủ điện kỹ thuật) on right wall
    const breakerBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.65, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
    );
    breakerBox.position.set(-0.06, 0.2, 1.2);
    rightWallGroup.add(breakerBox);

    // Electrical junction switches
    [-2.8, -0.5, 3.2].forEach(rz => {
      const jBox = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.12), outletMat);
      jBox.position.set(-0.06, -0.65, rz);
      rightWallGroup.add(jBox);
    });

    scene.add(rightWallGroup);

    // Large Framed 'NỘI QUY HOẠT ĐỘNG' (Rules & Regulations) Board (Matching image.png!)
    const ruleCanvas = document.createElement('canvas');
    ruleCanvas.width = 512;
    ruleCanvas.height = 768;
    const rCtx = ruleCanvas.getContext('2d');
    if (rCtx) {
      rCtx.fillStyle = '#080c16';
      rCtx.fillRect(0, 0, 512, 768);

      // Gold ornamental double border
      rCtx.strokeStyle = '#f59e0b';
      rCtx.lineWidth = 8;
      rCtx.strokeRect(14, 14, 484, 740);
      rCtx.lineWidth = 3;
      rCtx.strokeRect(22, 22, 468, 724);

      // Header: NỘI QUY HOẠT ĐỘNG
      rCtx.fillStyle = '#f59e0b';
      rCtx.font = 'bold 36px sans-serif';
      rCtx.textAlign = 'center';
      rCtx.fillText('NỘI QUY HOẠT ĐỘNG', 256, 80);
      rCtx.fillStyle = '#38bdf8';
      rCtx.font = 'bold 20px sans-serif';
      rCtx.fillText('CYBER GAME VIETNAM • ESPORTS', 256, 120);

      // Rules lines
      rCtx.textAlign = 'left';
      rCtx.fillStyle = '#ffffff';
      rCtx.font = 'bold 18px sans-serif';
      const vietnameseRules = [
        '1. Giữ gìn vệ sinh và trật tự chung trong phòng máy.',
        '2. Tuyệt đối không hút thuốc lá, thuốc lá điện tử.',
        '3. Không văng tục, chửi thề, đập phá phím chuột máy tính.',
        '4. Nạp tiền giờ chơi tại quầy thu ngân trước khi sử dụng.',
        '5. Tự bảo quản tư trang, xe cộ và tài sản cá nhân.',
        '6. Vui lòng thanh toán đồ ăn nước uống khi gọi món.',
        '7. Nghiêm cấm sử dụng phần mềm gian lận (Hack/Cheat).',
        '8. Mọi thắc mắc về sự cố máy vui lòng báo nhân viên.',
      ];
      vietnameseRules.forEach((rule, idx) => {
        rCtx.fillText(rule, 36, 185 + idx * 56);
      });

      rCtx.textAlign = 'center';
      rCtx.fillStyle = '#f59e0b';
      rCtx.font = 'bold 18px sans-serif';
      rCtx.fillText('CHÚC QUÝ KHÁCH LEO RANK CHIẾN THẮNG!', 256, 680);
    }
    const ruleTex = new THREE.CanvasTexture(ruleCanvas);
    const ruleBoardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 1.85),
      new THREE.MeshBasicMaterial({
        map: ruleTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    // Physically offset 14cm from right wall (x=4.18) and strictly in front of frame face
    ruleBoardMesh.position.set(4.04, 2.15, 3.1);
    ruleBoardMesh.rotation.y = -Math.PI / 2;
    scene.add(ruleBoardMesh);

    // Gold & dark framed border box with clear physical depth offset
    const ruleFrameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.92, 1.42),
      new THREE.MeshStandardMaterial({ color: 0x1e150a, metalness: 0.8, roughness: 0.3 })
    );
    ruleFrameMesh.position.set(4.10, 2.15, 3.1);
    scene.add(ruleFrameMesh);

    // Framed Esports Tournament Posters on Right Wall (CS:GO, Valorant, Dota 2)
    const createRightPoster = (title: string, sub: string, color: string, pZ: number) => {
      const rpCanvas = document.createElement('canvas');
      rpCanvas.width = 256;
      rpCanvas.height = 384;
      const ctx = rpCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, 256, 384);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, 240, 368);

        ctx.fillStyle = color;
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, 128, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(sub, 128, 100);

        ctx.fillStyle = color;
        ctx.fillRect(40, 130, 176, 120);
        ctx.fillStyle = '#0a0f1d';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('PRO LEAGUE', 128, 195);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText('SEASON 2026', 128, 310);
      }
      const rpTex = new THREE.CanvasTexture(rpCanvas);
      const rpMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 1.5),
        new THREE.MeshBasicMaterial({
          map: rpTex,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      // Strictly separated from frame and wall
      rpMesh.position.set(4.04, 2.2, pZ);
      rpMesh.rotation.y = -Math.PI / 2;

      const rpFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.56, 1.06),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.85 })
      );
      rpFrame.position.set(4.10, 2.2, pZ);

      scene.add(rpFrame);
      scene.add(rpMesh);
    };

    createRightPoster('CS:GO MAJOR', 'GLOBAL ESPORTS', '#ec4899', -1.2);
    createRightPoster('VALORANT MASTERS', 'CHAMPIONS TOUR', '#38bdf8', -2.8);
    createRightPoster('DOTA 2', 'THE INTERNATIONAL', '#a855f7', -4.2);

    // --- BACK WALL & SERVICE COUNTER (Quầy Thu Ngân, Kệ Mì Tôm, Tủ Mát Nước Ngọt) ---
    // 1. Back Wall Structure
    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(0, 1.9, -6.1);

    const createBackWallTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#263042';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#1a2230';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 256, 512);
        ctx.strokeRect(256, 0, 256, 512);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 1.5);
      return tex;
    };
    const backWallTex = createBackWallTexture();
    const backWallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 4.2),
      new THREE.MeshStandardMaterial({ map: backWallTex, color: 0xffffff, roughness: 0.8 })
    );
    backWallGroup.add(backWallMesh);

    // Illuminated Neon Center Signboard above Service Counter
    const cyberSignCanvas = document.createElement('canvas');
    cyberSignCanvas.width = 768;
    cyberSignCanvas.height = 180;
    const csCtx = cyberSignCanvas.getContext('2d');
    if (csCtx) {
      csCtx.fillStyle = '#0a1222';
      csCtx.fillRect(0, 0, 768, 180);

      csCtx.strokeStyle = '#00f0ff';
      csCtx.lineWidth = 6;
      csCtx.strokeRect(8, 8, 752, 164);

      csCtx.fillStyle = '#00f0ff';
      csCtx.font = 'bold 44px sans-serif';
      csCtx.textAlign = 'center';
      csCtx.fillText('CYBER GAME • ESPORTS ARENA', 384, 80);

      csCtx.fillStyle = '#f59e0b';
      csCtx.font = 'bold 22px sans-serif';
      csCtx.fillText('VIETNAM GAMING CENTER • HIGH SPEED FIBER 10Gbps', 384, 130);
    }
    const cyberSignTex = new THREE.CanvasTexture(cyberSignCanvas);
    const cyberSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.85),
      new THREE.MeshBasicMaterial({
        map: cyberSignTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    cyberSignMesh.position.set(0, 1.25, 0.08);
    backWallGroup.add(cyberSignMesh);

    const cyberSignLight = new THREE.PointLight(0x00f0ff, 1.1, 5.0);
    cyberSignLight.position.set(0, 1.2, 0.3);
    backWallGroup.add(cyberSignLight);

    scene.add(backWallGroup);

    // 2. Far End Service Counter (Quầy Thu Ngân)
    const counterGroup = new THREE.Group();
    counterGroup.position.set(0.4, 0, -5.2);

    // Counter Base (Dark walnut front with bevel)
    const counterBaseMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.55 });
    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.02, 0.8), counterBaseMat);
    counterBase.position.set(0, 0.51, 0);
    counterGroup.add(counterBase);

    // Polished Black Quartz Countertop
    const counterTopMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.35 });
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 0.88), counterTopMat);
    counterTop.position.set(0, 1.04, 0);
    counterGroup.add(counterTop);

    // Cyan LED Underglow Strip along bottom of counter
    const counterLed = new THREE.Mesh(
      new THREE.BoxGeometry(2.78, 0.02, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    counterLed.position.set(0, 0.02, 0.41);
    counterGroup.add(counterLed);

    // POS Cashier Computer Monitor & Customer Display
    const posScreenCanvas = document.createElement('canvas');
    posScreenCanvas.width = 256;
    posScreenCanvas.height = 180;
    const posCtx = posScreenCanvas.getContext('2d');
    if (posCtx) {
      posCtx.fillStyle = '#0f172a';
      posCtx.fillRect(0, 0, 256, 180);
      posCtx.fillStyle = '#38bdf8';
      posCtx.font = 'bold 20px sans-serif';
      posCtx.textAlign = 'center';
      posCtx.fillText('QUẦY THU NGÂN', 128, 45);
      posCtx.fillStyle = '#10b981';
      posCtx.font = 'bold 16px monospace';
      posCtx.fillText('HỆ THỐNG SẴN SÀNG', 128, 85);
      posCtx.fillStyle = '#f59e0b';
      posCtx.fillText('NẠP GIỜ / GỌI MÓN', 128, 130);
    }
    const posTex = new THREE.CanvasTexture(posScreenCanvas);
    const posBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.28, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x090d16 })
    );
    posBack.position.set(0.2, 1.25, 0.12);
    counterGroup.add(posBack);

    const posMonitor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.26),
      new THREE.MeshBasicMaterial({
        map: posTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    posMonitor.position.set(0.2, 1.25, 0.15);
    counterGroup.add(posMonitor);

    // VietQR Payment Stand (Mã QR thanh toán Momo / Ngân hàng)
    const qrStandCanvas = document.createElement('canvas');
    qrStandCanvas.width = 128;
    qrStandCanvas.height = 160;
    const qrCtx = qrStandCanvas.getContext('2d');
    if (qrCtx) {
      qrCtx.fillStyle = '#ffffff';
      qrCtx.fillRect(0, 0, 128, 160);
      qrCtx.fillStyle = '#ec4899';
      qrCtx.fillRect(0, 0, 128, 32);
      qrCtx.fillStyle = '#ffffff';
      qrCtx.font = 'bold 12px sans-serif';
      qrCtx.textAlign = 'center';
      qrCtx.fillText('VIETQR / MOMO', 64, 22);

      // Fake QR pattern
      qrCtx.fillStyle = '#000000';
      qrCtx.fillRect(24, 45, 80, 80);
      qrCtx.fillStyle = '#ffffff';
      qrCtx.fillRect(36, 57, 56, 56);
      qrCtx.fillStyle = '#000000';
      qrCtx.fillRect(48, 69, 32, 32);

      qrCtx.font = 'bold 10px sans-serif';
      qrCtx.fillText('QUÉT MÃ NẠP TIỀN', 64, 145);
    }
    const qrTex = new THREE.CanvasTexture(qrStandCanvas);
    const qrStand = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.22),
      new THREE.MeshBasicMaterial({
        map: qrTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    qrStand.position.set(-0.55, 1.20, 0.28);
    qrStand.rotation.x = -0.15;
    counterGroup.add(qrStand);

    // Warm Counter Task Light
    const counterLight = new THREE.PointLight(0xffedd5, 1.0, 4.0);
    counterLight.position.set(0, 2.1, 0);
    counterGroup.add(counterLight);

    scene.add(counterGroup);

    // 3. Wooden Snack & Instant Noodle Shelves (Kệ Mì Tôm & Bánh Snack)
    const snackShelvesGroup = new THREE.Group();
    snackShelvesGroup.position.set(-2.6, 0, -5.6);

    const shelfWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.65 });
    const shelfSideL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.4), shelfWoodMat);
    shelfSideL.position.set(-0.8, 1.1, 0);
    snackShelvesGroup.add(shelfSideL);

    const shelfSideR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.4), shelfWoodMat);
    shelfSideR.position.set(0.8, 1.1, 0);
    snackShelvesGroup.add(shelfSideR);

    // 4 Horizontal Shelves
    [0.45, 0.95, 1.45, 1.95].forEach((sy, tierIdx) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.04, 0.38), shelfWoodMat);
      plank.position.set(0, sy, 0);
      snackShelvesGroup.add(plank);

      // Stock items on shelves
      if (tierIdx === 0 || tierIdx === 1) {
        // Instant Noodle Cups (Hảo Hảo, Omachi, Indomie, Cung Đình)
        const noodleColors = [0xef4444, 0xf97316, 0xec4899, 0x10b981, 0xeab308];
        for (let nx = -0.65; nx <= 0.65; nx += 0.22) {
          const nCupMat = new THREE.MeshStandardMaterial({
            color: noodleColors[Math.floor(Math.abs(nx * 10)) % noodleColors.length],
            roughness: 0.4,
          });
          const nCup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.12, 12), nCupMat);
          nCup.position.set(nx, sy + 0.08, 0.05);
          snackShelvesGroup.add(nCup);

          const nCup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.12, 12), nCupMat);
          nCup2.position.set(nx, sy + 0.08, -0.07);
          snackShelvesGroup.add(nCup2);
        }
      } else {
        // Snack Bags (Oishi, Lay's, Bim Bim)
        const snackColors = [0xfacc15, 0xef4444, 0x3b82f6, 0x10b981];
        for (let sx = -0.62; sx <= 0.62; sx += 0.25) {
          const sBagMat = new THREE.MeshStandardMaterial({
            color: snackColors[Math.floor(Math.abs(sx * 8)) % snackColors.length],
            roughness: 0.35,
          });
          const sBag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.06), sBagMat);
          sBag.position.set(sx, sy + 0.11, 0.02);
          sBag.rotation.x = -0.15;
          snackShelvesGroup.add(sBag);
        }
      }
    });

    // Stainless Steel Hot Water Dispenser (Bình đun nước sôi pha mì tôm)
    const dispenserGroup = new THREE.Group();
    dispenserGroup.position.set(-1.45, 1.05, -5.2);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const dispBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 16), steelMat);
    dispBody.position.set(0, 0.21, 0);
    dispenserGroup.add(dispBody);

    const redFaucet = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redFaucet.position.set(-0.04, 0.12, 0.15);
    dispenserGroup.add(redFaucet);

    const blueFaucet = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    blueFaucet.position.set(0.04, 0.12, 0.15);
    dispenserGroup.add(blueFaucet);

    scene.add(dispenserGroup);
    scene.add(snackShelvesGroup);

    // 4. Brightly Lit Glass-Door Beverage Refrigerator (Tủ Mát Nước Ngọt)
    const coolerGroup = new THREE.Group();
    coolerGroup.position.set(2.8, 0, -5.5);

    // Cooler Cabinet
    const coolerCabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const coolerCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.3, 0.72), coolerCabMat);
    coolerCabinet.position.set(0, 1.15, 0);
    coolerGroup.add(coolerCabinet);

    // Top Illuminated Header (Light box)
    const coolerHeaderCanvas = document.createElement('canvas');
    coolerHeaderCanvas.width = 384;
    coolerHeaderCanvas.height = 96;
    const chCtx = coolerHeaderCanvas.getContext('2d');
    if (chCtx) {
      chCtx.fillStyle = '#0284c7';
      chCtx.fillRect(0, 0, 384, 96);
      chCtx.fillStyle = '#ffffff';
      chCtx.font = 'bold 26px sans-serif';
      chCtx.textAlign = 'center';
      chCtx.fillText('BEVERAGES & ENERGY', 192, 45);
      chCtx.fillStyle = '#f59e0b';
      chCtx.font = 'bold 18px monospace';
      chCtx.fillText('ICE COLD • STING • MONSTER', 192, 75);
    }
    const coolerHeaderTex = new THREE.CanvasTexture(coolerHeaderCanvas);
    const coolerHeader = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 0.28),
      new THREE.MeshBasicMaterial({ map: coolerHeaderTex })
    );
    coolerHeader.position.set(0, 2.12, 0.365);
    coolerGroup.add(coolerHeader);

    // Transparent Glass Door with Chrome Frame
    const coolerGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      metalness: 0.1,
    });
    const coolerGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.7), coolerGlassMat);
    coolerGlass.position.set(0, 1.05, 0.365);
    coolerGroup.add(coolerGlass);

    // Chrome Door Pull Handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
    const coolerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), handleMat);
    coolerHandle.position.set(-0.52, 1.1, 0.39);
    coolerGroup.add(coolerHandle);

    // Bright Interior Cold LED Light
    const coolerInteriorLight = new THREE.PointLight(0xffffff, 1.5, 3.2);
    coolerInteriorLight.position.set(0, 1.2, 0.15);
    coolerGroup.add(coolerInteriorLight);

    // 4 Shelves inside Refrigerator with Vietnamese Cyber Cafe Drinks
    const drinkColors = [
      0xef4444, // Sting Dâu (Red)
      0xeab308, // Sting Vàng / Red Bull (Gold)
      0x10b981, // Monster Energy (Green)
      0x3b82f6, // Pepsi / Pocari (Blue)
      0x0284c7, // Aquafina (Sky Blue)
    ];

    [0.4, 0.8, 1.2, 1.6].forEach(dy => {
      const wireShelf = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.02, 0.58), steelMat);
      wireShelf.position.set(0, dy, 0);
      coolerGroup.add(wireShelf);

      // Stack rows of cans / bottles
      for (let rx = -0.48; rx <= 0.48; rx += 0.16) {
        const dColor = drinkColors[Math.floor(Math.abs(rx * 6 + dy * 3)) % drinkColors.length];
        const canMat = new THREE.MeshStandardMaterial({ color: dColor, metalness: 0.7, roughness: 0.25 });

        // Front drink can
        const can1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), canMat);
        can1.position.set(rx, dy + 0.09, 0.18);
        coolerGroup.add(can1);

        // Back drink can
        const can2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), canMat);
        can2.position.set(rx, dy + 0.09, 0.02);
        coolerGroup.add(can2);
      }
    });

    scene.add(coolerGroup);

    // 5. Front Entrance Wall (at z = 5.0)
    const frontWallGroup = new THREE.Group();
    frontWallGroup.position.set(0, 1.9, 5.05);

    const frontWallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x222a38, roughness: 0.82 })
    );
    frontWallMesh.rotation.y = Math.PI;
    frontWallGroup.add(frontWallMesh);

    // Double Glass Entrance Doors with Metal Trim
    const doorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.5),
      new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, roughness: 0.1 })
    );
    doorGlass.position.set(0, -0.65, -0.05);
    doorGlass.rotation.y = Math.PI;
    frontWallGroup.add(doorGlass);

    // Neon Green "LỐI RA / EXIT" Signboard above Entrance Doors
    const exitCanvas = document.createElement('canvas');
    exitCanvas.width = 256;
    exitCanvas.height = 96;
    const exCtx = exitCanvas.getContext('2d');
    if (exCtx) {
      exCtx.fillStyle = '#064e3b';
      exCtx.fillRect(0, 0, 256, 96);
      exCtx.strokeStyle = '#22c55e';
      exCtx.lineWidth = 4;
      exCtx.strokeRect(4, 4, 248, 88);

      exCtx.fillStyle = '#22c55e';
      exCtx.font = 'bold 32px sans-serif';
      exCtx.textAlign = 'center';
      exCtx.fillText('LỐI RA • EXIT', 128, 58);
    }
    const exitTex = new THREE.CanvasTexture(exitCanvas);
    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.32),
      new THREE.MeshBasicMaterial({
        map: exitTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    exitSign.position.set(0, 0.85, -0.08);
    exitSign.rotation.y = Math.PI;
    frontWallGroup.add(exitSign);

    const exitLight = new THREE.PointLight(0x22c55e, 0.9, 3.2);
    exitLight.position.set(0, 0.85, -0.25);
    frontWallGroup.add(exitLight);

    scene.add(frontWallGroup);

    // --- GAME SCREEN MATERIALS ---
    const createScreenCanvas = (stationId: number) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 320;
      const ctx = c.getContext('2d');
      if (ctx) {
        // Dark cyberpunk battlefield scene
        ctx.fillStyle = '#090d18';
        ctx.fillRect(0, 0, 512, 320);

        // Top match HUD
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, 512, 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`CYBER STRIKE ONLINE • MÁY 0${stationId}`, 20, 28);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('RANK: THÁCH ĐẤU • 240 FPS', 320, 28);

        // Minimap radar in top-right
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(440, 110, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshair reticle
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(256, 160, 16, 0, Math.PI * 2);
        ctx.moveTo(256, 135); ctx.lineTo(256, 185);
        ctx.moveTo(231, 160); ctx.lineTo(281, 160);
        ctx.stroke();

        // Bottom Combat HUD (Health & Ammo)
        ctx.fillStyle = '#10b981';
        ctx.fillRect(40, 260, 160, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('100 HP | 100 AP', 50, 278);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('30 / 90 [AK-47]', 340, 280);
      }
      return c;
    };

    const screenOffMat = new THREE.MeshStandardMaterial({ color: 0x05070d, roughness: 0.1 });

    // --- HIGH-END 3D BATTLESTATION BUILDER ---
    // Curved monitors, RGB PC cases, Mechanical keyboards, Desk mats, Ergonomic gaming chairs
    const buildStation = (id: number, name: string, posX: number, posZ: number): StationUpgradeState => {
      const group = new THREE.Group();
      group.position.set(posX, 0, posZ);

      // 1. Sleek Modern Gaming Desk (Carbon-fiber top & Red LED trim)
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.05, 0.88),
        new THREE.MeshStandardMaterial({ color: 0x161e2e, roughness: 0.35 })
      );
      deskTop.position.set(0, 0.75, 0);
      group.add(deskTop);

      // Front red LED edge trim on desk
      const deskLed = new THREE.Mesh(
        new THREE.BoxGeometry(1.58, 0.015, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      deskLed.position.set(0, 0.75, 0.44);
      group.add(deskLed);

      // Angled black powder-coated steel legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8, roughness: 0.3 });
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.75), legMat);
      legL.position.set(-0.72, 0.375, 0);
      group.add(legL);

      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.75), legMat);
      legR.position.set(0.72, 0.375, 0);
      group.add(legR);

      // 2. Large Red-and-Black Desk Mat
      const matMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const deskMatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.006, 0.44), matMat);
      deskMatMesh.position.set(0, 0.778, 0.05);
      group.add(deskMatMesh);

      const matBorder = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.004, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      matBorder.position.set(0, 0.776, 0.05);
      group.add(matBorder);

      // 3. Mechanical Keyboard with RGB Backlighting
      const kbdGroup = new THREE.Group();
      kbdGroup.position.set(-0.06, 0.785, 0.05);

      const kbdBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.015, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.7 })
      );
      kbdGroup.add(kbdBase);

      const kbdKeys = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.012, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
      );
      kbdKeys.position.set(0, 0.01, 0);
      kbdGroup.add(kbdKeys);

      const kbdRgb = new THREE.Mesh(
        new THREE.BoxGeometry(0.43, 0.005, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
      );
      kbdRgb.position.set(0, 0.006, 0);
      kbdGroup.add(kbdRgb);
      group.add(kbdGroup);

      // 4. Ergonomic Gaming Mouse with RGB Scroll Wheel
      const mouseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.024, 0.11),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 })
      );
      mouseMesh.position.set(0.28, 0.792, 0.05);
      group.add(mouseMesh);

      const mouseLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.008, 0.03),
        new THREE.MeshBasicMaterial({ color: 0xd946ef })
      );
      mouseLed.position.set(0.28, 0.804, 0.04);
      group.add(mouseLed);

      // 5. Gaming Headset resting on Stand
      const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8), legMat);
      standPole.position.set(-0.62, 0.94, -0.15);
      group.add(standPole);

      const headsetBand = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      headsetBand.rotation.x = Math.PI;
      headsetBand.position.set(-0.62, 1.08, -0.15);
      group.add(headsetBand);

      // 6. Large Curved Gaming Monitor
      const monitorGroup = new THREE.Group();
      monitorGroup.position.set(0, 1.15, -0.22);

      // V-shaped Metal Gaming Stand & Neck
      const standV = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.22), legMat);
      standV.position.set(0, -0.37, 0.06);
      monitorGroup.add(standV);

      const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.05), legMat);
      standNeck.position.set(0, -0.18, 0);
      monitorGroup.add(standNeck);

      // Curved Screen Multi-Segment Frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.85, roughness: 0.2 });
      const centerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.03), frameMat);
      monitorGroup.add(centerFrame);

      const leftFrameWing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.03), frameMat);
      leftFrameWing.position.set(-0.36, 0, 0.03);
      leftFrameWing.rotation.y = 0.22;
      monitorGroup.add(leftFrameWing);

      const rightFrameWing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.03), frameMat);
      rightFrameWing.position.set(0.36, 0, 0.03);
      rightFrameWing.rotation.y = -0.22;
      monitorGroup.add(rightFrameWing);

      // Curved Screen Displays
      const sCanvas = createScreenCanvas(id);
      const sTex = new THREE.CanvasTexture(sCanvas);
      const screenOnMat = new THREE.MeshBasicMaterial({ map: sTex });

      const centerScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.48), screenOffMat);
      centerScreen.position.set(0, 0, 0.016);
      monitorGroup.add(centerScreen);

      const leftScreenWing = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.48), screenOffMat);
      leftScreenWing.position.set(-0.35, 0, 0.046);
      leftScreenWing.rotation.y = 0.22;
      monitorGroup.add(leftScreenWing);

      const rightScreenWing = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.48), screenOffMat);
      rightScreenWing.position.set(0.35, 0, 0.046);
      rightScreenWing.rotation.y = -0.22;
      monitorGroup.add(rightScreenWing);

      // Ambient screen glow light
      const screenLight = new THREE.PointLight(0x00f0ff, 0, 3.8);
      screenLight.position.set(0, 0, 0.3);
      monitorGroup.add(screenLight);

      group.add(monitorGroup);

      // 7. High-End Gaming PC Case (Transparent glass side panel & Glowing RGB fans & GPU)
      const pcGroup = new THREE.Group();
      pcGroup.position.set(0.62, 1.02, 0);

      // PC Chassis Frame
      const pcChassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.52, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.85, roughness: 0.2 })
      );
      pcGroup.add(pcChassis);

      // Left Transparent Tempered Glass Panel
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.32,
        roughness: 0.05,
        metalness: 0.1,
      });
      const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.48, 0.46), glassMat);
      glassPanel.position.set(-0.126, 0, 0);
      pcGroup.add(glassPanel);

      // 3 Front RGB Intake Fans (Vertical trio of glowing rings matching image.png)
      const fanRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const fanInnerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      for (let f = 0; f < 3; f++) {
        const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.014, 8, 20), fanRingMat);
        fanRing.position.set(0, -0.15 + f * 0.15, 0.252);
        pcGroup.add(fanRing);

        const fanCenter = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), fanInnerMat);
        fanCenter.position.set(0, -0.15 + f * 0.15, 0.252);
        pcGroup.add(fanCenter);
      }

      // Internal GPU (Graphics Card with glowing GEFORCE RTX side logo)
      const gpuBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.28), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
      gpuBody.position.set(-0.04, -0.05, 0);
      pcGroup.add(gpuBody);

      const gpuLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.025, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.5 })
      );
      gpuLed.position.set(-0.08, -0.05, 0);
      pcGroup.add(gpuLed);

      // Dual RGB RAM Sticks
      const ramLed1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.012), new THREE.MeshBasicMaterial({ color: 0xd946ef }));
      ramLed1.position.set(-0.04, 0.14, -0.06);
      pcGroup.add(ramLed1);

      const ramLed2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.012), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      ramLed2.position.set(-0.04, 0.14, -0.03);
      pcGroup.add(ramLed2);

      // AIO Liquid CPU Cooler Ring & Sleeved Tubing
      const aioRing = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      aioRing.rotation.y = Math.PI / 2;
      aioRing.position.set(-0.06, 0.08, -0.1);
      pcGroup.add(aioRing);

      group.add(pcGroup);

      // 8. Ergonomic High-Back Gaming Chair (Red & Black Racing Bucket Seat)
      const chairGroup = new THREE.Group();
      chairGroup.position.set(0, 0, 0.65);

      // 5-Star Spider Base at Floor & Caster Wheels
      const spiderMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.2 });
      const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), spiderMat);
      chairBase.position.set(0, 0.06, 0);
      chairGroup.add(chairBase);

      const chairPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), spiderMat);
      chairPiston.position.set(0, 0.25, 0);
      chairGroup.add(chairPiston);

      // Bucket Seat Cushion (Black Center, Red Wings)
      const seatMatBlack = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5 });
      const seatMatRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });

      const seatCenter = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.46), seatMatBlack);
      seatCenter.position.set(0, 0.46, 0);
      chairGroup.add(seatCenter);

      const seatWingL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.46), seatMatRed);
      seatWingL.position.set(-0.22, 0.49, 0);
      seatWingL.rotation.z = -0.15;
      chairGroup.add(seatWingL);

      const seatWingR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.46), seatMatRed);
      seatWingR.position.set(0.22, 0.49, 0);
      seatWingR.rotation.z = 0.15;
      chairGroup.add(seatWingR);

      // Racing High Backrest with Shoulders & Harness Cutouts
      const backGroup = new THREE.Group();
      backGroup.position.set(0, 0.52, 0.20);
      backGroup.rotation.x = 0.08;

      const backCenter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.07), seatMatBlack);
      backCenter.position.set(0, 0.36, 0);
      backGroup.add(backCenter);

      const backWingL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.65, 0.07), seatMatRed);
      backWingL.position.set(-0.21, 0.34, 0.02);
      backWingL.rotation.y = -0.25;
      backGroup.add(backWingL);

      const backWingR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.65, 0.07), seatMatRed);
      backWingR.position.set(0.21, 0.34, 0.02);
      backWingR.rotation.y = 0.25;
      backGroup.add(backWingR);

      // Red Neck Pillow at Headrest
      const neckPillow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.07), seatMatRed);
      neckPillow.position.set(0, 0.64, 0.04);
      backGroup.add(neckPillow);

      // Red Lumbar Cushion
      const lumbarPillow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), seatMatRed);
      lumbarPillow.position.set(0, 0.12, 0.04);
      backGroup.add(lumbarPillow);

      chairGroup.add(backGroup);

      // 3D Padded Armrests
      [-0.24, 0.24].forEach(armX => {
        const armPole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.04), spiderMat);
        armPole.position.set(armX, 0.55, 0);
        chairGroup.add(armPole);

        const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.24), seatMatBlack);
        armPad.position.set(armX, 0.66, 0.02);
        chairGroup.add(armPad);
      });

      group.add(chairGroup);
      scene.add(group);

      return {
        id,
        name,
        position: new THREE.Vector3(posX, 1.0, posZ),
        sitPoint: new THREE.Vector3(posX, 0, posZ + 0.65),
        isOccupied: false,
        timeRemaining: 0,
        currentCustomerType: '',
        totalEarnedFromStation: 0,
        monitorLevel: 1,
        gpuLevel: 1,
        ramLevel: 1,
        stationGroup: group,
        screenMesh: centerScreen,
        monitorFrameMesh: centerFrame,
        screenLight: screenLight,
        pcCaseLedMesh: gpuLed,
        screenOnMat: screenOnMat,
        screenOffMat: screenOffMat,
        screenWingMeshes: [leftScreenWing, rightScreenWing],
      };
    };

    // SYMMETRICAL TWO-ROW CYBER LAYOUT WITH CLEAR CENTRAL AISLE
    // Left Row: 3 Battlestations (x = -2.2)
    // Right Row: 3 Battlestations (x = +2.2)
    stationsRef.current = [
      buildStation(1, 'Máy 01', -2.2, -2.8),
      buildStation(2, 'Máy 02', -2.2, -0.9),
      buildStation(3, 'Máy 03', -2.2, 1.0),
      buildStation(4, 'Máy 04', 2.2, -2.8),
      buildStation(5, 'Máy 05', 2.2, -0.9),
      buildStation(6, 'Máy 06', 2.2, 1.0),
    ];

    buildStationRef.current = buildStation;
    gamingBuiltRef.current = false;
    setSceneVersion(v => v + 1);

    // --- OBJECT COLLIDERS & RIGIDBODY HITBOX SYSTEM ---
    // Precise bounding box colliders for walls, service counter, rule board, snack shelves, cooler, and stations
    const colliders: { name: string; min: THREE.Vector3; max: THREE.Vector3 }[] = [
      // 1. Boundary Walls
      { name: 'LeftWall', min: new THREE.Vector3(-5.0, 0, -6.5), max: new THREE.Vector3(-3.85, 4.0, 5.5) },
      { name: 'RightWall', min: new THREE.Vector3(3.85, 0, -6.5), max: new THREE.Vector3(5.0, 4.0, 5.5) },
      { name: 'RuleBoardBuffer', min: new THREE.Vector3(3.70, 0, 2.05), max: new THREE.Vector3(4.30, 4.0, 4.15) },
      { name: 'BackWall', min: new THREE.Vector3(-4.5, 0, -6.5), max: new THREE.Vector3(4.5, 4.0, -5.9) },
      { name: 'FrontEntranceWall', min: new THREE.Vector3(-4.5, 0, 4.82), max: new THREE.Vector3(4.5, 4.0, 6.0) },

      // 2. Far End Service Area Colliders
      { name: 'ServiceCounter', min: new THREE.Vector3(-1.15, 0, -5.75), max: new THREE.Vector3(1.95, 1.4, -4.68) },
      { name: 'SnackShelves', min: new THREE.Vector3(-3.8, 0, -6.0), max: new THREE.Vector3(-1.25, 2.5, -4.85) },
      { name: 'BeverageCooler', min: new THREE.Vector3(2.05, 0, -6.0), max: new THREE.Vector3(3.75, 2.5, -4.95) },

      // 3. Waiting Area
      { name: 'WaitingChairs', min: new THREE.Vector3(-3.95, 0, 2.0), max: new THREE.Vector3(-3.15, 1.2, 4.4) },

      // 4. Battlestations - Left Row (Máy 01, 02, 03)
      { name: 'Station01', min: new THREE.Vector3(-3.05, 0, -3.35), max: new THREE.Vector3(-1.35, 1.8, -1.95) },
      { name: 'Station02', min: new THREE.Vector3(-3.05, 0, -1.45), max: new THREE.Vector3(-1.35, 1.8, -0.05) },
      { name: 'Station03', min: new THREE.Vector3(-3.05, 0, 0.45), max: new THREE.Vector3(-1.35, 1.8, 1.85) },

      // 5. Battlestations - Right Row (Máy 04, 05, 06)
      { name: 'Station04', min: new THREE.Vector3(1.35, 0, -3.35), max: new THREE.Vector3(3.05, 1.8, -1.95) },
      { name: 'Station05', min: new THREE.Vector3(1.35, 0, -1.45), max: new THREE.Vector3(3.05, 1.8, -0.05) },
      { name: 'Station06', min: new THREE.Vector3(1.35, 0, 0.45), max: new THREE.Vector3(3.05, 1.8, 1.85) },
    ];

    collidersRef.current = colliders;

    // Player Capsule / Cylinder Hitbox Radius (28cm buffer prevents any near-plane clipping)
    const PLAYER_HITBOX_RADIUS = 0.28;

    const resolvePlayerCollision = (currentPos: THREE.Vector3): THREE.Vector3 => {
      let x = currentPos.x;
      let z = currentPos.z;

      for (let iter = 0; iter < 3; iter++) {
        for (const col of colliders) {
          const closestX = Math.max(col.min.x, Math.min(x, col.max.x));
          const closestZ = Math.max(col.min.z, Math.min(z, col.max.z));

          const dx = x - closestX;
          const dz = z - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < PLAYER_HITBOX_RADIUS * PLAYER_HITBOX_RADIUS) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = PLAYER_HITBOX_RADIUS - dist;
              x += (dx / dist) * overlap;
              z += (dz / dist) * overlap;
            } else {
              // Deep inside: push out along nearest collider face
              const dLeft = Math.abs(x - col.min.x);
              const dRight = Math.abs(col.max.x - x);
              const dNear = Math.abs(z - col.min.z);
              const dFar = Math.abs(col.max.z - z);
              const minD = Math.min(dLeft, dRight, dNear, dFar);
              if (minD === dLeft) x = col.min.x - PLAYER_HITBOX_RADIUS;
              else if (minD === dRight) x = col.max.x + PLAYER_HITBOX_RADIUS;
              else if (minD === dNear) z = col.min.z - PLAYER_HITBOX_RADIUS;
              else z = col.max.z + PLAYER_HITBOX_RADIUS;
            }
          }
        }
      }

      // Hard room safety bounds
      x = Math.max(-3.7, Math.min(3.7, x));
      z = Math.max(-5.8, Math.min(4.75, z));

      return new THREE.Vector3(x, currentPos.y, z);
    };

    let lastTime = performance.now();
    let spawnTimer = 0;

    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Animate Industrial Ceiling Fans
      for (const fan of ceilingFansList) {
        fan.rotation.y += delta * 2.6;
      }

      // 1. Move Player throughout the Cyber Game Hall with Rigidbody/Capsule Collision
      const speed = 2.8;
      const move = moveInputRef.current;
      if (move.forward !== 0 || move.strafe !== 0) {
        const sin = Math.sin(playerYawRef.current);
        const cos = Math.cos(playerYawRef.current);
        const dirX = -sin * move.forward + cos * move.strafe;
        const dirZ = -cos * move.forward - sin * move.strafe;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
        if (len > 0.001) {
          const stepX = (dirX / len) * speed * delta;
          const stepZ = (dirZ / len) * speed * delta;

          // Continuous sliding collision resolution (Decomposed X and Z steps)
          let currentPos = playerPosRef.current.clone();

          // Step X & resolve
          currentPos.x += stepX;
          currentPos = resolvePlayerCollision(currentPos);

          // Step Z & resolve
          currentPos.z += stepZ;
          currentPos = resolvePlayerCollision(currentPos);

          playerPosRef.current.copy(currentPos);
        }
      }

      if (cameraRef.current) {
        cameraRef.current.position.copy(playerPosRef.current);
        const euler = new THREE.Euler(playerPitchRef.current, playerYawRef.current, 0, 'YXZ');
        cameraRef.current.quaternion.setFromEuler(euler);
      }

      // 2. Waiting Queue
      for (const waitingCust of customersRef.current) {
        if (waitingCust.state === 'waiting') {
          waitingCust.waitTimeSeconds += delta;

          if (waitingCust.waitTimeSeconds > 3 && waitingCust.waitTimePenalty === 0) {
            waitingCust.waitTimePenalty = -10;
            const updated = calculateSatisfactionCore(
              null,
              waitingCust.waitTimeSeconds,
              internetPlanRef.current,
              acEnabledRef.current,
              foodServiceRef.current,
              pricingPolicyRef.current,
              waitingCust.foodExtra,
              waitingCust.expectationScore
            );
            Object.assign(waitingCust, updated);
            triggerPopup(`Chờ lâu: ${waitingCust.waitTimePenalty}đ!`, waitingCust.mesh?.position || playerPosRef.current, '#f43f5e');
          }

          const freePC = stationsRef.current.find(s => !s.isOccupied);
          if (freePC) {
            freePC.isOccupied = true;
            freePC.currentCustomerId = waitingCust.id;
            waitingCust.targetStationId = freePC.id;
            waitingCust.state = 'walking';

            addLog(`[Hàng Đợi] ${freePC.name} đã trống! 1 ${waitingCust.name} bước vào máy.`);
            triggerPopup('Có máy trống rồi!', waitingCust.mesh?.position || playerPosRef.current, '#38bdf8');
          } else if (waitingCust.waitTimeSeconds > engineRef.current.queuePatience()) {
            waitingCust.state = 'leaving';
            engineRef.current.recordWalkout();
            engineRef.current.recordReview(1);
            waitingCust.finalScore = Math.max(5, waitingCust.finalScore - 30);
            waitingCust.emoji = '😡';
            waitingCust.tierLabel = 'Very Unhappy';
            waitingCust.stars = 1;
            waitingCust.returnChance = 2;

            if (waitingCust.mesh) {
              // Đứng dậy từ ghế chờ bước ra lối đi và xoay mặt ra cửa
              waitingCust.mesh.position.set(-2.0, 0, 3.2);
              waitingCust.mesh.lookAt(0, 0, 4.8);
            }
            animateCustomerLimbs(waitingCust, 0, 'leaving');

            addLog(`[Hàng Đợi] Chờ quá 18s! 1 ${waitingCust.name} bực tức đứng dậy bỏ về (😡 1 sao)`);
            triggerPopup('Chờ lâu quá! Bỏ về! 😡', waitingCust.mesh?.position || playerPosRef.current, '#f43f5e');
            syncToParent();
          }
        }
      }

      // 3. Customer movement, leaving & limb procedural animations
      for (const cust of [...customersRef.current]) {
        animateCustomerLimbs(cust, delta, cust.state);

        if (cust.state === 'leaving' && cust.mesh) {
          const exitDoor = new THREE.Vector3(0, 0, 4.8);
          const dir = exitDoor.clone().sub(cust.mesh.position);
          const distToExit = dir.length();

          if (distToExit > 0.35 && cust.mesh.position.z < 4.7) {
            dir.normalize();
            cust.mesh.position.add(dir.multiplyScalar(delta * 2.2));
            cust.mesh.lookAt(exitDoor.x, cust.mesh.position.y, exitDoor.z);
          } else {
            // Khách đã bước qua cửa ra ngoài tiệm net!
            if (sceneRef.current && cust.mesh) {
              sceneRef.current.remove(cust.mesh);
            }
            customersRef.current = customersRef.current.filter(c => c.id !== cust.id);
            syncToParent();
          }
        }

        if (cust.state === 'walking' && cust.targetStationId) {
          const st = stationsRef.current.find(s => s.id === cust.targetStationId);
          if (st && cust.mesh) {
            const target = st.sitPoint;
            const dir = target.clone().sub(cust.mesh.position);
            const dist = dir.length();

            if (dist > 0.1) {
              dir.normalize();
              cust.mesh.position.add(dir.multiplyScalar(delta * 2.2));
              cust.mesh.lookAt(target.x, cust.mesh.position.y, target.z);
            } else {
              cust.state = 'playing';
              cust.mesh.visible = true;
              cust.mesh.position.set(st.position.x, 0, st.position.z + 0.65);
              cust.mesh.rotation.set(0, Math.PI, 0);
              animateCustomerLimbs(cust, 0, 'playing');

              // Lên lịch các lần gọi đồ trong buổi chơi (dựa trên loại khách, giờ chơi, giờ trong ngày)
              const sessionSeconds = cust.hours * 8;
              cust.orderFractions = engineRef.current
                .planOrders(cust.type, cust.hours, sessionSeconds)
                .map(t => t / sessionSeconds);
              cust.foodExtra = engineRef.current.hygieneModifier();

              const satResult = calculateSatisfactionCore(
                st,
                cust.waitTimeSeconds,
                internetPlanRef.current,
                acEnabledRef.current,
                foodServiceRef.current,
                pricingPolicyRef.current,
                cust.foodExtra,
                cust.expectationScore
              );
              Object.assign(cust, satResult);

              const earnings = engineRef.current.rentalRevenue(cust.hours, cust.pricePerHour);
              st.timeRemaining = cust.hours * 8;
              st.currentCustomerType = cust.name;
              st.totalEarnedFromStation += earnings;

              if (st.screenMesh && st.screenOnMat) st.screenMesh.material = st.screenOnMat;
              if (st.screenWingMeshes && st.screenOnMat) {
                st.screenWingMeshes.forEach(w => { w.material = st.screenOnMat!; });
              }
              if (st.screenLight) st.screenLight.intensity = 1.6;

              engineRef.current.recordCustomerStart(earnings);
              if (onMoneyEarnedRef.current) onMoneyEarnedRef.current(earnings);
              soundController.playCashChime();
              triggerPopup(`+${earnings.toLocaleString('vi-VN')} đ • ${satResult.emoji} ${satResult.finalScore}đ`, st.position);
              addLog(`[${st.name}] ${cust.name} bắt đầu chơi! Điểm hài lòng: ${satResult.emoji} ${satResult.finalScore}đ (${satResult.stars}⭐)`);
              syncToParent();
            }
          }
        }
      }

      // 4. Station countdown
      for (const st of stationsRef.current) {
        if (st.isOccupied && st.timeRemaining > 0) {
          const speedMultiplier = 1.0 + (st.ramLevel - 1) * 0.2;
          st.timeRemaining -= delta * speedMultiplier;

          if (st.timeRemaining <= 0) {
            st.isOccupied = false;
            st.timeRemaining = 0;
            st.currentCustomerType = '';
            if (st.screenMesh && st.screenOffMat) st.screenMesh.material = st.screenOffMat;
            if (st.screenWingMeshes && st.screenOffMat) {
              st.screenWingMeshes.forEach(w => { w.material = st.screenOffMat!; });
            }
            if (st.screenLight) st.screenLight.intensity = 0;

            const cust = customersRef.current.find(c => c.targetStationId === st.id);
            if (cust) {
              let reviewText = 'Quán chơi mượt, mạng nhanh, điều hòa lạnh toát!';
              if (cust.finalScore >= 80) {
                reviewText = 'Máy cấu hình cực khủng, combat không tụt fps! Sẽ quay lại thường xuyên.';
              } else if (cust.finalScore >= 60) {
                reviewText = 'Quán ổn áp, chơi game mượt, giá cả hợp lý.';
              } else if (cust.finalScore >= 40) {
                reviewText = 'Tạm được, máy hơi bình thường, cần nâng cấp thêm VGA.';
              } else {
                reviewText = 'Mạng hơi lag, phải chờ đợi lâu, không hài lòng!';
              }
              if (cust.ordersFailed > 0) {
                reviewText = `Gọi đồ mà quán hết hàng ${cust.ordersFailed} lần! ${reviewText}`;
              } else if (cust.ordersServed > 0 && cust.finalScore >= 60) {
                reviewText = `Đồ ăn nước uống phục vụ nhanh. ${reviewText}`;
              }

              const newReview: CustomerSatisfactionBreakdown = {
                id: String(Date.now() + Math.random()),
                customerName: cust.name,
                customerType: cust.type === 'HocSinh' ? 'Học Sinh' : cust.type === 'GameThu' ? 'Game Thủ' : 'Khách VIP',
                stationName: st.name,
                baseScore: cust.baseScore,
                computerQualityScore: cust.computerQualityScore,
                ramLevel: st.ramLevel,
                vgaLevel: st.gpuLevel,
                monitorLevel: st.monitorLevel,
                priceScore: cust.priceScore,
                waitTimePenalty: cust.waitTimePenalty,
                internetBonus: cust.internetBonus,
                acBonus: cust.acBonus,
                foodBonus: cust.foodBonus,
                finalScore: cust.finalScore,
                tier: cust.tier,
                emoji: cust.emoji,
                tierLabel: cust.tierLabel,
                stars: cust.stars,
                returnChance: cust.returnChance,
                reviewComment: reviewText,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              };

              engineRef.current.recordReview(cust.stars);
              engineRef.current.recordCustomerLeft();
              setRecentReviews(prev => [newReview, ...prev.slice(0, 9)]);
              recentReviewsRef.current = [newReview, ...recentReviewsRef.current.slice(0, 9)];
              triggerPopup(`${cust.emoji} Đánh giá ${cust.stars}⭐: ${cust.finalScore}đ!`, st.position, '#f59e0b');
              addLog(`[${st.name}] ${cust.name} chơi xong (${cust.emoji} ${cust.stars}⭐), đứng lên đi ra cửa về.`);

              // Khách đứng lên khỏi ghế và bắt đầu đi ra cửa!
              cust.state = 'leaving';
              cust.targetStationId = null;
              if (cust.mesh) {
                // Đứng dậy, lùi ra khỏi bàn ghế vào lối đi trung tâm
                const aisleX = st.position.x > 0 ? 0.4 : -0.4;
                cust.mesh.position.set(aisleX, 0, st.position.z + 0.95);
                // Xoay mặt hướng thẳng ra cửa chính
                cust.mesh.lookAt(0, 0, 4.8);
              }
              animateCustomerLimbs(cust, 0, 'leaving');
              syncToParent();
            }
          }
        }
      }

      // 4b. Khách đang chơi gọi đồ ăn / nước theo lịch đã lên
      for (const cust of customersRef.current) {
        if (cust.state !== 'playing' || cust.orderFractions.length === 0) continue;
        const st = stationsRef.current.find(s => s.id === cust.targetStationId);
        if (!st) continue;
        const total = cust.hours * 8;
        const progress = (total - st.timeRemaining) / total;
        while (cust.orderFractions.length > 0 && cust.orderFractions[0] <= progress) {
          cust.orderFractions.shift();
          handleCustomerOrder(cust, st);
        }
      }

      // 5. Update direct DOM Badges (Zero setState in loop)
      if (cameraRef.current && mountRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;

        const activeEntities = customersRef.current.filter(
          c => c.mesh && (c.state === 'playing' || c.state === 'waiting' || c.state === 'walking' || c.state === 'leaving')
        );

        for (let i = 0; i < 6; i++) {
          const el = badgeRefs.current[i];
          if (!el) continue;

          const cust = activeEntities[i];
          if (cust && cust.mesh) {
            const headY = cust.state === 'playing' || cust.state === 'waiting' ? 1.55 : 1.82;
            const headPos = cust.mesh.position.clone().add(new THREE.Vector3(0, headY, 0));
            headPos.project(cameraRef.current);

            const isVisible = headPos.z < 1 && headPos.z > -1;
            if (isVisible) {
              const x = ((headPos.x + 1) * w) / 2;
              const y = ((-headPos.y + 1) * h) / 2;

              el.style.display = 'flex';
              el.style.left = `${x}px`;
              el.style.top = `${y}px`;

              const emojiEl = el.querySelector('.badge-emoji');
              if (emojiEl) emojiEl.textContent = cust.emoji;

              const scoreEl = el.querySelector('.badge-score');
              if (scoreEl) scoreEl.textContent = `${cust.finalScore}đ`;

              const starsEl = el.querySelector('.badge-stars');
              if (starsEl) starsEl.textContent = '★'.repeat(cust.stars);

              const waitEl = el.querySelector('.badge-wait') as HTMLElement;
              if (waitEl) {
                if (cust.state === 'waiting') {
                  waitEl.style.display = 'inline-block';
                  waitEl.textContent = 'Đang chờ';
                  waitEl.className = 'badge-wait text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-semibold';
                } else if (cust.state === 'leaving') {
                  waitEl.style.display = 'inline-block';
                  waitEl.textContent = 'Đi về 🚪';
                  waitEl.className = 'badge-wait text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded font-semibold';
                } else {
                  waitEl.style.display = 'none';
                }
              }
            } else {
              el.style.display = 'none';
            }
          } else {
            el.style.display = 'none';
          }
        }
      }

      // 6. Spawn Countdown (Updates state only when integer second changes)
      const eng = engineRef.current;
      eng.tick(delta); // đồng hồ ngày + phát sự kiện cập nhật giao diện
      if (stationsRef.current.length > 0) {
        let q = 0;
        for (const stn of stationsRef.current) q += stn.ramLevel * 2 + stn.gpuLevel * 3 + stn.monitorLevel * 2;
        eng.reportFleet(stationsRef.current.length, q / stationsRef.current.length);
      }

      const spawnInterval = eng.spawnIntervalSec();
      if (eng.isOpen()) spawnTimer += delta;
      const remainingSec = eng.isOpen() ? Math.max(0, Math.ceil(spawnInterval - spawnTimer)) : 0;
      if (remainingSec !== lastCountdownSecRef.current) {
        lastCountdownSecRef.current = remainingSec;
        setCustomerSpawnCountdown(remainingSec);
      }

      // Tiệm mở cửa: khách đến theo nhịp phụ thuộc mặt bằng, danh tiếng, giờ cao điểm
      if (eng.isOpen() && spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnCustomer();
      }

      // 7. Distance Check (< 2m, Updates state only when target station changes)
      let closestStation: StationUpgradeState | null = null;
      let minDistance = Infinity;

      for (const st of stationsRef.current) {
        const dist = playerPosRef.current.distanceTo(st.position);
        if (dist <= configRef.current.interactDistance && dist < minDistance) {
          minDistance = dist;
          closestStation = st;
        }
      }

      const currentStationId = closestStation ? closestStation.id : null;
      if (currentStationId !== lastPromptStationIdRef.current) {
        lastPromptStationIdRef.current = currentStationId;
        if (closestStation) {
          setActiveStationPrompt({
            stationId: closestStation.id,
            distance: parseFloat(minDistance.toFixed(2)),
          });
        } else {
          setActiveStationPrompt(null);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, []); // Strictly empty dependency array

  // Đồng bộ công tắc môi trường sang engine (ảnh hưởng chi phí mạng/điều hòa và giá thuê)
  useEffect(() => {
    engine.setEnvironment({ internetPlan, acEnabled, foodService, pricingPolicy });
  }, [engine, internetPlan, acEnabled, foodService, pricingPolicy]);

  useEffect(() => {
    setUpgradeNotice('');
  }, [selectedUpgradeStation?.id]);

  // Mở Khu Gaming -> xây thêm 2 máy cấu hình cao (Máy 07, 08) vào mô phỏng 3D
  useEffect(() => {
    if (!game.zones.gaming || gamingBuiltRef.current) return;
    const build = buildStationRef.current;
    const cols = collidersRef.current;
    if (!build || !cols) return;
    gamingBuiltRef.current = true;
    const slots = [
      { id: 7, name: 'Máy 07 (Gaming)', x: -2.2, z: 2.9 },
      { id: 8, name: 'Máy 08 (Gaming)', x: 2.2, z: 2.9 },
    ];
    for (const slot of slots) {
      if (stationsRef.current.some(s => s.id === slot.id)) continue;
      const st = build(slot.id, slot.name, slot.x, slot.z);
      st.monitorLevel = 2;
      st.gpuLevel = 2;
      st.ramLevel = 2;
      if (st.monitorFrameMesh) st.monitorFrameMesh.scale.set(1.18, 1, 1);
      if (st.screenMesh) st.screenMesh.scale.set(1.18, 1, 1);
      if (st.pcCaseLedMesh) {
        const ledMat = st.pcCaseLedMesh.material as THREE.MeshStandardMaterial;
        if (ledMat) {
          ledMat.emissive = new THREE.Color(0x3b82f6);
          ledMat.emissiveIntensity = 2.5;
        }
      }
      stationsRef.current.push(st);
      cols.push({
        name: `Station0${slot.id}`,
        min: new THREE.Vector3(slot.x - 0.85, 0, slot.z - 0.55),
        max: new THREE.Vector3(slot.x + 0.85, 1.8, slot.z + 0.85),
      });
    }
    addLog('🎮 Khu Gaming đã mở: thêm Máy 07 & 08 cấu hình cao!');
  }, [game.zones.gaming, sceneVersion, addLog]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          moveInputRef.current.forward = 1;
          break;
        case 's':
        case 'arrowdown':
          moveInputRef.current.forward = -1;
          break;
        case 'a':
        case 'arrowleft':
          moveInputRef.current.strafe = -1;
          break;
        case 'd':
        case 'arrowright':
          moveInputRef.current.strafe = 1;
          break;
        case configRef.current.interactKey.toLowerCase():
          e.preventDefault();
          if (selectedUpgradeStationRef.current) {
            setSelectedUpgradeStation(null);
          } else if (lastPromptStationIdRef.current) {
            const st = stationsRef.current.find(s => s.id === lastPromptStationIdRef.current);
            if (st) setSelectedUpgradeStation({ ...st });
          }
          break;
        case 'escape':
          setSelectedUpgradeStation(null);
          setInspectCustomer(null);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 's':
        case 'arrowup':
        case 'arrowdown':
          moveInputRef.current.forward = 0;
          break;
        case 'a':
        case 'd':
        case 'arrowleft':
        case 'arrowright':
          moveInputRef.current.strafe = 0;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Strictly empty dependency array

  // Pointer controls
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - lastPointerPosRef.current.x;
    const dy = e.clientY - lastPointerPosRef.current.y;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

    playerYawRef.current -= dx * 0.0035;
    playerPitchRef.current -= dy * 0.0035;
    playerPitchRef.current = Math.max(-1.2, Math.min(1.2, playerPitchRef.current));
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handleBadgeSlotClick = (slotIdx: number) => {
    const activeEntities = customersRef.current.filter(
      c => c.mesh && (c.state === 'playing' || c.state === 'waiting' || c.state === 'walking')
    );
    const cust = activeEntities[slotIdx];
    if (cust) {
      setInspectCustomer({ ...cust });
    }
  };

  const openUpgradeModal = () => {
    if (activeStationPrompt) {
      const st = stationsRef.current.find(s => s.id === activeStationPrompt.stationId);
      if (st) setSelectedUpgradeStation({ ...st });
    }
  };

  const stockWarnings = engine.stockWarnings();
  const lastReport = game.history[0];

  return (
    <div className="relative w-full h-[620px] md:h-[680px] bg-slate-950 rounded-xl overflow-hidden select-none border border-slate-800 shadow-2xl">
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* OVERHEAD 3D CUSTOMER SATISFACTION BADGES (Direct DOM update, Zero React state updates) */}
      <div ref={badgesContainerRef} className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map(idx => (
          <div
            key={idx}
            ref={el => { badgeRefs.current[idx] = el; }}
            style={{ display: 'none', position: 'absolute' }}
            onClick={() => handleBadgeSlotClick(idx)}
            className="transform -translate-x-1/2 -translate-y-full pointer-events-auto bg-slate-950/90 border border-emerald-500/50 hover:border-emerald-400 hover:scale-110 active:scale-95 transition-transform text-white rounded-full px-2.5 py-1 shadow-xl flex items-center gap-1.5 cursor-pointer backdrop-blur-sm group select-none"
            title="Bấm để xem chi tiết cách tính điểm hài lòng"
          >
            <span className="badge-emoji text-base">😍</span>
            <span className="badge-score text-xs font-mono font-bold text-emerald-400">70đ</span>
            <span className="badge-stars text-[10px] text-amber-400 font-bold">★★★★★</span>
            <span className="badge-wait text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-semibold hidden">
              Đang chờ
            </span>
          </div>
        ))}
      </div>

      {/* Floating Cash / Notification Popups */}
      {floatingPopups.map(popup => (
        <div
          key={popup.id}
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full font-bold text-lg md:text-xl drop-shadow-md flex items-center gap-1 animate-bounce z-30"
          style={{
            left: `${popup.x}px`,
            top: `${popup.y}px`,
            color: popup.color || '#34d399',
            opacity: popup.opacity,
          }}
        >
          <Sparkles className="w-4 h-4" />
          <span>{popup.text}</span>
        </div>
      ))}

      {/* Reticle */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            activeStationPrompt
              ? 'bg-emerald-400 ring-4 ring-emerald-500/40 scale-150'
              : 'bg-white/60 ring-2 ring-black/40'
          }`}
        />
      </div>

      {/* TOP HUD: Money & Quick Spawn */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            đ
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Quỹ Quán (MoneyManager)
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {totalMoney.toLocaleString('vi-VN')} {config.currencySymbol}
            </div>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={spawnCustomer}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            title="Sinh ngay 1 khách hàng đến quán"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{game.phase === 'open' ? `Gọi Khách (${customerSpawnCountdown}s)` : 'Tiệm đóng cửa'}</span>
          </button>

          <button
            onClick={() => setIsMobileMode(!isMobileMode)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              isMobileMode
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isMobileMode ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
            <span>{isMobileMode ? 'Mobile' : 'PC'}</span>
          </button>

          <button
            onClick={() => { playerPosRef.current.set(0, 1.6, 2.7); }}
            className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Đặt lại vị trí nhân vật"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUICK ENVIRONMENT CONTROLS TOOLBAR */}
      <div className="absolute top-20 left-4 right-4 pointer-events-auto z-20 flex flex-wrap items-center gap-2">
        {/* NGÀY / GIỜ / MỞ-ĐÓNG TIỆM / CẢNH BÁO KHO */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 text-xs shadow-lg">
          <div className="px-2 flex items-center gap-1.5 font-mono font-bold text-white">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Ngày {game.day} • {formatHour(game.hour)}</span>
          </div>
          {game.phase === 'open' ? (
            <button
              onClick={() => engine.closeShop()}
              className="px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 bg-rose-700/80 hover:bg-rose-600 text-white"
              title="Đóng cửa sớm và chốt sổ ngày hôm nay"
            >
              <DoorClosed className="w-3 h-3" />
              <span>Đóng cửa</span>
            </button>
          ) : (
            <button
              onClick={() => engine.openShop()}
              disabled={game.phase === 'bankrupt'}
              className="px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
            >
              <DoorOpen className="w-3 h-3" />
              <span>Mở tiệm</span>
            </button>
          )}
          <div className="px-1.5 text-amber-400 font-bold" title="Đánh giá trung bình 40 khách gần nhất">
            ★ {engine.rating().toFixed(1)}
          </div>
          {stockWarnings.length > 0 && (
            <button
              onClick={onOpenManagement}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                stockWarnings[0].status === 'out' ? 'bg-rose-900/80 text-rose-200' : 'bg-amber-900/70 text-amber-200'
              }`}
              title={stockWarnings.map(w => `${w.label} ${w.text}`).join('\n')}
            >
              <Package className="w-3 h-3" />
              <span>
                {stockWarnings[0].label} {stockWarnings[0].text}
                {stockWarnings.length > 1 ? ` (+${stockWarnings.length - 1})` : ''}
              </span>
            </button>
          )}
          {onOpenManagement && (
            <button
              onClick={onOpenManagement}
              className="px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 bg-indigo-600/80 hover:bg-indigo-500 text-white"
            >
              <Store className="w-3 h-3" />
              <span>Quản lý tiệm</span>
            </button>
          )}
        </div>

        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 text-xs shadow-lg">
          <div className="text-[10px] font-bold text-slate-400 uppercase px-2 flex items-center gap-1">
            <Smile className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tác Nhân Hài Lòng:</span>
          </div>

          <button
            onClick={() => updateEnvironment('internet')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
              internetPlan === 'gigabit'
                ? 'bg-sky-600/80 text-white'
                : internetPlan === 'normal'
                ? 'bg-slate-800 text-slate-200'
                : 'bg-rose-900/80 text-rose-200'
            }`}
            title="Bấm để đổi gói cước mạng"
          >
            <Wifi className="w-3 h-3" />
            <span>Mạng: {internetPlan === 'gigabit' ? '1Gbps (+10)' : internetPlan === 'normal' ? 'Thường (+5)' : 'Lag (-15)'}</span>
          </button>

          <button
            onClick={() => updateEnvironment('ac')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
              acEnabled ? 'bg-teal-600/80 text-white' : 'bg-slate-800 text-rose-300'
            }`}
            title="Bật/Tắt điều hòa nhiệt độ"
          >
            <Wind className="w-3 h-3" />
            <span>Điều Hòa: {acEnabled ? '22°C (+8)' : 'Tắt (-10)'}</span>
          </button>

          <button
            onClick={() => updateEnvironment('food')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
              foodService ? 'bg-amber-600/80 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Bật/Tắt phục vụ mì cay & nước"
          >
            <Coffee className="w-3 h-3" />
            <span>Đồ Ăn: {foodService ? 'Có (+10)' : 'Không (0)'}</span>
          </button>

          <button
            onClick={() => updateEnvironment('price')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
              pricingPolicy === 'cheap'
                ? 'bg-emerald-600/80 text-white'
                : pricingPolicy === 'standard'
                ? 'bg-slate-800 text-slate-200'
                : 'bg-rose-900/80 text-rose-200'
            }`}
            title="Đổi chính sách giá giờ chơi"
          >
            <span>Giá: {pricingPolicy === 'cheap' ? 'Rẻ (+10)' : pricingPolicy === 'standard' ? 'Chuẩn (+5)' : 'Đắt (-10)'}</span>
          </button>
        </div>
      </div>

      {/* RECENT CUSTOMER LOGS BADGE */}
      <div className="absolute bottom-16 left-4 hidden md:block max-w-sm pointer-events-none z-20">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nhật Ký Cửa &amp; Hàng Đợi (WaitingQueue)</span>
          </div>
          {customerLogs.slice(0, 3).map((log, idx) => (
            <div key={idx} className="text-[11px] truncate text-slate-300">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* TIỆM ĐANG ĐÓNG CỬA: chuẩn bị ngày mới */}
      {game.phase === 'closed' && !selectedUpgradeStation && !inspectCustomer && (
        <div className="absolute inset-x-0 top-40 flex justify-center pointer-events-none z-30 px-4">
          <div className="pointer-events-auto bg-slate-950/95 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl max-w-md w-full space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-white">🌅 Ngày {game.day} • Tiệm chưa mở cửa</div>
              <div className="text-[10px] text-slate-400">{engine.location.emoji} {engine.location.name}</div>
            </div>
            {lastReport && lastReport.day === game.day - 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 font-mono">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Báo cáo ngày {lastReport.day}
                </div>
                <div className="flex justify-between"><span className="text-slate-400">Thuê máy</span><span className="text-emerald-400">+{formatMoney(lastReport.rentalRevenue)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Đồ ăn & nước</span><span className="text-amber-400">+{formatMoney(lastReport.foodRevenue)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Giá vốn</span><span className="text-rose-400">-{formatMoney(lastReport.costOfGoods)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Thuê mặt bằng + lương + điện nước</span><span className="text-rose-400">-{formatMoney(lastReport.rent + lastReport.salaries + lastReport.utilities)}</span></div>
                {lastReport.branchNet !== 0 && (
                  <div className="flex justify-between"><span className="text-slate-400">Chi nhánh</span><span className={lastReport.branchNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{lastReport.branchNet >= 0 ? '+' : ''}{formatMoney(lastReport.branchNet)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
                  <span className="text-white">Lợi nhuận</span>
                  <span className={lastReport.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{lastReport.netProfit >= 0 ? '+' : ''}{formatMoney(lastReport.netProfit)}</span>
                </div>
              </div>
            )}
            <div className="text-slate-400 leading-relaxed">
              Kiểm tra kho và giá trước khi mở. Chi phí cố định hôm nay: <strong className="text-slate-200">{formatMoney(engine.dailyCosts().total)}</strong>.
            </div>
            <div className="flex gap-2">
              <button onClick={() => engine.openShop()} className="flex-1 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5">
                <DoorOpen className="w-4 h-4" /> Mở tiệm
              </button>
              {onOpenManagement && (
                <button onClick={onOpenManagement} className="flex-1 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5">
                  <Store className="w-4 h-4" /> Nhập hàng & quản lý
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {game.phase === 'bankrupt' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
            <div className="text-4xl">💀</div>
            <div className="text-lg font-black text-white">Tiệm phá sản!</div>
            <p className="text-xs text-slate-400">Nợ vượt quá giới hạn cho phép. Hãy thử lại với chiến lược chi tiêu thận trọng hơn.</p>
            <button onClick={() => engine.reset()} className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white">Chơi lại từ đầu</button>
          </div>
        </div>
      )}

      {game.won && !wonDismissed && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-400/60 rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
            <div className="text-5xl">🏆</div>
            <div className="text-lg font-black text-amber-300">Ông chủ Cyber Game lớn nhất!</div>
            <p className="text-xs text-slate-300">Bạn đã mở Cyber Gaming, có {engine.shopCount()} cơ sở, đánh giá {engine.rating().toFixed(1)}★ và thị phần {Math.round(engine.marketShare() * 100)}%.</p>
            <button onClick={() => { setWonDismissed(true); engine.continueAfterWin(); }} className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-900">Tiếp tục mở rộng đế chế</button>
          </div>
        </div>
      )}

      {/* CENTER INTERACTION PROMPT: Khi < 2m */}
      {activeStationPrompt && !selectedUpgradeStation && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
          <button
            onClick={openUpgradeModal}
            className="bg-slate-950/95 border-2 border-emerald-400/80 backdrop-blur-md rounded-2xl px-6 py-3.5 shadow-2xl flex items-center gap-3.5 hover:scale-105 active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs uppercase font-semibold text-emerald-400">
                Bàn Máy 0{activeStationPrompt.stationId} • Cự ly: {activeStationPrompt.distance}m
              </div>
              <div className="text-sm md:text-base font-bold text-white flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-xs border border-slate-700">
                  [{config.interactKey}]
                </span>
                <span>Nâng Cấp Linh Kiện &rarr; Tăng Điểm Hài Lòng Khách</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* CUSTOMER SATISFACTION INSPECT MODAL */}
      {inspectCustomer && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{inspectCustomer.emoji}</span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Chi Tiết Điểm Hài Lòng: {inspectCustomer.name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {inspectCustomer.state === 'waiting' ? 'Đang trong hàng đợi' : 'Đang ngồi chơi máy tính'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectCustomer(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Điểm khởi điểm (Base):</span>
                <span className="text-white font-bold">{inspectCustomer.baseScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chất lượng máy (RAM, VGA, Màn):</span>
                <span className="text-sky-400 font-bold">+{inspectCustomer.computerQualityScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giá thuê máy:</span>
                <span className={inspectCustomer.priceScore >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {inspectCustomer.priceScore >= 0 ? `+${inspectCustomer.priceScore}` : inspectCustomer.priceScore}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian chờ (Queue):</span>
                <span className={inspectCustomer.waitTimePenalty < 0 ? 'text-rose-400 font-bold' : 'text-slate-500 font-bold'}>
                  {inspectCustomer.waitTimePenalty}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chất lượng mạng Internet:</span>
                <span className={inspectCustomer.internetBonus >= 0 ? 'text-sky-400 font-bold' : 'text-rose-400 font-bold'}>
                  {inspectCustomer.internetBonus >= 0 ? `+${inspectCustomer.internetBonus}` : inspectCustomer.internetBonus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Điều hòa nhiệt độ:</span>
                <span className={inspectCustomer.acBonus >= 0 ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                  {inspectCustomer.acBonus >= 0 ? `+${inspectCustomer.acBonus}` : inspectCustomer.acBonus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đồ ăn, nước &amp; vệ sinh:</span>
                <span className={inspectCustomer.foodBonus > 0 ? 'text-amber-400 font-bold' : inspectCustomer.foodBonus < 0 ? 'text-rose-400 font-bold' : 'text-slate-500 font-bold'}>
                  {inspectCustomer.foodBonus > 0 ? `+${inspectCustomer.foodBonus}` : inspectCustomer.foodBonus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kỳ vọng &amp; tâm trạng ({inspectCustomer.name}):</span>
                <span className="text-rose-400 font-bold">{inspectCustomer.expectationScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đã gọi đồ (phục vụ / hết hàng):</span>
                <span className="text-slate-200 font-bold">{inspectCustomer.ordersServed} / {inspectCustomer.ordersFailed} • {formatMoney(inspectCustomer.foodSpent)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold font-sans">
                <span className="text-white">TỔNG ĐIỂM:</span>
                <span className="text-emerald-400 font-mono text-base">{inspectCustomer.finalScore} / 100</span>
              </div>
            </div>

            {/* Customer Outfits & Limbs Style */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                <Shirt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {inspectCustomer.outfitName || 'Trang Phục 3D & Phụ Kiện'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {inspectCustomer.outfitDetails || 'Tay chân cử động linh hoạt, quần áo & giày sneaker'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Trạng thái: </span>
                <span className="font-bold text-white">{inspectCustomer.tierLabel}</span>
              </div>
              <div className="text-amber-400 font-bold">
                {'★'.repeat(inspectCustomer.stars)} ({inspectCustomer.stars} sao)
              </div>
            </div>

            <button
              onClick={() => setInspectCustomer(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Đóng Chi Tiết
            </button>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL POPUP */}
      {selectedUpgradeStation && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs uppercase font-semibold text-emerald-400">
                  Hệ Thống Nâng Cấp Bàn Máy Tính (Cấp 1 &rarr; 5)
                </div>
                <h3 className="text-lg font-black text-white">
                  Cấu Hình &amp; Điểm Hài Lòng: {selectedUpgradeStation.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedUpgradeStation(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-slate-400 font-semibold">Linh kiện trong kho:</span>
                <span className={(game.stock['part_ram'] ?? 0) > 0 ? 'text-slate-200' : 'text-rose-400 font-bold'}>🧠 RAM ×{game.stock['part_ram'] ?? 0}</span>
                <span className={(game.stock['part_vga'] ?? 0) > 0 ? 'text-slate-200' : 'text-rose-400 font-bold'}>🎮 VGA ×{game.stock['part_vga'] ?? 0}</span>
                <span className={(game.stock['part_monitor'] ?? 0) > 0 ? 'text-slate-200' : 'text-rose-400 font-bold'}>🖥️ Màn ×{game.stock['part_monitor'] ?? 0}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Mỗi lần nâng cấp tốn 1 bộ linh kiện + tiền công
                {costMult < 1 ? ` (đã giảm ${Math.round((1 - costMult) * 100)}% nhờ Kỹ Thuật Viên)` : ''}. Nhập thêm tại tab Kho.
              </div>
              {upgradeNotice && <div className="text-rose-400 font-semibold">⚠ {upgradeNotice}</div>}
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Điểm Chất Lượng Máy: </span>
                <span className="text-sky-400 font-mono font-bold text-sm">
                  +{selectedUpgradeStation.ramLevel * 2 + selectedUpgradeStation.gpuLevel * 3 + selectedUpgradeStation.monitorLevel * 2} Điểm
                </span>
              </div>
              <div className="text-emerald-400 font-mono text-[11px]">
                RAM &times; 2 + VGA &times; 3 + Màn &times; 2
              </div>
            </div>

            <div className="space-y-3">
              {/* 1. MONITOR */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Màn Hình (Monitor Level {selectedUpgradeStation.monitorLevel}/5)</div>
                    <div className="text-sm font-bold text-white">
                      {monitorNames[selectedUpgradeStation.monitorLevel - 1]}
                    </div>
                    <div className="text-[11px] text-sky-400">
                      Điểm cộng hài lòng: +{selectedUpgradeStation.monitorLevel * 2} điểm
                    </div>
                  </div>
                </div>

                {selectedUpgradeStation.monitorLevel < 5 ? (
                  <button
                    onClick={() => handleUpgrade('monitor')}
                    disabled={totalMoney < upgradePrices.monitor[selectedUpgradeStation.monitorLevel]}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      totalMoney >= upgradePrices.monitor[selectedUpgradeStation.monitorLevel]
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Lên Cấp {selectedUpgradeStation.monitorLevel + 1}
                    <div className="text-[10px] font-mono">
                      {upgradePrices.monitor[selectedUpgradeStation.monitorLevel].toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                    MAX LEVEL
                  </span>
                )}
              </div>

              {/* 2. GPU */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Card Đồ Họa (GPU Level {selectedUpgradeStation.gpuLevel}/5)</div>
                    <div className="text-sm font-bold text-white">
                      {gpuNames[selectedUpgradeStation.gpuLevel - 1]}
                    </div>
                    <div className="text-[11px] text-purple-400">
                      Điểm cộng hài lòng: +{selectedUpgradeStation.gpuLevel * 3} điểm
                    </div>
                  </div>
                </div>

                {selectedUpgradeStation.gpuLevel < 5 ? (
                  <button
                    onClick={() => handleUpgrade('gpu')}
                    disabled={totalMoney < upgradePrices.gpu[selectedUpgradeStation.gpuLevel]}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      totalMoney >= upgradePrices.gpu[selectedUpgradeStation.gpuLevel]
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Lên Cấp {selectedUpgradeStation.gpuLevel + 1}
                    <div className="text-[10px] font-mono">
                      {upgradePrices.gpu[selectedUpgradeStation.gpuLevel].toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                    MAX LEVEL
                  </span>
                )}
              </div>

              {/* 3. RAM */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Bộ Nhớ RAM (RAM Level {selectedUpgradeStation.ramLevel}/5)</div>
                    <div className="text-sm font-bold text-white">
                      {ramNames[selectedUpgradeStation.ramLevel - 1]}
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      Điểm cộng hài lòng: +{selectedUpgradeStation.ramLevel * 2} điểm
                    </div>
                  </div>
                </div>

                {selectedUpgradeStation.ramLevel < 5 ? (
                  <button
                    onClick={() => handleUpgrade('ram')}
                    disabled={totalMoney < upgradePrices.ram[selectedUpgradeStation.ramLevel]}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      totalMoney >= upgradePrices.ram[selectedUpgradeStation.ramLevel]
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Lên Cấp {selectedUpgradeStation.ramLevel + 1}
                    <div className="text-[10px] font-mono">
                      {upgradePrices.ram[selectedUpgradeStation.ramLevel].toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                    MAX LEVEL
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedUpgradeStation(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Đóng Menu [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile touch controls */}
      {isMobileMode && (
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between pointer-events-auto z-30">
          <div className="bg-slate-900/85 backdrop-blur-md p-2 rounded-2xl border border-slate-800 grid grid-cols-3 gap-1 w-32 h-32 touch-none">
            <div />
            <button
              onPointerDown={() => { moveInputRef.current.forward = 1; }}
              onPointerUp={() => { moveInputRef.current.forward = 0; }}
              className="bg-slate-800 active:bg-emerald-600 rounded-lg text-white font-bold flex items-center justify-center text-xs"
            >
              ▲
            </button>
            <div />
            <button
              onPointerDown={() => { moveInputRef.current.strafe = -1; }}
              onPointerUp={() => { moveInputRef.current.strafe = 0; }}
              className="bg-slate-800 active:bg-emerald-600 rounded-lg text-white font-bold flex items-center justify-center text-xs"
            >
              ◀
            </button>
            <div className="bg-slate-950/60 rounded-lg flex items-center justify-center text-[9px] text-slate-500">
              MOVE
            </div>
            <button
              onPointerDown={() => { moveInputRef.current.strafe = 1; }}
              onPointerUp={() => { moveInputRef.current.strafe = 0; }}
              className="bg-slate-800 active:bg-emerald-600 rounded-lg text-white font-bold flex items-center justify-center text-xs"
            >
              ▶
            </button>
            <div />
            <button
              onPointerDown={() => { moveInputRef.current.forward = -1; }}
              onPointerUp={() => { moveInputRef.current.forward = 0; }}
              className="bg-slate-800 active:bg-emerald-600 rounded-lg text-white font-bold flex items-center justify-center text-xs"
            >
              ▼
            </button>
            <div />
          </div>

          <button
            onClick={openUpgradeModal}
            disabled={!activeStationPrompt}
            className={`w-20 h-20 rounded-full font-bold flex flex-col items-center justify-center shadow-2xl transition-all ${
              activeStationPrompt
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white ring-4 ring-emerald-400/50 scale-105 active:scale-95'
                : 'bg-slate-800/60 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            <Cpu className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] uppercase">NÂNG CẤP</span>
          </button>
        </div>
      )}

      {/* Bottom hint bar */}
      {!isMobileMode && (
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-400 pointer-events-none z-20">
          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center gap-3">
            <span>
              Di chuyển: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">W A S D</kbd>
            </span>
            <span>·</span>
            <span>
              Lại gần bàn: bấm <kbd className="px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono">[{config.interactKey}]</kbd> để Nâng Cấp Máy
            </span>
            <span>·</span>
            <span className="text-emerald-400">
              Click vào badge cảm xúc trên đầu khách để xem phiếu tính điểm!
            </span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 text-emerald-400 font-mono">
            Hàng Đợi + Điểm Khởi Điểm: 70đ
          </div>
        </div>
      )}
    </div>
  );
};
