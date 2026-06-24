import {useEffect, useRef, useCallback} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {componentData} from './data';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  flowEnabled: boolean;
}

function makeMat(color: number, opts: Partial<THREE.MeshStandardMaterial> = {}) {
  return new THREE.MeshStandardMaterial({
    color, metalness: 0.7, roughness: 0.28,
    emissive: color, emissiveIntensity: 0.08,
    ...opts,
  });
}

function makeGlowMat(color: number) {
  return new THREE.MeshStandardMaterial({
    color, metalness: 0.3, roughness: 0.2,
    emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.85
  });
}

function makeMetalMat(color: number, metalness = 0.85, roughness = 0.2) {
  return new THREE.MeshStandardMaterial({
    color, metalness, roughness,
    emissive: color, emissiveIntensity: 0.03,
  });
}

function addRivet(scene: THREE.Scene, pos: [number, number, number], size = 0.08) {
  const geo = new THREE.SphereGeometry(size, 6, 6);
  const mat = makeMetalMat(0x888899);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  scene.add(mesh);
}

function createFlange(scene: THREE.Scene, x: number, y: number, z: number, radius: number, thickness: number, rotX = 0, rotZ = 0) {
  const geo = new THREE.TorusGeometry(radius, thickness * 0.3, 8, 24);
  const mat = makeMetalMat(0x667788);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  mesh.rotation.z = rotZ;
  scene.add(mesh);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    addRivet(scene, [
      x + Math.cos(angle) * radius * 0.85,
      y + Math.sin(angle) * radius * 0.85 * (rotX === Math.PI / 2 ? 0 : 1),
      z + Math.sin(angle) * radius * 0.85 * (rotX === Math.PI / 2 ? 1 : 0)
    ], 0.06);
  }
}

function createPipe(scene: THREE.Scene, points: [number, number, number][], radius: number, color: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 48, radius, 16, false);
  const mat = makeMetalMat(color);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

function createLinearPipe(scene: THREE.Scene, points: [number, number, number][], radius: number, color: number) {
  const mat = makeMetalMat(color);
  for (let i = 0; i < points.length - 1; i++) {
    const start = new THREE.Vector3(...points[i]);
    const end = new THREE.Vector3(...points[i + 1]);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const len = start.distanceTo(end);
    const geo = new THREE.CylinderGeometry(radius, radius, len, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(up)) < 0.999) {
      const axis = new THREE.Vector3().crossVectors(up, dir).normalize();
      const angle = Math.acos(up.dot(dir));
      mesh.quaternion.setFromAxisAngle(axis, angle);
    } else if (dir.y < 0) {
      mesh.rotation.z = Math.PI;
    }
    mesh.castShadow = true;
    scene.add(mesh);
  }
}

function createSerpentineCoil(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
  numTubes: number, tubeColor: number,
  userData?: {id: string},
  components?: Record<string, THREE.Object3D>
) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const tubeRadius = 0.1;
  const tubeSpacing = height / (numTubes + 1);
  const bendX = width / 2 - 0.2;

  const tubeMat = makeMetalMat(tubeColor);
  const headerMat = makeMetalMat(0x666666);

  for (let i = 0; i < numTubes; i++) {
    const tubeY = -height / 2 + tubeSpacing * (i + 1);
    const startX = (i % 2 === 0) ? -bendX : bendX;
    const endX = (i % 2 === 0) ? bendX : -bendX;

    const pts: THREE.Vector3[] = [
      new THREE.Vector3(startX, tubeY, 0),
      new THREE.Vector3(endX, tubeY, 0),
    ];

    if (i < numTubes - 1) {
      const nextTubeY = -height / 2 + tubeSpacing * (i + 2);
      const dropX = (i % 2 === 0) ? bendX : -bendX;
      const bendRadius = tubeSpacing * 0.35;
      const segs = 12;

      const dropStart = new THREE.Vector3(dropX, tubeY, 0);
      const dropEnd = new THREE.Vector3(dropX, nextTubeY, 0);

      const dropDir = new THREE.Vector3().subVectors(dropEnd, dropStart);
      const dropMid = new THREE.Vector3().addVectors(dropStart, dropEnd).multiplyScalar(0.5);

      const normal = new THREE.Vector3(-Math.sign(dropDir.y), 0, 0);
      const arcCenter = dropMid.clone().add(normal.clone().multiplyScalar(bendRadius));

      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const angle = -Math.PI / 2 + Math.PI * t;
        const px = arcCenter.x + bendRadius * Math.cos(angle);
        const py = arcCenter.y + bendRadius * Math.sin(angle);
        pts.push(new THREE.Vector3(px, py, 0));
      }
    }

    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
    const tubeGeo = new THREE.TubeGeometry(curve, pts.length * 12, tubeRadius, 8, false);
    const mesh = new THREE.Mesh(tubeGeo, tubeMat);
    mesh.castShadow = true;
    group.add(mesh);
  }

  scene.add(group);

  if (userData && components) {
    group.userData = userData;
    components[userData.id] = group;
  }

  return group;
}

function createSupport(scene: THREE.Scene, x: number, z: number, height: number, color = 0x556677) {
  const legGeo = new THREE.CylinderGeometry(0.12, 0.15, height, 6);
  const legMat = makeMetalMat(color);
  for (let dx = -0.4; dx <= 0.4; dx += 0.8) {
    for (let dz = -0.4; dz <= 0.4; dz += 0.8) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x + dx, height / 2, z + dz);
      leg.castShadow = true;
      scene.add(leg);
    }
  }
  const baseGeo = new THREE.BoxGeometry(1.2, 0.15, 1.2);
  const base = new THREE.Mesh(baseGeo, legMat);
  base.position.set(x, 0.075, z);
  base.castShadow = true;
  scene.add(base);
}

export default function Scene3D({selectedId, onSelect, flowEnabled}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    components: Record<string, THREE.Object3D>;
    flowParticles: THREE.Mesh[];
    clock: THREE.Clock;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    hovered: THREE.Object3D | null;
    animId: number;
    turbineBlades: THREE.Object3D[];
    generatorShaft: THREE.Object3D | null;
  } | null>(null);

  const buildScene = useCallback((scene: THREE.Scene, components: Record<string, THREE.Object3D>) => {
    // Ground and grid
    const grid = new THREE.GridHelper(120, 60, 0x112233, 0x0a1522);
    grid.position.y = -0.01;
    scene.add(grid);

    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const groundMat = new THREE.MeshStandardMaterial({color: 0x080c15, metalness: 0.05, roughness: 0.95});
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    // Concrete foundation pads
    const padGeo = new THREE.BoxGeometry(26, 0.3, 14);
    const padMat = makeMetalMat(0x333340, 0.05, 0.9);
    const pad1 = new THREE.Mesh(padGeo, padMat);
    pad1.position.set(-25, 0.15, 0);
    pad1.receiveShadow = true;
    scene.add(pad1);

    const pad2 = new THREE.Mesh(new THREE.BoxGeometry(50, 0.3, 16), padMat);
    pad2.position.set(10, 0.15, 0);
    pad2.receiveShadow = true;
    scene.add(pad2);

    // ===== SINTERING MACHINE =====
    // Main body - long rectangular with rounded top
    const sinterBodyGeo = new THREE.BoxGeometry(22, 2.5, 10);
    const sinterBodyMat = makeMat(0xcc4411, {roughness: 0.4});
    const sinterBody = new THREE.Mesh(sinterBodyGeo, sinterBodyMat);
    sinterBody.position.set(-25, 2.8, 0);
    sinterBody.castShadow = true;
    sinterBody.receiveShadow = true;
    sinterBody.userData = {id: 'sinterMachine'};
    scene.add(sinterBody);
    components.sinterMachine = sinterBody;

    // Top housing
    const sinterTopGeo = new THREE.BoxGeometry(24, 1.2, 11);
    const sinterTop = new THREE.Mesh(sinterTopGeo, makeMat(0xaa3300));
    sinterTop.position.set(-25, 4.4, 0);
    sinterTop.castShadow = true;
    scene.add(sinterTop);

    // Hood / exhaust collection - hollow box with square holes on each side
    const hoodW = 20, hoodH = 3.8, hoodD = 9, hoodT = 0.25;
    const hoodMat = makeMat(0x993300);
    const hoodCx = -25, hoodCy = 7.0;
    const holeW = 8.0, holeH = 3.2;
    const hFTopH = hoodH / 2 - holeH / 2 - hoodT;
    const hFSideW = hoodW / 2 - holeW / 2 - hoodT;
    const hLSideW = hoodD / 2 - holeW / 2 - hoodT;

    // Front wall with hole
    const hFrontG = new THREE.Group();
    hFrontG.position.set(hoodCx, hoodCy, hoodD / 2 - hoodT / 2);
    scene.add(hFrontG);
    const hfT = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hFTopH, hoodT), hoodMat);
    hfT.position.set(0, holeH / 2 + hFTopH / 2, 0); hfT.castShadow = true; hFrontG.add(hfT);
    const hfB = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hFTopH, hoodT), hoodMat);
    hfB.position.set(0, -holeH / 2 - hFTopH / 2, 0); hfB.castShadow = true; hFrontG.add(hfB);
    const hfL = new THREE.Mesh(new THREE.BoxGeometry(hFSideW, holeH, hoodT), hoodMat);
    hfL.position.set(-holeW / 2 - hFSideW / 2, 0, 0); hfL.castShadow = true; hFrontG.add(hfL);
    const hfR = new THREE.Mesh(new THREE.BoxGeometry(hFSideW, holeH, hoodT), hoodMat);
    hfR.position.set(holeW / 2 + hFSideW / 2, 0, 0); hfR.castShadow = true; hFrontG.add(hfR);

    // Back wall with hole
    const hBackG = new THREE.Group();
    hBackG.position.set(hoodCx, hoodCy, -hoodD / 2 + hoodT / 2);
    scene.add(hBackG);
    const hbT = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hFTopH, hoodT), hoodMat);
    hbT.position.set(0, holeH / 2 + hFTopH / 2, 0); hbT.castShadow = true; hBackG.add(hbT);
    const hbB = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hFTopH, hoodT), hoodMat);
    hbB.position.set(0, -holeH / 2 - hFTopH / 2, 0); hbB.castShadow = true; hBackG.add(hbB);
    const hbL = new THREE.Mesh(new THREE.BoxGeometry(hFSideW, holeH, hoodT), hoodMat);
    hbL.position.set(-holeW / 2 - hFSideW / 2, 0, 0); hbL.castShadow = true; hBackG.add(hbL);
    const hbR = new THREE.Mesh(new THREE.BoxGeometry(hFSideW, holeH, hoodT), hoodMat);
    hbR.position.set(holeW / 2 + hFSideW / 2, 0, 0); hbR.castShadow = true; hBackG.add(hbR);

    // Left wall with hole
    const hLeftG = new THREE.Group();
    hLeftG.position.set(hoodCx - hoodW / 2 + hoodT / 2, hoodCy, 0);
    hLeftG.rotation.y = Math.PI / 2;
    scene.add(hLeftG);
    const hlT = new THREE.Mesh(new THREE.BoxGeometry(hoodD, hFTopH, hoodT), hoodMat);
    hlT.position.set(0, holeH / 2 + hFTopH / 2, 0); hlT.castShadow = true; hLeftG.add(hlT);
    const hlB = new THREE.Mesh(new THREE.BoxGeometry(hoodD, hFTopH, hoodT), hoodMat);
    hlB.position.set(0, -holeH / 2 - hFTopH / 2, 0); hlB.castShadow = true; hLeftG.add(hlB);
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(hLSideW, holeH, hoodT), hoodMat);
    hlL.position.set(-holeW / 2 - hLSideW / 2, 0, 0); hlL.castShadow = true; hLeftG.add(hlL);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(hLSideW, holeH, hoodT), hoodMat);
    hlR.position.set(holeW / 2 + hLSideW / 2, 0, 0); hlR.castShadow = true; hLeftG.add(hlR);

    // Right wall with hole
    const hRightG = new THREE.Group();
    hRightG.position.set(hoodCx + hoodW / 2 - hoodT / 2, hoodCy, 0);
    hRightG.rotation.y = Math.PI / 2;
    scene.add(hRightG);
    const hrT = new THREE.Mesh(new THREE.BoxGeometry(hoodD, hFTopH, hoodT), hoodMat);
    hrT.position.set(0, holeH / 2 + hFTopH / 2, 0); hrT.castShadow = true; hRightG.add(hrT);
    const hrB = new THREE.Mesh(new THREE.BoxGeometry(hoodD, hFTopH, hoodT), hoodMat);
    hrB.position.set(0, -holeH / 2 - hFTopH / 2, 0); hrB.castShadow = true; hRightG.add(hrB);
    const hrL = new THREE.Mesh(new THREE.BoxGeometry(hLSideW, holeH, hoodT), hoodMat);
    hrL.position.set(-holeW / 2 - hLSideW / 2, 0, 0); hrL.castShadow = true; hRightG.add(hrL);
    const hrR = new THREE.Mesh(new THREE.BoxGeometry(hLSideW, holeH, hoodT), hoodMat);
    hrR.position.set(holeW / 2 + hLSideW / 2, 0, 0); hrR.castShadow = true; hRightG.add(hrR);

    // Top wall
    const hTopWall = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hoodT, hoodD), hoodMat);
    hTopWall.position.set(hoodCx, hoodCy + hoodH / 2 - hoodT / 2, 0);
    hTopWall.castShadow = true;
    scene.add(hTopWall);

    // Bottom wall
    const hBotWall = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hoodT, hoodD), hoodMat);
    hBotWall.position.set(hoodCx, hoodCy - hoodH / 2 + hoodT / 2, 0);
    hBotWall.castShadow = true;
    scene.add(hBotWall);




    // Reciprocating grate bars
    for (let i = -4; i <= 4; i++) {
      const grateGeo = new THREE.BoxGeometry(2.2, 0.15, 9);
      const grateMat = makeMetalMat(0x554433, 0.9, 0.6);
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.set(-25 + i * 2.4, 1.5, 0);
      grate.castShadow = true;
      scene.add(grate);
    }

    // Drive mechanism boxes on side
    for (let i = -3; i <= 3; i++) {
      const driveGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
      const driveMat = makeMetalMat(0x776655);
      const drive = new THREE.Mesh(driveGeo, driveMat);
      drive.position.set(-25 + i * 3, 1.5, 5.5);
      scene.add(drive);
    }

    // Cooling fans - 3 on each side (6 total)
    const sinterFanPositions = [
      // Front side (z = +5.5)
      { x: -31, z: 5.8 },
      { x: -24, z: 5.8 },
      { x: -17, z: 5.8 },
      // Back side (z = -5.5)
      { x: -31, z: -5.8 },
      { x: -24, z: -5.8 },
      { x: -17, z: -5.8 },
    ];

    sinterFanPositions.forEach((pos, idx) => {
      const facing = idx < 3 ? 1 : -1;
      const fanY = 5.5;

      // Fan housing (shroud)
      const fanHousingGeo = new THREE.CylinderGeometry(3.2, 3.2, 1.8, 20);
      const fanHousingMat = makeMat(0x884422, { roughness: 0.35, metalness: 0.75 });
      const fanHousing = new THREE.Mesh(fanHousingGeo, fanHousingMat);
      fanHousing.position.set(pos.x, fanY, pos.z);
      fanHousing.rotation.x = Math.PI / 2;
      fanHousing.castShadow = true;
      scene.add(fanHousing);

      // Fan motor body behind housing
      const motorBodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.0, 12);
      const motorBodyMat = makeMetalMat(0x445566);
      const motorBody = new THREE.Mesh(motorBodyGeo, motorBodyMat);
      motorBody.position.set(pos.x, fanY, pos.z - facing * 1.4);
      motorBody.rotation.x = Math.PI / 2;
      scene.add(motorBody);

      // Fan guard outer ring
      const guardRingGeo = new THREE.TorusGeometry(2.8, 0.16, 8, 28);
      const guardRingMat = makeMetalMat(0x999999);
      const guardRing = new THREE.Mesh(guardRingGeo, guardRingMat);
      guardRing.position.set(pos.x, fanY, pos.z + facing * 1.0);
      scene.add(guardRing);

      // Fan guard middle ring
      const midRingGeo = new THREE.TorusGeometry(1.8, 0.10, 6, 20);
      const midRing = new THREE.Mesh(midRingGeo, guardRingMat);
      midRing.position.set(pos.x, fanY, pos.z + facing * 1.0);
      scene.add(midRing);

      // Fan guard inner ring
      const innerRingGeo = new THREE.TorusGeometry(0.8, 0.08, 6, 16);
      const innerRing = new THREE.Mesh(innerRingGeo, guardRingMat);
      innerRing.position.set(pos.x, fanY, pos.z + facing * 1.0);
      scene.add(innerRing);

      // Fan blades (6 blades)
      for (let b = 0; b < 6; b++) {
        const bladeGeo = new THREE.BoxGeometry(0.3, 2.4, 5.0);
        const bladeMat = makeMetalMat(0xbbbbbb);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(pos.x, fanY, pos.z + facing * 0.4);
        blade.rotation.z = (b / 6) * Math.PI;
        scene.add(blade);
      }

      // Fan motor hub
      const hubGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12);
      const hubMat = makeMetalMat(0x555555);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(pos.x, fanY, pos.z + facing * 0.6);
      hub.rotation.x = Math.PI / 2;
      scene.add(hub);

      // Mounting bracket
      const bracketGeo = new THREE.BoxGeometry(2.4, 0.4, 1.2);
      const bracketMat = makeMetalMat(0x666666);
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(pos.x, 3.5, pos.z + facing * 0.6);
      scene.add(bracket);

      // Vertical support strut
      const strutGeo = new THREE.CylinderGeometry(0.16, 0.16, 2.0, 6);
      const strut = new THREE.Mesh(strutGeo, bracketMat);
      strut.position.set(pos.x, 4.5, pos.z + facing * 0.6);
      scene.add(strut);
    });

    // Rivets along edges
    for (let x = -35; x <= -15; x += 1.5) {
      addRivet(scene, [x, 3.9, 5.2]);
      addRivet(scene, [x, 3.9, -5.2]);
    }


    // ===== BOILER (HRSG) - CUTAWAY VIEW (CHAMFERED OBLONG SHELL) =====
    const boilerMat = makeMat(0xddaa00, {roughness: 0.3, metalness: 0.75});
    const boilerFrameMat = makeMetalMat(0xcc9900);
    const bW = 12, bH = 14, bD = 8;
    const bL = -1, bR = 11, bBot = 0, bTop = 14;
    const ch = 1.8;

    // Chamfered cross-section shape
    function makeBoilerShape(inset: number) {
      const s = new THREE.Shape();
      const il = bL + inset, ir = bR - inset;
      const ib = bBot + inset, it = bTop - inset;
      const ci = Math.max(ch - inset, 0.1);
      s.moveTo(il + ci, ib);
      s.lineTo(ir - ci, ib);
      s.lineTo(ir, ib + ci);
      s.lineTo(ir, it - ci);
      s.lineTo(ir - ci, it);
      s.lineTo(il + ci, it);
      s.lineTo(il, it - ci);
      s.lineTo(il, ib + ci);
      s.closePath();
      return s;
    }

    const boilerOuterShape = makeBoilerShape(0);
    const boilerInnerShape = makeBoilerShape(0.35);
    const boilerHole = new THREE.Path();
    const innerPts = boilerInnerShape.getPoints();
    boilerHole.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < innerPts.length; i++) {
      boilerHole.lineTo(innerPts[i].x, innerPts[i].y);
    }
    boilerHole.closePath();
    boilerOuterShape.holes.push(boilerHole);

    const boilerShellGeo = new THREE.ExtrudeGeometry(boilerOuterShape, {depth: bD, bevelEnabled: false});
    const boilerShell = new THREE.Mesh(boilerShellGeo, boilerMat);
    boilerShell.position.set(0, 0, -bD / 2);
    boilerShell.castShadow = true;
    boilerShell.receiveShadow = true;
    boilerShell.userData = {id: 'boiler'};
    scene.add(boilerShell);
    components.boiler = boilerShell;

    // Back wall cap (solid)
    const backCapShape = makeBoilerShape(0);
    const backCapGeo = new THREE.ShapeGeometry(backCapShape);
    const backCap = new THREE.Mesh(backCapGeo, boilerMat);
    backCap.position.set(0, 0, -bD / 2);
    backCap.castShadow = true;
    backCap.receiveShadow = true;
    scene.add(backCap);

    // Exhaust inlet nozzle on top of boiler
    const exhaustNozzleGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.8, 12);
    const exhaustNozzleMat = makeMetalMat(0xddaa00);
    const exhaustNozzle = new THREE.Mesh(exhaustNozzleGeo, exhaustNozzleMat);
    exhaustNozzle.position.set(5, 14.4, 0);
    exhaustNozzle.castShadow = true;
    scene.add(exhaustNozzle);
    createFlange(scene, 5, 14.1, 0, 0.8, 0.12);

    // Boiler casing panels on back
    for (let y = 2; y <= 13; y += 2) {
      const panelGeo = new THREE.BoxGeometry(12.1, 0.15, 0.1);
      const panel = new THREE.Mesh(panelGeo, boilerFrameMat);
      panel.position.set(5, y, -bD / 2 + 0.1);
      scene.add(panel);
    }

    // Outlet nozzles on boiler right wall (x=11)
    const outNozzleGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12);
    const outNozzleMat = makeMetalMat(0xccaa00);
    const outNozzlePositions: [number, number][] = [
      [11, 11.5],  // superheater
      [11, 8.5],   // evaporator
      [11, 4.25],  // economizer
    ];
    outNozzlePositions.forEach(([nx, ny]) => {
      const nozzle = new THREE.Mesh(outNozzleGeo, outNozzleMat);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.set(nx + 0.4, ny, 0);
      nozzle.castShadow = true;
      scene.add(nozzle);
    });

    // ===== SUPERHEATER (inside boiler top section) =====
    createSerpentineCoil(scene, 5, 11.5, 0, 10, 3, 6, 8, 0xcc3333, {id: 'superheater'}, components);

    // ===== EVAPORATOR (fin-tube heat exchanger) =====
    createSerpentineCoil(scene, 5, 8.5, 0.5, 11, 3, 5, 6, 0xffaa00, {id: 'evaporator'}, components);

    // ===== ECONOMIZER (fin-tube heat exchanger) =====
    createSerpentineCoil(scene, 5, 4.25, 0.5, 11, 2.8, 5, 5, 0x4488cc, {id: 'economizer'}, components);

    // Connecting tubes from coil right ends to outlet nozzles
    const connTubeR = 0.2;
    const connTubeMat = makeMetalMat(0xccaa00);
    const connTubeData: [number, number, number, number][] = [
      [10, 11.5, 11.4, 1.4],   // superheater
      [10.5, 8.5, 11.4, 0.9],  // evaporator
      [10.5, 4.25, 11.4, 0.9], // economizer
    ];
    connTubeData.forEach(([x1, y, x2, len]) => {
      const tubeGeo = new THREE.CylinderGeometry(connTubeR, connTubeR, len, 10);
      const tube = new THREE.Mesh(tubeGeo, connTubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set((x1 + x2) / 2, y, 0);
      tube.castShadow = true;
      scene.add(tube);
    });

    // ===== SUPERHEATER → EVAPORATOR connecting pipe (outside left wall) =====
    createPipe(scene, [
      [-1.3, 11.5, 0],
      [-2.5, 11.5, 0],
      [-3, 11, 0],
      [-3, 10, 0],
      [-3, 9.5, 0],
      [-2.5, 9, 0],
      [-1.3, 8.5, 0],
    ], 0.25, 0xdd6600);

    // Outlet labels
    const outletLabels = [
      { text: 'Superheater Outlet', x: 13.5, y: 11.5, z: 0 },
      { text: 'Evaporator Outlet', x: 13.5, y: 8.5, z: 0 },
      { text: 'Economizer Outlet', x: 13.5, y: 4.25, z: 0 },
    ];
    outletLabels.forEach(({text, x, y, z}) => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      c.width = 512; c.height = 64;
      ctx.font = 'bold 22px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(text, 256, 42);
      const tex = new THREE.CanvasTexture(c);
      const spriteMat = new THREE.SpriteMaterial({map: tex, transparent: true, opacity: 0.9});
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(5, 0.6, 1);
      sprite.position.set(x, y, z);
      scene.add(sprite);
    });

    // ===== STEAM DRUM =====
    const drumGeo = new THREE.CylinderGeometry(1.5, 1.5, 6, 24);
    const drumMat = makeMat(0xeebb22, {roughness: 0.25, metalness: 0.85});
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.set(22, 14, 8);
    drum.rotation.z = Math.PI / 2;
    drum.castShadow = true;
    drum.userData = {id: 'steamDrum'};
    scene.add(drum);
    components.steamDrum = drum;

    // Drum end caps
    const capGeo = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = makeMetalMat(0xddaa11);
    const capL = new THREE.Mesh(capGeo, capMat);
    capL.position.set(19, 14, 8);
    capL.rotation.x = Math.PI / 2;
    capL.rotation.z = Math.PI / 2;
    scene.add(capL);
    const capR = new THREE.Mesh(capGeo, capMat);
    capR.position.set(25, 14, 8);
    capR.rotation.x = Math.PI / 2;
    capR.rotation.z = -Math.PI / 2;
    scene.add(capR);



    // Nozzles on drum
    const nozzleGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.5, 12);
    const nozzleMat = makeMetalMat(0xccaa00);
    const nozzlePositions: [number, number, number][] = [[20.5, 14, 8], [23.5, 14, 8], [22, 14, 9.7], [22, 15.5, 8], [22, 12.5, 8]];
    nozzlePositions.forEach(pos => {
      const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzle.position.set(...pos);
      scene.add(nozzle);
    });

    // ===== STEAM DRUM SUPPORT PLATFORM =====
    const drumPlatMat = makeMetalMat(0x556677);
    const drumPlatW = 8, drumPlatD = 5, drumPlatThick = 0.2;

    // Platform deck
    const drumPlatGeo = new THREE.BoxGeometry(drumPlatW, drumPlatThick, drumPlatD);
    const drumPlat = new THREE.Mesh(drumPlatGeo, drumPlatMat);
    drumPlat.position.set(22, 12, 8);
    drumPlat.castShadow = true;
    drumPlat.receiveShadow = true;
    scene.add(drumPlat);

    // Cross beams under platform
    [-2.5, 0, 2.5].forEach(dx => {
      const beamGeo = new THREE.BoxGeometry(0.15, 0.15, drumPlatD);
      const beam = new THREE.Mesh(beamGeo, drumPlatMat);
      beam.position.set(22 + dx, 12 - drumPlatThick / 2 - 0.1, 8);
      scene.add(beam);
    });
    [-1.5, 0, 1.5].forEach(dz => {
      const beamGeo = new THREE.BoxGeometry(drumPlatW, 0.15, 0.15);
      const beam = new THREE.Mesh(beamGeo, drumPlatMat);
      beam.position.set(22, 12 - drumPlatThick / 2 - 0.1, 8 + dz);
      scene.add(beam);
    });

    // Four corner legs
    const drumLegGeo = new THREE.CylinderGeometry(0.12, 0.15, 12, 6);
    [[-3, -2], [-3, 2], [3, -2], [3, 2]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(drumLegGeo, drumPlatMat);
      leg.position.set(22 + dx, 6, 8 + dz);
      leg.castShadow = true;
      scene.add(leg);
    });

    // ===== CIRCULATION PUMP SUPPORT PLATFORM (ground level) =====
    const cpPlatMat = makeMetalMat(0x556677);

    // Platform deck
    const cpPlatGeo = new THREE.BoxGeometry(4, 0.15, 3);
    const cpPlat = new THREE.Mesh(cpPlatGeo, cpPlatMat);
    cpPlat.position.set(15.5, 2.6, 6);
    cpPlat.castShadow = true;
    cpPlat.receiveShadow = true;
    scene.add(cpPlat);

    // Four legs
    const cpLegH = 2.6;
    const cpLegGeo = new THREE.CylinderGeometry(0.1, 0.12, cpLegH, 6);
    [[-1.5, -1], [-1.5, 1], [1.5, -1], [1.5, 1]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(cpLegGeo, cpPlatMat);
      leg.position.set(15.5 + dx, cpLegH / 2, 6 + dz);
      leg.castShadow = true;
      scene.add(leg);
    });

    // ===== TURBINE (industrial design) =====
    const turbineCasingMat = makeMat(0x0088bb, {roughness: 0.22, metalness: 0.88});
    const turbineDarkMat = makeMetalMat(0x005577);
    const turbineFlangeMat = makeMetalMat(0x336688);
    const turbineBoltMat = makeMetalMat(0x99aabb);
    const turbineBaseMat = makeMat(0x334455, {roughness: 0.5, metalness: 0.7});

    // HP casing (tapered, wider at inlet)
    const hpCasing = new THREE.Mesh(taperCylinderGeo(2.8, 2.2, 4, 24), turbineCasingMat);
    hpCasing.position.set(19.5, 5, 0);
    hpCasing.rotation.z = Math.PI / 2;
    hpCasing.castShadow = true;
    hpCasing.userData = {id: 'turbine'};
    scene.add(hpCasing);
    components.turbine = hpCasing;

    // IP/LP casing (wider, exhaust end)
    const lpCasing = new THREE.Mesh(taperCylinderGeo(3.0, 3.5, 3.5, 24), turbineCasingMat);
    lpCasing.position.set(24, 5, 0);
    lpCasing.rotation.z = Math.PI / 2;
    lpCasing.castShadow = true;
    scene.add(lpCasing);

    // Casing junction ring between HP and LP
    const junctionRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.25, 8, 24),
      turbineFlangeMat
    );
    junctionRing.position.set(21.8, 5, 0);
    junctionRing.rotation.y = Math.PI / 2;
    scene.add(junctionRing);

    // Horizontal split flanges (thick, industrial)
    const flangeGeo = new THREE.BoxGeometry(8.5, 0.35, 0.5);
    const splitFlangeTop = new THREE.Mesh(flangeGeo, turbineFlangeMat);
    splitFlangeTop.position.set(22, 5, 3.0);
    scene.add(splitFlangeTop);
    const splitFlangeBot = new THREE.Mesh(flangeGeo, turbineFlangeMat);
    splitFlangeBot.position.set(22, 5, -3.0);
    scene.add(splitFlangeBot);

    // Vertical stiffener ribs on casing
    for (let x = 18.0; x <= 25.5; x += 1.0) {
      const ribHeight = (x < 21.8) ? 2.8 : 3.2;
      const ribGeo = new THREE.BoxGeometry(0.12, 0.12, ribHeight * 2);
      const rib = new THREE.Mesh(ribGeo, turbineDarkMat);
      rib.position.set(x, 5, 0);
      scene.add(rib);
    }

    // Circumferential bands
    [18.2, 19.8, 21.8, 23.5, 25.0].forEach(bx => {
      const bandRadius = (bx < 21.8) ? 2.5 : 3.1;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(bandRadius, 0.08, 6, 24),
        turbineDarkMat
      );
      band.position.set(bx, 5, 0);
      band.rotation.y = Math.PI / 2;
      scene.add(band);
    });

    // Bolting along both split flanges (heavier bolts)
    for (let x = 18.0; x <= 25.8; x += 0.55) {
      const boltSize = 0.1;
      const boltGeo = new THREE.CylinderGeometry(boltSize, boltSize, 0.4, 6);
      const boltTop = new THREE.Mesh(boltGeo, turbineBoltMat);
      boltTop.position.set(x, 5.25, 3.0);
      boltTop.rotation.x = Math.PI / 2;
      scene.add(boltTop);
      const boltBot = new THREE.Mesh(boltGeo, turbineBoltMat);
      boltBot.position.set(x, 4.75, 3.0);
      boltBot.rotation.x = Math.PI / 2;
      scene.add(boltBot);
      const boltTop2 = boltTop.clone();
      boltTop2.position.z = -3.0;
      scene.add(boltTop2);
      const boltBot2 = boltBot.clone();
      boltBot2.position.z = -3.0;
      scene.add(boltBot2);
    }

    // Steam chest / inlet nozzle box
    const steamChestGeo = new THREE.BoxGeometry(1.8, 2.0, 1.5);
    const steamChest = new THREE.Mesh(steamChestGeo, makeMetalMat(0x006699));
    steamChest.position.set(17.8, 6.5, 0);
    steamChest.castShadow = true;
    scene.add(steamChest);
    const chestCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 1.6, 12),
      turbineDarkMat
    );
    chestCap.position.set(17.8, 6.5, 0);
    chestCap.rotation.z = Math.PI / 2;
    scene.add(chestCap);

    // Exhaust hood (diffuser shape, wider at bottom)
    const exhaustHoodGeo = new THREE.CylinderGeometry(1.4, 2.0, 2.0, 16, 1, true);
    const exhaustHood = new THREE.Mesh(exhaustHoodGeo, turbineCasingMat);
    exhaustHood.position.set(26.2, 3.8, 0);
    exhaustHood.rotation.x = Math.PI / 2;
    scene.add(exhaustHood);
    const exhaustFlange = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.15, 8, 16),
      turbineFlangeMat
    );
    exhaustFlange.position.set(27.2, 3.8, 0);
    exhaustFlange.rotation.y = Math.PI / 2;
    scene.add(exhaustFlange);

    // Exhaust outlet pipe stub
    const exhaustStub = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 1.0, 12),
      makeMetalMat(0x006688)
    );
    exhaustStub.position.set(27.5, 3.8, 0);
    exhaustStub.rotation.x = Math.PI / 2;
    scene.add(exhaustStub);

    // Bearing pedestals (heavy industrial style)
    const pedestalMat = makeMat(0x334455, {roughness: 0.4, metalness: 0.75});
    [17.2, 27.0].forEach(bx => {
      // Pedestal base
      const pedestalBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.2, 2.0),
        pedestalMat
      );
      pedestalBase.position.set(bx, 2.8, 0);
      scene.add(pedestalBase);
      // Bearing housing (larger)
      const bearingHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 1.6, 16),
        turbineDarkMat
      );
      bearingHousing.position.set(bx, 5, 0);
      bearingHousing.rotation.z = Math.PI / 2;
      bearingHousing.castShadow = true;
      scene.add(bearingHousing);
      // Bearing cap (top half)
      const bearingCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        turbineDarkMat
      );
      bearingCap.position.set(bx, 5, 0);
      bearingCap.rotation.x = Math.PI / 2;
      scene.add(bearingCap);
      // Oil drain pipe stub
      const oilDrain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8),
        makeMetalMat(0x556677)
      );
      oilDrain.position.set(bx, 3.8, 1.0);
      scene.add(oilDrain);
    });

    // Foundation/baseplate
    const baseplate = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.5, 5),
      turbineBaseMat
    );
    baseplate.position.set(22, 1.8, 0);
    scene.add(baseplate);
    // Baseplate edge trim
    const baseTrim = new THREE.Mesh(
      new THREE.BoxGeometry(12.2, 0.6, 0.15),
      turbineDarkMat
    );
    baseTrim.position.set(22, 1.8, 2.55);
    scene.add(baseTrim);
    const baseTrim2 = baseTrim.clone();
    baseTrim2.position.z = -2.55;
    scene.add(baseTrim2);

    // Lube oil piping (small lines along base)
    const oilPipeMat = makeMetalMat(0x886633);
    [1.0, -1.0].forEach(oz => {
      const oilPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 9, 6),
        oilPipeMat
      );
      oilPipe.position.set(22, 2.2, oz);
      oilPipe.rotation.z = Math.PI / 2;
      scene.add(oilPipe);
    });

    // Governor/actuator housing (small box on top)
    const governor = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.6),
      makeMetalMat(0x556677)
    );
    governor.position.set(19.0, 7.8, 0);
    scene.add(governor);
    const govArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6),
      makeMetalMat(0x778899)
    );
    govArm.position.set(19.0, 8.3, 0);
    scene.add(govArm);

    // Drain/vent connections (small nozzles on casing)
    [18.5, 20.5, 23.0, 25.0].forEach(dx => {
      const drain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6),
        makeMetalMat(0x667788)
      );
      drain.position.set(dx, 3.8, 2.8);
      drain.rotation.x = Math.PI / 4;
      scene.add(drain);
    });

    // ===== GENERATOR =====
    const genBodyGeo = new THREE.CylinderGeometry(2.8, 2.8, 5, 24);
    const genBodyMat = makeMat(0x00cc66, {roughness: 0.3, metalness: 0.8});
    const genBody = new THREE.Mesh(genBodyGeo, genBodyMat);
    genBody.position.set(37, 5, 0);
    genBody.rotation.z = Math.PI / 2;
    genBody.castShadow = true;
    genBody.userData = {id: 'generator'};
    scene.add(genBody);
    components.generator = genBody;

    // Cooling fins on generator
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const finGeo = new THREE.BoxGeometry(4.8, 0.08, 0.4);
      const finMat = makeMetalMat(0x00aa55, 0.85, 0.15);
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(37, 5 + Math.sin(angle) * 2.9, Math.cos(angle) * 2.9);
      fin.rotation.x = angle;
      scene.add(fin);
    }

    // End bells
    const bellGeo = new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const bellMat = makeMetalMat(0x009955);
    const bellR = new THREE.Mesh(bellGeo, bellMat);
    bellR.position.set(39.5, 5, 0);
    bellR.rotation.z = -Math.PI / 2;
    scene.add(bellR);
    const bellL = new THREE.Mesh(bellGeo, bellMat);
    bellL.position.set(34.5, 5, 0);
    bellL.rotation.z = Math.PI / 2;
    scene.add(bellL);

    // Shaft connection
    const shaftLen = 34.5 - 26.5;
    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.4, shaftLen, 12);
    const shaftMat = makeMetalMat(0x888888);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(26.5 + shaftLen / 2, 5, 0);
    shaft.rotation.z = Math.PI / 2;
    scene.add(shaft);

    // Terminal box
    const termGeo = new THREE.BoxGeometry(1.5, 1, 1);
    const termMat = makeMetalMat(0x008844);
    const term = new THREE.Mesh(termGeo, termMat);
    term.position.set(37, 8, 0);
    scene.add(term);

    // ===== CONDENSER =====
    const condCx = 32, condCy = 3.5, condCz = 9;
    const condLen = 7, condR = 2.2;
    const condShellMat = makeMat(0x3377cc, {roughness: 0.35, metalness: 0.75});
    const condEndMat = makeMetalMat(0x2266aa);

    // Main horizontal shell
    const condShellGeo = new THREE.CylinderGeometry(condR, condR, condLen, 24);
    const condShell = new THREE.Mesh(condShellGeo, condShellMat);
    condShell.rotation.z = Math.PI / 2;
    condShell.position.set(condCx, condCy, condCz);
    condShell.castShadow = true;
    condShell.receiveShadow = true;
    condShell.userData = {id: 'condenser'};
    scene.add(condShell);
    components.condenser = condShell;

    // Front water box (hemisphere)
    const condWaterBoxGeo = new THREE.SphereGeometry(condR * 1.1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const condFrontBox = new THREE.Mesh(condWaterBoxGeo, condEndMat);
    condFrontBox.position.set(condCx - condLen / 2, condCy, condCz);
    condFrontBox.rotation.z = Math.PI / 2;
    condFrontBox.castShadow = true;
    scene.add(condFrontBox);

    // Back water box (hemisphere)
    const condBackBox = new THREE.Mesh(condWaterBoxGeo, condEndMat);
    condBackBox.position.set(condCx + condLen / 2, condCy, condCz);
    condBackBox.rotation.z = -Math.PI / 2;
    condBackBox.castShadow = true;
    scene.add(condBackBox);

    // Water box flanges (rings at shell ends)
    const condFlangeGeo = new THREE.TorusGeometry(condR * 1.1, 0.15, 8, 24);
    const condFlangeMat = makeMetalMat(0x2255aa);
    const condFlangeL = new THREE.Mesh(condFlangeGeo, condFlangeMat);
    condFlangeL.position.set(condCx - condLen / 2, condCy, condCz);
    condFlangeL.rotation.y = Math.PI / 2;
    scene.add(condFlangeL);
    const condFlangeR = new THREE.Mesh(condFlangeGeo, condFlangeMat);
    condFlangeR.position.set(condCx + condLen / 2, condCy, condCz);
    condFlangeR.rotation.y = Math.PI / 2;
    scene.add(condFlangeR);

    // Tube sheet (visible disc at each end)
    const tubeSheetGeo = new THREE.CylinderGeometry(condR * 0.9, condR * 0.9, 0.2, 24);
    const tubeSheetMat = makeMetalMat(0x335577, 0.8, 0.3);
    const tubeSheetL = new THREE.Mesh(tubeSheetGeo, tubeSheetMat);
    tubeSheetL.rotation.z = Math.PI / 2;
    tubeSheetL.position.set(condCx - condLen / 2 + 0.3, condCy, condCz);
    scene.add(tubeSheetL);
    const tubeSheetR = new THREE.Mesh(tubeSheetGeo, tubeSheetMat);
    tubeSheetR.rotation.z = Math.PI / 2;
    tubeSheetR.position.set(condCx + condLen / 2 - 0.3, condCy, condCz);
    scene.add(tubeSheetR);

    // Tube bundle (visible tubes running through shell)
    const condTubeMat = makeMetalMat(0x4488dd, 0.9, 0.1);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 8; col++) {
        const angle = (col / 8) * Math.PI * 2;
        const r = condR * 0.55;
        const ty = condCy + Math.sin(angle) * r * ((row % 2 === 0) ? 1 : 0.5);
        const tz = condCz + Math.cos(angle) * r * ((row % 2 === 0) ? 1 : 0.5);
        const condTubeGeo = new THREE.CylinderGeometry(0.07, 0.07, condLen - 1, 6);
        const condTube = new THREE.Mesh(condTubeGeo, condTubeMat);
        condTube.rotation.z = Math.PI / 2;
        condTube.position.set(condCx, ty, tz);
        scene.add(condTube);
      }
    }

    // Support legs
    const condLegMat = makeMetalMat(0x445566);
    [-2.5, 2.5].forEach(dx => {
      const legGeo = new THREE.CylinderGeometry(0.15, 0.18, condCy, 6);
      const leg = new THREE.Mesh(legGeo, condLegMat);
      leg.position.set(condCx + dx, condCy / 2, condCz);
      leg.castShadow = true;
      scene.add(leg);
    });
    // Base plate
    const condBaseGeo = new THREE.BoxGeometry(8, 0.15, condR * 2.5);
    const condBase = new THREE.Mesh(condBaseGeo, condLegMat);
    condBase.position.set(condCx, 0.075, condCz);
    condBase.castShadow = true;
    scene.add(condBase);

    // Exhaust steam inlet on top
    const condInletGeo = new THREE.CylinderGeometry(0.6, 0.6, 1, 12);
    const condInlet = new THREE.Mesh(condInletGeo, condShellMat);
    condInlet.position.set(condCx - 1, condCy + condR + 0.5, condCz);
    condInlet.castShadow = true;
    scene.add(condInlet);

    // Condensate outlet on bottom
    const condOutletGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 10);
    const condOutlet = new THREE.Mesh(condOutletGeo, condEndMat);
    condOutlet.position.set(condCx + 1, condCy - condR - 0.3, condCz);
    scene.add(condOutlet);

    // ===== PUMPS =====
    // Condensate Pump
    // Condensate Pump removed

    // Feed Water Pump
    createPump(scene, 14, 1.8, 8, 1.4, 0xc0c0c0, 'feedPump');

    // Sea Water Pump removed

    // ===== COOLING FAN =====


    // ===== PIPING =====

    // Exhaust pipe: vertical rise → elbow → horizontal run → elbow → vertical drop into boiler
    const exhMat = makeMetalMat(0xff4444);
    const exhR = 0.4;
    const elbowR = 2.0;

    // Vertical rise from sinter hood top (y=8.9) to just below the top elbow
    const hoodTop = 8.9;
    const pipeX = -20;
    const vRiseLen = 15 - elbowR - hoodTop;
    const vRiseGeo = new THREE.CylinderGeometry(exhR, exhR, vRiseLen, 16);
    const vRise = new THREE.Mesh(vRiseGeo, exhMat);
    vRise.position.set(pipeX, hoodTop + vRiseLen / 2, 0);
    vRise.castShadow = true;
    scene.add(vRise);

    // Top-left elbow: vertical (coming up) → horizontal (going right)
    const elbowLPoints: [number, number, number][] = [
      [pipeX, 15 - elbowR, 0],
      [pipeX, 15 - elbowR * 0.45, 0],
      [pipeX + elbowR * 0.15, 15 - elbowR * 0.15, 0],
      [pipeX + elbowR * 0.55, 15, 0],
      [pipeX + elbowR, 15, 0],
    ];
    createPipe(scene, elbowLPoints, exhR, 0xff4444);

    // Horizontal run between the two elbows
    const hLen = (5 - elbowR) - (pipeX + elbowR);
    const hGeo = new THREE.CylinderGeometry(exhR, exhR, hLen, 16);
    const hPipe = new THREE.Mesh(hGeo, exhMat);
    hPipe.rotation.z = Math.PI / 2;
    hPipe.position.set((pipeX + elbowR + 5 - elbowR) / 2, 15, 0);
    hPipe.castShadow = true;
    scene.add(hPipe);

    // Top-right elbow: horizontal (coming from left) → vertical (going down)
    const elbowRPoints: [number, number, number][] = [
      [5 - elbowR, 15, 0],
      [5 - elbowR * 0.55, 15, 0],
      [5 - elbowR * 0.15, 15 - elbowR * 0.15, 0],
      [5, 15 - elbowR * 0.45, 0],
      [5, 15 - elbowR, 0],
    ];
    createPipe(scene, elbowRPoints, exhR, 0xff4444);

    // Vertical drop from elbow end (y=13.8) to nozzle (y=13.4)
    const dropLen = 0.6;
    const dropGeo = new THREE.CylinderGeometry(exhR, exhR, dropLen, 16);
    const dropPipe = new THREE.Mesh(dropGeo, exhMat);
    dropPipe.position.set(5, 13.4 + dropLen / 2, 0);
    dropPipe.castShadow = true;
    scene.add(dropPipe);

    const pipes: {points: [number, number, number][]; color: number; radius: number}[] = [
    ];

    pipes.forEach(p => {
      createPipe(scene, p.points, p.radius, p.color);
    });

    // ===== CONDENSATE PUMP → CONDENSER (connects to side/end face) =====
    // Pump platform near condenser front water box
    const cp2Mat = makeMetalMat(0x445566);
    const cp2Plat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 2.5), cp2Mat);
    cp2Plat.position.set(26, 3.2, 11);
    scene.add(cp2Plat);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), cp2Mat);
      leg.position.set(26 + dx, 1.6, 11 + dz);
      scene.add(leg);
    });
    // Pump on platform
    createPump(scene, 26, 3.9, 11, 0.7, 0x2255aa, 'condenserPump');
    // Pipe from pump to condenser front end face (flat side, not round shell)
    createPipe(scene, [
      [26, 3.9, 11],
      [27, 3.7, 10.3],
      [27.8, 3.5, 9.6],
      [28.5, 3.5, 9],
    ], 0.25, 0x5599cc);


    const fpPipeR = 0.25;
    const fpPumpOx = 14 + 1.4 * 0.2;
    const fpPumpOy = 1.8 + 1.4 * 1.15;

    // Condenser → Feed Pump (sweeping arc)
    createPipe(scene, [
      [32, 2.5, 9],
      [30, 2, 8.5],
      [27, 1.5, 8.5],
      [fpPumpOx + 1.2, fpPumpOy, 8],
    ], fpPipeR, 0x3399ff);

    // Feed Pump → Economizer (sweeping arc)
    createPipe(scene, [
      [fpPumpOx, fpPumpOy, 8],
      [fpPumpOx, fpPumpOy + 1, 8],
      [fpPumpOx - 1, 3.5, 8],
      [11.85, 4.25, 8],
      [11.85, 4.25, 6],
      [11.85, 4.25, 3.5],
      [11.85, 4.25, 2],
      [11.85, 4.25, 1],
      [11.85, 4.25, 0.5],
      [11.85, 4.25, 0],
      [11.8, 4.25, 0],
    ], fpPipeR, 0x3399ff);

    createFlange(scene, fpPumpOx, fpPumpOy, 8, 0.35, 0.08);

    // ===== EVAPORATOR OUTLET → STEAM DRUM (sweeping arc, routes around platform) =====
    const evPipeR = 0.35;
    const evPipeMat = makeMetalMat(0xffaa00);
    const evDrumX = 20.5, evDrumY = 14, evDrumZ = 8;

    createPipe(scene, [
      [11.8, 8.5, 0],
      [12.5, 8.5, 0],
      [13, 8.5, 0.5],
      [15, 9.5, 1.5],
      [17, 11, 3],
      [18, 12.5, 4],
      [18, 14, 5],
      [19, 15, 6.5],
      [20, 15, 7.5],
      [21, 14.5, 8],
      [19, 13, 8],
    ], evPipeR, 0xffaa00);

    createFlange(scene, 19, 13, 8, 0.4, 0.08);

    // ===== STEAM DRUM → EVAPORATOR (downcomer, routes to ground-level pump) =====
    createPipe(scene, [
      [22, 13, 8],
      [22, 14.5, 9.5],
      [21, 15, 11],
      [19.5, 15, 12.5],
      [18, 14, 12],
      [17, 11, 10],
      [16, 7, 8],
      [15.5, 4, 6],
      [15.5, 3.4, 6],
    ], evPipeR, 0xffaa00);

    // Circulation pump on ground-level platform
    createPump(scene, 15.5, 3.4, 6, 1.0, 0xcc3333, 'circPump');

    // Downcomer continuation: pump → evaporator
    createPipe(scene, [
      [15.5, 3.4, 6],
      [14, 4, 5],
      [13, 5, 4],
      [12, 6.5, 3],
      [11.8, 8, 2],
    ], evPipeR, 0xffaa00);

    // Downcomer continuation: pump → evaporator
    createPipe(scene, [
      [15, 3.3, 6],
      [14, 4, 5],
      [13, 5, 4],
      [12, 6.5, 3],
      [11.8, 8, 2],
    ], evPipeR, 0xffaa00);

    // ===== ECONOMIZER OUTLET → STEAM DRUM (routes around platform) =====
    const ecPipeR = 0.25;

    createPipe(scene, [
      [11.8, 4.25, 0],
      [12.5, 4.25, 0],
      [13, 4.25, 0.5],
      [14.5, 5.5, 1.5],
      [16, 7.5, 3],
      [17.5, 10, 4],
      [18, 12, 5],
      [19, 13, 6.5],
      [19, 12.5, 8],
    ], ecPipeR, 0x4488cc);

    // ===== SUPERHEATER OUTLET → TURBINE INLET (sweeping arc) =====
    const shPipeR = 0.35;
    const shPipeMat = makeMetalMat(0xcc2222);

    createPipe(scene, [
      [11.8, 11.5, 0],
      [12.5, 11.5, 0],
      [13, 11.5, 0.3],
      [14.5, 10.5, 0.6],
      [15.5, 9, 0.5],
      [16, 7.5, 0.3],
      [16.5, 6, 0.2],
      [17, 5.5, 0],
      [18, 5, 0],
    ], shPipeR, 0xcc2222);

    [9.5, 7.0].forEach(sy => {
      const supMat = makeMetalMat(0x556677);
      const sup = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.15), supMat);
      sup.position.set(15.5, sy, 0);
      scene.add(sup);
    });

    // Pipe supports/brackets
    const bracketPositions = [[-7, 6, 0]];
    bracketPositions.forEach(pos => {
      const bracketGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
      const bracketMat = makeMetalMat(0x556677);
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(pos[0], pos[1] - 0.4, pos[2]);
      scene.add(bracket);
    });



    // ===== RIVER (right side of condenser) =====
    const rcx = 44, rcz = 22, rw = 10, rl = 30;

    // Animated water texture
    const wc = document.createElement('canvas');
    wc.width = 512; wc.height = 512;
    const wctx = wc.getContext('2d')!;
    const wg = wctx.createLinearGradient(0, 0, 0, 512);
    wg.addColorStop(0, '#1565c0'); wg.addColorStop(0.25, '#1e88e5');
    wg.addColorStop(0.5, '#1976d2'); wg.addColorStop(0.75, '#2196f3');
    wg.addColorStop(1, '#1565c0');
    wctx.fillStyle = wg; wctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 300; i++) {
      const brightness = 180 + Math.random() * 75;
      wctx.fillStyle = `rgba(${brightness}, ${brightness + 30}, 255, ${0.06 + Math.random() * 0.12})`;
      wctx.beginPath();
      wctx.ellipse(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 20, 1 + Math.random() * 5, Math.random() * Math.PI, 0, Math.PI * 2);
      wctx.fill();
    }
    for (let y = 0; y < 512; y += 8) {
      wctx.strokeStyle = `rgba(200, 230, 255, ${0.04 + Math.random() * 0.06})`;
      wctx.lineWidth = 0.5 + Math.random() * 1.5;
      wctx.beginPath();
      wctx.moveTo(0, y);
      for (let x = 0; x < 512; x += 10) {
        wctx.lineTo(x, y + Math.sin(x * 0.02 + y * 0.01) * 3);
      }
      wctx.stroke();
    }
    const wtex = new THREE.CanvasTexture(wc);
    wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
    wtex.repeat.set(1, 4);

    // Water surface - bright visible plane
    const waterGeo = new THREE.PlaneGeometry(rw - 0.5, rl - 1, 20, 40);
    const waterMat = new THREE.MeshStandardMaterial({
      map: wtex, color: 0x2196f3,
      metalness: 0.5, roughness: 0.1,
      emissive: 0x0d47a1, emissiveIntensity: 0.35,
      transparent: true, opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(rcx, 0.15, rcz);
    waterMesh.userData.isWater = true;
    scene.add(waterMesh);

    // Vertex displacement for gentle wave shape
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      const x = wPos.getX(i);
      const y = wPos.getY(i);
      wPos.setZ(i, Math.sin(x * 2 + y * 0.5) * 0.08 + Math.cos(x * 1.5 - y * 0.3) * 0.06);
    }
    waterGeo.computeVertexNormals();

    // Shallow water edge strip (lighter blue)
    const edgeGeo = new THREE.PlaneGeometry(rw + 0.5, rl, 4, 20);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x42a5f5, metalness: 0.3, roughness: 0.2,
      emissive: 0x1565c0, emissiveIntensity: 0.15,
      transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.rotation.x = -Math.PI / 2;
    edgeMesh.position.set(rcx, 0.05, rcz);
    scene.add(edgeMesh);

    // Riverbed visible beneath
    const bedGeo = new THREE.PlaneGeometry(rw + 2, rl + 1, 8, 20);
    const bedCanvas = document.createElement('canvas');
    bedCanvas.width = 256; bedCanvas.height = 256;
    const bctx = bedCanvas.getContext('2d')!;
    bctx.fillStyle = '#2a2520'; bctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) {
      bctx.fillStyle = `rgb(${40 + Math.random() * 30}, ${35 + Math.random() * 25}, ${25 + Math.random() * 20})`;
      bctx.beginPath();
      bctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 4, 0, Math.PI * 2);
      bctx.fill();
    }
    const bedTex = new THREE.CanvasTexture(bedCanvas);
    bedTex.wrapS = bedTex.wrapT = THREE.RepeatWrapping;
    bedTex.repeat.set(3, 8);
    const bedMat2 = new THREE.MeshStandardMaterial({map: bedTex, color: 0x3e3530, roughness: 0.95, metalness: 0.02});
    const bedMesh = new THREE.Mesh(bedGeo, bedMat2);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.set(rcx, -0.35, rcz);
    scene.add(bedMesh);

    // Banks - green-brown terrain
    const bankMat3 = new THREE.MeshStandardMaterial({color: 0x3a4a2a, roughness: 0.88, metalness: 0.02});
    const bankSlopeMat = new THREE.MeshStandardMaterial({color: 0x5a5040, roughness: 0.9, metalness: 0.05});

    // Left bank
    const lbGeo = new THREE.PlaneGeometry(2, rl + 2, 4, 20);
    const lbPos = lbGeo.attributes.position;
    for (let i = 0; i < lbPos.count; i++) {
      const ly = lbPos.getY(i);
      const lx = lbPos.getX(i);
      const edgeDist = lx + 1;
      lbPos.setZ(i, Math.max(0, edgeDist * 0.4) + Math.sin(ly * 1.5) * 0.15);
    }
    lbGeo.computeVertexNormals();
    const lb = new THREE.Mesh(lbGeo, bankMat3);
    lb.rotation.x = -Math.PI / 2;
    lb.position.set(rcx - rw / 2 - 0.5, 0.1, rcz);
    scene.add(lb);

    // Right bank
    const rbGeo = new THREE.PlaneGeometry(2, rl + 2, 4, 20);
    const rbPos = rbGeo.attributes.position;
    for (let i = 0; i < rbPos.count; i++) {
      const ry = rbPos.getY(i);
      const rx = rbPos.getX(i);
      const edgeDist = 1 - rx;
      rbPos.setZ(i, Math.max(0, edgeDist * 0.4) + Math.sin(ry * 1.5) * 0.15);
    }
    rbGeo.computeVertexNormals();
    const rb = new THREE.Mesh(rbGeo, bankMat3);
    rb.rotation.x = -Math.PI / 2;
    rb.position.set(rcx + rw / 2 + 0.5, 0.1, rcz);
    scene.add(rb);

    // Rocks scattered along banks
    for (let i = 0; i < 40; i++) {
      const t = Math.random();
      const z = rcz - rl / 2 + t * rl;
      const side = Math.random() > 0.5 ? 1 : -1;
      const rsz = 0.12 + Math.random() * 0.35;
      const rockGeo = new THREE.DodecahedronGeometry(rsz, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.12, 0.22 + Math.random() * 0.18),
        roughness: 0.85, metalness: 0.05,
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(rcx + side * (rw / 2 + 0.5 + Math.random() * 2.5), rsz * 0.4, z);
      rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      rock.castShadow = true;
      scene.add(rock);
    }

    // Submerged pebbles (visible through water)
    for (let i = 0; i < 20; i++) {
      const px = rcx + (Math.random() - 0.5) * (rw - 1);
      const pz = rcz - rl / 2 + Math.random() * rl;
      const ps = 0.15 + Math.random() * 0.3;
      const pebGeo = new THREE.SphereGeometry(ps, 6, 4);
      const pebMat = new THREE.MeshStandardMaterial({color: 0x555550, roughness: 0.7, transparent: true, opacity: 0.45});
      const peb = new THREE.Mesh(pebGeo, pebMat);
      peb.position.set(px, -0.15, pz);
      peb.scale.y = 0.5;
      scene.add(peb);
    }

    // White foam / ripple lines on surface
    for (let i = 0; i < 30; i++) {
      const fx = rcx + (Math.random() - 0.5) * (rw - 2);
      const fz = rcz - rl / 2 + Math.random() * rl;
      const fw = 0.5 + Math.random() * 2;
      const fGeo = new THREE.PlaneGeometry(fw, 0.06);
      const fMat = new THREE.MeshBasicMaterial({color: 0xe3f2fd, transparent: true, opacity: 0.25 + Math.random() * 0.3, side: THREE.DoubleSide});
      const f = new THREE.Mesh(fGeo, fMat);
      f.rotation.x = -Math.PI / 2;
      f.rotation.z = Math.random() * 0.3;
      f.position.set(fx, 0.22, fz);
      scene.add(f);
    }

    // Reflection highlights
    for (let i = 0; i < 15; i++) {
      const hx = rcx + (Math.random() - 0.5) * (rw - 2);
      const hz = rcz - rl / 2 + Math.random() * rl;
      const hGeo = new THREE.PlaneGeometry(0.8 + Math.random() * 2, 0.15);
      const hMat = new THREE.MeshBasicMaterial({color: 0xbbddff, transparent: true, opacity: 0.15 + Math.random() * 0.1, side: THREE.DoubleSide});
      const h = new THREE.Mesh(hGeo, hMat);
      h.rotation.x = -Math.PI / 2;
      h.position.set(hx, 0.25, hz);
      scene.add(h);
    }

    // End caps (natural river ends)
    const endGeo = new THREE.PlaneGeometry(rw + 2, 3, 4, 4);
    const endPos = endGeo.attributes.position;
    for (let i = 0; i < endPos.count; i++) {
      const ex = endPos.getX(i);
      endPos.setZ(i, Math.abs(ex) * 0.3 + Math.random() * 0.2);
    }
    endGeo.computeVertexNormals();
    const endF = new THREE.Mesh(endGeo, bankMat3);
    endF.rotation.x = -Math.PI / 2;
    endF.position.set(rcx, 0.15, rcz - rl / 2 - 1.5);
    scene.add(endF);
    const endB = new THREE.Mesh(endGeo.clone(), bankMat3);
    endB.rotation.x = -Math.PI / 2;
    endB.position.set(rcx, 0.15, rcz + rl / 2 + 1.5);
    scene.add(endB);

    // Condenser discharge pipe to river (straight)
    createPipe(scene, [
      [35.5, 3.5, 9],
      [37.5, 2.5, 9],
      [39, 1.5, 9],
      [rcx - rw / 2, 0.5, 9],
    ], 0.4, 0x2255aa);

    // Condenser intake pipe from river (straight)
    createPipe(scene, [
      [35.5, 2.5, 10],
      [37.5, 1.5, 10],
      [39, 0.5, 10],
      [rcx - rw / 2, 0.3, 10],
    ], 0.35, 0x3366aa);

    createPump(scene, 38, 1.5, 10, 1.0, 0x3366aa, 'seaWaterPump');

  }, []);

  const createFlowParticles = useCallback((scene: THREE.Scene): THREE.Mesh[] => {
    const particles: THREE.Mesh[] = [];
    const flowPaths = [
      {color: 0xff4444, points: [[-20, 8.9, 0], [-20, 13.8, 0], [-19.3, 15, 0], [-18.8, 15, 0], [3.8, 15, 0], [5, 14.5, 0], [5, 13.8, 0], [5, 13.4, 0]], count: 35},
      {color: 0x00aaff, points: [[26, 3.5, 0], [28, 3, 2], [30, 2.5, 5], [32, 2.5, 7]], count: 20},
      {color: 0x3399ff, points: [[14.28, 3.41, 8], [14.28, 4.25, 8], [11.85, 4.25, 8], [11.85, 4.25, 0]], count: 15},
      // Superheater steam to turbine (linear path)
      {color: 0xff3333, points: [[11.8, 11.5, 0], [16.2, 11.5, 0], [16.2, 5, 0], [18, 5, 0]], count: 25},
      // Evaporator outlet to steam drum
      {color: 0xffaa00, points: [[11.85, 8.5, 0], [11.85, 14, 0], [11.85, 14, 8], [20.5, 14, 8]], count: 20},
    ];

    flowPaths.forEach(flow => {
      const curve = new THREE.CatmullRomCurve3(flow.points.map(p => new THREE.Vector3(...p)));
      for (let i = 0; i < flow.count; i++) {
        const geo = new THREE.SphereGeometry(0.3, 8, 8);
        const mat = new THREE.MeshBasicMaterial({color: flow.color, transparent: true, opacity: 0.9, depthTest: false});
        const particle = new THREE.Mesh(geo, mat);
        particle.renderOrder = 999;
        particle.userData = {curve, t: i / flow.count, speed: 0.12 + Math.random() * 0.06};
        scene.add(particle);
        particles.push(particle);
      }
    });
    return particles;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c18);
    scene.fog = new THREE.FogExp2(0x080c18, 0.003);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(45, 35, 55);

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 15;
    controls.maxDistance = 120;
    controls.target.set(0, 6, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.5));

    const dir = new THREE.DirectionalLight(0xffeedd, 1.4);
    dir.position.set(35, 45, 25);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 120;
    dir.shadow.camera.left = -50;
    dir.shadow.camera.right = 50;
    dir.shadow.camera.top = 50;
    dir.shadow.camera.bottom = -50;
    dir.shadow.bias = -0.001;
    scene.add(dir);

    scene.add(new THREE.HemisphereLight(0x4488ff, 0x223344, 0.35));

    const rimLight = new THREE.DirectionalLight(0x00aaff, 0.25);
    rimLight.position.set(-25, 15, -25);
    scene.add(rimLight);

    // Subtle fill light
    const fillLight = new THREE.PointLight(0xff8844, 0.3, 60);
    fillLight.position.set(-25, 8, 5);
    scene.add(fillLight);

    const components: Record<string, THREE.Object3D> = {};
    buildScene(scene, components);
    const flowParticles: THREE.Mesh[] = [];

    // Falling particles inside boiler (hot gas/ash from top to bottom)
    const boilerDropParticles: THREE.Mesh[] = [];
    for (let i = 0; i < 80; i++) {
      const sz = 0.06 + Math.random() * 0.18;
      const geo = new THREE.SphereGeometry(sz, 5, 5);
      const r = 0.7 + Math.random() * 0.3;
      const g = 0.15 + Math.random() * 0.25;
      const b = 0.02 + Math.random() * 0.05;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(r, g, b),
        transparent: true,
        opacity: 0.5 + Math.random() * 0.5,
      });
      const drop = new THREE.Mesh(geo, mat);
      drop.position.set(
        1 + Math.random() * 8,
        1.5 + Math.random() * 11,
        -3 + Math.random() * 6
      );
      drop.userData.speed = 0.4 + Math.random() * 1.8;
      drop.userData.driftX = (Math.random() - 0.5) * 0.15;
      drop.userData.driftZ = (Math.random() - 0.5) * 0.1;
      drop.userData.phase = Math.random() * Math.PI * 2;
      scene.add(drop);
      boilerDropParticles.push(drop);
    }

    // ===== FIRE inside hood (sintering combustion) =====
    const fireEmbers: THREE.Mesh[] = [];
    for (let i = -4; i <= 4; i++) {
      const flamesPerSpot = 5 + Math.floor(Math.random() * 5);
      for (let f = 0; f < flamesPerSpot; f++) {
        const fh = 1.5 + Math.random() * 2.5;
        const fw = 0.5 + Math.random() * 0.8;
        const flameGeo = new THREE.ConeGeometry(fw, fh, 8);
        const r = 0.9 + Math.random() * 0.1;
        const g = 0.15 + Math.random() * 0.45;
        const b = Math.random() * 0.05;
        const flameMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(r, g, b),
          transparent: true,
          opacity: 0.6 + Math.random() * 0.4,
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        const fx = -25 + i * 2.4 + (Math.random() - 0.5) * 2;
        const fz = (Math.random() - 0.5) * 7;
        flame.position.set(fx, 3.0 + fh / 2, fz);
        flame.userData.baseY = flame.position.y;
        flame.userData.phase = Math.random() * Math.PI * 2;
        flame.userData.speed = 2 + Math.random() * 5;
        flame.userData.baseScale = 0.6 + Math.random() * 0.7;
        scene.add(flame);
        fireEmbers.push(flame);
      }
    }
    for (let i = 0; i < 80; i++) {
      const emberGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.2, 5, 5);
      const er = 1.0;
      const eg = 0.3 + Math.random() * 0.4;
      const eb = Math.random() * 0.05;
      const emberMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(er, eg, eb),
        transparent: true,
        opacity: 0.6 + Math.random() * 0.4,
      });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(
        -25 + (Math.random() - 0.5) * 18,
        1.6 + Math.random() * 0.3,
        (Math.random() - 0.5) * 7
      );
      ember.userData.phase = Math.random() * Math.PI * 2;
      ember.userData.speed = 1.5 + Math.random() * 3;
      scene.add(ember);
      fireEmbers.push(ember);
    }
    const fireLight = new THREE.PointLight(0xff5500, 4, 18);
    fireLight.position.set(-25, 5, 0);
    scene.add(fireLight);
    const fireLight2 = new THREE.PointLight(0xff3300, 2.5, 12);
    fireLight2.position.set(-20, 5, 2);
    scene.add(fireLight2);
    const fireLight3 = new THREE.PointLight(0xffaa00, 2, 10);
    fireLight3.position.set(-30, 5, -2);
    scene.add(fireLight3);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    stateRef.current = {
      scene, camera, renderer, controls, components, flowParticles,
      clock: new THREE.Clock(), raycaster, mouse, hovered: null, animId: 0,
      turbineBlades: [], generatorShaft: null,
    };

    // Axes indicator (top-right corner)
    const axesSize = 100;
    const axesScene = new THREE.Scene();
    axesScene.background = null;
    const axesCam = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    axesCam.position.set(0, 0, 4);
    const axesRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    axesRenderer.setSize(axesSize, axesSize);
    axesRenderer.setPixelRatio(window.devicePixelRatio);
    axesRenderer.setClearColor(0x000000, 0);
    axesRenderer.domElement.style.cssText = 'position:fixed;top:60px;right:15px;z-index:100;pointer-events:none;border:1px solid rgba(0,212,255,0.3);border-radius:8px;background:rgba(8,12,24,0.7);';
    document.body.appendChild(axesRenderer.domElement);

    const axesLen = 1.2;
    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(axesLen, 0, 0)]);
    const xAxisMat = new THREE.LineBasicMaterial({color: 0xff4444, linewidth: 2});
    const xAxisLine = new THREE.Line(xAxisGeo, xAxisMat);
    axesScene.add(xAxisLine);

    const yAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axesLen, 0)]);
    const yAxisMat = new THREE.LineBasicMaterial({color: 0x44ff44, linewidth: 2});
    const yAxisLine = new THREE.Line(yAxisGeo, yAxisMat);
    axesScene.add(yAxisLine);

    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axesLen)]);
    const zAxisMat = new THREE.LineBasicMaterial({color: 0x4488ff, linewidth: 2});
    const zAxisLine = new THREE.Line(zAxisGeo, zAxisMat);
    axesScene.add(zAxisLine);

    // Axis labels
    function makeAxisLabel(text: string, color: string, pos: [number, number, number]) {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      c.width = 64; c.height = 64;
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 32);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({map: tex, transparent: true});
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.4, 0.4, 0.4);
      sprite.position.set(...pos);
      return sprite;
    }
    axesScene.add(makeAxisLabel('X', '#ff4444', [axesLen + 0.35, 0, 0]));
    axesScene.add(makeAxisLabel('Y', '#44ff44', [0, axesLen + 0.35, 0]));
    axesScene.add(makeAxisLabel('Z', '#4488ff', [0, 0, axesLen + 0.35]));

    // Small origin dot
    const originGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const originMat = new THREE.MeshBasicMaterial({color: 0xffffff});
    axesScene.add(new THREE.Mesh(originGeo, originMat));

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const onClick = (e: MouseEvent) => {
      const s = stateRef.current!;
      s.mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
      s.mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
      s.raycaster.setFromCamera(s.mouse, s.camera);
      const meshes = Object.values(s.components);
      const intersects = s.raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData.id) obj = obj.parent;
        const id = obj?.userData.id;
        if (id && componentData[id]) onSelect(id);
      } else {
        onSelect(null);
      }
    };

    const onHover = (e: MouseEvent) => {
      const s = stateRef.current!;
      s.mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
      s.mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
      s.raycaster.setFromCamera(s.mouse, s.camera);
      const meshes = Object.values(s.components);
      const intersects = s.raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData.id) hitObj = hitObj.parent;
        if (hitObj && s.hovered !== hitObj) {
          if (s.hovered) s.hovered.traverse(o => {
            if ((o as THREE.Mesh).material) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.08;
          });
          s.hovered = hitObj;
          hitObj.traverse(o => {
            if ((o as THREE.Mesh).material) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
          });
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        if (s.hovered) s.hovered.traverse(o => {
          if ((o as THREE.Mesh).material) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.08;
        });
        s.hovered = null;
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onHover);
    window.addEventListener('resize', onResize);

    const animate = () => {
      const s = stateRef.current!;
      const delta = s.clock.getDelta();
      const elapsed = s.clock.elapsedTime;

      s.flowParticles.forEach(p => {
        p.userData.t += p.userData.speed * delta;
        if (p.userData.t > 1) p.userData.t -= 1;
        const pos = p.userData.curve.getPoint(p.userData.t);
        p.position.copy(pos);
        p.material.opacity = 0.5 + Math.sin(p.userData.t * Math.PI) * 0.4;
        const scale = 0.8 + Math.sin(p.userData.t * Math.PI) * 0.4;
        p.scale.setScalar(scale);
      });

      // Falling boiler particles
      boilerDropParticles.forEach(p => {
        p.position.y -= p.userData.speed * delta;
        p.position.x += p.userData.driftX * delta;
        p.position.z += p.userData.driftZ * delta;
        (p.material as THREE.MeshBasicMaterial).opacity =
          0.4 + Math.sin(elapsed * 2 + p.userData.phase) * 0.35;
        if (p.position.y < 1.5) {
          p.position.y = 12.5 + Math.random() * 1;
          p.position.x = 1 + Math.random() * 8;
          p.position.z = -3 + Math.random() * 6;
          p.userData.speed = 0.4 + Math.random() * 1.8;
        }
      });

      // Fire animation inside hood
      fireEmbers.forEach(p => {
        if (p.userData.baseY !== undefined) {
          // Flame cone: flicker height and opacity
          const flicker = Math.sin(elapsed * p.userData.speed + p.userData.phase);
          const scale = p.userData.baseScale + flicker * 0.3;
          p.scale.set(1, scale, 1);
          (p.material as THREE.MeshBasicMaterial).opacity = 0.4 + flicker * 0.35;
        } else {
          // Ember: pulse opacity
          (p.material as THREE.MeshBasicMaterial).opacity =
            0.3 + Math.sin(elapsed * p.userData.speed + p.userData.phase) * 0.35;
        }
      });
      // Flicker the fire lights
      fireLight.intensity = 3.5 + Math.sin(elapsed * 5) * 1.2 + Math.sin(elapsed * 13) * 0.6;
      fireLight2.intensity = 2.0 + Math.sin(elapsed * 7 + 1) * 0.8;
      fireLight3.intensity = 1.8 + Math.sin(elapsed * 9 + 2) * 0.7;

      // Animate water surface UV offset for flowing effect
      s.scene.traverse(obj => {
        if ((obj as THREE.Mesh).userData?.isWater && (obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
          if (mat.normalMap) {
            mat.normalMap.offset.y -= delta * 0.08;
            mat.normalMap.offset.x += delta * 0.02;
          }
        }
      });

      s.controls.update();
      s.renderer.render(s.scene, s.camera);

      // Update axes indicator to mirror main camera rotation
      axesCam.position.copy(s.camera.position).normalize().multiplyScalar(4);
      axesCam.lookAt(0, 0, 0);
      axesRenderer.render(axesScene, axesCam);

      s.animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(stateRef.current!.animId);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousemove', onHover);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      axesRenderer.dispose();
      if (axesRenderer.domElement.parentNode) {
        axesRenderer.domElement.parentNode.removeChild(axesRenderer.domElement);
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [buildScene, createFlowParticles, onSelect]);

  useEffect(() => {
    if (!stateRef.current) return;
    stateRef.current.flowParticles.forEach(p => {
      p.visible = flowEnabled;
    });
  }, [flowEnabled]);

  useEffect(() => {
    if (!stateRef.current) return;
    const {components, camera, controls} = stateRef.current;
    Object.keys(components).forEach(key => {
      const comp = components[key];
      if (!comp) return;
      comp.traverse(obj => {
        if (!(obj as THREE.Mesh).material) return;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (key === selectedId) {
          mat.emissive.set(0x00f0ff);
          mat.emissiveIntensity = 1.2;
        } else {
          const origColor = componentData[key]?.color ?? 0xffffff;
          mat.emissive.set(origColor);
          mat.emissiveIntensity = 0.08;
        }
      });
    });
    if (selectedId && components[selectedId]) {
      const target = components[selectedId].position.clone();
      controls.target.lerp(target, 0.5);
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      const dist = 30;
      const idealPos = target.clone().add(dir.multiplyScalar(dist));
      camera.position.lerp(idealPos, 0.5);
    }
  }, [selectedId]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function taperCylinderGeo(rTop: number, rBot: number, h: number, seg: number) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg);
}

function createPump(scene: THREE.Scene, x: number, y: number, z: number, size: number, color: number, id: string) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const pumpBlue = makeMat(color, {roughness: 0.25, metalness: 0.8});
  const redFlange = makeMat(0xcc3300, {roughness: 0.3, metalness: 0.7});
  const boltMat = makeMetalMat(0x888888, 0.9, 0.3);
  const darkMat = makeMetalMat(0x333340, 0.6, 0.5);

  // === Volute casing (spiral/snail shape) ===
  // Main body - large cylinder
  const bodyGeo = new THREE.CylinderGeometry(size * 0.9, size, size * 0.7, 28);
  const body = new THREE.Mesh(bodyGeo, pumpBlue);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  body.userData = {id};
  group.add(body);

  // Volute tongue / spiral wrap using torus segments
  const voluteTorusGeo = new THREE.TorusGeometry(size * 0.65, size * 0.28, 12, 24, Math.PI * 1.4);
  const voluteTorus = new THREE.Mesh(voluteTorusGeo, pumpBlue);
  voluteTorus.position.set(0, 0, 0);
  voluteTorus.rotation.y = Math.PI / 2;
  voluteTorus.rotation.z = Math.PI * 0.15;
  voluteTorus.castShadow = true;
  group.add(voluteTorus);

  // Back plate (flat disc)
  const backPlateGeo = new THREE.CylinderGeometry(size * 0.95, size * 0.95, 0.12, 28);
  const backPlate = new THREE.Mesh(backPlateGeo, pumpBlue);
  backPlate.rotation.z = Math.PI / 2;
  backPlate.position.x = -size * 0.35;
  group.add(backPlate);

  // Front shroud (smaller disc)
  const frontShroudGeo = new THREE.CylinderGeometry(size * 0.75, size * 0.85, 0.1, 28);
  const frontShroud = new THREE.Mesh(frontShroudGeo, pumpBlue);
  frontShroud.rotation.z = Math.PI / 2;
  frontShroud.position.x = size * 0.35;
  group.add(frontShroud);

  // === Horizontal split line with bolts ===
  const splitGeo = new THREE.BoxGeometry(size * 2.2, 0.06, 0.06);
  const splitMat = makeMetalMat(0x2255aa);
  const splitLine = new THREE.Mesh(splitGeo, splitMat);
  splitLine.position.set(0, 0, size * 0.72);
  group.add(splitLine);
  const splitLine2 = splitLine.clone();
  splitLine2.position.z = -size * 0.72;
  group.add(splitLine2);

  // Bolts along split line
  for (let i = -4; i <= 4; i++) {
    const boltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6);
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(i * size * 0.2, 0, size * 0.82);
    group.add(bolt);
    const bolt2 = bolt.clone();
    bolt2.position.z = -size * 0.82;
    group.add(bolt2);
  }

  // === Suction nozzle (axial inlet - horizontal, facing left) ===
  const inletPipeGeo = new THREE.CylinderGeometry(size * 0.4, size * 0.4, size * 0.6, 16);
  const inletPipe = new THREE.Mesh(inletPipeGeo, pumpBlue);
  inletPipe.rotation.z = Math.PI / 2;
  inletPipe.position.set(-size * 1.1, 0, 0);
  inletPipe.castShadow = true;
  group.add(inletPipe);

  // Inlet flange (red disc)
  const inletFlangeGeo = new THREE.CylinderGeometry(size * 0.55, size * 0.55, 0.15, 20);
  const inletFlange = new THREE.Mesh(inletFlangeGeo, redFlange);
  inletFlange.rotation.z = Math.PI / 2;
  inletFlange.position.set(-size * 1.4, 0, 0);
  group.add(inletFlange);

  // Inlet flange bolt holes
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const fbGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    const fb = new THREE.Mesh(fbGeo, boltMat);
    fb.rotation.z = Math.PI / 2;
    fb.position.set(-size * 1.4, Math.sin(angle) * size * 0.42, Math.cos(angle) * size * 0.42);
    group.add(fb);
  }

  // === Discharge nozzle (top outlet - vertical) ===
  const outletPipeGeo = new THREE.CylinderGeometry(size * 0.3, size * 0.3, size * 0.5, 14);
  const outletPipe = new THREE.Mesh(outletPipeGeo, pumpBlue);
  outletPipe.position.set(size * 0.2, size * 0.85, 0);
  outletPipe.castShadow = true;
  group.add(outletPipe);

  // Outlet flange (red disc)
  const outletFlangeGeo = new THREE.CylinderGeometry(size * 0.42, size * 0.42, 0.15, 18);
  const outletFlange = new THREE.Mesh(outletFlangeGeo, redFlange);
  outletFlange.position.set(size * 0.2, size * 1.15, 0);
  group.add(outletFlange);

  // Outlet flange bolts
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const fbGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6);
    const fb = new THREE.Mesh(fbGeo, boltMat);
    fb.position.set(size * 0.2 + Math.sin(angle) * size * 0.34, size * 1.15, Math.cos(angle) * size * 0.34);
    group.add(fb);
  }

  // === Bearing housing (between pump and motor) ===
  const bearingGeo = new THREE.CylinderGeometry(size * 0.35, size * 0.35, size * 0.4, 16);
  const bearing = new THREE.Mesh(bearingGeo, darkMat);
  bearing.position.set(size * 0.5, size * 0.4, 0);
  bearing.castShadow = true;
  group.add(bearing);

  // === Motor (vertical, on top) ===
  const motorBodyGeo = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size * 1.2, 20);
  const motorBodyMat = makeMat(0x445566, {roughness: 0.3, metalness: 0.75});
  const motorBody = new THREE.Mesh(motorBodyGeo, motorBodyMat);
  motorBody.position.set(size * 0.5, size * 1.6, 0);
  motorBody.castShadow = true;
  group.add(motorBody);

  // Motor cooling fins
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const finGeo = new THREE.BoxGeometry(0.06, size * 1.1, 0.15);
    const fin = new THREE.Mesh(finGeo, motorBodyMat);
    fin.position.set(
      size * 0.5 + Math.cos(angle) * size * 0.52,
      size * 1.6,
      Math.sin(angle) * size * 0.52
    );
    fin.rotation.y = angle;
    group.add(fin);
  }

  // Motor terminal box
  const termGeo = new THREE.BoxGeometry(size * 0.3, size * 0.25, size * 0.3);
  const termBox = new THREE.Mesh(termGeo, darkMat);
  termBox.position.set(size * 0.5 + size * 0.4, size * 1.8, 0);
  group.add(termBox);

  // Motor top cap
  const capGeo = new THREE.SphereGeometry(size * 0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const motorCap = new THREE.Mesh(capGeo, motorBodyMat);
  motorCap.position.set(size * 0.5, size * 2.2, 0);
  group.add(motorCap);

  // === Base plate / mounting feet ===
  const baseGeo = new THREE.BoxGeometry(size * 2.8, 0.2, size * 2);
  const baseMat2 = makeMetalMat(0x444450, 0.5, 0.6);
  const base = new THREE.Mesh(baseGeo, baseMat2);
  base.position.set(size * 0.2, -size * 0.9, 0);
  base.castShadow = true;
  group.add(base);

  // Mounting feet (4 corners)
  const footGeo = new THREE.BoxGeometry(size * 0.4, 0.15, size * 0.4);
  const footPositions = [
    [-size * 0.6, -size * 1.0, -size * 0.7],
    [-size * 0.6, -size * 1.0, size * 0.7],
    [size * 1.0, -size * 1.0, -size * 0.7],
    [size * 1.0, -size * 1.0, size * 0.7],
  ];
  footPositions.forEach(fp => {
    const foot = new THREE.Mesh(footGeo, baseMat2);
    foot.position.set(fp[0], fp[1], fp[2]);
    foot.castShadow = true;
    group.add(foot);
  });

  // Foundation bolts
  footPositions.forEach(fp => {
    const fboltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    const fbolt = new THREE.Mesh(fboltGeo, boltMat);
    fbolt.position.set(fp[0], fp[1] - 0.2, fp[2]);
    group.add(fbolt);
  });

  scene.add(group);
  group.userData = {id};
  return group;
}
