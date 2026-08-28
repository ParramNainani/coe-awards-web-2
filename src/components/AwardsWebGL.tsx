import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Line, Float, Sparkles } from '@react-three/drei';

function StreamTrail({ curve, isReversed, onComplete }: { curve: THREE.Curve<THREE.Vector3>, isReversed: boolean, onComplete: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);
  const progress = useRef(0);
  const speed = 0.18;
  const trailLength = 0.25;

  useFrame((state, delta) => {
    if (!ref.current) return;

    progress.current += delta * speed;

    if (progress.current >= 1) {
      onComplete();
      return;
    }

    const t = isReversed ? 1 - progress.current : progress.current;
    const pos = curve.getPoint(Math.min(Math.max(t, 0), 1));
    ref.current.position.copy(pos);

    const scale = Math.sin(progress.current * Math.PI) * 1.5;
    ref.current.scale.setScalar(Math.max(scale, 0.01));

    if (lineRef.current) {
      const positions: number[] = [];
      const numSegments = 15;
      for (let i = 0; i <= numSegments; i++) {
        const offset = (i / numSegments) * trailLength;
        let ptT = isReversed ? t + offset : t - offset;
        ptT = Math.min(Math.max(ptT, 0), 1);

        const pt = curve.getPoint(ptT);
        positions.push(pt.x, pt.y, pt.z);
      }
      lineRef.current.geometry.setPositions(positions);
      if (lineRef.current.geometry.boundingSphere === null) {
        lineRef.current.geometry.computeBoundingSphere();
      }
    }

    const worldPos = new THREE.Vector3();
    ref.current.getWorldPosition(worldPos);

    const targetCamPos = worldPos.clone().normalize().multiplyScalar(9);
    targetCamPos.y += 1.5;
    targetCamPos.normalize().multiplyScalar(9);

    state.camera.position.lerp(targetCamPos, delta * 2.5);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={Array(16).fill(new THREE.Vector3(0, 0, 0))}
        color="#ea580c"
        lineWidth={2.5}
        transparent={false}
        frustumCulled={false}
      />
      <mesh ref={ref} frustumCulled={false}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#ea580c" />
      </mesh>
    </group>
  );
}

function SingleDataStream({ arcs }: { arcs: any[] }) {
  const [streamState, setStreamState] = useState({ index: 0, isReversed: false });

  const handleComplete = () => {
    const currentArc = arcs[streamState.index];
    const endPoint = streamState.isReversed ? currentArc.p1 : currentArc.p2;

    const nextArcs: { idx: number, reverse: boolean }[] = [];
    arcs.forEach((arc, i) => {
      if (i !== streamState.index) {
        if (arc.p1.distanceTo(endPoint) < 0.1) nextArcs.push({ idx: i, reverse: false });
        else if (arc.p2.distanceTo(endPoint) < 0.1) nextArcs.push({ idx: i, reverse: true });
      }
    });

    if (nextArcs.length > 0) {
      const next = nextArcs[Math.floor(Math.random() * nextArcs.length)];
      setStreamState({ index: next.idx, isReversed: next.reverse });
    } else {
      setStreamState({ index: Math.floor(Math.random() * arcs.length), isReversed: false });
    }
  };

  if (arcs.length === 0) return null;

  return <StreamTrail key={`${streamState.index}-${streamState.isReversed}`} curve={arcs[streamState.index].curve} isReversed={streamState.isReversed} onComplete={handleComplete} />;
}

function ConnectionArcs({ radius }: { radius: number }) {
  const ObjectConnections = useMemo(() => {
    const arcs = [];
    const numPoints = 25;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      points.push(
        new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        )
      );
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const distance = p1.distanceTo(p2);

        if (distance < radius * 1.5 && Math.random() > 0.45) {
          const midPoint = p1.clone().add(p2).multiplyScalar(0.5);
          midPoint.normalize().multiplyScalar(radius + Math.max(distance * 0.3, 0.4));

          const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
          arcs.push({
            curvePoints: curve.getPoints(12),
            curve,
            p1,
            p2
          });
        }
      }
    }
    return { arcs, points };
  }, [radius]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {ObjectConnections.points.map((p, idx) => (
        <mesh key={`p-${idx}`} position={p}>
          <sphereGeometry args={[0.065, 8, 8]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      ))}

      {ObjectConnections.arcs.map((arc, idx) => (
        <Line
          key={`arc-line-${idx}`}
          points={arc.curvePoints}
          color="#ea580c"
          lineWidth={0.8}
          transparent
          opacity={0.15}
        />
      ))}

      {ObjectConnections.arcs.length > 0 && (
        <SingleDataStream arcs={ObjectConnections.arcs} />
      )}

      <group scale={[radius * 0.91, radius * 0.91, radius * 0.91]}>
        <mesh>
          <icosahedronGeometry args={[1.001, 2]} />
          <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.15} />
        </mesh>

        <mesh>
          <sphereGeometry args={[1.002, 16, 16]} />
          <meshBasicMaterial color="#ea580c" wireframe transparent opacity={0.08} />
        </mesh>

        <Sparkles count={60} scale={2} size={0.6} speed={0.15} opacity={0.3} color="#ea580c" />
        <Sparkles count={40} scale={2} size={0.5} speed={0.15} opacity={0.4} color="#94a3b8" />
      </group>
    </group>
  );
}

function BackgroundTechElements() {
  return (
    <group>
      <Sparkles count={50} scale={25} size={1.2} speed={0.2} opacity={0.2} color="#ea580c" />
      <Sparkles count={30} scale={25} size={0.8} speed={0.2} opacity={0.3} color="#94a3b8" />

      <Float speed={1.5} rotationIntensity={2} floatIntensity={2}>
        <mesh position={[-8, 5, -10]}>
          <icosahedronGeometry args={[1.5, 0]} />
          <meshBasicMaterial color="#cbd5e1" wireframe transparent opacity={0.15} />
        </mesh>
      </Float>

      <Float speed={1} rotationIntensity={1.5} floatIntensity={2}>
        <mesh position={[9, -4, -12]}>
          <octahedronGeometry args={[2, 0]} />
          <meshBasicMaterial color="#ea580c" wireframe transparent opacity={0.1} />
        </mesh>
      </Float>

      <Float speed={2} rotationIntensity={3} floatIntensity={1}>
        <mesh position={[-6, -6, -8]}>
          <torusGeometry args={[1.4, 0.04, 16, 48]} />
          <meshBasicMaterial color="#f97316" wireframe transparent opacity={0.15} />
        </mesh>
      </Float>
    </group>
  );
}

export default function AwardsWebGL() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 65 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      dpr={[1, 1.5]}
      performance={{ min: 0.5 }}
    >
      <fog attach="fog" args={['#f8fafc', 7, 24]} />

      <ambientLight intensity={1.5} />
      <pointLight position={[0, 0, -2]} intensity={1.0} color="#ffffff" distance={15} />
      <pointLight position={[8, 8, 6]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-8, -6, 5]} intensity={1.0} color="#ea580c" />

      <BackgroundTechElements />

      <ConnectionArcs radius={4.5} />
    </Canvas>
  );
}
