import Image from 'next/image';
import { Button } from 'antd';
import type { GameStatus } from '@/game/types';
import { characters } from '@/game/config';

export function HallSidebar({ status, focusGame }: { status: GameStatus; focusGame: () => void }) {
  const character = characters[status.character || 'kaguya'];
  return (
    <aside className="hall-sidebar" aria-label="ข้อมูลห้อง">
      <div className="hall-intro">
        <span className="eyebrow">ยินดีต้อนรับสู่</span>
        <h1>
          Exhibition
          <br />
          Hall<span className="title-dot">.</span>
        </h1>
        <p>
          พื้นที่พบปะ สำรวจบูธ
          <br />
          และค้นพบสิ่งใหม่ระหว่างทาง
        </p>
      </div>
      <div className="hall-stats">
        <div>
          <strong>{status.booths || '—'}</strong>
          <span>บูธจัดแสดง</span>
        </div>
        <div>
          <strong>{status.props || '—'}</strong>
          <span>แบบของตกแต่ง</span>
        </div>
      </div>
      <div className="sidebar-section">
        <h2>พื้นที่ในห้อง</h2>
        <ul className="zone-list">
          <li>
            <span className="zone-color open" />
            <div>
              <strong>Open & Studio</strong>
              <span>บูธเปิดสำหรับเดินสำรวจ</span>
            </div>
          </li>
          <li>
            <span className="zone-color pavilion" />
            <div>
              <strong>Pavilion</strong>
              <span>บูธพร้อมพื้นที่ด้านใน</span>
            </div>
          </li>
          <li>
            <span className="zone-color lounge" />
            <div>
              <strong>Lounge & Reception</strong>
              <span>พื้นที่พักผ่อนและต้อนรับ</span>
            </div>
          </li>
        </ul>
      </div>
      <div className="avatar-card">
        <div className="avatar-art">
          <Image
            src={`/world/characters/${character.key}-portrait.png`}
            alt={character.name}
            width={84}
            height={70}
            unoptimized
          />
        </div>
        <div>
          <span>นักสำรวจของคุณ</span>
          <strong>{character.name}</strong>
          <span className="presence">พร้อมออกเดินทาง</span>
        </div>
      </div>
      <div className="movement-guide">
        <h2>เดินสำรวจได้เลย</h2>
        <div className="keyboard-row">
          <kbd>W</kbd>
          <span>หรือปุ่มลูกศร</span>
        </div>
        <div className="keyboard-row">
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
        </div>
        <p>คลิกที่แผนที่ก่อนใช้แป้นพิมพ์</p>
        <Button block onClick={focusGame} disabled={status.phase !== 'ready'}>
          เริ่มเดินสำรวจ ↗
        </Button>
      </div>
      <div className="sidebar-note">
        <span className="note-mark">◇</span>
        <p>
          แมปนี้ประกอบจากชุด asset ที่ให้มา
          <br />
          และเปิดแก้ไขต่อใน Tiled ได้
        </p>
      </div>
    </aside>
  );
}
