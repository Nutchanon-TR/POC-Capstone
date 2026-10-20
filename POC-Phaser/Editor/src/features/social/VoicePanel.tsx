'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Button } from 'antd';
import type { GameBridge } from '@/game/GameBridge';
import { gameConfig } from '@/game/config';
import { HallSession } from './HallSession';
declare global {
  interface Window {
    __HALL_SESSION__?: HallSession;
  }
}
export function VoicePanel({ bridge, sessionKey }: { bridge: GameBridge; sessionKey: string }) {
  const [session] = useState(() => new HallSession(bridge, sessionKey));
  const presence = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const voice = useSyncExternalStore(
    session.voice.subscribe,
    session.voice.getSnapshot,
    session.voice.getSnapshot,
  );
  useEffect(() => {
    session.start();
    if (gameConfig.debug) window.__HALL_SESSION__ = session;
    return () => {
      session.dispose();
      if (window.__HALL_SESSION__ === session) delete window.__HALL_SESSION__;
    };
  }, [session]);
  const connected = voice.phase === 'connected';
  return (
    <section
      className="voice-panel"
      aria-label="ห้องเสียง"
      data-presence={presence.phase}
      data-voice={voice.phase}
    >
      <div className="voice-heading">
        <div>
          <strong>ห้องเสียง</strong>
          <span>
            {presence.name || 'นักสำรวจ'} · {presence.count} คนในแมป
          </span>
        </div>
        <span className={`voice-indicator ${connected ? 'connected' : ''}`}>
          {connected
            ? `${voice.participants.length} คนในสาย`
            : voice.phase === 'connecting'
              ? 'กำลังเข้าร่วม'
              : voice.phase === 'reconnecting'
                ? 'กำลังต่อใหม่'
                : 'ยังไม่เข้าร่วม'}
        </span>
      </div>
      {voice.phase === 'idle' ? (
        <>
          <p className="voice-hint">คุยกับผู้เล่นในห้องนี้ · เข้าร่วมโดยปิดไมค์ไว้ก่อน</p>
          <Button
            block
            type="primary"
            disabled={presence.phase !== 'connected'}
            onClick={() => void session.joinVoice()}
          >
            เข้าร่วมห้องเสียง
          </Button>
        </>
      ) : (
        <div className="voice-actions">
          <Button
            type={voice.micEnabled ? 'primary' : 'default'}
            disabled={!connected}
            loading={voice.micBusy}
            aria-pressed={voice.micEnabled}
            onClick={() => void session.voice.setMic(!voice.micEnabled)}
          >
            {voice.micEnabled ? 'ปิดไมค์' : 'เปิดไมค์'}
          </Button>
          <Button onClick={() => session.voice.leave()}>ออกจากห้องเสียง</Button>
        </div>
      )}
      {!!voice.participants.length && (
        <ul className="voice-participants">
          {voice.participants.map((p) => (
            <li key={p.id} data-speaking={p.speaking}>
              <span className={p.speaking ? 'speaking-dot' : 'quiet-dot'} />
              <span>
                {p.name}
                {p.id === presence.id ? ' (คุณ)' : ''}
              </span>
              <small>{p.speaking ? 'กำลังพูด' : p.mic ? 'เปิดไมค์' : 'ปิดไมค์'}</small>
            </li>
          ))}
        </ul>
      )}
      {connected && voice.audioBlocked && (
        <Button block onClick={() => void session.voice.resumeAudio()}>
          เปิดเสียงที่ได้รับ
        </Button>
      )}
      {voice.error && <Alert type="warning" title={voice.error} showIcon />}
      {presence.error && (
        <div className="voice-error">
          {presence.error}
          <Button size="small" onClick={session.retry}>
            เชื่อมต่อใหม่
          </Button>
        </div>
      )}
    </section>
  );
}
