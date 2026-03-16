import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useOctopus } from '../context/OctopusContext';
import { useTerminals } from '../context/TerminalContext';
import Tentacle from '../Tentacle/Tentacle';
import styles from './Octopus.module.css';

const Octopus: React.FC = () => {
  const { state, setPosition, toggleExpanded } = useOctopus();
  const { configs, runtimes, addConfig, startTerminal } = useTerminals();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 初始化一个默认的 Claude 终端
  useEffect(() => {
    if (configs.length === 0) {
      addConfig({
        type: 'claude',
        name: 'Claude',
        command: 'claude',
        args: [],
      });
    }
  }, [configs.length, addConfig]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains(styles.body)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - state.position.x,
        y: e.clientY - state.position.y,
      });
    }
  }, [state.position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
    }
  }, [isDragging, dragOffset, setPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 触手位置计算（圆形分布）
  const tentaclePositions = useMemo(() => {
    const count = Math.min(configs.length, 8);
    const radius = 70;
    return configs.slice(0, 8).map((config, index) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
      return {
        config,
        runtime: runtimes.find((r) => r.configId === config.id),
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle: (angle * 180) / Math.PI + 90,
      };
    });
  }, [configs, runtimes]);

  return (
    <div
      className={styles.container}
      style={{
        left: state.position.x,
        top: state.position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 触手 */}
      {tentaclePositions.map(({ config, runtime, x, y, angle }) => (
        <Tentacle
          key={config.id}
          config={config}
          runtime={runtime}
          position={{ x, y }}
          angle={angle}
          onClick={() => startTerminal(config.id)}
        />
      ))}

      {/* 八爪鱼身体 */}
      <div
        className={styles.body}
        onClick={toggleExpanded}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // 打开设置面板
        }}
      >
        <div className={styles.bodyInner}>
          <div className={styles.face}>
            <div className={styles.eyes}>
              <span className={styles.eye}>◕</span>
              <span className={styles.eye}>◕</span>
            </div>
            <div className={styles.mouth}>◡</div>
          </div>
          <div className={styles.name}>{state.name}</div>
        </div>
      </div>
    </div>
  );
};

export default Octopus;
