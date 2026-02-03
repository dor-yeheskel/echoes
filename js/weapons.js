/* ========= BOMBS ========= */

function getBombImpactPointFrom(lat, lng, heading, speed) {
  const t = speed / CONFIG_DEFAULTS.accel;              // seconds
  const dist = 0.5 * (speed / 3.6) * t;                // meters
  return move(lat, lng, heading, dist);
}


function getBombImpactPoint() {
return getBombImpactPointFrom(state.lat, state.lng, state.heading, state.speed);
}


function dropBomb() {
  if (state.gameOver || !state.gameStarted) return;
  if (state.maxBombs <= 0) return;
  if (state.bombs <= 0) return;

  playSound("release_bomb");
  state.bombs--;
  state.bombsUsed = (state.bombsUsed || 0) + 1;
  updateHUD();

  const bomb = {
    lat: state.lat,
    lng: state.lng,
    heading: state.heading,
    speed: state.speed,
    predicted: getBombImpactPointFrom(state.lat, state.lng, state.heading, state.speed),
 
    marker: L.marker([state.lat, state.lng], {
      icon: L.divIcon({ html: "💣", className: "bomb" })
    }).addTo(layerBombs)
  };

  entities.bombs.push(bomb);
}

function explodeBomb(bomb) {
  layerBombs.removeLayer(bomb.marker);

  let hitSomething = false;
  let destroySomething = false;

  explosionEffect(bomb.lat, bomb.lng);

  // ===== unified damage logic (targets + radars) =====
  function checkHit(entity, radius) {
    const d = distance(bomb, entity);

    let dmg = 0;
    if (d < radius * 0.7) dmg = 1;

    if (dmg > 0) {
      hitSomething = true;
      const destroyed = applyDamage(entity, dmg);
      if (destroyed) destroySomething = true;
      return destroyed;
    }
    return false;
  }

  // targets
  for (let i = entities.targets.length - 1; i >= 0; i--) {
    const t = entities.targets[i];

    if (checkHit(t, getTargetHitRadius(t.size))) {
      layerTargets.removeLayer(t.marker);
      entities.targets.splice(i, 1);
      entities.remainingTargets = entities.targets.length;

      if (entities.remainingTargets <= 0 && !state.gameOver) {
        state.gameOver = true;
        setTimeout(() => victoryHandler(), 600);
      }
    }
  }

  // radars
  for (let i = entities.radars.length - 1; i >= 0; i--) {
    const r = entities.radars[i];
    if (!r.alive) continue;

    if (checkHit(r, getRadarHitRadius(r.size))) {
      r.alive = false;
      state.destroyedRadars++;
      layerRadars.removeLayer(r.marker);
      layerRadars.removeLayer(r.circle);
    }
  }
  playSound("explode");
  if (destroySomething) {
    playSound("destroyed");
  } else if (hitSomething) {
    playSound("hit");
  }
}

/* ========= MISSILES ========= */

function launchMissile(radar) {
  playSound("rocket_launch");
  state.missileCounter++;
  let isSmart = false;
  let isPredict = false;
  if (
    radar.smartRocketsEvery > 0 &&
    radar.predictRocketsEvery > 0 &&
    radar.smartRocketsEvery === radar.predictRocketsEvery
  ) {
    console.warn(
      "[missiles] smart & predict cadence collision - defaulting to smart"
    );
  }
  // SMART – priority 1
  if (
    radar.smartRocketsEvery > 0 &&
    state.missileCounter % radar.smartRocketsEvery === 0
  ) {
    isSmart = true;
  }
  // PREDICT – only if not smart
  else if (
    radar.predictRocketsEvery > 0 &&
    state.missileCounter % radar.predictRocketsEvery === 0
  ) {
    isPredict = true;
  }

  let heading;
  let speed = radar.rocketSpeed;

  // SMART – untouched
  if (isSmart) {
    heading = bearing(radar.lat, radar.lng, state.lat, state.lng);
    speed *= radar.smartRocketSpeedFactor;
  }
  // PREDICT – NEW (one-time lead)
  else if (isPredict) {
    const leadDist =
      (state.speed / 3.6) * radar.predictRocketsLead;

    const predicted = move(
      state.lat,
      state.lng,
      state.heading,
      leadDist
    );

    heading = bearing(radar.lat, radar.lng, predicted.lat, predicted.lng);
  }
  // DUMB
  else {
    heading = bearing(radar.lat, radar.lng, state.lat, state.lng);
  }

  const missile = {
    lat: radar.lat,
    lng: radar.lng,
    heading,
    smart: isSmart,   // ⚠️ predict ≠ smart
    speed,
    life: CONFIG_DEFAULTS.missileLifetime,
    lockBeeped: false,
    lockLost: false,
    marker: L.marker([radar.lat, radar.lng], {
      icon: L.divIcon({
        html: `<div class="missile">🚀</div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(layerMissiles)
  };

  entities.missiles.push(missile);
}
