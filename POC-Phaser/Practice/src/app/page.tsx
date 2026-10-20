import GameHost from "@/components/GameHost";

export default function HomePage() {
  return (
    <main className="practice">
      <header>
        <p className="eyebrow">PHASER PRACTICE / บทที่ 0</p>
        <h1>เริ่มจากพื้นที่ว่าง แล้วค่อยสร้างเกม</h1>
        <p className="intro">
          Next.js พร้อมแล้ว เราจะเพิ่ม Phaser ทีละส่วน วางโค้ด รันดูผล
          แล้วทำความเข้าใจก่อนเดินต่อ
        </p>
      </header>

      <section aria-labelledby="playground-title">
        <div className="section-heading">
          <h2 id="playground-title">พื้นที่ทดลอง</h2>
          <span>Next.js พร้อมใช้งาน</span>
        </div>
        <GameHost />
      </section>

      <section className="notes" aria-labelledby="before-title">
        <h2 id="before-title">ก่อนเริ่มเขียน</h2>
        <p>
          พื้นที่ด้านบนยังเป็น HTML เราจะให้ Phaser สร้าง canvas ตรงนี้ในบทแรก
          ตอนนี้จึงยังไม่มีเกมหรือแผนที่แสดงอยู่
        </p>
        <p>
          ไฟล์ที่จะเริ่มแก้คือ <code>src/components/GameHost.tsx</code>
          ส่วนแผนที่เตรียมไว้ใน <code>public/assets/expo</code>
        </p>
        <a href="/assets/expo/expo.tmj" target="_blank" rel="noreferrer">เปิดข้อมูลแผนที่ .tmj</a>
        <a href="/assets/expo/expo.tsj" target="_blank" rel="noreferrer">เปิดข้อมูลชุดรูป .tsj</a>
      </section>
    </main>
  );
}
