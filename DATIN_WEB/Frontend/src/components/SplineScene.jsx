import React, { useState, Suspense } from 'react';
import Spline from '@splinetool/react-spline';
import { SPLINE_SCENE_URL } from '../api/config';

const SplineScene = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Continuous DOM watermark purge
  React.useEffect(() => {
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
    try {
      // 1. Completely disable the internal WebGL Spline watermark logo overlay pass
      if (splineApp?._renderer?.pipeline) {
        const pipeline = splineApp._renderer.pipeline;
        if (pipeline.logoOverlayPass) {
          pipeline.logoOverlayPass.enabled = false;
        }
        // Intercept setWatermark so Spline can never re-enable the watermark
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
