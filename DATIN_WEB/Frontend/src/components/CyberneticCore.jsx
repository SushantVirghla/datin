import React, { useState, useEffect } from 'react';
import './CyberneticCore.css';

/**
 * CyberneticCore - Ultra-high-performance 60–144 FPS visual core
 * Uses zero WebGL fillrate, zero CPU DOM mutations, and zero battery drain.
 */
const CyberneticCore = ({ variant = 'robot', watermark = 'NABOT' }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animId;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const handlePointerMove = (e) => {
      targetX = ((e.clientX / window.innerWidth) * 2 - 1) * 14;
      targetY = -((e.clientY / window.innerHeight) * 2 - 1) * 14;
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const loop = () => {
      curX += (targetX - curX) * 0.1;
      curY += (targetY - curY) * 0.1;
      setTilt({ x: curX, y: curY });
      animId = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handlePointerLeave, { passive: true });
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mouseout', handlePointerLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  const isDtnc = variant === 'dtnc';

  return (
    <div className="cyber-core-wrapper" aria-hidden="true">
      {/* Background Watermark */}
      <div className="cyber-core-watermark">
        <span>{watermark}</span>
      </div>

      <div
        className="cyber-core-stage"
        style={{
          transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        }}
      >
        {/* Outer Orbital Gyro Ring 1 */}
        <div className={`cyber-ring cyber-ring-1 ${isDtnc ? 'ring-gold' : 'ring-cyan'}`} />

        {/* Outer Orbital Gyro Ring 2 */}
        <div className={`cyber-ring cyber-ring-2 ${isDtnc ? 'ring-gold' : 'ring-purple'}`} />

        {/* Outer Orbital Gyro Ring 3 */}
        <div className="cyber-ring cyber-ring-3" />

        {/* Ambient Radial Flare */}
        <div className={`cyber-flare ${isDtnc ? 'flare-gold' : 'flare-cyan'}`} />

        {/* Center Orb Hologram */}
        <div className={`cyber-orb-sphere ${isDtnc ? 'orb-gold' : 'orb-cyan'}`}>
          <div className="cyber-orb-inner-grid" />
          <div className="cyber-orb-core-pulse" />
          <div className="cyber-orb-symbol">
            {isDtnc ? (
              <span className="cyber-coin-symbol">DTNC</span>
            ) : (
              <span className="cyber-bot-eyes">
                <span className="cyber-eye" />
                <span className="cyber-eye" />
              </span>
            )}
          </div>
        </div>

        {/* Floating Digital Particle Satellites */}
        <div className="cyber-satellite cyber-sat-1" />
        <div className="cyber-satellite cyber-sat-2" />
        <div className="cyber-satellite cyber-sat-3" />
        <div className="cyber-satellite cyber-sat-4" />
      </div>
    </div>
  );
};

export default CyberneticCore;
