import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './DevPage.css';

const DevPage = () => {
  const [activeFlowTab, setActiveFlowTab] = useState('rag'); // 'rag' | 'eval'
  const hover = useHoverSound();
  const click = useClickSound();

  const developers = [
    {
      name: 'Sushant Virghla',
      role: 'Lead Architect & AI Systems Engineer',
      tag: 'Project Lead',
      url: 'https://www.linkedin.com/in/sushant-virghla-b74435329/',
      initials: 'SV',
    },
    {
      name: 'Sumit Sharma',
      role: 'Lead Core Backend & Decentralized Systems',
      tag: 'Co-Author',
      url: 'https://www.linkedin.com/in/async-sunlight/',
      initials: 'SS',
    },
    {
      name: 'Udisha Singh',
      role: 'AI Researcher & Data Security Analyst',
      tag: 'Co-Author',
      url: 'https://www.linkedin.com/in/udisha-singh-379b213a9/',
      initials: 'US',
    },
    {
      name: 'Uday',
      role: 'Full Stack Engineer & Security Specialist',
      tag: 'Core Contributor',
      url: 'https://www.linkedin.com/in/uday-sonkar12/',
      initials: 'U',
    },
  ];

  return (
    <div className="page-container dev-page-container">
      <div className="page-content dev-page-content">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Badge */}
          <div className="dev-page-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Development & Architecture</span>
          </div>

          <h1 className="page-title">DATIN Architecture & Research</h1>
          <p className="page-subtitle">
            Deep dive into DATIN’s 3D neural RAG pipeline, LLM self-reflection judge, peer-reviewed scientific publications, and developer collective.
          </p>

          {/* ========================================================
              SECTION 1: 3D DATA FLOW ARCHITECTURE
              ======================================================== */}
          <div className="glass-card dev-section-card">
            <div className="dev-section-header">
              <div className="dev-section-title-wrap">
                <span className="dev-section-tag">Interactive Blueprint</span>
                <h2 className="dev-section-title">End-to-End System Architecture</h2>
                <p className="dev-section-desc">
                  Live data flow topology showing client telemetry, vector generation, Pinecone retrieval, dual LLM generation, and self-healing evaluation reflection loops.
                </p>
              </div>

              {/* Mode switch pills */}
              <div className="dev-flow-tabs">
                <button
                  className={`dev-flow-tab-btn ${activeFlowTab === 'rag' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setActiveFlowTab('rag'); }}
                  onMouseEnter={hover.onMouseEnter}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>RAG & Vector Retrieval Flow</span>
                </button>
                <button
                  className={`dev-flow-tab-btn ${activeFlowTab === 'eval' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setActiveFlowTab('eval'); }}
                  onMouseEnter={hover.onMouseEnter}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span>LLM Evaluation & Reflection</span>
                </button>
              </div>
            </div>

            {/* 3D Animated Interactive Schematic Stage */}
            <div className="dev-schematic-stage">
              {activeFlowTab === 'rag' ? (
                <div className="schematic-diagram-view">
                  <svg className="schematic-flow-svg" viewBox="0 0 980 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="primaryGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#007AFF" />
                        <stop offset="100%" stopColor="#5856D6" />
                      </linearGradient>
                      <linearGradient id="emeraldGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#34C759" />
                        <stop offset="100%" stopColor="#30D158" />
                      </linearGradient>
                      <linearGradient id="amberGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FF9500" />
                        <stop offset="100%" stopColor="#FF2D55" />
                      </linearGradient>
                      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#007AFF" />
                      </marker>
                      <marker id="arrowAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#FF9500" />
                      </marker>
                      <marker id="arrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#34C759" />
                      </marker>
                    </defs>

                    {/* Animated Circuit Tracks with flowing pulses */}
                    {/* 1. Client -> API Endpoint */}
                    <path d="M 120 120 L 120 180 L 120 220" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 2. API Endpoint -> AI Model for Vector Query */}
                    <path d="M 175 250 L 280 250 L 280 120 L 360 120" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 3. AI Model -> Vectorise Text (1024 dim) */}
                    <path d="M 470 120 L 560 120" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 4. Vectorise Text -> Vector Searcher */}
                    <path d="M 610 160 L 610 210" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 5. API Endpoint -> Previous Context Rhombus */}
                    <path d="M 175 270 L 440 270" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 6. Vector Searcher -> Connect and Fetch Vector DB */}
                    <path d="M 665 250 L 820 250 L 820 400 L 850 400" stroke="rgba(255,149,0,0.5)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim-fast" markerEnd="url(#arrowAmber)" />
                    {/* 7. Vector DB -> If Extra Files Needed (Decision) */}
                    <path d="M 850 380 L 780 380 L 780 320" stroke="rgba(52,199,89,0.5)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrowGreen)" />
                    {/* 8. Decision -> Internal Storage */}
                    <path d="M 830 300 L 910 300 L 910 165" stroke="rgba(255,149,0,0.5)" strokeWidth="2" strokeDasharray="5 5" className="flow-path-anim" markerEnd="url(#arrowAmber)" />
                    {/* 9. Internal Storage -> Full Context */}
                    <path d="M 850 120 L 780 120" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 10. Decision -> Full Context */}
                    <path d="M 780 280 L 740 280 L 740 160" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 11. Full Context -> Vector Searcher */}
                    <path d="M 670 120 L 640 120 L 640 210" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 12. Vector Searcher -> Previous Context */}
                    <path d="M 555 250 L 515 250" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 13. Context -> LLM Agent for Response Generation */}
                    <path d="M 460 300 L 460 370 L 460 380" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 14. LLM Agent -> Evaluation Function */}
                    <path d="M 370 410 L 220 410" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrow)" />
                    {/* 15. Evaluation Function -> API Endpoint (Corrected Response) */}
                    <path d="M 150 370 L 150 300" stroke="rgba(52,199,89,0.6)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrowGreen)" />
                    {/* 16. API Endpoint -> Client (Final RAG Response) */}
                    <path d="M 145 220 L 145 180 L 145 140" stroke="rgba(52,199,89,0.7)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#arrowGreen)" />

                    {/* Interactive 3D Holographic Nodes */}

                    {/* NODE 1: Client (Cloud Shape) */}
                    <g className="node-group" transform="translate(60, 60)">
                      <rect x="0" y="0" width="120" height="60" rx="30" className="node-box-cloud" />
                      <text x="60" y="36" textAnchor="middle" className="node-text-title">Client</text>
                    </g>

                    {/* NODE 2: API Endpoint */}
                    <g className="node-group" transform="translate(65, 220)">
                      <rect x="0" y="0" width="110" height="75" rx="14" className="node-box-rect" />
                      <text x="55" y="38" textAnchor="middle" className="node-text-title">API</text>
                      <text x="55" y="55" textAnchor="middle" className="node-text-title">Endpoint</text>
                    </g>

                    {/* NODE 3: AI Model for Vector Query Generator */}
                    <g className="node-group" transform="translate(360, 80)">
                      <rect x="0" y="0" width="130" height="75" rx="28" className="node-box-cloud" />
                      <text x="65" y="32" textAnchor="middle" className="node-text-title-sm">AI Model for</text>
                      <text x="65" y="48" textAnchor="middle" className="node-text-title-sm">Vector Query</text>
                      <text x="65" y="64" textAnchor="middle" className="node-text-title-sm">Generator</text>
                    </g>

                    {/* NODE 4: Vectorise Text to 1024 Dim Vector */}
                    <g className="node-group" transform="translate(560, 85)">
                      <rect x="0" y="0" width="105" height="70" rx="12" className="node-box-rect" />
                      <text x="52" y="26" textAnchor="middle" className="node-text-title-sm">Vectorise</text>
                      <text x="52" y="42" textAnchor="middle" className="node-text-title-sm">Text to 1024</text>
                      <text x="52" y="58" textAnchor="middle" className="node-text-title-sm">Dimension</text>
                    </g>

                    {/* NODE 5: Vector Searcher */}
                    <g className="node-group" transform="translate(555, 210)">
                      <rect x="0" y="0" width="110" height="75" rx="12" className="node-box-rect" />
                      <text x="55" y="38" textAnchor="middle" className="node-text-title">Vector</text>
                      <text x="55" y="55" textAnchor="middle" className="node-text-title">Searcher</text>
                    </g>

                    {/* NODE 6: Previous Context + User Query (Parallelogram) */}
                    <g className="node-group" transform="translate(425, 230)">
                      <polygon points="15,0 100,0 85,60 0,60" className="node-box-para" />
                      <text x="50" y="24" textAnchor="middle" className="node-text-title-xs">Previous</text>
                      <text x="50" y="38" textAnchor="middle" className="node-text-title-xs">context +</text>
                      <text x="50" y="50" textAnchor="middle" className="node-text-title-xs">query + info</text>
                    </g>

                    {/* NODE 7: Full Context (Parallelogram) */}
                    <g className="node-group" transform="translate(680, 95)">
                      <polygon points="15,0 95,0 80,55 0,55" className="node-box-para" />
                      <text x="47" y="28" textAnchor="middle" className="node-text-title-sm">Full</text>
                      <text x="47" y="44" textAnchor="middle" className="node-text-title-sm">Context</text>
                    </g>

                    {/* NODE 8: Internal Storage (Cylinder/Storage Box) */}
                    <g className="node-group" transform="translate(850, 90)">
                      <rect x="0" y="0" width="105" height="70" rx="10" className="node-box-storage" />
                      <text x="52" y="36" textAnchor="middle" className="node-text-title-sm">Internal</text>
                      <text x="52" y="52" textAnchor="middle" className="node-text-title-sm">Storage</text>
                    </g>

                    {/* NODE 9: If Extra Files Needed (Rhombus/Diamond) */}
                    <g className="node-group" transform="translate(735, 260)">
                      <polygon points="45,0 90,35 45,70 0,35" className="node-box-diamond" />
                      <text x="45" y="32" textAnchor="middle" className="node-text-title-xs">If extra</text>
                      <text x="45" y="44" textAnchor="middle" className="node-text-title-xs">files needed</text>
                    </g>

                    {/* NODE 10: Vector Database (Pinecone) */}
                    <g className="node-group" transform="translate(850, 365)">
                      <rect x="0" y="0" width="105" height="70" rx="10" className="node-box-storage" />
                      <text x="52" y="36" textAnchor="middle" className="node-text-title-sm">Vector</text>
                      <text x="52" y="52" textAnchor="middle" className="node-text-title-sm">Database</text>
                    </g>

                    {/* NODE 11: LLM Agent for Response Generation (Cloud) */}
                    <g className="node-group" transform="translate(370, 375)">
                      <rect x="0" y="0" width="135" height="75" rx="30" className="node-box-cloud" />
                      <text x="67" y="34" textAnchor="middle" className="node-text-title-sm">LLM Agent</text>
                      <text x="67" y="50" textAnchor="middle" className="node-text-title-sm">for Response</text>
                      <text x="67" y="66" textAnchor="middle" className="node-text-title-sm">Generation</text>
                    </g>

                    {/* NODE 12: Evaluation Function */}
                    <g className="node-group" transform="translate(100, 370)">
                      <rect x="0" y="0" width="115" height="75" rx="14" className="node-box-rect" />
                      <text x="57" y="38" textAnchor="middle" className="node-text-title-sm">Evaluation</text>
                      <text x="57" y="55" textAnchor="middle" className="node-text-title-sm">Function</text>
                    </g>
                  </svg>
                </div>
              ) : (
                <div className="schematic-diagram-view">
                  <svg className="schematic-flow-svg" viewBox="0 0 980 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <marker id="evalArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#007AFF" />
                      </marker>
                      <marker id="evalAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#FF9500" />
                      </marker>
                    </defs>

                    {/* Connections */}
                    {/* User Query -> Evaluation Function */}
                    <path d="M 280 80 L 510 80 L 510 200" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* Retrieved Data -> Evaluation Function */}
                    <path d="M 280 180 L 460 180 L 460 220 L 470 220" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* User Query -> LLM Agent for Response Generation */}
                    <path d="M 200 95 L 140 95 L 140 220" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* Retrieved Data -> LLM Agent for Response Generation */}
                    <path d="M 200 185 L 140 185 L 140 220" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* LLM Agent -> Evaluation Function */}
                    <path d="M 205 255 L 470 255" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* Evaluation Function -> LLM Agent for Evaluation */}
                    <path d="M 590 235 L 730 235" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* LLM Agent for Evaluation -> Evaluation Function (Results) */}
                    <path d="M 730 265 L 590 265" stroke="rgba(52,199,89,0.5)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* Prompts for correctness -> Evaluation Function */}
                    <path d="M 720 120 L 530 120 L 530 200" stroke="rgba(255,149,0,0.5)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalAmber)" />
                    {/* Evaluation Function -> Run Reflection */}
                    <path d="M 530 280 L 530 350" stroke="rgba(0,122,255,0.4)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />
                    {/* Run Reflection -> LLM Agent (Self-Healing Loop) */}
                    <path d="M 460 380 L 330 380 L 330 270 L 205 270" stroke="rgba(255,149,0,0.6)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim-fast" markerEnd="url(#evalAmber)" />
                    {/* LLM Agent -> Final Generated Response */}
                    <path d="M 140 290 L 140 370 L 140 375" stroke="rgba(52,199,89,0.6)" strokeWidth="2.5" strokeDasharray="6 6" className="flow-path-anim" markerEnd="url(#evalArrow)" />

                    {/* Nodes */}
                    {/* Parallelogram 1: User Query */}
                    <g className="node-group" transform="translate(200, 50)">
                      <polygon points="18,0 110,0 92,55 0,55" className="node-box-para" />
                      <text x="55" y="32" textAnchor="middle" className="node-text-title-sm">User Query</text>
                    </g>

                    {/* Parallelogram 2: Retrieved Data from Vector Storage */}
                    <g className="node-group" transform="translate(200, 140)">
                      <polygon points="18,0 115,0 97,60 0,60" className="node-box-para" />
                      <text x="57" y="26" textAnchor="middle" className="node-text-title-xs">Retrieved Data</text>
                      <text x="57" y="40" textAnchor="middle" className="node-text-title-xs">from Vector</text>
                      <text x="57" y="52" textAnchor="middle" className="node-text-title-xs">Storage</text>
                    </g>

                    {/* Cloud: LLM Agent for Response Generation */}
                    <g className="node-group" transform="translate(75, 220)">
                      <rect x="0" y="0" width="130" height="70" rx="28" className="node-box-cloud" />
                      <text x="65" y="32" textAnchor="middle" className="node-text-title-sm">LLM Agent</text>
                      <text x="65" y="48" textAnchor="middle" className="node-text-title-sm">for Response</text>
                    </g>

                    {/* Center Rect: Evaluation Function */}
                    <g className="node-group" transform="translate(470, 205)">
                      <rect x="0" y="0" width="120" height="75" rx="14" className="node-box-rect" />
                      <text x="60" y="38" textAnchor="middle" className="node-text-title-sm">Evaluation</text>
                      <text x="60" y="55" textAnchor="middle" className="node-text-title-sm">Function</text>
                    </g>

                    {/* Document: Langchain Prompts */}
                    <g className="node-group" transform="translate(720, 60)">
                      <rect x="0" y="0" width="145" height="80" rx="8" className="node-box-doc" />
                      <text x="72" y="24" textAnchor="middle" className="node-text-title-xs" style={{ fontWeight: 600 }}>Langchain Prompts</text>
                      <text x="72" y="38" textAnchor="middle" className="node-text-title-xs">Correctness & Helpful</text>
                      <text x="72" y="52" textAnchor="middle" className="node-text-title-xs">Groundedness</text>
                      <text x="72" y="66" textAnchor="middle" className="node-text-title-xs">Retrieval Relevance</text>
                    </g>

                    {/* Cloud: LLM Agent for Evaluation */}
                    <g className="node-group" transform="translate(730, 215)">
                      <rect x="0" y="0" width="130" height="75" rx="28" className="node-box-cloud" />
                      <text x="65" y="34" textAnchor="middle" className="node-text-title-sm">LLM Agent</text>
                      <text x="65" y="50" textAnchor="middle" className="node-text-title-sm">for Evaluation</text>
                    </g>

                    {/* Bottom Rect: Run Reflection */}
                    <g className="node-group" transform="translate(460, 350)">
                      <rect x="0" y="0" width="140" height="70" rx="12" className="node-box-rect-alt" />
                      <text x="70" y="30" textAnchor="middle" className="node-text-title-sm" style={{ fontWeight: 600 }}>Run Reflection</text>
                      <text x="70" y="46" textAnchor="middle" className="node-text-title-xs">Healing assessment</text>
                      <text x="70" y="58" textAnchor="middle" className="node-text-title-xs">& regeneration</text>
                    </g>

                    {/* Bottom Parallelogram: Final Generated Response */}
                    <g className="node-group" transform="translate(75, 375)">
                      <polygon points="16,0 125,0 109,55 0,55" className="node-box-para-green" />
                      <text x="62" y="26" textAnchor="middle" className="node-text-title-xs" style={{ fontWeight: 600 }}>Final Generated</text>
                      <text x="62" y="40" textAnchor="middle" className="node-text-title-xs">Response (Accurate)</text>
                    </g>
                  </svg>
                </div>
              )}

              {/* Data Flow Legend Bar */}
              <div className="schematic-legend-bar">
                <div className="legend-item">
                  <span className="legend-pip blue-pip" />
                  <span>Forward Inference Stream</span>
                </div>
                <div className="legend-item">
                  <span className="legend-pip amber-pip" />
                  <span>Pinecone Vectors & Reflection Loop</span>
                </div>
                <div className="legend-item">
                  <span className="legend-pip green-pip" />
                  <span>Consensus & Healed Output</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 2: RESEARCH & SCIENTIFIC PUBLICATIONS
              ======================================================== */}
          <div className="dev-section-heading-wrap">
            <span className="dev-section-tag">Academic Publications</span>
            <h2 className="dev-section-title">Peer-Reviewed Research</h2>
            <p className="dev-section-desc">
              Foundational research behind DATIN's decentralized threat validation, distributed consensus protocols, and neural evaluation engines.
            </p>
          </div>

          <div className="research-grid">
            {/* Paper 1: Published & Certified */}
            <div className="glass-card research-card research-card-certified">
              <div className="research-status-pill certified">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Published & Certified &bull; ICICCS 2026</span>
              </div>

              <h3 className="research-paper-title">
                Blockchain-Based Decentralized Threat Intelligence Validation System
              </h3>

              <div className="research-meta-row">
                <span className="research-authors">
                  <strong>Authors:</strong> Sumit Sharma, Sushant Virghla, Udisha Singh
                </span>
                <span className="research-conf">
                  <strong>Conference:</strong> International Conference on Intelligent Computing and Communication Systems (ICICCS 2026) &bull; Birmingham City University, UK
                </span>
              </div>

              <p className="research-abstract">
                Introduces a novel decentralized architecture coupling Solana blockchain consensus with autonomous AI RAG agents to prevent poisoning attacks, incentivize validator staking, and cryptographically timestamp threat telemetry.
              </p>

              {/* Certificate Preview Card with Glassmorphic Zoom */}
              <div className="research-certificate-preview">
                <img
                  src="/assets/iciccs-2026-certificate.jpg"
                  alt="ICICCS 2026 Certificate of Participation - Blockchain-Based Decentralized Threat Intelligence Validation System"
                  className="certificate-image"
                />
                <div className="certificate-overlay">
                  <span className="certificate-tag">Ref: BCU/ICICCS26/DMPedia-905</span>
                </div>
              </div>

              <div className="research-actions">
                <a
                  href="https://digitalmanuscriptpedia.com/conferences/index.php/DMP-LNCSE/article/view/209"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary research-paper-btn"
                  onMouseEnter={hover.onMouseEnter}
                  onClick={click.onClick}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>View Publication on DMPedia</span>
                </a>
              </div>
            </div>

            {/* Paper 2: In Progress */}
            <div className="glass-card research-card research-card-progress">
              <div className="research-status-pill in-progress">
                <span className="pulsing-radar-dot" />
                <span>Research In Progress</span>
              </div>

              <h3 className="research-paper-title">
                Self-Healing RAG: LLM-as-a-Judge Reflection Architectures for Zero-Day Threat Context
              </h3>

              <div className="research-meta-row">
                <span className="research-authors">
                  <strong>Research Team:</strong> DATIN AI Architecture Group
                </span>
                <span className="research-conf">
                  <strong>Track:</strong> Automated Threat Analysis & Neural Groundedness
                </span>
              </div>

              <p className="research-abstract">
                Investigating dual-model evaluation loops using Langchain LangSmith evaluators to measure hallucination rates and generate real-time corrective prompts during cyber threat extraction.
              </p>

              <div className="research-progress-box">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: '68%' }} />
                </div>
                <div className="progress-bar-labels">
                  <span>Experimental Evaluation Phase</span>
                  <span>68% Complete</span>
                </div>
              </div>
            </div>

            {/* Paper 3: In Progress */}
            <div className="glass-card research-card research-card-progress">
              <div className="research-status-pill in-progress">
                <span className="pulsing-radar-dot" />
                <span>Research In Progress</span>
              </div>

              <h3 className="research-paper-title">
                Economic Incentive Models & Sybil Defense in Decentralized Threat Intelligence Networks
              </h3>

              <div className="research-meta-row">
                <span className="research-authors">
                  <strong>Research Team:</strong> DATIN Consensus & Cryptoeconomics Lab
                </span>
                <span className="research-conf">
                  <strong>Track:</strong> Tokenomics & Byzantine Fault Tolerance
                </span>
              </div>

              <p className="research-abstract">
                Game-theoretic modeling of validator collateral slashing, dynamic DTNC reward scheduling, and stake-weighted reputation algorithms under adversarial network conditions.
              </p>

              <div className="research-progress-box">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: '42%' }} />
                </div>
                <div className="progress-bar-labels">
                  <span>Formal Proofs & Simulation</span>
                  <span>42% Complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 3: CORE DEVELOPERS & CONTRIBUTORS
              ======================================================== */}
          <div className="dev-section-heading-wrap" style={{ marginTop: '4rem' }}>
            <span className="dev-section-tag">Core Engineering</span>
            <h2 className="dev-section-title">Project Developers</h2>
            <p className="dev-section-desc">
              The researchers and engineers building and maintaining the DATIN decentralized intelligence platform.
            </p>
          </div>

          <div className="developers-grid">
            {developers.map((dev, i) => (
              <motion.div
                key={dev.name}
                className="glass-card developer-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="developer-card-top">
                  <div className="developer-avatar-sphere">
                    <span>{dev.initials}</span>
                  </div>
                  <span className="developer-tag">{dev.tag}</span>
                </div>

                <h3 className="developer-name">{dev.name}</h3>
                <p className="developer-role">{dev.role}</p>

                <div className="developer-card-bottom">
                  <a
                    href={dev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="developer-linkedin-btn"
                    onMouseEnter={hover.onMouseEnter}
                    onClick={click.onClick}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span>Connect on LinkedIn</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DevPage;
