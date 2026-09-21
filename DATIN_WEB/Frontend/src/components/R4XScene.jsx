import React, { useEffect, useRef, useState, Suspense } from 'react';
import Spline from '@splinetool/react-spline';
import { R4X_SPLINE_SCENE_URL } from '../api/config';
import CyberneticCore from './CyberneticCore';

const R4XScene = ({ watermark = 'DTNC', is3DMode = true }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const sceneRef = useRef(null);
  const splineAppRef = useRef(null);
  const helmetRef = useRef(null);
  const eyesRef = useRef(null);
  const robotRef = useRef(null);

  // If Speed / Performance mode is active, render the lightweight 60–144 FPS Cybernetic Core
  if (!is3DMode) {
    return (
      <div className="spline-scene-wrapper r4x-scene-wrapper">
        <CyberneticCore variant="dtnc" watermark={watermark} />
      </div>
    );
  }

  const handleSplineLoad = (splineApp) => {
    splineAppRef.current = splineApp;

    try {
      // 1. Cap pixel ratio on Retina displays to eliminate 4K GPU fillrate lag
      if (splineApp?._renderer?.renderer) {
        const threeRenderer = splineApp._renderer.renderer;
        if (typeof threeRenderer.setPixelRatio === 'function') {
          threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        }
      }

      // 2. Completely disable the internal WebGL Spline watermark logo overlay pass
      if (splineApp?._renderer?.pipeline) {
        const pipeline = splineApp._renderer.pipeline;
        if (pipeline.logoOverlayPass) {
          pipeline.logoOverlayPass.enabled = false;
        }
        pipeline.setWatermark = function () {
          if (this.logoOverlayPass) {
            this.logoOverlayPass.enabled = false;
          }
        };
        if (typeof pipeline.updateRenderToScreen === 'function') {
          pipeline.updateRenderToScreen();
        }
      }

      const scene = splineApp._scene;

      // 3. Locate Robot, Helmet, Eyes in the 3D scene
      const findObj = (name) => {
        if (scene?.getObjectByName) {
          const obj = scene.getObjectByName(name);
          if (obj) return obj;
        }
        if (typeof splineApp.findObjectByName === 'function') {
          return splineApp.findObjectByName(name);
        }
        return null;
      };

      helmetRef.current = findObj('Helmet') || findObj('Head') || findObj('Sphere');
      eyesRef.current = findObj('Eyes') || findObj('Eye') || findObj('Face');
      robotRef.current = findObj('Robot') || findObj('Body') || findObj('Group') || scene;

      // 4. Disable conflicting built-in event listeners to prevent loop fighting
      const lookAtEvents = splineApp._eventManager?.handlers?.LookAt?.events || [];
      lookAtEvents.forEach((ev) => {
        if (ev && typeof ev.stop === 'function') {
          ev.stop();
        } else if (ev) {
          ev.enabled = false;
        }
      });
      if (splineApp._eventManager?.handlers?.LookAt) {
        splineApp._eventManager.handlers.LookAt.enabled = false;
      }

      const mouseEvents = splineApp._eventManager?.handlers?.MouseHover?.events || [];
      mouseEvents.forEach((ev) => {
        if (ev && typeof ev.stop === 'function') {
          ev.stop();
        } else if (ev) {
          ev.enabled = false;
        }
      });

      const controls = splineApp._controls;
      if (controls) {
        controls.enabled = false;
        if (controls.enableRotate !== undefined) controls.enableRotate = false;
        if (controls.enableZoom !== undefined) controls.enableZoom = false;
        if (controls.enablePan !== undefined) controls.enablePan = false;
      }

      if (typeof splineApp.setGlobalEvents === 'function') {
        splineApp.setGlobalEvents(false);
      }

      // 5. Initial front view render
      const cam = splineApp._camera;
      if (cam) {
        cam.position.set(0, 0, 1000);
        cam.rotation.set(0, 0, 0);
        if (typeof cam.lookAt === 'function') {
          cam.lookAt(0, 0, 0);
        }
      }

      if (helmetRef.current) helmetRef.current.rotation.set(0, 0, 0);
      if (eyesRef.current) eyesRef.current.rotation.set(0, 0, 0);
      if (robotRef.current) robotRef.current.rotation.set(0, 0, 0);

      if (typeof splineApp.requestRender === 'function') {
        splineApp.requestRender();
      }
    } catch (err) {
      console.warn('Spline front view setup error:', err);
    }

    setIsLoaded(true);
  };

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let curYaw = 0;
    let curPitch = 0;
    let curRoll = 0;
    let curBodyRoll = 0;
    let animId = null;
    let isLoopActive = false;

    const requestFrame = () => {
      if (!isLoopActive) {
        isLoopActive = true;
        animId = requestAnimationFrame(updateLoop);
      }
    };

    const handlePointerMove = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      requestFrame();
    };

    const handlePointerLeave = (e) => {
      if (
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY <= 0 ||
        e.clientY >= window.innerHeight
      ) {
        mouseX = 0;
        mouseY = 0;
        requestFrame();
      }
    };

    const updateLoop = () => {
      const targetYaw = -mouseX * 0.42;
      const targetPitch = mouseY * 0.20;
      const targetRoll = mouseX * 0.08;
      const targetBodyRoll = mouseX * 0.04;

      const diffYaw = targetYaw - curYaw;
      const diffPitch = targetPitch - curPitch;
      const diffRoll = targetRoll - curRoll;
      const diffBodyRoll = targetBodyRoll - curBodyRoll;

      curYaw += diffYaw * 0.08;
      curPitch += diffPitch * 0.08;
      curRoll += diffRoll * 0.08;
      curBodyRoll += diffBodyRoll * 0.06;

      const helmet = helmetRef.current;
      const eyes = eyesRef.current;
      const robot = robotRef.current;

      if (helmet) {
        helmet.rotation.x = curPitch;
        helmet.rotation.y = curYaw;
        helmet.rotation.z = curRoll;
      }
      if (eyes) {
        eyes.rotation.x = curPitch;
        eyes.rotation.y = curYaw;
        eyes.rotation.z = curRoll;
      }
      if (robot) {
        robot.rotation.z = curBodyRoll;
      }

      const app = splineAppRef.current;
      if (app && typeof app.requestRender === 'function') {
        app.requestRender();
      }

      // Idle sleep: if movement has settled, stop the loop and save 100% GPU!
      const isSettled =
        Math.abs(diffYaw) < 0.0003 &&
        Math.abs(diffPitch) < 0.0003 &&
        Math.abs(diffRoll) < 0.0003 &&
        Math.abs(diffBodyRoll) < 0.0003;

      if (!isSettled) {
        animId = requestAnimationFrame(updateLoop);
      } else {
        isLoopActive = false;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handlePointerLeave, { passive: true });

    // Initial render burst to settle
    requestFrame();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mouseout', handlePointerLeave);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isLoaded]);

  return (
    <div ref={sceneRef} className="spline-scene-wrapper r4x-scene-wrapper">
      {/* Watermark text behind the robot */}
      <div className="nabot-watermark r4x-watermark">
        <span>{watermark}</span>
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="spline-loading">
          <div className="spline-loading-spinner" />
          <p>Loading R4X 3D Scene...</p>
        </div>
      )}

      {/* Spline 3D scene */}
      <Suspense fallback={null}>
        <Spline
          scene={R4X_SPLINE_SCENE_URL}
          onLoad={handleSplineLoad}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </Suspense>
    </div>
  );
};

export default R4XScene;
