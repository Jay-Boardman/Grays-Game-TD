/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  WeaponType, 
  WEAPON_REGISTRY, 
  EnemyType, 
  ENEMY_REGISTRY, 
  PlayerState, 
  EnemyInstance, 
  DroppedWeapon, 
  ParticleEffect, 
  TOWER_FLOORS, 
  FloorConfig 
} from '../types';
import { PhysicsEngine } from '../game/physics';
import { WeaponVisualBuilder } from '../game/weapons';
import { EnemyFactory } from '../game/enemies';
import { Sword, Trophy, Shield, Flame, RotateCcw, Zap, Sparkles, Play } from 'lucide-react';

// --- SOUND SYNTHESIZER (Web Audio API) ---
class GameSoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext is initialized lazily on first user interaction to bypass browser policies
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playWhoosh() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    // Filter to make it sound like a swing
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.12);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playHitPunch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Solid base thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Slap high-frequency impact
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);

    gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start();
    osc2.stop(this.ctx.currentTime + 0.08);
  }

  playClashMetal() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // High pitched metallic bell/chime
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.25);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1450, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(1100, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.35);
    osc2.stop(this.ctx.currentTime + 0.35);

    // Crackle noise impact
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start();
  }

  playDamageVoice() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Grunt
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    // lowpass to sound muffled / throat-like
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playFallenClink() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // weapon bounce
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playTriumphantLevel() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = this.ctx.currentTime;
    playNote(261.63, now, 0.2);       // C4
    playNote(329.63, now + 0.15, 0.2); // E4
    playNote(392.00, now + 0.3, 0.2);  // G4
    playNote(523.25, now + 0.45, 0.6); // C5 (triumphant sustain)
  }

  playCountdownTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

// Global Single Instance of sound module
const sfx = new GameSoundFX();

// --- PROPS ---
interface VRGameCanvasProps {
  onScoreChange: (score: number) => void;
  onKillsChange: (kills: number) => void;
  onFloorChange: (floor: number) => void;
  onHealthChange: (health: number, max: number) => void;
  onGameStateChange: (state: 'menu' | 'playing' | 'gameover' | 'victory') => void;
  activeGameState: 'menu' | 'playing' | 'gameover' | 'victory';
}

export const VRGameCanvas: React.FC<VRGameCanvasProps> = ({
  onScoreChange,
  onKillsChange,
  onFloorChange,
  onHealthChange,
  onGameStateChange,
  activeGameState
}) => {
  // Container Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopId = useRef<number | null>(null);

  // States inside canvas wrapper (for reactive dashboard UI overlay)
  const [currentFloorConfig, setCurrentFloorConfig] = useState<FloorConfig | null>(null);
  const [activeWaveNumber, setActiveWaveNumber] = useState<number>(0);
  const [totalWavesCount, setTotalWavesCount] = useState<number>(0);
  const [enemiesLeftCount, setEnemiesLeftCount] = useState<number>(0);
  const [leftHandWeapon, setLeftHandWeapon] = useState<WeaponType>(WeaponType.FISTS);
  const [rightHandWeapon, setRightHandWeapon] = useState<WeaponType>(WeaponType.FISTS);
  const [isVREnabled, setIsVREnabled] = useState<boolean>(false);
  const [floorTransitionTimer, setFloorTransitionTimer] = useState<number | null>(null);
  const [redFlashActive, setRedFlashActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Core Game Objects (useRefs to avoid trigger React re-render loops at 60fps)
  const playerStateRef = useRef<PlayerState>({
    id: 'player',
    position: new THREE.Vector3(0, 0, 4),
    velocity: new THREE.Vector3(0, 0, 0),
    radius: 0.8,
    height: 1.8,
    isGrounded: true,
    mass: 1.5,
    health: 100,
    maxHealth: 100,
    score: 0,
    floor: 5, // Top Floor
    leftWeapon: WeaponType.FISTS,
    rightWeapon: WeaponType.FISTS,
    isAttackingLeft: false,
    isAttackingRight: false,
    lastAttackTimeLeft: 0,
    lastAttackTimeRight: 0,
    immunityUntil: 0,
    kills: 0
  });

  const enemiesRef = useRef<EnemyInstance[]>([]);
  const droppedWeaponsRef = useRef<DroppedWeapon[]>([]);
  const particlesRef = useRef<ParticleEffect[]>([]);
  const activeWaveIndexRef = useRef<number>(0);
  const isFloorClearingRef = useRef<boolean>(false);
  const floorClearTimeRef = useRef<number>(0);

  // ThreeJS Scene Elements
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const physicsRef = useRef<PhysicsEngine>(new PhysicsEngine());
  const weaponVisualBuilderRef = useRef<WeaponVisualBuilder>(new WeaponVisualBuilder());
  const enemyFactoryRef = useRef<EnemyFactory | null>(null);

  // Visual Groups/Meshes
  const playerLeftHandMeshRef = useRef<THREE.Object3D | null>(null);
  const playerRightHandMeshRef = useRef<THREE.Object3D | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const elevatorGateMeshRef = useRef<THREE.Mesh | null>(null);

  // Desktop First-Person Camera Mouse Drag State
  const cameraRotationRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0)); // Pitch (x) and Yaw (y)
  const isMouseDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  // Keyboard Movement State
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // WebXR Session and Controller Refs
  const xrControllersRef = useRef<THREE.XRTargetRaySpace[]>([]);

  // Sound Mute Toggle helper
  const handleToggleMute = () => {
    const muted = sfx.toggleMute();
    setIsMuted(muted);
  };

  // Trigger weapon grab from ground
  const scavengeWeaponNearPlayer = () => {
    const player = playerStateRef.current;
    if (activeGameState !== 'playing') return;

    let closestWeapon: DroppedWeapon | null = null;
    let closestDist = 2.0; // max distance for pickup

    droppedWeaponsRef.current.forEach((w) => {
      const dist = player.position.distanceTo(w.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestWeapon = w;
      }
    });

    if (closestWeapon) {
      const weapon: DroppedWeapon = closestWeapon;
      
      // Determine hand (if right hand has fists, pick up in right hand. Else left hand fists. Else overwrite right hand!)
      let pickedUpLeft = false;
      if (player.rightWeapon === WeaponType.FISTS) {
        player.rightWeapon = weapon.type;
        setRightHandWeapon(weapon.type);
      } else if (player.leftWeapon === WeaponType.FISTS) {
        player.leftWeapon = weapon.type;
        setLeftHandWeapon(weapon.type);
        pickedUpLeft = true;
      } else {
        // Drop current right hand weapon, pick up new one
        spawnDroppedWeaponFromPlayer(player.rightWeapon, false);
        player.rightWeapon = weapon.type;
        setRightHandWeapon(weapon.type);
      }

      sfx.playFallenClink();

      // Remove from scene & database
      if (sceneRef.current && weapon.mesh) {
        sceneRef.current.remove(weapon.mesh);
      }
      droppedWeaponsRef.current = droppedWeaponsRef.current.filter((w) => w.id !== weapon.id);

      // Rebuild Player Hands Visuals
      rebuildPlayerHandsVisuals();

      // Display prompt
      spawnFloatingTextEffect(
        `Scavenged ${WEAPON_REGISTRY[weapon.type].name}!`, 
        new THREE.Vector3(player.position.x, player.position.y + 1.2, player.position.z), 
        "#00ffaa"
      );
    }
  };

  // Drop / Throw active weapon
  const throwActiveWeapon = () => {
    const player = playerStateRef.current;
    if (activeGameState !== 'playing') return;

    // Prefer dropping right weapon, unless only left hand has a weapon
    let typeToThrow = WeaponType.FISTS;
    let isLeft = false;

    if (player.rightWeapon !== WeaponType.FISTS) {
      typeToThrow = player.rightWeapon;
      player.rightWeapon = WeaponType.FISTS;
      setRightHandWeapon(WeaponType.FISTS);
    } else if (player.leftWeapon !== WeaponType.FISTS) {
      typeToThrow = player.leftWeapon;
      player.leftWeapon = WeaponType.FISTS;
      setLeftHandWeapon(WeaponType.FISTS);
      isLeft = true;
    }

    if (typeToThrow !== WeaponType.FISTS) {
      // Calculate look direction to launch
      const lookDir = new THREE.Vector3(0, 0, -1);
      if (cameraRef.current) {
        lookDir.applyQuaternion(cameraRef.current.quaternion);
      }
      
      // Spawn flying physical weapon
      spawnDroppedWeaponFromPlayer(typeToThrow, true, lookDir);
      rebuildPlayerHandsVisuals();
      sfx.playWhoosh();
    }
  };

  // Re-build standard hands visual attachments based on equipped slots
  const rebuildPlayerHandsVisuals = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean old
    if (playerLeftHandMeshRef.current) scene.remove(playerLeftHandMeshRef.current);
    if (playerRightHandMeshRef.current) scene.remove(playerRightHandMeshRef.current);

    const builder = weaponVisualBuilderRef.current;
    const player = playerStateRef.current;

    // Left hand mesh container
    const leftGroup = new THREE.Group();
    leftGroup.name = "player_left_hand_attachment";
    const visualL = builder.createWeaponMesh(player.leftWeapon);
    builder.orientWeaponInHand(visualL, player.leftWeapon, true);
    leftGroup.add(visualL);
    scene.add(leftGroup);
    playerLeftHandMeshRef.current = leftGroup;

    // Right hand mesh container
    const rightGroup = new THREE.Group();
    rightGroup.name = "player_right_hand_attachment";
    const visualR = builder.createWeaponMesh(player.rightWeapon);
    builder.orientWeaponInHand(visualR, player.rightWeapon, false);
    rightGroup.add(visualR);
    scene.add(rightGroup);
    playerRightHandMeshRef.current = rightGroup;
  };

  // Helper to spawn weapon dropping on floor
  const spawnDroppedWeaponFromPlayer = (
    type: WeaponType, 
    isThrown: boolean = false,
    direction?: THREE.Vector3
  ) => {
    const player = playerStateRef.current;
    const builder = weaponVisualBuilderRef.current;
    const scene = sceneRef.current;
    if (!scene) return;

    const startPos = player.position.clone();
    startPos.y += 1.0; // hand level

    const velocity = new THREE.Vector3();
    if (isThrown && direction) {
      velocity.copy(direction).multiplyScalar(15.0); // high speed throw
      velocity.y += 2.0; // slight arc
    } else {
      // gentle drop/tumble
      velocity.set((Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3);
    }

    const drop = builder.createDroppedWeapon(type, startPos, velocity);
    
    if (isThrown) {
      drop.isCustomThrown = true;
      drop.thrownDamage = WEAPON_REGISTRY[type].damage * 1.5; // Throwing does 1.5x damage!
    }

    if (drop.mesh) {
      scene.add(drop.mesh);
    }
    droppedWeaponsRef.current.push(drop);
  };

  // Spawn visual floating particle damage stars
  const spawnDamageParticles = (pos: THREE.Vector3, colorStr: string, count: number = 12) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const geom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorStr) });

    for (let i = 0; i < count; i++) {
      const pMesh = new THREE.Mesh(geom, mat);
      pMesh.position.copy(pos);
      scene.add(pMesh);

      particlesRef.current.push({
        id: `particle_${Date.now()}_${Math.random()}`,
        position: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 6
        ),
        color: colorStr,
        size: 0.06,
        alpha: 1.0,
        decay: Math.random() * 1.5 + 1.2,
        gravity: -10,
        mesh: pMesh
      });
    }
  };

  // Spawn floating 3D numbers/text in ThreeJS (procedural using canvas texture)
  const spawnFloatingTextEffect = (text: string, pos: THREE.Vector3, color: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = color;
    ctx.font = "bold 26px 'Space Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.set(1.5, 0.4, 1);
    scene.add(sprite);

    // Fade and float upward
    const startTime = Date.now();
    const duration = 1200;

    const anim = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1.0) {
        scene.remove(sprite);
        texture.dispose();
        mat.dispose();
      } else {
        sprite.position.y = pos.y + progress * 0.8;
        mat.opacity = 1.0 - progress;
        requestAnimationFrame(anim);
      }
    };
    anim();
  };

  // Start Attack Animation logic (fists or weapons)
  const performPlayerAttack = (isLeft: boolean) => {
    const player = playerStateRef.current;
    const currentTime = Date.now();

    const currentWeaponType = isLeft ? player.leftWeapon : player.rightWeapon;
    const stats = WEAPON_REGISTRY[currentWeaponType];
    
    // Check cooldown
    const lastAttack = isLeft ? player.lastAttackTimeLeft : player.lastAttackTimeRight;
    if (currentTime - lastAttack < stats.cooldown) return;

    // Set Attack Active state
    if (isLeft) {
      player.isAttackingLeft = true;
      player.lastAttackTimeLeft = currentTime;
    } else {
      player.isAttackingRight = true;
      player.lastAttackTimeRight = currentTime;
    }

    // Play whoosh swing sound
    if (currentWeaponType === WeaponType.SHIELD) {
      sfx.playHitPunch(); // Shield has blunt punch sound
    } else {
      sfx.playWhoosh();
    }

    // Compute attack reach with camera/look quaternion
    const lookDir = new THREE.Vector3(0, 0, -1);
    if (cameraRef.current) {
      lookDir.applyQuaternion(cameraRef.current.quaternion);
    }

    // Physics hit sweep scanning
    const sweepReach = stats.reach;
    let hitAny = false;

    enemiesRef.current.forEach((enemy) => {
      if (enemy.state === 'dying') return;

      const check = physicsRef.current.checkStrikeHit(
        player.position,
        lookDir,
        enemy,
        sweepReach,
        Math.PI / 1.8 // sweeping horizontal arc cone
      );

      if (check.hit) {
        hitAny = true;
        
        // Damage Enemy
        enemy.health -= stats.damage;

        // Visual effects
        const hitPoint = enemy.position.clone();
        hitPoint.y += (enemy.height * 0.6);
        spawnDamageParticles(hitPoint, enemy.color, 15);

        // Float hit damage
        spawnFloatingTextEffect(`-${stats.damage}`, new THREE.Vector3(enemy.position.x, enemy.position.y + enemy.height + 0.3, enemy.position.z), "#ff3333");

        // Stun enemy and apply physical recoil velocity vector
        enemy.state = 'stunned';
        enemy.stunUntil = currentTime + (300 + stats.swingWeight * 500); // heavier weapons stun longer!
        
        // Apply knockback velocity (Mass matters! Heavy bosses recoil less)
        const knockbackScalar = (stats.impactForce * 4.0) / enemy.mass;
        enemy.velocity.add(check.pushVector.multiplyScalar(knockbackScalar));
        enemy.velocity.y = 1.8; // pop them up into the air slightly!

        // Play metal clashing sound or solid wet punch impact
        if (currentWeaponType === WeaponType.FISTS || currentWeaponType === WeaponType.WOODEN_CLUB) {
          sfx.playHitPunch();
        } else {
          sfx.playClashMetal();
        }

        // Check if enemy died
        if (enemy.health <= 0) {
          triggerEnemyDeath(enemy);
        }
      }
    });

    // Award bonus score for stylish sweeps even if no hit
    if (hitAny) {
      player.score += 25;
      onScoreChange(player.score);
    }
  };

  // Kill Enemy handling (dropping weapon onto ground and ragdoll fade out)
  const triggerEnemyDeath = (enemy: EnemyInstance) => {
    enemy.state = 'dying';
    const player = playerStateRef.current;
    
    // Add stats
    player.kills += 1;
    player.score += ENEMY_REGISTRY[enemy.type].points;
    
    onKillsChange(player.kills);
    onScoreChange(player.score);

    // Drop their weapon as physical item for player to scavenge!
    if (enemy.weaponType !== WeaponType.FISTS) {
      // Toss weapon into the air physically
      spawnDroppedWeaponFromPlayer(enemy.weaponType, false);
    }

    // Death float effect
    spawnFloatingTextEffect("+ DEFEATED +", new THREE.Vector3(enemy.position.x, enemy.position.y + enemy.height + 0.5, enemy.position.z), "#ffdd00");
    sfx.playTriumphantLevel();

    // Ragdoll spin animation then dissolve from scene
    const scene = sceneRef.current;
    const body = enemy.mesh;
    if (scene && body) {
      const deathTime = Date.now();
      const shrinkAnim = () => {
        const elapsed = Date.now() - deathTime;
        const progress = elapsed / 1000; // 1 second animation

        if (progress >= 1.0) {
          scene.remove(body);
          // Delete from references
          enemiesRef.current = enemiesRef.current.filter((e) => e.id !== enemy.id);
          
          // Re-trigger database scan to check if all wave enemies are dead
          checkWaveCompletion();
        } else {
          body.position.y = enemy.position.y + progress * 1.5;
          body.rotation.x += 4 * dt;
          body.scale.setScalar(enemy.scale * (1.0 - progress));
          requestAnimationFrame(shrinkAnim);
        }
      };
      
      const dt = 0.016; // mock frame time
      shrinkAnim();
    }
  };

  // Scan wave completion and advance or trigger level clear elevator
  const checkWaveCompletion = () => {
    if (enemiesRef.current.length === 0) {
      // Wave cleared!
      const currentConfig = TOWER_FLOORS.find((f) => f.floorNumber === playerStateRef.current.floor);
      if (!currentConfig) return;

      const activeIndex = activeWaveIndexRef.current;
      currentConfig.waves[activeIndex].completed = true;

      if (activeIndex < currentConfig.waves.length - 1) {
        // Prepare next wave
        const nextIndex = activeIndex + 1;
        activeWaveIndexRef.current = nextIndex;
        setActiveWaveNumber(nextIndex + 1);
        
        spawnFloatingTextEffect(
          `WAVE ${nextIndex + 1} STARTING!`, 
          new THREE.Vector3(playerStateRef.current.position.x, playerStateRef.current.position.y + 1.5, playerStateRef.current.position.z), 
          "#ff5500"
        );
        spawnWaveEnemies(currentConfig.waves[nextIndex].enemiesToSpawn, currentConfig.radius);
      } else {
        // Floor Fully Cleared! Open the center elevator hatch!
        triggerFloorCleared(currentConfig);
      }
    }
  };

  // Open the main central circular descent trapdoor with gorgeous golden visuals
  const triggerFloorCleared = (config: FloorConfig) => {
    if (isFloorClearingRef.current) return;
    isFloorClearingRef.current = true;
    floorClearTimeRef.current = Date.now();

    sfx.playTriumphantLevel();
    
    // Animate elevator hatch sliding open in the center floor!
    if (elevatorGateMeshRef.current) {
      const openGate = () => {
        if (!elevatorGateMeshRef.current) return;
        if (elevatorGateMeshRef.current.position.y > -2.0) {
          elevatorGateMeshRef.current.position.y -= 0.05;
          elevatorGateMeshRef.current.scale.y -= 0.05;
          requestAnimationFrame(openGate);
        }
      };
      openGate();
    }

    // Spawn rich golden fountain particles at center floor (0, 0, 0)
    spawnDamageParticles(new THREE.Vector3(0, 0.1, 0), "#ffd700", 40);

    // Countdown and automatic descent
    let secondsLeft = 5;
    setFloorTransitionTimer(secondsLeft);

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        setFloorTransitionTimer(null);
        descendToNextFloor();
      } else {
        setFloorTransitionTimer(secondsLeft);
        sfx.playCountdownTick();
      }
    }, 1000);
  };

  // Perform physical level change transition
  const descendToNextFloor = () => {
    const player = playerStateRef.current;
    
    if (player.floor > 1) {
      // Descend one level
      player.floor -= 1;
      onFloorChange(player.floor);

      // Reset level completion references
      isFloorClearingRef.current = false;
      activeWaveIndexRef.current = 0;
      setActiveWaveNumber(1);

      // Relocate player to top of the next floor (spawn with safe falling height!)
      player.position.set(0, 5, 5);
      player.velocity.set(0, 0, 0);
      player.isGrounded = false;

      // Rebuild entire Tower Room Environment
      setupTowerFloorLevel(player.floor);
    } else {
      // Ground floor completed = VICTORY!
      onGameStateChange('victory');
    }
  };

  // Set up visual environment (walls, brick materials, light fixtures, center portals) for a specific floor level
  const setupTowerFloorLevel = (floorNum: number) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean old floor layout
    if (floorGroupRef.current) scene.remove(floorGroupRef.current);
    
    const config = TOWER_FLOORS.find((f) => f.floorNumber === floorNum);
    if (!config) return;

    setCurrentFloorConfig(config);
    setTotalWavesCount(config.waves.length);

    // Generate physical obstacles/pillars
    physicsRef.current.generatePillars(config.radius, config.isBossFloor ? 2 : 4);

    const group = new THREE.Group();
    group.name = `floor_environment_${floorNum}`;

    // Floor stone tiling material
    const floorTileMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: 0.9,
      metalness: 0.15
    });

    const floorGeom = new THREE.CylinderGeometry(config.radius, config.radius, 0.2, 32);
    const floorMesh = new THREE.Mesh(floorGeom, floorTileMat);
    floorMesh.position.y = -0.1;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // Decorative central elevator metal hatch / grate (where player goes down)
    const hatchGeom = new THREE.CylinderGeometry(2.2, 2.2, 0.08, 16);
    const hatchMat = new THREE.MeshStandardMaterial({ color: 0x2c3539, metalness: 0.95, roughness: 0.1 });
    const hatchMesh = new THREE.Mesh(hatchGeom, hatchMat);
    hatchMesh.position.set(0, 0.02, 0);
    hatchMesh.receiveShadow = true;
    group.add(hatchMesh);
    elevatorGateMeshRef.current = hatchMesh;

    // Outer circular boundary walls (represented by cylinders facing inwards)
    const wallGeom = new THREE.CylinderGeometry(config.radius, config.radius, 9, 32, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color).multiplyScalar(0.7),
      roughness: 0.95,
      side: THREE.BackSide // see inside from center
    });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.y = 4.5;
    group.add(wallMesh);

    // Ceiling cover
    const ceilingGeom = new THREE.CylinderGeometry(config.radius, config.radius, 0.2, 32);
    const ceilingMesh = new THREE.Mesh(ceilingGeom, wallMat);
    ceilingMesh.position.y = 9.0;
    group.add(ceilingMesh);

    // Build Pillars visually
    const pillarGeom = new THREE.CylinderGeometry(1.4, 1.4, 9, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(config.color).addScalar(0.04), roughness: 0.9 });
    physicsRef.current.pillars.forEach((p) => {
      const pMesh = new THREE.Mesh(pillarGeom, pillarMat);
      pMesh.position.set(p.position.x, 4.5, p.position.z);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      group.add(pMesh);
    });

    // Add wall torches with flickering orange fire lights!
    const torchCount = 6;
    for (let i = 0; i < torchCount; i++) {
      const angle = (i / torchCount) * Math.PI * 2;
      const torchX = Math.cos(angle) * (config.radius - 0.25);
      const torchZ = Math.sin(angle) * (config.radius - 0.25);

      const torchGroup = new THREE.Group();
      torchGroup.position.set(torchX, 3.2, torchZ);
      torchGroup.rotation.y = -angle + Math.PI;

      // Wooden bracket
      const bracketGeom = new THREE.BoxGeometry(0.08, 0.4, 0.15);
      const bracket = new THREE.Mesh(bracketGeom, new THREE.MeshStandardMaterial({ color: 0x3d2314 }));
      torchGroup.add(bracket);

      // Gold metal ring holder
      const ringGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
      const ring = new THREE.Mesh(ringGeom, new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 }));
      ring.position.set(0, 0, 0.12);
      torchGroup.add(ring);

      // Flickering orange fire pointlight
      const fireLight = new THREE.PointLight(0xffaa00, 1.5, 9);
      fireLight.position.set(0, 0.2, 0.15);
      fireLight.name = "torch_light";
      torchGroup.add(fireLight);

      // Tiny physical flame mesh (yellow/orange cone)
      const flameGeom = new THREE.ConeGeometry(0.06, 0.18, 4);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
      const flame = new THREE.Mesh(flameGeom, flameMat);
      flame.position.set(0, 0.12, 0.12);
      flame.name = "torch_flame";
      torchGroup.add(flame);

      group.add(torchGroup);
    }

    scene.add(group);
    floorGroupRef.current = group;

    // SPAWN THE INITIAL WAVE
    const activeWaveIndex = activeWaveIndexRef.current;
    spawnWaveEnemies(config.waves[activeWaveIndex].enemiesToSpawn, config.radius);
  };

  // Wave Spawner logic
  const spawnWaveEnemies = (types: EnemyType[], towerRadius: number) => {
    if (!enemyFactoryRef.current) return;

    // Clean any residue
    enemiesRef.current.forEach((e) => {
      if (sceneRef.current && e.mesh) sceneRef.current.remove(e.mesh);
    });
    enemiesRef.current = [];

    // Spawn each type at random polar coordinate distances around the center elevator
    types.forEach((type, index) => {
      const angle = (index / types.length) * Math.PI * 2 + Math.random() * 0.8;
      const radiusDist = towerRadius * 0.65 + (Math.random() - 0.5) * 2; // Keep away from center
      const spawnX = Math.cos(angle) * radiusDist;
      const spawnZ = Math.sin(angle) * radiusDist;

      const isBoss = type === EnemyType.BOSS_WARDEN || type === EnemyType.BOSS_GOLEM || type === EnemyType.BOSS_NECROMANCER;
      const enemy = enemyFactoryRef.current!.createEnemy(type, new THREE.Vector3(spawnX, 1.5, spawnZ), isBoss);
      
      if (enemy.mesh && sceneRef.current) {
        sceneRef.current.add(enemy.mesh);
      }
      enemiesRef.current.push(enemy);
    });

    setEnemiesLeftCount(enemiesRef.current.length);
  };

  // Reset Game fully
  const handleRestartGame = () => {
    // Clear old state lists
    enemiesRef.current.forEach((e) => {
      if (sceneRef.current && e.mesh) sceneRef.current.remove(e.mesh);
    });
    enemiesRef.current = [];

    droppedWeaponsRef.current.forEach((w) => {
      if (sceneRef.current && w.mesh) sceneRef.current.remove(w.mesh);
    });
    droppedWeaponsRef.current = [];

    particlesRef.current.forEach((p) => {
      if (sceneRef.current && p.mesh) sceneRef.current.remove(p.mesh);
    });
    particlesRef.current = [];

    const player = playerStateRef.current;
    player.health = 100;
    player.maxHealth = 100;
    player.score = 0;
    player.kills = 0;
    player.floor = 5; // Top attic floor
    player.leftWeapon = WeaponType.FISTS;
    player.rightWeapon = WeaponType.FISTS;
    player.position.set(0, 1.5, 4);
    player.velocity.set(0, 0, 0);

    setLeftHandWeapon(WeaponType.FISTS);
    setRightHandWeapon(WeaponType.FISTS);
    onFloorChange(5);
    onScoreChange(0);
    onKillsChange(0);
    onHealthChange(100, 100);

    isFloorClearingRef.current = false;
    activeWaveIndexRef.current = 0;
    setActiveWaveNumber(1);

    rebuildPlayerHandsVisuals();
    setupTowerFloorLevel(5);
    
    onGameStateChange('playing');
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene & Camera Setups
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0f13); // Deep cosmic dark slate
    scene.fog = new THREE.FogExp2(0x0e0f13, 0.05); // Fog makes tower look eerie and tall
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // Position camera inside player head
    camera.position.set(0, 1.6, 0); // first person eye height
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Enable XR WebVR support
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting (ambient soft blue tint)
    const ambientLight = new THREE.AmbientLight(0x203545, 0.7);
    scene.add(ambientLight);

    // Moonbeam central elevator directional light (glowing down from ceiling hole)
    const moonbeam = new THREE.DirectionalLight(0xddeeff, 1.8);
    moonbeam.position.set(0, 8.5, 0);
    moonbeam.castShadow = true;
    moonbeam.shadow.mapSize.width = 1024;
    moonbeam.shadow.mapSize.height = 1024;
    moonbeam.shadow.camera.near = 0.5;
    moonbeam.shadow.camera.far = 15;
    const shadowSize = 12;
    moonbeam.shadow.camera.left = -shadowSize;
    moonbeam.shadow.camera.right = shadowSize;
    moonbeam.shadow.camera.top = shadowSize;
    moonbeam.shadow.camera.bottom = -shadowSize;
    scene.add(moonbeam);

    // Setup Factories
    const builder = weaponVisualBuilderRef.current;
    const enemyFactory = new EnemyFactory(builder);
    enemyFactoryRef.current = enemyFactory;

    // Generate hands
    rebuildPlayerHandsVisuals();

    // Spawn Tower Floors
    setupTowerFloorLevel(playerStateRef.current.floor);

    // --- DESKTOP FIRST PERSON CAMERA (DRAG MOUSE TO LOOK) ---
    const handleMouseDown = (e: MouseEvent) => {
      if (renderer.xr.isPresenting) return; // ignore in VR mode
      isMouseDraggingRef.current = true;
      previousMousePositionRef.current.set(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDraggingRef.current || renderer.xr.isPresenting) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      previousMousePositionRef.current.set(e.clientX, e.clientY);

      // Adjust camera rotation look
      cameraRotationRef.current.y -= deltaX * 0.005; // Yaw
      cameraRotationRef.current.x -= deltaY * 0.005; // Pitch

      // Limit pitch to avoid flipping upside down
      cameraRotationRef.current.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, cameraRotationRef.current.x));
    };

    const handleMouseUp = () => {
      isMouseDraggingRef.current = false;
    };

    // Mobile / Touch controls
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isMouseDraggingRef.current = true;
        previousMousePositionRef.current.set(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isMouseDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;
      previousMousePositionRef.current.set(e.touches[0].clientX, e.touches[0].clientY);

      cameraRotationRef.current.y -= deltaX * 0.007;
      cameraRotationRef.current.x -= deltaY * 0.007;
      cameraRotationRef.current.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, cameraRotationRef.current.x));
    };

    const handleTouchEnd = () => {
      isMouseDraggingRef.current = false;
    };

    // Window event listeners for mouse look drag
    const targetElement = containerRef.current;
    targetElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    targetElement.addEventListener('touchstart', handleTouchStart);
    targetElement.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;

      // Scavenge
      if (e.key.toLowerCase() === 'e') {
        scavengeWeaponNearPlayer();
      }
      // Drop/Throw
      if (e.key.toLowerCase() === 'r') {
        throwActiveWeapon();
      }
      // Left punch shortcut
      if (e.key.toLowerCase() === 'j') {
        performPlayerAttack(true);
      }
      // Right punch shortcut
      if (e.key.toLowerCase() === 'k') {
        performPlayerAttack(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // --- WEBXR CONTROLLERS SETUP ---
    // Connect standard WebXR controllers for punches/swinging in VR headsets!
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);

    const onVRTriggerStartLeft = () => {
      performPlayerAttack(true);
    };
    const onVRTriggerStartRight = () => {
      performPlayerAttack(false);
    };
    const onVRGripStartLeft = () => {
      // Pick up weapon or grab
      scavengeWeaponNearPlayer();
    };
    const onVRGripStartRight = () => {
      scavengeWeaponNearPlayer();
    };

    controller1.addEventListener('selectstart', onVRTriggerStartLeft);
    controller2.addEventListener('selectstart', onVRTriggerStartRight);
    controller1.addEventListener('squeezestart', onVRGripStartLeft);
    controller2.addEventListener('squeezestart', onVRGripStartRight);

    scene.add(controller1);
    scene.add(controller2);
    xrControllersRef.current = [controller1, controller2];

    // Check VR Availability
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        setIsVREnabled(supported);
      });
    }

    // CLEANUP DISPOSAL
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);

      targetElement.removeEventListener('mousedown', handleMouseDown);
      targetElement.removeEventListener('touchstart', handleTouchStart);
      targetElement.removeEventListener('touchmove', handleTouchMove);

      controller1.removeEventListener('selectstart', onVRTriggerStartLeft);
      controller2.removeEventListener('selectstart', onVRTriggerStartRight);
      controller1.removeEventListener('squeezestart', onVRGripStartLeft);
      controller2.removeEventListener('squeezestart', onVRGripStartRight);

      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && targetElement.contains(rendererRef.current.domElement)) {
          targetElement.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // --- CORE GAME TICK LOOP ---
  useEffect(() => {
    let lastTime = performance.now();

    const gameTick = () => {
      if (activeGameState !== 'playing') {
        gameLoopId.current = requestAnimationFrame(gameTick);
        return;
      }

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const physics = physicsRef.current;
      const player = playerStateRef.current;
      const currentTime = Date.now();

      if (!scene || !camera || !renderer) {
        gameLoopId.current = requestAnimationFrame(gameTick);
        return;
      }

      // 1. UPDATE WALL TORCHES FLICKER
      if (floorGroupRef.current) {
        floorGroupRef.current.children.forEach((torch) => {
          const light = torch.getObjectByName("torch_light") as THREE.PointLight;
          const flame = torch.getObjectByName("torch_flame") as THREE.Mesh;
          if (light && flame) {
            const flicker = Math.sin(now * 0.02) * 0.15 + (Math.random() - 0.5) * 0.08 + 1.25;
            light.intensity = flicker;
            flame.scale.setScalar(flicker * 0.75);
          }
        });
      }

      // 2. PLAYER FIRST PERSON LOOK ROTATION (IF NOT IN VR)
      if (!renderer.xr.isPresenting) {
        // Construct visual Euler quaternion
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.x = cameraRotationRef.current.x;
        euler.y = cameraRotationRef.current.y;
        camera.quaternion.setFromEuler(euler);
      }

      // 3. KEYBOARD PLAYER MOVEMENT (First Person Perspective)
      const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forwardDir.y = 0; // lock to horizontal plane
      forwardDir.normalize();

      const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      rightDir.y = 0;
      rightDir.normalize();

      const moveForce = new THREE.Vector3(0, 0, 0);
      if (keysPressedRef.current['w']) moveForce.add(forwardDir);
      if (keysPressedRef.current['s']) moveForce.sub(forwardDir);
      if (keysPressedRef.current['d']) moveForce.add(rightDir);
      if (keysPressedRef.current['a']) moveForce.sub(rightDir);

      if (moveForce.lengthSq() > 0.01) {
        moveForce.normalize();
        const activeSpeed = 7.5; // Player running speed
        player.velocity.x += moveForce.x * activeSpeed * dt * 10;
        player.velocity.z += moveForce.z * activeSpeed * dt * 10;
      }

      // 4. RUN PHYSICS SIMULATION FOR PLAYER
      const currentConfig = TOWER_FLOORS.find((f) => f.floorNumber === player.floor);
      const towerRadius = currentConfig ? currentConfig.radius : 15.0;

      physics.updateObject(player, dt, towerRadius);

      // Bind camera position to follow player's head height
      if (renderer.xr.isPresenting) {
        // In WebVR mode, camera position is managed by HMD tracking automatically.
        // We sync playerState physics center coordinate to the XR camera position!
        const xrCamera = renderer.xr.getCamera(camera);
        player.position.copy(xrCamera.position);
      } else {
        // Desktop mode: position camera at head offset
        camera.position.set(player.position.x, player.position.y + 1.6, player.position.z);
      }

      // 5. RENDER WEAPON HELD MODELS (DESKTOP MODE FLOATING HANDS)
      if (!renderer.xr.isPresenting) {
        // Bind hand attachment slots smoothly to camera sides
        if (playerLeftHandMeshRef.current) {
          playerLeftHandMeshRef.current.position.copy(camera.position);
          playerLeftHandMeshRef.current.quaternion.copy(camera.quaternion);
          
          // Animate striking swing forward arc
          const swingProgress = (currentTime - player.lastAttackTimeLeft) / WEAPON_REGISTRY[player.leftWeapon].cooldown;
          if (swingProgress < 1.0) {
            // striking rotation chop
            const angle = Math.sin(swingProgress * Math.PI) * 0.8;
            playerLeftHandMeshRef.current.rotateX(angle);
            playerLeftHandMeshRef.current.position.addScaledVector(forwardDir, Math.sin(swingProgress * Math.PI) * 0.6);
          } else {
            player.isAttackingLeft = false;
            // Idle breathing bobbing
            playerLeftHandMeshRef.current.position.y += Math.sin(now * 0.003) * 0.03;
          }
        }

        if (playerRightHandMeshRef.current) {
          playerRightHandMeshRef.current.position.copy(camera.position);
          playerRightHandMeshRef.current.quaternion.copy(camera.quaternion);

          // Animate striking
          const swingProgress = (currentTime - player.lastAttackTimeRight) / WEAPON_REGISTRY[player.rightWeapon].cooldown;
          if (swingProgress < 1.0) {
            const angle = Math.sin(swingProgress * Math.PI) * 0.8;
            playerRightHandMeshRef.current.rotateX(angle);
            playerRightHandMeshRef.current.position.addScaledVector(forwardDir, Math.sin(swingProgress * Math.PI) * 0.6);
          } else {
            player.isAttackingRight = false;
            playerRightHandMeshRef.current.position.y += Math.sin(now * 0.003 + 1.5) * 0.03;
          }
        }
      } else {
        // VR presentation enabled! Mirror hands visually to the actual XR controller handles!
        const controllerL = renderer.xr.getController(0);
        const controllerR = renderer.xr.getController(1);

        if (playerLeftHandMeshRef.current && controllerL.visible) {
          playerLeftHandMeshRef.current.position.copy(controllerL.position);
          playerLeftHandMeshRef.current.quaternion.copy(controllerL.quaternion);
        }
        if (playerRightHandMeshRef.current && controllerR.visible) {
          playerRightHandMeshRef.current.position.copy(controllerR.position);
          playerRightHandMeshRef.current.quaternion.copy(controllerR.quaternion);
        }
      }

      // 6. SIMULATE DROPPED WEAPONS PHYSICS
      droppedWeaponsRef.current.forEach((w) => {
        physics.updateWeapon(w, dt, towerRadius);

        // Fun thrown damage physics!
        if (w.isCustomThrown && Math.abs(w.velocity.lengthSq()) > 10.0) {
          // Check collision with enemies
          enemiesRef.current.forEach((enemy) => {
            if (enemy.state === 'dying') return;

            const dist = w.position.distanceTo(enemy.position);
            if (dist < w.radius + enemy.radius) {
              // Slam weapon hit!
              const dmg = w.thrownDamage || 30;
              enemy.health -= dmg;
              enemy.state = 'stunned';
              enemy.stunUntil = currentTime + 800;
              
              // Bounce weapon backward
              w.velocity.multiplyScalar(-0.4);
              w.velocity.y = 3.0;
              w.isCustomThrown = false; // hit landed

              spawnDamageParticles(w.position.clone(), enemy.color, 15);
              spawnFloatingTextEffect(`SLAM -${dmg}`, new THREE.Vector3(enemy.position.x, enemy.position.y + enemy.height + 0.3, enemy.position.z), "#ffdd00");
              sfx.playClashMetal();

              if (enemy.health <= 0) {
                triggerEnemyDeath(enemy);
              }
            }
          });
        }
      });

      // 7. SIMULATE ENEMIES AI & COLLISION
      enemiesRef.current.forEach((enemy) => {
        // Core AI decisions
        if (enemyFactoryRef.current) {
          enemyFactoryRef.current.tickAI(enemy, dt, player.position, currentTime);
        }

        // Run movement physics
        physics.updateObject(enemy, dt, towerRadius);

        // Look at player in 3D
        if (enemy.mesh) {
          enemyFactoryRef.current?.updateHealthBar(enemy, camera);
        }

        // Check if enemy weapon swing frames connect with Player body!
        if (enemy.state === 'attacking' && currentTime < enemy.attackCooldownUntil) {
          const attackProgress = (ENEMY_REGISTRY[enemy.type].attackCooldown - (enemy.attackCooldownUntil - currentTime)) / ENEMY_REGISTRY[enemy.type].attackCooldown;
          
          // Connect hit on 45% progress of swing
          if (attackProgress >= 0.4 && attackProgress <= 0.45) {
            // Verify reach distance
            const check = physics.checkStrikeHit(
              enemy.position,
              enemy.direction,
              player,
              ENEMY_REGISTRY[enemy.type].attackReach * enemy.scale,
              Math.PI / 1.8
            );

            if (check.hit && currentTime > player.immunityUntil) {
              // Damage player!
              const damage = ENEMY_REGISTRY[enemy.type].attackDamage;
              player.health -= damage;
              
              // 1 second immunity frames
              player.immunityUntil = currentTime + 1000;

              onHealthChange(player.health, player.maxHealth);

              // Recoil player backward
              player.velocity.add(check.pushVector.multiplyScalar(6.0));
              player.velocity.y = 1.5; // kick camera view up

              // Overlay screen blood damage effect
              setRedFlashActive(true);
              setTimeout(() => setRedFlashActive(false), 250);

              // Groan and screen shake
              sfx.playDamageVoice();

              // Check gameover
              if (player.health <= 0) {
                onGameStateChange('gameover');
              }
            }
          }
        }
      });

      setEnemiesLeftCount(enemiesRef.current.length);

      // 8. RESOLVE CLIPPING overlapping between entities (keeps them solid!)
      // Resolve Player vs Enemies
      enemiesRef.current.forEach((enemy) => {
        physics.resolveElasticCollision(player, enemy, 0.4);
      });

      // Resolve Enemy vs Enemy
      for (let i = 0; i < enemiesRef.current.length; i++) {
        for (let j = i + 1; j < enemiesRef.current.length; j++) {
          physics.resolveElasticCollision(enemiesRef.current[i], enemiesRef.current[j], 0.35);
        }
      }

      // 9. SIMULATE AND UPDATE PARTICLES
      particlesRef.current.forEach((p) => {
        p.velocity.y += p.gravity * dt;
        p.position.addScaledVector(p.velocity, dt);
        p.alpha -= p.decay * dt;

        if (p.mesh) {
          p.mesh.position.copy(p.position);
          
          if (p.mesh instanceof THREE.Mesh && p.mesh.material instanceof THREE.MeshBasicMaterial) {
            p.mesh.material.opacity = p.alpha;
          }
        }
      });

      // Purge dead particles
      particlesRef.current.forEach((p) => {
        if (p.alpha <= 0 && scene && p.mesh) {
          scene.remove(p.mesh);
        }
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // Render Scene
      renderer.render(scene, camera);

      gameLoopId.current = requestAnimationFrame(gameTick);
    };

    gameLoopId.current = requestAnimationFrame(gameTick);

    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
    };
  }, [activeGameState]);

  // --- TRIGGER VR SESSION MODE ---
  const handleEnterVR = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    // Check navigator XR support
    if (navigator.xr) {
      navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor']
      }).then((session) => {
        renderer.xr.setSession(session);
        // Start Sound contexts
        sfx.playTriumphantLevel();
      }).catch((err) => {
        alert("Could not start VR Session: " + err.message + "\nFallback playing on screen is enabled!");
      });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#050505] font-sans select-none">
      
      {/* 3D Canvas Mounting Point */}
      <div 
        ref={containerRef} 
        id="canvas-container"
        className="w-full flex-grow relative cursor-crosshair bg-[#050505]"
      >
        {/* Cinematic screen damage flash */}
        {redFlashActive && (
          <div className="absolute inset-0 z-30 pointer-events-none bg-red-600/35 animate-ping duration-150 border-8 border-red-700" />
        )}

        {/* Floating level clearance count down banner */}
        {floorTransitionTimer !== null && (
          <div className="absolute inset-x-0 top-1/3 z-20 flex flex-col items-center justify-center pointer-events-none animate-bounce">
            <div className="bg-[#0a0a0a]/95 border border-amber-500/30 rounded-sm px-8 py-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-md">
              <h4 className="text-amber-500 text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse mb-1">
                LIFT GATE SEAL DISMANTLED
              </h4>
              <h2 className="text-2xl font-light tracking-tighter text-white uppercase">
                DESCENDING TO <span className="font-black">FLOOR {playerStateRef.current.floor - 1}</span>...
              </h2>
              <p className="text-amber-500/80 font-sans text-xs mt-3 uppercase tracking-widest">
                Level Descending in <span className="text-white font-bold text-sm">{floorTransitionTimer}</span>S
              </p>
            </div>
          </div>
        )}

        {/* Canvas instructions helper badge overlay */}
        {activeGameState === 'playing' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-[#050505]/90 backdrop-blur-md px-6 py-3 rounded-sm border border-white/10 shadow-xl text-[#e0e0e0] text-[10px] tracking-wider uppercase flex items-center gap-6 justify-center max-w-[95%] text-center md:flex-row flex-col">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" /> 
              <span className="text-white/40 mr-1">MOVE:</span>
              <b className="text-white font-bold bg-white/10 px-1 py-0.5 rounded-sm border border-white/20">W,A,S,D</b>
            </span>
            <span className="hidden md:inline text-white/10">|</span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> 
              <span className="text-white/40 mr-1">LOOK:</span>
              <b className="text-white font-bold bg-white/10 px-1 py-0.5 rounded-sm border border-white/20">DRAG MOUSE</b>
            </span>
            <span className="hidden md:inline text-white/10">|</span>
            <span className="flex items-center gap-1.5">
              <Sword className="w-3.5 h-3.5 text-emerald-400" /> 
              <span className="text-white/40 mr-1">PUNCH:</span>
              <b className="text-white font-bold bg-white/10 px-1 py-0.5 rounded-sm border border-white/20">J</b> (L) // <b className="text-white font-bold bg-white/10 px-1 py-0.5 rounded-sm border border-white/20">K</b> (R)
            </span>
            <span className="hidden md:inline text-white/10">|</span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> 
              <span className="text-white/40 mr-1">ACTION:</span>
              <b className="text-white font-bold bg-white/10 px-1 py-0.5 rounded-sm border border-white/20">E</b> SCAVENGE // <b className="text-white font-bold bg-white/10 px-1 py-0.5 rounded-sm border border-white/20">R</b> THROW
            </span>
          </div>
        )}
      </div>

      {/* Dynamic 2D HUD Panel */}
      {activeGameState === 'playing' && (
        <div className="bg-[#0a0a0a] border-t border-white/10 p-5 grid grid-cols-2 md:grid-cols-4 gap-6 items-center z-10 shadow-2xl relative">
          
          {/* Active Level Config */}
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Location</span>
            <span className="text-white font-bold text-sm truncate flex items-center gap-2 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.7)] animate-pulse" />
              {currentFloorConfig ? currentFloorConfig.name : "High Spire"}
            </span>
            <span className="text-white/30 text-[10px] truncate mt-0.5 max-w-[200px] uppercase tracking-wider">
              {currentFloorConfig ? currentFloorConfig.description : ""}
            </span>
          </div>

          {/* Incoming Waves Status */}
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Tactical State</span>
            <div className="flex items-center gap-2 text-white font-light text-sm uppercase tracking-wider">
              <span>WAVE <span className="font-black">{activeWaveNumber}</span> / {totalWavesCount}</span>
              <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-red-950/30 text-red-500 border border-red-600/20">
                {enemiesLeftCount} Remaining
              </span>
            </div>
            {/* Visual Wave Dots */}
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: totalWavesCount }).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-sm flex-grow max-w-[32px] transition-all duration-300 ${
                    i + 1 < activeWaveNumber 
                      ? "bg-emerald-500" 
                      : i + 1 === activeWaveNumber 
                      ? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                      : "bg-white/10"
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Active Weapons Scavenged */}
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2">Armament Slots</span>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/5 rounded-sm border border-white/10 px-3 py-1.5 flex items-center justify-between text-[10px] text-[#e0e0e0] uppercase tracking-wider">
                <span className="text-white/30 font-bold mr-2">LH:</span>
                <span className="font-semibold text-white truncate">{WEAPON_REGISTRY[leftHandWeapon].name}</span>
              </div>
              <div className="flex-1 bg-white/5 rounded-sm border border-white/10 px-3 py-1.5 flex items-center justify-between text-[10px] text-[#e0e0e0] uppercase tracking-wider">
                <span className="text-white/30 font-bold mr-2">RH:</span>
                <span className="font-semibold text-cyan-400 truncate">{WEAPON_REGISTRY[rightHandWeapon].name}</span>
              </div>
            </div>
          </div>

          {/* Sound & WebVR controls */}
          <div className="flex items-center gap-3 justify-end col-span-2 md:col-span-1">
            <button
              onClick={handleToggleMute}
              className={`px-4 py-2.5 rounded-sm border transition uppercase tracking-[0.2em] text-[10px] font-bold cursor-pointer duration-300 ${
                isMuted 
                  ? "bg-red-950/20 border-red-600/30 text-red-500" 
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              title="Toggle Audio Effects"
            >
              {isMuted ? "🔇 Muted" : "🔊 Audio On"}
            </button>

            {isVREnabled ? (
              <button
                onClick={handleEnterVR}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-sm shadow-lg shadow-red-950/40 border border-red-500 flex items-center gap-2 uppercase tracking-[0.2em] text-[10px] animate-pulse cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> ENTER VR
              </button>
            ) : (
              <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-sm text-white/30 text-center text-[10px] tracking-[0.2em] uppercase max-w-[170px]">
                VR Headset Idle
              </div>
            )}
          </div>

        </div>
      )}

      {/* LOBBY / MAIN MENU */}
      {activeGameState === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]/95 p-6 overflow-y-auto">
          {/* Background visuals */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(40,10,10,0.4)_0%,_transparent_70%)] opacity-60 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <div className="max-w-xl w-full text-center flex flex-col items-center relative z-10">
            
            {/* Immersive Medieval Logo */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-600/10 blur-3xl rounded-full" />
              <div className="border border-white/10 bg-[#0a0a0a]/90 rounded-sm p-6 shadow-2xl relative flex flex-col items-center max-w-sm">
                <Shield className="w-12 h-12 text-red-500 mb-3 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse" />
                <h1 className="text-3xl font-light tracking-[0.2em] text-white uppercase">
                  TOWER DESCENT
                </h1>
                <div className="flex items-center gap-1.5 mt-2 font-sans text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase">
                  <span>PHYSICS-BASED</span>
                  <span className="w-1 h-1 rounded-full bg-red-500" />
                  <span>VR COMBAT</span>
                </div>
              </div>
            </div>

            {/* Premise descriptions */}
            <div className="text-left border-l-2 border-white/20 pl-4 py-2 my-8 max-w-md">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">Prologue Registry</div>
              <p className="text-[#e0e0e0]/70 text-[11px] leading-relaxed uppercase tracking-wider">
                You awaken locked at the high spire of a massive tower. Escaped but unarmed, you have nothing but your fists. Defeat ancient guardians, scavenge high-tier legendary swords, maces, and greataxes from fallen skeletons and knights, and descend down five floors of progressive difficulty!
              </p>
            </div>

            {/* Interactive Features Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-8">
              <div className="bg-white/5 border border-white/10 rounded-sm p-3 text-center">
                <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <h4 className="text-[10px] text-white uppercase tracking-[0.15em] font-bold">Wave Intensity</h4>
                <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider">High-speed tactical survival pacing</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-sm p-3 text-center">
                <Sword className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
                <h4 className="text-[10px] text-white uppercase tracking-[0.15em] font-bold">Weapon Swaps</h4>
                <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider">Scavenge superior armaments on defeats</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-sm p-3 text-center">
                <RotateCcw className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
                <h4 className="text-[10px] text-white uppercase tracking-[0.15em] font-bold">Lethal Throws</h4>
                <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider">Toss weapons as high damage spikes</p>
              </div>
            </div>

            {/* Play CTA controls */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handleRestartGame}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-6 rounded-sm shadow-lg shadow-cyan-950/30 transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-[0.2em]"
              >
                <Play className="w-4 h-4 fill-current" /> START CONQUEST
              </button>

              {isVREnabled && (
                <button
                  onClick={() => {
                    handleRestartGame();
                    // Auto open VR session immediately
                    setTimeout(handleEnterVR, 500);
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-sm shadow-md transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-[0.2em] border border-red-500/30"
                >
                  <Sparkles className="w-4 h-4" /> PLAY IN WEBXR HEADSET
                </button>
              )}
            </div>

            <span className="text-white/30 text-[9px] uppercase tracking-[0.4em] mt-10">
              Powered by Three.js WebXR Integration
            </span>

          </div>
        </div>
      )}

    </div>
  );
};
