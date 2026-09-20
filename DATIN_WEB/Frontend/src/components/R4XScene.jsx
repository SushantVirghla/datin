import React, { useEffect, useRef, useState, Suspense } from 'react';
import Spline from '@splinetool/react-spline';
import { R4X_SPLINE_SCENE_URL } from '../api/config';

const R4XScene = ({ watermark = 'DTNC' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const sceneRef = useRef(null);
  const splineAppRef = useRef(null);
  const helmetRef = useRef(null);
  const eyesRef = useRef(null);
  const robotRef = useRef(null);

  // Continuous DOM watermark purge
  useEffect(() => {
    const purgeDomWatermarks = () => {
      const selectors = ['#spline', '#spline-watermark', '#logo', 'a[href*="spline.design"]', 'a[href*="spline"]', '.spline-watermark'];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          try { el.remove(); } catch (_) { el.style.display = 'none'; }
        });
      });
      document.querySelectorAll('spline-viewer').forEach((viewer) => {
        if (viewer.shadowRoot) {
          const wm = viewer.shadowRoot.querySelector('#logo') ||
                     viewer.shadowRoot.querySelector('a[href*="spline"]') ||
                     viewer.shadowRoot.querySelector('#spline') ||
                     viewer.shadowRoot.querySelector('.watermark');
          if (wm) {
            try { wm.remove(); } catch (_) { wm.style.display = 'none'; }
          }
        }
      });
    };

    purgeDomWatermarks();
    const interval = setInterval(purgeDomWatermarks, 250);
    const timeout = setTimeout(() => clearInterval(interval), 8000);

    const observer = new MutationObserver(purgeDomWatermarks);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  const handleSplineLoad = (splineApp) => {
    splineAppRef.current = splineApp;

    try {
      // Completely disable the internal WebGL Spline watermark logo overlay pass
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

      // 1. Locate Robot, Helmet, Eyes in the 3D scene
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

      const robot = findObj('Robot');
      const helmet = findObj('Helmet');
      const eyes = findObj('Eyes');

      robotRef.current = robot;
      helmetRef.current = helmet;
      eyesRef.current = eyes;

      // 2. Disable broken internal LookAt events that tilt the head backward into the sky
      const lookAtEvents = splineApp._eventManager?.handlers?.LookAt?.events || [];
      lookAtEvents.forEach((evt) => {
        evt.paused = true;
        if (evt.data) {
          evt.data.disabled = true;
        }
      });

      // 3. Reset Robot, Helmet, and Eyes to clean upright Front View rest pose
      if (helmet) {
        helmet.rotation.order = 'YXZ';
        helmet.rotation.set(0, 0, 0);
        if (helmet.quaternion) helmet.quaternion.identity();
      }
      if (eyes) {
        eyes.rotation.order = 'YXZ';
        eyes.rotation.set(0, 0, 0);
        if (eyes.quaternion) eyes.quaternion.identity();
      }
      if (robot) {
        robot.rotation.set(0, 0, 0);
        if (robot.quaternion) robot.quaternion.identity();
      }

      // 4. Lock OrbitControls so mouse drag or hover cannot tilt into a top-down view
      const controls = splineApp._controls;
      const oc = controls?.orbitControls;
      if (oc) {
        oc.enableRotate = false;
        oc.enablePan = false;
        oc.enableZoom = false;
        oc.hoverRotatePanMode = 0;
        if (typeof oc.updateUseWindowEvents === 'function') {
          oc.updateUseWindowEvents(false);
        }
        if (oc.target) oc.target.set(-0.92, -145, 0);
        if (oc.position0) oc.position0.set(-0.92, -145, 800);
        if (oc.target0) oc.target0.set(-0.92, -145, 0);
        if (oc.quat0) oc.quat0.identity();
      }
      if (controls) {
        controls.enableRotate = false;
        controls.enablePan = false;
      }

      // 5. Align Camera to eye-level Front View, shifted upward into the open viewport
      const cam = splineApp._camera;
      if (cam) {
        cam.position.set(-0.92, -145, 800);
        cam.rotation.set(0, 0, 0);
        if (cam.quaternion) cam.quaternion.identity();
        cam.lookAt(-0.92, -145, 0);
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld(true);
      }

      if (typeof oc?.update === 'function') {
        oc.update();
      }

      // Request initial render
      if (typeof splineApp.requestRender === 'function') {
        splineApp.requestRender();
      } else if (typeof splineApp._requestRenderAutoMode === 'function') {
        splineApp._requestRenderAutoMode();
      }
    } catch (err) {
      console.warn('Spline front view setup error:', err);
    }

    setIsLoaded(true);
  };

  useEffect(() => {
    let mouseX = 0; // -1 to 1
    let mouseY = 0; // -1 to 1
    let curYaw = 0;
    let curPitch = 0;
    let curRoll = 0;
    let curBodyRoll = 0;
    let animId;

    const handlePointerMove = (e) => {
      // Normalize to [-1, 1] relative to viewport center
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const handlePointerLeave = (e) => {
      // When mouse leaves the window entirely, smoothly return to center front view
      if (
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY <= 0 ||
        e.clientY >= window.innerHeight
      ) {
        mouseX = 0;
        mouseY = 0;
      }
    };

    const updateLoop = () => {
      // Natural front-view head tracking:
      // - Mouse left/right -> yaw head left/right (±24°)
      // - Mouse up/down -> pitch head up/down (±11°, strictly clamped so it NEVER flips into ceiling)
      // - Subtle cute BB-8 roll (±4.5°)
      const targetYaw = -mouseX * 0.42;
      const targetPitch = mouseY * 0.20;
      const targetRoll = mouseX * 0.08;
      const targetBodyRoll = mouseX * 0.04;

      // Silky 60fps lerp damping
      curYaw += (targetYaw - curYaw) * 0.08;
      curPitch += (targetPitch - curPitch) * 0.08;
      curRoll += (targetRoll - curRoll) * 0.08;
      curBodyRoll += (targetBodyRoll - curBodyRoll) * 0.06;

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
      if (app) {
        if (typeof app.requestRender === 'function') {
          app.requestRender();
        } else if (typeof app._requestRenderAutoMode === 'function') {
          app._requestRenderAutoMode();
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handlePointerLeave, { passive: true });
    animId = requestAnimationFrame(updateLoop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mouseout', handlePointerLeave);
      cancelAnimationFrame(animId);
    };
  }, [isLoaded]);

  return (
    <div ref={sceneRef} className="spline-scene-wrapper r4x-scene-wrapper">
      {/* Watermark text behind the robot, matching landing page */}
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
