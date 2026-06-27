/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { PhysicalObject, PlayerState, EnemyInstance, DroppedWeapon } from '../types';

export class PhysicsEngine {
  gravity: number = -16.0; // Units/s^2, slightly low for floaty fun
  floorY: number = 0;
  friction: number = 0.85; // Air friction
  groundFriction: number = 0.6; // Floor friction for sliding weapons

  // Columns / Pillars in the room for visual and physical obstacles
  pillars: { position: THREE.Vector3; radius: number; height: number }[] = [];

  constructor() {}

  /**
   * Reset pillars for a given floor to create unique layouts
   */
  generatePillars(towerRadius: number, count: number = 4) {
    this.pillars = [];
    if (count === 0) return;

    // Generate symmetrical pillars
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.PI / count;
      const distance = towerRadius * 0.45; // Placement radius
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      this.pillars.push({
        position: new THREE.Vector3(x, 0, z),
        radius: 1.4,
        height: 10
      });
    }
  }

  /**
   * Update position and velocity of a physical object with gravity, boundaries, and friction.
   */
  updateObject(obj: PhysicalObject, dt: number, towerRadius: number) {
    if (dt <= 0) return;
    if (dt > 0.1) dt = 0.1; // Cap time step to avoid massive jumps on lag

    // Apply gravity
    if (!obj.isGrounded) {
      obj.velocity.y += this.gravity * dt;
    }

    // Apply air resistance/friction
    obj.velocity.x *= Math.pow(this.friction, dt * 10);
    obj.velocity.z *= Math.pow(this.friction, dt * 10);

    // Update position
    obj.position.x += obj.velocity.x * dt;
    obj.position.y += obj.velocity.y * dt;
    obj.position.z += obj.velocity.z * dt;

    // Floor collision
    if (obj.position.y <= this.floorY) {
      obj.position.y = this.floorY;
      obj.velocity.y = 0;
      obj.isGrounded = true;
    } else {
      obj.isGrounded = false;
    }

    // Outer cylinder wall boundary collision (the Tower Walls)
    const distFromCenter = Math.sqrt(obj.position.x * obj.position.x + obj.position.z * obj.position.z);
    const limit = towerRadius - obj.radius;
    if (distFromCenter > limit) {
      // Push back inside
      const angle = Math.atan2(obj.position.z, obj.position.x);
      obj.position.x = Math.cos(angle) * limit;
      obj.position.z = Math.sin(angle) * limit;

      // Bounce velocity slightly
      const normalX = -Math.cos(angle);
      const normalZ = -Math.sin(angle);
      
      // Reflect velocity vector
      const dot = obj.velocity.x * normalX + obj.velocity.z * normalZ;
      if (dot < 0) {
        obj.velocity.x -= 2 * dot * normalX * 0.4;
        obj.velocity.z -= 2 * dot * normalZ * 0.4;
      }
    }

    // Pillar Collisions
    for (const pillar of this.pillars) {
      const dx = obj.position.x - pillar.position.x;
      const dz = obj.position.z - pillar.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = pillar.radius + obj.radius;

      if (dist < minDist) {
        // Collision detected! Push out.
        const angle = Math.atan2(dz, dx);
        obj.position.x = pillar.position.x + Math.cos(angle) * minDist;
        obj.position.z = pillar.position.z + Math.sin(angle) * minDist;

        const normalX = Math.cos(angle);
        const normalZ = Math.sin(angle);

        // Reflect velocity
        const dot = obj.velocity.x * normalX + obj.velocity.z * normalZ;
        if (dot < 0) {
          obj.velocity.x -= 2 * dot * normalX * 0.4;
          obj.velocity.z -= 2 * dot * normalZ * 0.4;
        }
      }
    }

    // Sync mesh if it exists
    if (obj.mesh) {
      obj.mesh.position.copy(obj.position);
    }
  }

  /**
   * Handle weapon physics (spinning, bouncing, sliding)
   */
  updateWeapon(weapon: DroppedWeapon, dt: number, towerRadius: number) {
    if (dt <= 0) return;
    if (dt > 0.1) dt = 0.1;

    // Apply gravity
    if (!weapon.isGrounded) {
      weapon.velocity.y += this.gravity * dt;
    } else {
      // Weapon on the ground slides with higher friction
      weapon.velocity.x *= Math.pow(this.groundFriction, dt * 10);
      weapon.velocity.z *= Math.pow(this.groundFriction, dt * 10);
      
      // Stop completely if slow enough
      if (Math.abs(weapon.velocity.x) < 0.1) weapon.velocity.x = 0;
      if (Math.abs(weapon.velocity.z) < 0.1) weapon.velocity.z = 0;
      
      // Slowly stop rotating when grounded
      weapon.rotSpeed.multiplyScalar(Math.pow(0.5, dt * 10));
    }

    // Update position
    weapon.position.x += weapon.velocity.x * dt;
    weapon.position.y += weapon.velocity.y * dt;
    weapon.position.z += weapon.velocity.z * dt;

    // Floor collision and bounce
    if (weapon.position.y <= this.floorY + 0.1) {
      weapon.position.y = this.floorY + 0.1;
      
      if (Math.abs(weapon.velocity.y) > 1.5) {
        // Bounce!
        weapon.velocity.y = -weapon.velocity.y * 0.4; // coefficient of restitution
        weapon.rotSpeed.x += (Math.random() - 0.5) * 5;
        weapon.rotSpeed.y += (Math.random() - 0.5) * 5;
        weapon.rotSpeed.z += (Math.random() - 0.5) * 5;
      } else {
        weapon.velocity.y = 0;
        weapon.isGrounded = true;
      }
    } else {
      weapon.isGrounded = false;
    }

    // Wall constraints
    const distFromCenter = Math.sqrt(weapon.position.x * weapon.position.x + weapon.position.z * weapon.position.z);
    const limit = towerRadius - weapon.radius;
    if (distFromCenter > limit) {
      const angle = Math.atan2(weapon.position.z, weapon.position.x);
      weapon.position.x = Math.cos(angle) * limit;
      weapon.position.z = Math.sin(angle) * limit;

      const normalX = -Math.cos(angle);
      const normalZ = -Math.sin(angle);

      const dot = weapon.velocity.x * normalX + weapon.velocity.z * normalZ;
      if (dot < 0) {
        weapon.velocity.x -= 2 * dot * normalX * 0.5;
        weapon.velocity.z -= 2 * dot * normalZ * 0.5;
        weapon.rotSpeed.multiplyScalar(1.2);
      }
    }

    // Pillar collision for weapon
    for (const pillar of this.pillars) {
      const dx = weapon.position.x - pillar.position.x;
      const dz = weapon.position.z - pillar.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = pillar.radius + weapon.radius;

      if (dist < minDist) {
        const angle = Math.atan2(dz, dx);
        weapon.position.x = pillar.position.x + Math.cos(angle) * minDist;
        weapon.position.z = pillar.position.z + Math.sin(angle) * minDist;

        const normalX = Math.cos(angle);
        const normalZ = Math.sin(angle);

        const dot = weapon.velocity.x * normalX + weapon.velocity.z * normalZ;
        if (dot < 0) {
          weapon.velocity.x -= 2 * dot * normalX * 0.5;
          weapon.velocity.z -= 2 * dot * normalZ * 0.5;
        }
      }
    }

    // Sync mesh rotation and position
    if (weapon.mesh) {
      weapon.mesh.position.copy(weapon.position);
      weapon.mesh.rotation.x += weapon.rotSpeed.x * dt;
      weapon.mesh.rotation.y += weapon.rotSpeed.y * dt;
      weapon.mesh.rotation.z += weapon.rotSpeed.z * dt;
    }
  }

  /**
   * Resolve overlapping collisions between two active entities (Player/Enemy or Enemy/Enemy)
   * This is a realistic elastic recoil that resolves clipping instantly!
   */
  resolveElasticCollision(ent1: PhysicalObject, ent2: PhysicalObject, repulsion: number = 0.5) {
    const dx = ent2.position.x - ent1.position.x;
    const dz = ent2.position.z - ent1.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = ent1.radius + ent2.radius;

    if (dist < minDist && dist > 0.01) {
      // Push overlap resolution
      const overlap = minDist - dist;
      const pushX = (dx / dist) * overlap * repulsion;
      const pushZ = (dz / dist) * overlap * repulsion;

      // Adjust positions based on mass ratios
      const totalMass = ent1.mass + ent2.mass;
      const ratio1 = ent2.mass / totalMass;
      const ratio2 = ent1.mass / totalMass;

      ent1.position.x -= pushX * ratio1;
      ent1.position.z -= pushZ * ratio1;
      ent2.position.x += pushX * ratio2;
      ent2.position.z += pushZ * ratio2;

      // Swap a portion of their velocities for realistic bounce impact
      const normalX = dx / dist;
      const normalZ = dz / dist;

      const relativeVelocityX = ent2.velocity.x - ent1.velocity.x;
      const relativeVelocityZ = ent2.velocity.z - ent1.velocity.z;

      const velAlongNormal = relativeVelocityX * normalX + relativeVelocityZ * normalZ;

      if (velAlongNormal < 0) {
        // Restitution coefficient (elasticity)
        const restitution = 0.4;
        const impulseScalar = -(1 + restitution) * velAlongNormal / (1/ent1.mass + 1/ent2.mass);

        const impulseX = impulseScalar * normalX;
        const impulseZ = impulseScalar * normalZ;

        ent1.velocity.x -= impulseX / ent1.mass;
        ent1.velocity.z -= impulseZ / ent1.mass;
        ent2.velocity.x += impulseX / ent2.mass;
        ent2.velocity.z += impulseZ / ent2.mass;
      }
    }
  }

  /**
   * Check if a weapon strike hits an entity based on reach, angle, and physical swept-volume.
   * Returns details of hit (force vector, location)
   */
  checkStrikeHit(
    attackerPos: THREE.Vector3,
    attackerLookDir: THREE.Vector3,
    victim: PhysicalObject,
    reach: number,
    angleSpread: number = Math.PI / 2.2 // ~80 degrees cone
  ): { hit: boolean; pushVector: THREE.Vector3 } {
    const pushVector = new THREE.Vector3();
    
    // Height bounding box check
    const heightDiff = Math.abs(attackerPos.y - victim.position.y);
    if (heightDiff > Math.max(victim.height, 2.0)) {
      return { hit: false, pushVector };
    }

    const dx = victim.position.x - attackerPos.x;
    const dz = victim.position.z - attackerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Is within physical sweep reach?
    if (dist < reach + victim.radius) {
      // Calculate angle between attacker looking direction and victim direction
      const victimDir = new THREE.Vector3(dx, 0, dz).normalize();
      const look2D = new THREE.Vector3(attackerLookDir.x, 0, attackerLookDir.z).normalize();
      const dot = look2D.dot(victimDir);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

      if (angle <= angleSpread) {
        // Calculate dynamic push back vector based on direction of strike
        pushVector.copy(victimDir).multiplyScalar(1); // Standard normal hit push
        return { hit: true, pushVector };
      }
    }

    return { hit: false, pushVector };
  }
}
