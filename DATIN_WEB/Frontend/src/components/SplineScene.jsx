import React, { useState, Suspense } from 'react';
import Spline from '@splinetool/react-spline';
import { SPLINE_SCENE_URL } from '../api/config';
import CyberneticCore from './CyberneticCore';

const SplineScene = ({ is3DMode = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // If Speed / Performance mode is active, render the lightweight 60–144 FPS Cybernetic Core
  if (!is3DMode) {
    return <CyberneticCore variant="robot" watermark="NABOT" />;
  }

  const handleSplineLoad = (splineApp) => {
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

      if (typeof splineApp?.setGlobalEvents === 'function') {
        splineApp.setGlobalEvents(true);
      }
      if (typeof splineApp?._controls?.updateUseWindowEvents === 'function') {
        splineApp._controls.updateUseWindowEvents(true);
      }
    } catch (err) {
      console.warn('Spline setup error:', err);
    }
    setIsLoaded(true);
  };

  return (
    <div className="spline-scene-wrapper">
      {/* NABOT watermark text behind the robot */}
      <div className="nabot-watermark">
        <span>NABOT</span>
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="spline-loading">
          <div className="spline-loading-spinner" />
          <p>Loading 3D Scene...</p>
        </div>
      )}

      {/* Spline 3D scene */}
      <Suspense fallback={null}>
        <Spline
          scene={SPLINE_SCENE_URL}
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

export default SplineScene;
