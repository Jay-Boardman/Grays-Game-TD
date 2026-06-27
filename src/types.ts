/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export enum WeaponType {
  FISTS = 'FISTS',
  DAGGER = 'DAGGER',
  WOODEN_CLUB = 'WOODEN_CLUB',
  IRON_SWORD = 'IRON_SWORD',
  MACE = 'MACE',
  BATTLEAXE = 'BATTLEAXE',
  SHIELD = 'SHIELD'
}

export interface WeaponStats {
  type: WeaponType;
  name: string;
  damage: number;
  reach: number;
  cooldown: number; // in milliseconds
  impactForce: number; // physically pushes enemies back
  swingWeight: number; // high weight has slower swing, bigger physical impact
  color: string;
  metalness: number;
  roughness: number;
}

export const WEAPON_REGISTRY: Record<WeaponType, WeaponStats> = {
  [WeaponType.FISTS]: {
    type: WeaponType.FISTS,
    name: "Bare Fists",
    damage: 8,
    reach: 1.2,
    cooldown: 350,
    impactForce: 3.5,
    swingWeight: 0.2,
    color: "#ffdbac",
    metalness: 0.0,
    roughness: 0.8
  },
  [WeaponType.DAGGER]: {
    type: WeaponType.DAGGER,
    name: "Assassin's Dagger",
    damage: 15,
    reach: 1.4,
    cooldown: 250,
    impactForce: 2.0,
    swingWeight: 0.15,
    color: "#8a95a5",
    metalness: 0.9,
    roughness: 0.2
  },
  [WeaponType.WOODEN_CLUB]: {
    type: WeaponType.WOODEN_CLUB,
    name: "Spiked Wooden Club",
    damage: 22,
    reach: 1.8,
    cooldown: 600,
    impactForce: 7.0,
    swingWeight: 0.6,
    color: "#8b5a2b",
    metalness: 0.1,
    roughness: 0.9
  },
  [WeaponType.IRON_SWORD]: {
    type: WeaponType.IRON_SWORD,
    name: "Soldier's Broadsword",
    damage: 28,
    reach: 2.1,
    cooldown: 500,
    impactForce: 6.0,
    swingWeight: 0.5,
    color: "#c0c0c0",
    metalness: 0.9,
    roughness: 0.1
  },
  [WeaponType.MACE]: {
    type: WeaponType.MACE,
    name: "Flanged Steel Mace",
    damage: 35,
    reach: 1.9,
    cooldown: 700,
    impactForce: 9.5,
    swingWeight: 0.8,
    color: "#708090",
    metalness: 0.95,
    roughness: 0.3
  },
  [WeaponType.BATTLEAXE]: {
    type: WeaponType.BATTLEAXE,
    name: "Double-Headed Greataxe",
    damage: 48,
    reach: 2.3,
    cooldown: 900,
    impactForce: 12.0,
    swingWeight: 0.95,
    color: "#4f5d73",
    metalness: 0.85,
    roughness: 0.4
  },
  [WeaponType.SHIELD]: {
    type: WeaponType.SHIELD,
    name: "Knight's Iron Shield",
    damage: 12,
    reach: 1.5,
    cooldown: 500,
    impactForce: 8.0,
    swingWeight: 0.7,
    color: "#4682b4",
    metalness: 0.8,
    roughness: 0.3
  }
};

export enum EnemyType {
  SKELETON = 'SKELETON',
  ARMORED_KNIGHT = 'ARMORED_KNIGHT',
  TOWER_GUARD = 'TOWER_GUARD',
  ORC_BERSERKER = 'ORC_BERSERKER',
  BOSS_WARDEN = 'BOSS_WARDEN',
  BOSS_GOLEM = 'BOSS_GOLEM',
  BOSS_NECROMANCER = 'BOSS_NECROMANCER'
}

export interface EnemyStats {
  type: EnemyType;
  name: string;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  attackCooldown: number;
  attackReach: number;
  weaponType: WeaponType;
  points: number;
  scale: number;
  color: string;
}

export const ENEMY_REGISTRY: Record<EnemyType, EnemyStats> = {
  [EnemyType.SKELETON]: {
    type: EnemyType.SKELETON,
    name: "Skeleton Grunt",
    maxHealth: 40,
    speed: 1.8,
    attackDamage: 10,
    attackCooldown: 1200,
    attackReach: 1.5,
    weaponType: WeaponType.DAGGER,
    points: 100,
    scale: 0.9,
    color: "#dfdcd6"
  },
  [EnemyType.ARMORED_KNIGHT]: {
    type: EnemyType.ARMORED_KNIGHT,
    name: "Armored Knight",
    maxHealth: 90,
    speed: 1.3,
    attackDamage: 18,
    attackCooldown: 1500,
    attackReach: 2.0,
    weaponType: WeaponType.IRON_SWORD,
    points: 250,
    scale: 1.05,
    color: "#4a607a"
  },
  [EnemyType.TOWER_GUARD]: {
    type: EnemyType.TOWER_GUARD,
    name: "Tower Watch Guard",
    maxHealth: 130,
    speed: 1.15,
    attackDamage: 22,
    attackCooldown: 1800,
    attackReach: 1.8,
    weaponType: WeaponType.MACE,
    points: 400,
    scale: 1.15,
    color: "#2f4f4f"
  },
  [EnemyType.ORC_BERSERKER]: {
    type: EnemyType.ORC_BERSERKER,
    name: "Orc Berserker",
    maxHealth: 180,
    speed: 1.9,
    attackDamage: 28,
    attackCooldown: 1400,
    attackReach: 2.2,
    weaponType: WeaponType.BATTLEAXE,
    points: 600,
    scale: 1.25,
    color: "#556b2f"
  },
  [EnemyType.BOSS_WARDEN]: {
    type: EnemyType.BOSS_WARDEN,
    name: "The Tower Warden (Boss)",
    maxHealth: 450,
    speed: 1.4,
    attackDamage: 35,
    attackCooldown: 1600,
    attackReach: 2.4,
    weaponType: WeaponType.MACE,
    points: 1500,
    scale: 1.6,
    color: "#7a1a1a"
  },
  [EnemyType.BOSS_GOLEM]: {
    type: EnemyType.BOSS_GOLEM,
    name: "Iron Sentinel Golem (Boss)",
    maxHealth: 700,
    speed: 0.95,
    attackDamage: 45,
    attackCooldown: 2200,
    attackReach: 2.6,
    weaponType: WeaponType.MACE,
    points: 2500,
    scale: 1.9,
    color: "#5c626e"
  },
  [EnemyType.BOSS_NECROMANCER]: {
    type: EnemyType.BOSS_NECROMANCER,
    name: "Sauron's Shadow Archmage (Final Boss)",
    maxHealth: 1000,
    speed: 1.6,
    attackDamage: 55,
    attackCooldown: 1500,
    attackReach: 3.0,
    weaponType: WeaponType.IRON_SWORD,
    points: 5000,
    scale: 1.7,
    color: "#4b0082"
  }
};

export interface PhysicalObject {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  height: number;
  isGrounded: boolean;
  mass: number;
  mesh?: THREE.Object3D;
}

export interface PlayerState extends PhysicalObject {
  health: number;
  maxHealth: number;
  score: number;
  floor: number; // Start at top floor (e.g., 5 or 10), fight down to 1
  leftWeapon: WeaponType;
  rightWeapon: WeaponType;
  isAttackingLeft: boolean;
  isAttackingRight: boolean;
  lastAttackTimeLeft: number;
  lastAttackTimeRight: number;
  immunityUntil: number; // timestamp for damage immunity frames
  kills: number;
}

export interface EnemyInstance extends PhysicalObject {
  type: EnemyType;
  name: string;
  health: number;
  maxHealth: number;
  color: string;
  state: 'idle' | 'chasing' | 'attacking' | 'stunned' | 'dying';
  stunUntil: number;
  attackCooldownUntil: number;
  lastRepathTime: number;
  targetPosition: THREE.Vector3;
  direction: THREE.Vector3;
  weaponType: WeaponType;
  isBoss: boolean;
  scale: number;
  healthBarMesh?: THREE.Object3D;
  bodyMesh?: THREE.Object3D;
  leftHandMesh?: THREE.Object3D;
  rightHandMesh?: THREE.Object3D;
}

export interface DroppedWeapon extends PhysicalObject {
  type: WeaponType;
  rotSpeed: THREE.Vector3;
  bounceHeight: number;
  spawnTime: number;
  isCustomThrown?: boolean;
  thrownDamage?: number;
}

export interface ParticleEffect {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  mesh?: THREE.Points | THREE.Mesh;
}

export interface FloorWave {
  waveNumber: number;
  enemiesToSpawn: EnemyType[];
  completed: boolean;
}

export interface FloorConfig {
  floorNumber: number;
  name: string;
  description: string;
  color: string;
  radius: number; // outer tower bounds
  waves: FloorWave[];
  isBossFloor: boolean;
}

export const TOWER_FLOORS: FloorConfig[] = [
  {
    floorNumber: 5,
    name: "Floor 5: The High Spire Attic",
    description: "You awaken locked at the crown of the tower. Escaped but unarmed, you hear rattling skeletons approaching...",
    color: "#2a2d32",
    radius: 14,
    isBossFloor: false,
    waves: [
      { waveNumber: 1, enemiesToSpawn: [EnemyType.SKELETON, EnemyType.SKELETON], completed: false },
      { waveNumber: 2, enemiesToSpawn: [EnemyType.SKELETON, EnemyType.SKELETON, EnemyType.SKELETON], completed: false }
    ]
  },
  {
    floorNumber: 4,
    name: "Floor 4: Guard Barracks",
    description: "Tower Sentinels patrol this level. Secure their high-quality iron armaments to progress further down.",
    color: "#3a3c42",
    radius: 15,
    isBossFloor: false,
    waves: [
      { waveNumber: 1, enemiesToSpawn: [EnemyType.SKELETON, EnemyType.ARMORED_KNIGHT], completed: false },
      { waveNumber: 2, enemiesToSpawn: [EnemyType.ARMORED_KNIGHT, EnemyType.ARMORED_KNIGHT], completed: false },
      { waveNumber: 3, enemiesToSpawn: [EnemyType.SKELETON, EnemyType.SKELETON, EnemyType.ARMORED_KNIGHT], completed: false }
    ]
  },
  {
    floorNumber: 3,
    name: "Floor 3: Torture Chambers & Warden's Lair",
    description: "The sound of heavy rattling chains and deep laughs echoes. Defeat the giant Tower Warden to unlock the prison floor lift.",
    color: "#441a1a",
    radius: 14,
    isBossFloor: true,
    waves: [
      { waveNumber: 1, enemiesToSpawn: [EnemyType.ARMORED_KNIGHT, EnemyType.TOWER_GUARD], completed: false },
      { waveNumber: 2, enemiesToSpawn: [EnemyType.BOSS_WARDEN], completed: false }
    ]
  },
  {
    floorNumber: 2,
    name: "Floor 2: The Alchemical Library & Vault",
    description: "Violent Orc Berserkers guard the tower treasury. Their heavy axes smash through armor easily.",
    color: "#223e2b",
    radius: 16,
    isBossFloor: false,
    waves: [
      { waveNumber: 1, enemiesToSpawn: [EnemyType.TOWER_GUARD, EnemyType.ORC_BERSERKER], completed: false },
      { waveNumber: 2, enemiesToSpawn: [EnemyType.ORC_BERSERKER, EnemyType.ORC_BERSERKER], completed: false },
      { waveNumber: 3, enemiesToSpawn: [EnemyType.ARMORED_KNIGHT, EnemyType.TOWER_GUARD, EnemyType.ORC_BERSERKER], completed: false }
    ]
  },
  {
    floorNumber: 1,
    name: "Floor 1: The Throne Room (Ground Floor)",
    description: "The Iron Sentinel and the Arch-Necromancer stand in your way to freedom. Defeat them and escape the tower!",
    color: "#1c112e",
    radius: 18,
    isBossFloor: true,
    waves: [
      { waveNumber: 1, enemiesToSpawn: [EnemyType.ORC_BERSERKER, EnemyType.BOSS_GOLEM], completed: false },
      { waveNumber: 2, enemiesToSpawn: [EnemyType.BOSS_NECROMANCER], completed: false }
    ]
  }
];
