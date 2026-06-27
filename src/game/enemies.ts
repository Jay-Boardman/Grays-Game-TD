/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { EnemyType, EnemyInstance, ENEMY_REGISTRY, WeaponType } from '../types';
import { WeaponVisualBuilder } from './weapons';

export class EnemyFactory {
  private weaponBuilder: WeaponVisualBuilder;

  constructor(weaponBuilder: WeaponVisualBuilder) {
    this.weaponBuilder = weaponBuilder;
  }

  /**
   * Create an EnemyInstance with complete procedural meshes and physical states
   */
  createEnemy(type: EnemyType, position: THREE.Vector3, isBoss: boolean = false): EnemyInstance {
    const registryStats = ENEMY_REGISTRY[type];
    const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const scale = isBoss ? registryStats.scale * 1.3 : registryStats.scale;
    const maxHealth = isBoss ? registryStats.maxHealth * 1.5 : registryStats.maxHealth;

    // Visual Group Wrapper
    const visualGroup = new THREE.Group();
    visualGroup.name = `enemy_group_${id}`;

    // Main body mesh group
    const bodyMesh = new THREE.Group();
    bodyMesh.name = `enemy_body_${id}`;
    visualGroup.add(bodyMesh);

    // Create procedural graphics based on the enemy type
    this.buildProceduralGraphics(type, bodyMesh, registryStats.color, scale);

    // Equip the enemy's default weapon visually
    const rightHandMesh = new THREE.Group();
    rightHandMesh.name = "right_hand";
    rightHandMesh.position.set(0.35 * scale, 0.9 * scale, -0.2 * scale);
    bodyMesh.add(rightHandMesh);

    const leftHandMesh = new THREE.Group();
    leftHandMesh.name = "left_hand";
    leftHandMesh.position.set(-0.35 * scale, 0.9 * scale, -0.2 * scale);
    bodyMesh.add(leftHandMesh);

    // Add weapon mesh to right hand
    const weaponType = registryStats.weaponType;
    if (weaponType !== WeaponType.FISTS) {
      const weaponVisual = this.weaponBuilder.createWeaponMesh(weaponType);
      // Scale weapon to match enemy size
      weaponVisual.scale.multiplyScalar(scale);
      // Orient weapon in hand
      this.weaponBuilder.orientWeaponInHand(weaponVisual, weaponType, false);
      rightHandMesh.add(weaponVisual);
    }

    // Floating 3D Health Bar above their head for VR play!
    const healthBarMesh = this.createFloatingHealthBar(scale);
    healthBarMesh.position.set(0, 2.0 * scale, 0);
    visualGroup.add(healthBarMesh);

    // Shadow support
    visualGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return {
      id,
      position: position.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      radius: 0.55 * scale,
      height: 1.8 * scale,
      isGrounded: false,
      mass: isBoss ? 4.5 * scale : 1.2 * scale,
      type,
      name: isBoss ? `BOSS: ${registryStats.name}` : registryStats.name,
      health: maxHealth,
      maxHealth: maxHealth,
      color: registryStats.color,
      state: 'idle',
      stunUntil: 0,
      attackCooldownUntil: 0,
      lastRepathTime: 0,
      targetPosition: position.clone(),
      direction: new THREE.Vector3(0, 0, -1),
      weaponType,
      isBoss,
      scale,
      mesh: visualGroup,
      bodyMesh,
      healthBarMesh,
      leftHandMesh,
      rightHandMesh
    };
  }

  /**
   * Helper to build floating health bars that face the player camera
   */
  private createFloatingHealthBar(scale: number): THREE.Object3D {
    const container = new THREE.Group();
    container.name = "health_bar_container";

    // Background red bar
    const bgGeom = new THREE.PlaneGeometry(0.7 * scale, 0.08 * scale);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x220000, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeom, bgMat);
    container.add(bg);

    // Foreground green progress bar
    const fgGeom = new THREE.PlaneGeometry(0.7 * scale, 0.08 * scale);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const fg = new THREE.Mesh(fgGeom, fgMat);
    fg.position.z = 0.005; // hover slightly in front
    fg.name = "green_fill";
    container.add(fg);

    // Boss star indicator if they are extremely powerful
    return container;
  }

  /**
   * Render custom stylized 3D meshes for skeletons, knights, orcs, and bosses procedurally
   */
  private buildProceduralGraphics(type: EnemyType, bodyMesh: THREE.Group, colorStr: string, scale: number) {
    const enemyColor = new THREE.Color(colorStr);

    // Common standard materials
    const skinMat = new THREE.MeshStandardMaterial({ color: enemyColor, roughness: 0.8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#e6e4dc"), roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#555c66"), metalness: 0.9, roughness: 0.25 });
    const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const yellowEyeMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x0c011a }); // necromancer shadow

    switch (type) {
      case EnemyType.SKELETON: {
        // Skull Head
        const headGeom = new THREE.BoxGeometry(0.24 * scale, 0.24 * scale, 0.24 * scale);
        const head = new THREE.Mesh(headGeom, boneMat);
        head.position.set(0, 1.45 * scale, 0);
        bodyMesh.add(head);

        // Jaw block
        const jawGeom = new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.16 * scale);
        const jaw = new THREE.Mesh(jawGeom, boneMat);
        jaw.position.set(0, -0.13 * scale, 0.04 * scale);
        head.add(jaw);

        // Red glowing eyes
        const eyeGeom = new THREE.SphereGeometry(0.03 * scale, 4, 4);
        const leftEye = new THREE.Mesh(eyeGeom, redEyeMat);
        leftEye.position.set(-0.07 * scale, 0.02 * scale, 0.11 * scale);
        const rightEye = leftEye.clone();
        rightEye.position.x = 0.07 * scale;
        head.add(leftEye);
        head.add(rightEye);

        // Ribcage Chest Cylinder
        const chestGeom = new THREE.CylinderGeometry(0.18 * scale, 0.12 * scale, 0.6 * scale, 6);
        const chest = new THREE.Mesh(chestGeom, boneMat);
        chest.position.set(0, 1.0 * scale, 0);
        bodyMesh.add(chest);

        // Spine
        const spineGeom = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.4 * scale, 6);
        const spine = new THREE.Mesh(spineGeom, boneMat);
        spine.position.set(0, 0.6 * scale, 0);
        bodyMesh.add(spine);

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.04 * scale, 0.03 * scale, 0.6 * scale, 5);
        const leftLeg = new THREE.Mesh(legGeom, boneMat);
        leftLeg.position.set(-0.12 * scale, 0.3 * scale, 0);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.12 * scale;
        bodyMesh.add(leftLeg);
        bodyMesh.add(rightLeg);
        break;
      }

      case EnemyType.ARMORED_KNIGHT:
      case EnemyType.TOWER_GUARD: {
        // Knight Helm
        const helmGeom = new THREE.CylinderGeometry(0.2 * scale, 0.22 * scale, 0.32 * scale, 8);
        const helm = new THREE.Mesh(helmGeom, metalMat);
        helm.position.set(0, 1.45 * scale, 0);
        bodyMesh.add(helm);

        // Visor slit with glowing blue energy
        const visorGeom = new THREE.BoxGeometry(0.28 * scale, 0.05 * scale, 0.1 * scale);
        const energyMat = new THREE.MeshBasicMaterial({ color: type === EnemyType.TOWER_GUARD ? 0x00ffcc : 0x0099ff });
        const visor = new THREE.Mesh(visorGeom, energyMat);
        visor.position.set(0, 0.05 * scale, 0.14 * scale);
        helm.add(visor);

        // Crest plumage/spike
        const plumeGeom = new THREE.ConeGeometry(0.03 * scale, 0.25 * scale, 4);
        const plumeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(type === EnemyType.TOWER_GUARD ? "#cc0000" : "#ffaa00"), roughness: 0.7 });
        const plume = new THREE.Mesh(plumeGeom, plumeMat);
        plume.position.set(0, 0.25 * scale, -0.05 * scale);
        plume.rotation.x = -Math.PI / 6;
        helm.add(plume);

        // Plated Body Torso
        const torsoGeom = new THREE.BoxGeometry(0.55 * scale, 0.75 * scale, 0.35 * scale);
        const torso = new THREE.Mesh(torsoGeom, metalMat);
        torso.position.set(0, 0.9 * scale, 0);
        bodyMesh.add(torso);

        // Pauldrons (shoulder plates)
        const pauldronGeom = new THREE.SphereGeometry(0.16 * scale, 8, 8);
        const pauldronL = new THREE.Mesh(pauldronGeom, metalMat);
        pauldronL.position.set(-0.35 * scale, 1.2 * scale, 0);
        pauldronL.scale.set(1.2, 1, 1);
        const pauldronR = pauldronL.clone();
        pauldronR.position.x = 0.35 * scale;
        bodyMesh.add(pauldronL);
        bodyMesh.add(pauldronR);

        // Plated Boots Legs
        const legGeom = new THREE.BoxGeometry(0.18 * scale, 0.55 * scale, 0.18 * scale);
        const leftLeg = new THREE.Mesh(legGeom, metalMat);
        leftLeg.position.set(-0.16 * scale, 0.27 * scale, 0);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.16 * scale;
        bodyMesh.add(leftLeg);
        bodyMesh.add(rightLeg);
        break;
      }

      case EnemyType.ORC_BERSERKER: {
        // Chunky green skull
        const headGeom = new THREE.BoxGeometry(0.28 * scale, 0.25 * scale, 0.28 * scale);
        const head = new THREE.Mesh(headGeom, skinMat);
        head.position.set(0, 1.4 * scale, 0.05 * scale);
        bodyMesh.add(head);

        // Underbite teeth/tusks
        const tuskGeom = new THREE.ConeGeometry(0.04 * scale, 0.12 * scale, 4);
        const tuskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const leftTusk = new THREE.Mesh(tuskGeom, tuskMat);
        leftTusk.position.set(-0.09 * scale, -0.05 * scale, 0.14 * scale);
        leftTusk.rotation.x = Math.PI / 4;
        const rightTusk = leftTusk.clone();
        rightTusk.position.x = 0.09 * scale;
        head.add(leftTusk);
        head.add(rightTusk);

        // Yellow glowing eyes
        const eyeGeom = new THREE.SphereGeometry(0.04 * scale, 4, 4);
        const eyeL = new THREE.Mesh(eyeGeom, yellowEyeMat);
        eyeL.position.set(-0.07 * scale, 0.05 * scale, 0.12 * scale);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.07 * scale;
        head.add(eyeL);
        head.add(eyeR);

        // Massive muscular chest torso
        const torsoGeom = new THREE.CylinderGeometry(0.4 * scale, 0.25 * scale, 0.7 * scale, 8);
        const torso = new THREE.Mesh(torsoGeom, skinMat);
        torso.position.set(0, 0.9 * scale, 0);
        bodyMesh.add(torso);

        // Rusty metal shoulder straps / armor plates
        const ironPlateGeom = new THREE.BoxGeometry(0.48 * scale, 0.18 * scale, 0.34 * scale);
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x6e3d23, metalness: 0.7, roughness: 0.8 }); // rusty bronze
        const armorPlate = new THREE.Mesh(ironPlateGeom, armorMat);
        armorPlate.position.set(0, 1.15 * scale, 0);
        bodyMesh.add(armorPlate);

        // Bulky legs
        const legGeom = new THREE.CylinderGeometry(0.15 * scale, 0.1 * scale, 0.5 * scale, 8);
        const legL = new THREE.Mesh(legGeom, skinMat);
        legL.position.set(-0.16 * scale, 0.25 * scale, 0);
        const legR = legL.clone();
        legR.position.x = 0.16 * scale;
        bodyMesh.add(legL);
        bodyMesh.add(legR);
        break;
      }

      case EnemyType.BOSS_WARDEN: {
        // Massive Red spiked Helm
        const helmGeom = new THREE.BoxGeometry(0.35 * scale, 0.35 * scale, 0.35 * scale);
        const helmMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#4a1a1a"), metalness: 0.85, roughness: 0.3 });
        const helm = new THREE.Mesh(helmGeom, helmMat);
        helm.position.set(0, 1.5 * scale, 0);
        bodyMesh.add(helm);

        // Red central slit eye (Cylon/Cyclops look)
        const visorGeom = new THREE.BoxGeometry(0.28 * scale, 0.04 * scale, 0.04 * scale);
        const visor = new THREE.Mesh(visorGeom, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        visor.position.set(0, 0.05 * scale, 0.16 * scale);
        helm.add(visor);

        // Horns
        const hornGeom = new THREE.ConeGeometry(0.06 * scale, 0.35 * scale, 4);
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const hornL = new THREE.Mesh(hornGeom, hornMat);
        hornL.position.set(-0.16 * scale, 0.16 * scale, 0.05 * scale);
        hornL.rotation.z = Math.PI / 4;
        hornL.rotation.x = -Math.PI / 8;
        const hornR = hornL.clone();
        hornR.position.x = 0.16 * scale;
        hornR.rotation.z = -Math.PI / 4;
        helm.add(hornL);
        helm.add(hornR);

        // Enormous Spiked Red Plated Torso
        const torsoGeom = new THREE.BoxGeometry(0.7 * scale, 0.8 * scale, 0.5 * scale);
        const torso = new THREE.Mesh(torsoGeom, helmMat);
        torso.position.set(0, 0.9 * scale, 0);
        bodyMesh.add(torso);

        // Spikes on the pauldrons
        const pSpikeGeom = new THREE.ConeGeometry(0.05 * scale, 0.2 * scale, 4);
        const spikeR = new THREE.Mesh(pSpikeGeom, hornMat);
        spikeR.position.set(0.35 * scale, 1.25 * scale, 0);
        bodyMesh.add(spikeR);

        const legGeom = new THREE.BoxGeometry(0.25 * scale, 0.5 * scale, 0.25 * scale);
        const leftLeg = new THREE.Mesh(legGeom, helmMat);
        leftLeg.position.set(-0.2 * scale, 0.25 * scale, 0);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.2 * scale;
        bodyMesh.add(leftLeg);
        bodyMesh.add(rightLeg);
        break;
      }

      case EnemyType.BOSS_GOLEM: {
        // Giant gray granite blocky sections
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4f59, roughness: 0.95 });
        const crackMat = new THREE.MeshBasicMaterial({ color: 0xff4400 }); // glowing lava vein cracks

        const headGeom = new THREE.BoxGeometry(0.32 * scale, 0.3 * scale, 0.32 * scale);
        const head = new THREE.Mesh(headGeom, stoneMat);
        head.position.set(0, 1.45 * scale, 0.05 * scale);
        bodyMesh.add(head);

        // Central lava line
        const crackGeom = new THREE.BoxGeometry(0.04 * scale, 0.32 * scale, 0.33 * scale);
        const crack = new THREE.Mesh(crackGeom, crackMat);
        head.add(crack);

        // Massive boulder torso
        const torsoGeom = new THREE.DodecahedronGeometry(0.52 * scale, 1);
        const torso = new THREE.Mesh(torsoGeom, stoneMat);
        torso.position.set(0, 0.9 * scale, 0);
        torso.scale.set(1.1, 0.9, 1);
        bodyMesh.add(torso);

        // Heavy stump legs
        const legGeom = new THREE.BoxGeometry(0.28 * scale, 0.45 * scale, 0.28 * scale);
        const legL = new THREE.Mesh(legGeom, stoneMat);
        legL.position.set(-0.25 * scale, 0.22 * scale, 0);
        const legR = legL.clone();
        legR.position.x = 0.25 * scale;
        bodyMesh.add(legL);
        bodyMesh.add(legR);
        break;
      }

      case EnemyType.BOSS_NECROMANCER: {
        // Deep shadow dark cloak
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x150b24, roughness: 0.9 });
        const purpleMat = new THREE.MeshStandardMaterial({ color: 0x5a189a, roughness: 0.8 });

        // Hooded head
        const hoodGeom = new THREE.SphereGeometry(0.24 * scale, 8, 8);
        const hood = new THREE.Mesh(hoodGeom, robeMat);
        hood.position.set(0, 1.45 * scale, 0);
        hood.scale.set(1, 1.1, 1);
        bodyMesh.add(hood);

        // Pitch black face inside hood
        const faceGeom = new THREE.SphereGeometry(0.18 * scale, 8, 8);
        const face = new THREE.Mesh(faceGeom, voidMat);
        face.position.set(0, 0, 0.06 * scale);
        hood.add(face);

        // Glowing violet skull eyes
        const eyeGeom = new THREE.SphereGeometry(0.035 * scale, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe0aaff });
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-0.06 * scale, 0.02 * scale, 0.14 * scale);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.06 * scale;
        face.add(eyeL);
        face.add(eyeR);

        // Elegant floating robed torso
        const torsoGeom = new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, 0.8 * scale, 8);
        const torso = new THREE.Mesh(torsoGeom, robeMat);
        torso.position.set(0, 0.9 * scale, 0);
        bodyMesh.add(torso);

        // Purple collar plates
        const collarGeom = new THREE.CylinderGeometry(0.28 * scale, 0.28 * scale, 0.12 * scale, 8);
        const collar = new THREE.Mesh(collarGeom, purpleMat);
        collar.position.set(0, 1.3 * scale, 0);
        bodyMesh.add(collar);

        // Shoulder robes (draped sleeves)
        const sleeveGeom = new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, 0.45 * scale, 6);
        const sleeveL = new THREE.Mesh(sleeveGeom, robeMat);
        sleeveL.position.set(-0.35 * scale, 1.0 * scale, 0);
        sleeveL.rotation.z = Math.PI / 6;
        const sleeveR = sleeveL.clone();
        sleeveR.position.x = 0.35 * scale;
        sleeveR.rotation.z = -Math.PI / 6;
        bodyMesh.add(sleeveL);
        bodyMesh.add(sleeveR);
        break;
      }
    }
  }

  /**
   * Run the behavioral frame for an active enemy (chasing player, winding up attacks, recovering from hit)
   */
  tickAI(
    enemy: EnemyInstance,
    dt: number,
    playerPos: THREE.Vector3,
    currentTime: number
  ) {
    if (enemy.state === 'dying') return;

    // Is stunned?
    if (currentTime < enemy.stunUntil) {
      enemy.state = 'stunned';
      enemy.velocity.x *= Math.pow(0.1, dt); // rapidly bleed horizontal momentum from impact
      enemy.velocity.z *= Math.pow(0.1, dt);
      
      // Play shaking jitter visual
      if (enemy.bodyMesh) {
        enemy.bodyMesh.position.x = (Math.sin(currentTime * 40) * 0.05) * enemy.scale;
        enemy.bodyMesh.position.z = (Math.cos(currentTime * 40) * 0.05) * enemy.scale;
      }
      return;
    }

    // Restore body mesh positions if recovering from stun
    if (enemy.state === 'stunned') {
      enemy.state = 'idle';
      if (enemy.bodyMesh) {
        enemy.bodyMesh.position.set(0, 0, 0);
      }
    }

    // Pathing towards the player
    const stats = ENEMY_REGISTRY[enemy.type];
    const dx = playerPos.x - enemy.position.x;
    const dz = playerPos.z - enemy.position.z;
    const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Keep distance-based states
    if (distanceToPlayer < stats.attackReach * enemy.scale) {
      // Within attack range!
      if (currentTime >= enemy.attackCooldownUntil) {
        // Trigger attack wind-up!
        enemy.state = 'attacking';
        // Cooldown starts (wind-up is 400ms, then actual hit frame)
        enemy.attackCooldownUntil = currentTime + stats.attackCooldown;
      }
    } else {
      // Too far, chase player
      enemy.state = 'chasing';
    }

    // Apply motion states
    if (enemy.state === 'chasing') {
      // Face the player
      enemy.direction.set(dx, 0, dz).normalize();
      
      // Interpolate body rotation
      if (enemy.bodyMesh) {
        const targetAngle = Math.atan2(-dx, -dz);
        // smooth rotate
        const currentAngle = enemy.bodyMesh.rotation.y;
        let diff = targetAngle - currentAngle;
        // wrap angle
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        enemy.bodyMesh.rotation.y += diff * dt * 6;

        // Walking tilt/bobbing
        enemy.bodyMesh.position.y = Math.sin(currentTime * 8) * 0.05 * enemy.scale;
        
        // Sway arms
        if (enemy.leftHandMesh && enemy.rightHandMesh) {
          enemy.leftHandMesh.rotation.x = Math.sin(currentTime * 8) * 0.4;
          enemy.rightHandMesh.rotation.x = -Math.sin(currentTime * 8) * 0.4;
        }
      }

      // Apply movement speed towards player
      const activeSpeed = stats.speed * (enemy.isBoss ? 1.1 : 1.0);
      enemy.velocity.x += enemy.direction.x * activeSpeed * dt * 10;
      enemy.velocity.z += enemy.direction.z * activeSpeed * dt * 10;
    } 
    else if (enemy.state === 'attacking') {
      // Turn directly to face player instantly when swinging
      enemy.direction.set(dx, 0, dz).normalize();
      if (enemy.bodyMesh) {
        enemy.bodyMesh.rotation.y = Math.atan2(-dx, -dz);
        enemy.bodyMesh.position.y = 0;
      }

      // Lunge forward slightly during attack
      const activeSpeed = stats.speed * 1.5;
      enemy.velocity.x += enemy.direction.x * activeSpeed * dt * 4;
      enemy.velocity.z += enemy.direction.z * activeSpeed * dt * 4;

      // Attack visual: wind back, then chop forward
      const attackProgress = (stats.attackCooldown - (enemy.attackCooldownUntil - currentTime)) / stats.attackCooldown;
      if (enemy.rightHandMesh) {
        if (attackProgress < 0.25) {
          // Wind up: Lift weapon back/high
          enemy.rightHandMesh.rotation.x = -Math.PI / 3;
          enemy.rightHandMesh.rotation.y = -Math.PI / 6;
        } else if (attackProgress < 0.55) {
          // Swing forward: Chop down hard
          enemy.rightHandMesh.rotation.x = Math.PI / 2.2;
          enemy.rightHandMesh.rotation.y = Math.PI / 8;
        } else {
          // Recover to neutral holding position
          enemy.rightHandMesh.rotation.x = THREE.MathUtils.lerp(enemy.rightHandMesh.rotation.x, 0, dt * 5);
          enemy.rightHandMesh.rotation.y = THREE.MathUtils.lerp(enemy.rightHandMesh.rotation.y, 0, dt * 5);
        }
      }
    }
    else {
      // Idle
      if (enemy.bodyMesh) {
        enemy.bodyMesh.position.y = THREE.MathUtils.lerp(enemy.bodyMesh.position.y, 0, dt * 5);
        if (enemy.leftHandMesh && enemy.rightHandMesh) {
          enemy.leftHandMesh.rotation.x = THREE.MathUtils.lerp(enemy.leftHandMesh.rotation.x, 0, dt * 5);
          enemy.rightHandMesh.rotation.x = THREE.MathUtils.lerp(enemy.rightHandMesh.rotation.x, 0, dt * 5);
        }
      }
    }
  }

  /**
   * Redraw floating health-bar fills in VR
   */
  updateHealthBar(enemy: EnemyInstance, camera: THREE.Camera) {
    if (!enemy.healthBarMesh || !enemy.mesh) return;

    // Look at camera
    enemy.healthBarMesh.lookAt(camera.position);

    // Scaling the green fill plane based on remaining health percentage
    const greenFill = enemy.healthBarMesh.getObjectByName("green_fill") as THREE.Mesh;
    if (greenFill) {
      const pct = Math.max(0, Math.min(1.0, enemy.health / enemy.maxHealth));
      greenFill.scale.x = pct;
      
      // Shift pivot position so it scales from left to right instead of center
      const originalWidth = 0.7 * enemy.scale;
      greenFill.position.x = - (originalWidth * (1.0 - pct)) / 2;

      // Color coding (green -> yellow -> red)
      const material = greenFill.material as THREE.MeshBasicMaterial;
      if (pct > 0.5) {
        material.color.setHex(0x00ff00); // Green
      } else if (pct > 0.2) {
        material.color.setHex(0xffaa00); // Orange-Yellow
      } else {
        material.color.setHex(0xff0000); // Red
      }
    }
  }
}
