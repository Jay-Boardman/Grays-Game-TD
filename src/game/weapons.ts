/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WeaponType, WEAPON_REGISTRY, WeaponStats, DroppedWeapon } from '../types';

export class WeaponVisualBuilder {
  private materials: Record<string, THREE.Material> = {};

  constructor() {}

  /**
   * Helper to cache materials to prevent memory leaks and garbage collection stutters
   */
  private getMaterial(colorStr: string, metalness: number, roughness: number, emissive: boolean = false): THREE.Material {
    const key = `${colorStr}_${metalness}_${roughness}_${emissive}`;
    if (this.materials[key]) {
      return this.materials[key];
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorStr),
      metalness: metalness,
      roughness: roughness,
      emissive: emissive ? new THREE.Color(colorStr).multiplyScalar(0.25) : new THREE.Color(0x000000)
    });
    
    this.materials[key] = material;
    return material;
  }

  /**
   * Create a 3D procedural mesh for a specific WeaponType
   */
  createWeaponMesh(type: WeaponType): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `weapon_${type}`;
    const stats = WEAPON_REGISTRY[type];

    const weaponColor = stats.color;
    const metalMat = this.getMaterial(weaponColor, stats.metalness, stats.roughness);
    const gripMat = this.getMaterial("#3d2314", 0.1, 0.9); // dark leather grip
    const goldMat = this.getMaterial("#d4af37", 0.9, 0.1); // gold detailing
    const steelMat = this.getMaterial("#708090", 0.9, 0.2); // generic dark steel

    switch (type) {
      case WeaponType.FISTS: {
        // Bare hands don't draw a massive weapon mesh, just a glove/fist mesh
        const fistGeom = new THREE.SphereGeometry(0.12, 8, 8);
        const fistMesh = new THREE.Mesh(fistGeom, this.getMaterial("#e0b094", 0.0, 0.8));
        fistMesh.position.set(0, 0, -0.1);
        group.add(fistMesh);
        break;
      }

      case WeaponType.DAGGER: {
        // Hilt
        const hiltGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
        const hilt = new THREE.Mesh(hiltGeom, gripMat);
        hilt.rotation.x = Math.PI / 2;
        group.add(hilt);

        // Guard
        const guardGeom = new THREE.BoxGeometry(0.12, 0.03, 0.03);
        const guard = new THREE.Mesh(guardGeom, goldMat);
        guard.position.set(0, 0.1, 0);
        group.add(guard);

        // Blade
        const bladeGeom = new THREE.ConeGeometry(0.04, 0.45, 4);
        const blade = new THREE.Mesh(bladeGeom, metalMat);
        blade.scale.set(0.3, 1.0, 1.0); // Flat dagger shape
        blade.position.set(0, 0.325, 0);
        group.add(blade);
        break;
      }

      case WeaponType.WOODEN_CLUB: {
        // Handle
        const handleGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
        const handle = new THREE.Mesh(handleGeom, this.getMaterial("#5c3a21", 0.05, 0.95));
        handle.rotation.x = Math.PI / 2;
        group.add(handle);

        // Large spiked head
        const headGeom = new THREE.CylinderGeometry(0.16, 0.08, 0.7, 8);
        const head = new THREE.Mesh(headGeom, metalMat);
        head.position.set(0, 0.4, 0);
        group.add(head);

        // Procedural spikes
        const spikeGeom = new THREE.ConeGeometry(0.03, 0.1, 4);
        const spikeMat = this.getMaterial("#a0a0a0", 0.8, 0.3);
        for (let i = 0; i < 8; i++) {
          const spike = new THREE.Mesh(spikeGeom, spikeMat);
          const angle = (i / 8) * Math.PI * 2;
          const h = 0.2 + (i % 3) * 0.15;
          spike.position.set(Math.cos(angle) * 0.13, h, Math.sin(angle) * 0.13);
          spike.rotation.z = -angle - Math.PI / 2;
          head.add(spike);
        }
        break;
      }

      case WeaponType.IRON_SWORD: {
        // Grip/Hilt
        const hiltGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
        const hilt = new THREE.Mesh(hiltGeom, gripMat);
        hilt.rotation.x = Math.PI / 2;
        group.add(hilt);

        // Pommel
        const pommelGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const pommel = new THREE.Mesh(pommelGeom, goldMat);
        pommel.position.set(0, -0.22, 0);
        group.add(pommel);

        // Guard
        const guardGeom = new THREE.BoxGeometry(0.3, 0.04, 0.05);
        const guard = new THREE.Mesh(guardGeom, goldMat);
        guard.position.set(0, 0.2, 0);
        group.add(guard);

        // Blade
        const bladeGeom = new THREE.BoxGeometry(0.08, 1.1, 0.018);
        const blade = new THREE.Mesh(bladeGeom, metalMat);
        blade.position.set(0, 0.75, 0);
        group.add(blade);

        // Tip
        const tipGeom = new THREE.ConeGeometry(0.04, 0.12, 4);
        const tip = new THREE.Mesh(tipGeom, metalMat);
        tip.scale.set(2, 1, 0.45);
        tip.rotation.y = Math.PI / 4;
        tip.position.set(0, 1.36, 0);
        group.add(tip);
        break;
      }

      case WeaponType.MACE: {
        // Long steel shaft
        const shaftGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8);
        const shaft = new THREE.Mesh(shaftGeom, steelMat);
        shaft.position.set(0, 0.25, 0);
        group.add(shaft);

        // Grip cover
        const leatherGripGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
        const leatherGrip = new THREE.Mesh(leatherGripGeom, gripMat);
        leatherGrip.position.set(0, 0.1, 0);
        group.add(leatherGrip);

        // Flanged Mace Head
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.7, 0);
        
        const coreGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
        const core = new THREE.Mesh(coreGeom, metalMat);
        headGroup.add(core);

        // Flanges (wings)
        const wingGeom = new THREE.BoxGeometry(0.18, 0.3, 0.03);
        for (let i = 0; i < 4; i++) {
          const wing = new THREE.Mesh(wingGeom, metalMat);
          wing.rotation.y = (i * Math.PI) / 4;
          headGroup.add(wing);
        }

        // Top spike
        const topSpikeGeom = new THREE.ConeGeometry(0.04, 0.15, 6);
        const topSpike = new THREE.Mesh(topSpikeGeom, steelMat);
        topSpike.position.set(0, 0.22, 0);
        headGroup.add(topSpike);

        group.add(headGroup);
        break;
      }

      case WeaponType.BATTLEAXE: {
        // Enormous wooden shaft
        const shaftGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
        const shaft = new THREE.Mesh(shaftGeom, this.getMaterial("#402210", 0.0, 0.95));
        shaft.position.set(0, 0.4, 0);
        group.add(shaft);

        // Leather wrap
        const wrapGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8);
        const wrap = new THREE.Mesh(wrapGeom, gripMat);
        wrap.position.set(0, 0.1, 0);
        group.add(wrap);

        // Twin iron crescent blades
        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(0, 0.9, 0);

        // Central metal bracket
        const bracketGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8);
        const bracket = new THREE.Mesh(bracketGeom, steelMat);
        bladeGroup.add(bracket);

        // Left blade
        const shapeLeft = new THREE.Shape();
        shapeLeft.moveTo(0, -0.15);
        shapeLeft.quadraticCurveTo(-0.25, -0.3, -0.45, -0.2);
        shapeLeft.quadraticCurveTo(-0.48, 0, -0.45, 0.2);
        shapeLeft.quadraticCurveTo(-0.25, 0.3, 0, 0.15);
        shapeLeft.closePath();

        const extrudeSettings = { depth: 0.02, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 };
        const geomLeft = new THREE.ExtrudeGeometry(shapeLeft, extrudeSettings);
        geomLeft.center();
        const meshLeft = new THREE.Mesh(geomLeft, metalMat);
        meshLeft.position.set(-0.24, 0, 0);
        bladeGroup.add(meshLeft);

        // Right blade (mirrored)
        const meshRight = meshLeft.clone();
        meshRight.position.set(0.24, 0, 0);
        meshRight.rotation.z = Math.PI;
        bladeGroup.add(meshRight);

        // Top metal point
        const pointGeom = new THREE.ConeGeometry(0.04, 0.2, 4);
        const point = new THREE.Mesh(pointGeom, steelMat);
        point.position.set(0, 0.18, 0);
        bladeGroup.add(point);

        group.add(bladeGroup);
        break;
      }

      case WeaponType.SHIELD: {
        // Enormous circular shield
        const shieldGroup = new THREE.Group();
        
        // Face of shield
        const shieldFaceGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16);
        const faceMesh = new THREE.Mesh(shieldFaceGeom, this.getMaterial("#223344", 0.4, 0.6));
        faceMesh.rotation.x = Math.PI / 2;
        shieldGroup.add(faceMesh);

        // Steel outer ring
        const ringGeom = new THREE.TorusGeometry(0.48, 0.03, 8, 24);
        const ringMesh = new THREE.Mesh(ringGeom, steelMat);
        ringMesh.position.set(0, 0, 0.01);
        shieldGroup.add(ringMesh);

        // Golden center boss
        const bossGeom = new THREE.SphereGeometry(0.12, 12, 12);
        const bossMesh = new THREE.Mesh(bossGeom, goldMat);
        bossMesh.scale.set(1, 1, 0.5);
        bossMesh.position.set(0, 0, 0.03);
        shieldGroup.add(bossMesh);

        // Iron cross bands on the face
        const bandHorizGeom = new THREE.BoxGeometry(0.9, 0.06, 0.01);
        const bandHoriz = new THREE.Mesh(bandHorizGeom, steelMat);
        bandHoriz.position.set(0, 0, 0.01);
        shieldGroup.add(bandHoriz);

        const bandVertGeom = new THREE.BoxGeometry(0.06, 0.9, 0.01);
        const bandVert = new THREE.Mesh(bandVertGeom, steelMat);
        bandVert.position.set(0, 0, 0.01);
        shieldGroup.add(bandVert);

        // Back handle strap
        const handleStrapGeom = new THREE.BoxGeometry(0.15, 0.04, 0.03);
        const strap = new THREE.Mesh(handleStrapGeom, gripMat);
        strap.position.set(0, 0, -0.06);
        shieldGroup.add(strap);

        group.add(shieldGroup);
        break;
      }
    }

    // Cast & Receive Shadows on all children of the group
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  /**
   * Adjust standard hand orientation of holding weapon based on its type
   */
  orientWeaponInHand(mesh: THREE.Object3D, type: WeaponType, isLeftHand: boolean) {
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);

    if (type === WeaponType.FISTS) {
      mesh.position.set(isLeftHand ? -0.15 : 0.15, -0.1, -0.2);
    } else if (type === WeaponType.SHIELD) {
      mesh.rotation.y = isLeftHand ? Math.PI / 2.5 : -Math.PI / 2.5;
      mesh.rotation.x = -Math.PI / 6;
      mesh.position.set(isLeftHand ? -0.25 : 0.25, -0.05, -0.2);
      mesh.scale.set(0.8, 0.8, 0.8);
    } else {
      // Slanted forward holding grip
      mesh.rotation.x = -Math.PI / 2.2; // hold forward
      mesh.rotation.y = isLeftHand ? -Math.PI / 12 : Math.PI / 12;
      mesh.position.set(isLeftHand ? -0.2 : 0.2, -0.15, -0.3);
      
      // Fine position adjustments per weapon type
      if (type === WeaponType.DAGGER) {
        mesh.scale.set(0.85, 0.85, 0.85);
        mesh.position.y += 0.05;
      } else if (type === WeaponType.BATTLEAXE) {
        mesh.position.y -= 0.15;
        mesh.position.z -= 0.1;
      } else if (type === WeaponType.WOODEN_CLUB) {
        mesh.position.y -= 0.05;
      }
    }
  }

  /**
   * Helper to spawn a physical dropped weapon on the ground
   */
  createDroppedWeapon(
    type: WeaponType, 
    position: THREE.Vector3, 
    velocity: THREE.Vector3
  ): DroppedWeapon {
    const id = `weapon_drop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Create the visual model
    const visualGroup = new THREE.Group();
    visualGroup.name = `dropped_weapon_group_${id}`;

    // Main weapon mesh inside the spinner group
    const weaponMesh = this.createWeaponMesh(type);
    
    // Position weapon mesh horizontally for lying on the ground nicely or spinning
    weaponMesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI * 2);
    visualGroup.add(weaponMesh);

    // Glowing halo ring underneath to draw user attention to scavenge
    const ringGeom = new THREE.RingGeometry(0.35, 0.42, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(WEAPON_REGISTRY[type].color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -0.05; // hover just above floor
    visualGroup.add(ringMesh);

    // Floating dynamic point light to illuminate the area
    const light = new THREE.PointLight(
      new THREE.Color(WEAPON_REGISTRY[type].color),
      0.4,
      3.0
    );
    light.position.set(0, 0.5, 0);
    visualGroup.add(light);

    // Add visual bouncing/glowing indicators
    return {
      id,
      position: position.clone(),
      velocity: velocity.clone(),
      radius: 0.6,
      height: 0.4,
      isGrounded: false,
      mass: 0.8,
      type,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4 + 2, // Prefer horizontal spinning
        (Math.random() - 0.5) * 4
      ),
      bounceHeight: Math.random() * 100, // random offset for floating hover bobbing
      spawnTime: Date.now(),
      mesh: visualGroup
    };
  }
}
