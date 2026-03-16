import React, { useMemo } from 'react';
import { TerminalConfig, TerminalRuntimeState } from '../../../shared/types';
import styles from './Tentacle.module.css';

interface TentacleProps {
  config: TerminalConfig;
  runtime?: TerminalRuntimeState;
  position: { x: number; y: number };
  angle: number;
  onClick: () => void;
}

const Tentacle: React.FC<TentacleProps> = ({
  config,
  runtime,
  position,
  angle,
  onClick,
}) => {
  const status = runtime?.status || 'disconnected';

  const statusColor = useMemo(() => {
    switch (status) {
      case 'connected':
        return '#4ade80'; // 绿色
      case 'connecting':
        return '#60a5fa'; // 蓝色
      case 'error':
        return '#f87171'; // 红色
      default:
        return '#9ca3af'; // 灰色
    }
  }, [status]);

  const isConnected = status === 'connected';

  return (
    <div
      className={styles.container}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) rotate(${angle}deg)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* 触手线条 */}
      <svg
        className={styles.line}
        width="60"
        height="10"
        viewBox="0 0 60 10"
      >
        <path
          d="M0,5 Q30,0 60,5"
          stroke={statusColor}
          strokeWidth="3"
          fill="none"
          className={isConnected ? styles.activeLine : ''}
        />
      </svg>

      {/* 触手末端（连接点） */}
      <div
        className={`${styles.tip} ${isConnected ? styles.activeTip : ''}`}
        style={{
          backgroundColor: statusColor,
          boxShadow: isConnected ? `0 0 10px ${statusColor}` : 'none',
        }}
      >
        <span className={styles.icon}>{getIcon(config.type)}</span>
      </div>

      {/* 终端名称 */}
      <div
        className={styles.label}
        style={{
          transform: `rotate(${-angle}deg)`,
        }}
      >
        {config.name}
      </div>
    </div>
  );
};

function getIcon(type: string): string {
  switch (type) {
    case 'claude':
      return '🐙';
    case 'openclaw':
      return '🦑';
    case 'opencode':
      return '🦐';
    default:
      return '💻';
  }
}

export default Tentacle;
