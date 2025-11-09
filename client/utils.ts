export async function drawScareness (text: string): Promise<void> {
    const textureDict = 'timerbars';
    
    if (!HasStreamedTextureDictLoaded(textureDict)) {
        RequestStreamedTextureDict(textureDict, true);

        while (!HasStreamedTextureDictLoaded(textureDict)) {
            await Delay(10);
        }
    }

    const safeZone = (1.0 - GetSafeZoneSize()) * 0.5;
    const baseX = 0.918 - safeZone;
    const baseY = 0.984 - safeZone;
    DrawSprite(textureDict, 'all_black_bg', baseX, baseY, 0.165, 0.035, 0.0, 255, 255, 255, 160);

    BeginTextCommandDisplayText('CELL_EMAIL_BCON');
    SetTextFont(0);
    SetTextScale(0.425, 0.425);
    SetTextColour(255, 255, 255, 255);
    SetTextRightJustify(true);
    SetTextWrap(0.0, baseX + 0.0785);
    AddTextComponentSubstringPlayerName(text);
    EndTextCommandDisplayText(baseX + 0.0785, baseY - 0.0165);
};

export function drawProgress(value: number): void {
    const screenCenterX = 0.5;
    const screenBottomY = 0.96;

    const width = 0.12;

    const clampedValue = Math.max(0, Math.min(value, 100));
    const progressRatio = clampedValue / 100;
    const progressWidth = width * progressRatio;
    const progressOffsetX = screenCenterX - (width / 2) + (progressWidth / 2);

    DrawRect(screenCenterX, screenBottomY, width, 0.015, 0, 0, 0, 180);
    DrawRect(progressOffsetX, screenBottomY, progressWidth, 0.009, 220, 50, 50, 255);
}

export function Delay (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function loadAnimDict (dict: string): Promise<void> {
    if (!DoesAnimDictExist(dict)) {
        return;
    }
    RequestAnimDict(dict);

    while (!HasAnimDictLoaded(dict)) {
        await Delay(10);
    }
};

export async function playAnimation (entity: number, dict: string, lib: string, flag?: number): Promise<void> {
    if (!IsEntityPlayingAnim(entity, dict, lib, flag ?? 49)) {
        await loadAnimDict(dict);
        TaskPlayAnim(entity, dict, lib, 2.0, -1.0, -1, flag ?? 49, 0, false, false, false);
    }
};

export function isAimingMeleeAtTarget(ped: number, target: number): boolean {
    if (!DoesEntityExist(target)) {
        console.error('Ingen giltig target entity angavs')
        return false;
    }

    const pedCoords = GetEntityCoords(ped, true);
    const targetCoords = GetEntityCoords(target, true);

    const dist = Vdist(pedCoords[0], pedCoords[1], pedCoords[2], targetCoords[0], targetCoords[1], targetCoords[2]);
    if (dist > 3.0) return false;

    const camRot = GetGameplayCamRot(2);
    const pitch = camRot[0] * (Math.PI / 180);
    const yaw = camRot[2] * (Math.PI / 180);

    const camForward = [
        Math.cos(pitch) * Math.sin(yaw),
        Math.cos(pitch) * Math.cos(yaw),
        Math.sin(pitch),
    ];

    const dirToTarget = [
        targetCoords[0] - pedCoords[0],
        targetCoords[1] - pedCoords[1],
        targetCoords[2] - pedCoords[2],
    ];

    const length = Math.sqrt(dirToTarget[0] ** 2 + dirToTarget[1] ** 2 + dirToTarget[2] ** 2);
    if (length === 0) return false;

    const normDirToTarget = [dirToTarget[0] / length, dirToTarget[1] / length, dirToTarget[2] / length];
    const dot = camForward[0] * normDirToTarget[0] + camForward[1] * normDirToTarget[1] + camForward[2] * normDirToTarget[2];

    const angleDeg = Math.acos(dot) * (180 / Math.PI);
    const maxAngle = 60;

    return angleDeg <= maxAngle;
};

export function isEntityRobbed (entity: number) {
    if (entity === -1) return;

    if (!DoesEntityExist(entity)) {
        console.warn('Peden existerar inte?')
        return;
    }

    if (!NetworkGetEntityIsNetworked(entity)) {
        NetworkRegisterEntityAsNetworked(entity);
    }

    return Entity(entity).state.robbed
};

export function sendNotify (text: string, type: string) {
    TriggerEvent('core:client:notification', {
        title: 'Olaglig aktivitet',
        text: text,
        type: type
    })
};