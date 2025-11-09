import { drawScareness, isEntityRobbed, sendNotify, isAimingMeleeAtTarget, Delay, drawProgress, playAnimation } from './utils';

type Weapon = {
  male: number;
  female: number;
  multiplier: number,
  divider: number,
  melee: boolean
};

const weapons: Record<number, Weapon> = {
  [GetHashKey('WEAPON_KNIFE')]: {
    male: 50, // Success rate för män utav 100
    female: 85  , // Success rate för kvinnor utav 100
    multiplier: 0.7, // multipliceras med orginal värdet för varje scareness interval
    divider: 2, // dividera scareness på 2 för att göra så den tar bort mindre
    melee: true
  },
  [GetHashKey("WEAPON_PISTOL")]: {
    male: 92,
    female: 100,
    multiplier: 1.6,
    divider: 1,
    melee: false
  }
};

let isActive: boolean = false;
let target: number = -1;
let lastTime: number = 0;

function isArmed(): boolean {
  const ped = PlayerPedId();
  const [success, weaponHash] = GetCurrentPedWeapon(ped, false);

  return success && weaponHash in weapons;
};

async function getGunData(): Promise<Weapon | null> {
  const [success, weaponHash] = GetCurrentPedWeapon(PlayerPedId(), false);
  if (!success || !(weaponHash in weapons)) {
    console.warn('Inget giltigt vapen');
    return null;
  }

  return weapons[weaponHash];
}

async function finish () {
  ClearPedTasksImmediately(target);
  await Delay (150);

  playAnimation(target, 'mp_common', 'givetake1_a');
  emitNet('npc_robbery:server:giveReward')

  await Delay (1000);

  ClearPedTasksImmediately(target);
  FreezeEntityPosition(target, false);

  SetBlockingOfNonTemporaryEvents(target, false);
  SetPedFleeAttributes(target, 0, false);
  TaskSmartFleePed(target, PlayerPedId(), 100.0, -1, false, false);

  setTimeout(() => {
    DeleteEntity(target)
  }, 7500)

  target = 0;
  isActive = false;
};

function notScared () {
  console.log('Inte rädd');

  if (!target || !DoesEntityExist(target)) {
    console.error("Peden finns inte?");
    return;
  }

  ClearPedTasksImmediately(target);
  FreezeEntityPosition(target, false);

  const luck: number = Math.floor(Math.random() * 100) + 1;
  const targetLuck: number = IsPedMale(target) ? 50 : 85;

  if (luck <= targetLuck) {
    SetPedFleeAttributes(target, 0, true);
    SetBlockingOfNonTemporaryEvents(target, true);
    SetPedCanEvasiveDive(target, false);

    SetPedAsEnemy(target, true);

    SetPedCombatAttributes(target, 0, true);
    SetPedCombatAttributes(target, 1, true);
    SetPedCombatAttributes(target, 5, true); 
    SetPedCombatAttributes(target, 17, true);
    SetPedCombatAttributes(target, 46, true); 

    TaskCombatPed(target, PlayerPedId(), 0, 16);
  } else {
    SetBlockingOfNonTemporaryEvents(target, false);
    SetPedFleeAttributes(target, 0, false);
    TaskSmartFleePed(target, PlayerPedId(), 100.0, -1, false, false);

    setTimeout(() => {
      DeleteEntity(target)
    }, 7500)
  }

  target = 0;
  isActive = false;
};

async function startRobbing (entity: number) {
  if (isActive) return;
  if (!DoesEntityExist(entity) || !IsEntityAPed(entity)) return;

  const time = GetGameTimer();
  if (time - lastTime < 60000) {
    sendNotify('Lugna ner dig lite först..', 'error')
    isActive = false;
    return;
  }

  lastTime = time;
  target = entity;

  const weaponData = await getGunData();
  if (!weaponData) {
    console.log('Inget giltigt vapen framme')
    Entity(entity).state.set('robbed', false, true);
    return;
  }

  const luck: number = Math.floor(Math.random() * 100) + 1;
  const targetLuck: number = IsPedMale(target) ? weaponData.male : weaponData.female;

  if (luck > targetLuck) {
    notScared();
    return;
  }

  isActive = true;

  let progress = 0.0;
  let scareness = 5.0;

  FreezeEntityPosition(target, true);
  ClearPedTasksImmediately(target);

  SetBlockingOfNonTemporaryEvents(target, true);
  SetPedFleeAttributes(target, 0, false);
  SetPedCombatAttributes(target, 46, true);
  SetPedSeeingRange(target, 0.0);
  SetPedHearingRange(target, 0.0);

  let isAimingAtTarget = false;

  const interval = setInterval(() => {
    if (!isActive) return clearInterval(interval);

    playAnimation(target, 'missminuteman_1ig_2', 'handsup_base');

    if (!isArmed()) {
      notScared();
      clearInterval(interval);
      return;
    }

    if (!DoesEntityExist(target) || IsPedDeadOrDying(target, false) ) {
      isActive = false;
      sendNotify('Personen är död..', 'error');
      
      clearInterval(interval);
      return;
    }

    if (scareness < 0.5) {
      notScared();

      clearInterval(interval);
      return;
    }

    if (isAimingAtTarget) {
      const df = 0.40*weaponData.multiplier
      scareness+=df;

      if (scareness > 16) {
        scareness = 16;
      }
    } else {
      const df = 0.50/weaponData.divider
      scareness-=df;
    }

    const amountToAdd = scareness >= 15 ? 0.8 : scareness < 1.5 ? 0.45 : 0.15;
    progress+=amountToAdd;

    if (progress >= 100) {
      finish();

      clearInterval(interval);
      return;
    }
  }, 150)

  const tick = setTick(() => {
    if (!isActive) return clearTick(tick);

    if (weaponData.melee) {
      const success = isAimingMeleeAtTarget(PlayerPedId(), target);

      if (success) {
        isAimingAtTarget = true;
      } else {
        isAimingAtTarget = false;
      }
    } else {
      const [asuccess, entity] = GetEntityPlayerIsFreeAimingAt(PlayerId());

      if (asuccess && DoesEntityExist(entity) && IsEntityAPed(entity) && entity === target) {
        isAimingAtTarget = true;
      } else {
        isAimingAtTarget = false;
      }
    }

    TaskTurnPedToFaceEntity(target, PlayerPedId(), 900)
    SetFacialIdleAnimOverride(target, 'mood_stressed_1', '')

    drawScareness(`${scareness >= 15 ? 'Personen är livrädd' : scareness < 2.5 ? 'Personen är oberörd' : 'Personen är nervös'}`);
    drawProgress(progress);
  })
};

setTick(() => {
  const ped: number = PlayerPedId();
  const [x, y, z]: number[] = GetEntityCoords(ped, false);

  if (!isActive && isArmed()) {
    const [success, entity] = GetEntityPlayerIsFreeAimingAt(PlayerId());

    if (success && DoesEntityExist(entity) && IsEntityAPed(entity) && !IsPedDeadOrDying(entity, false) && !IsPedInAnyVehicle(entity, false)) {
      const [ex, ey, ez]: number[] = GetEntityCoords(entity, false);
      const dist: number = Vdist(x, y, z, ex, ey, ez);

      if (dist < 12.5 && !isEntityRobbed(entity)) {
        Entity(entity).state.set('robbed', true, true);
        startRobbing(entity);
      }
    }
  }
});
