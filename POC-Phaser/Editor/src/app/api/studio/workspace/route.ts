import { z } from 'zod';
import { readStudio, StudioConflict, updateStudio } from '@/server/studioStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function namespace(request: Request) {
  return process.env.MAP_STUDIO_TEST_MODE === '1'
    ? request.headers.get('x-studio-test-workspace') || 'project'
    : 'project';
}
export async function GET(request: Request) {
  try {
    return Response.json(await readStudio(namespace(request)), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      { message: 'อ่านไฟล์แมปถาวรไม่สำเร็จ ตรวจสอบโฟลเดอร์ .studio แล้วลองใหม่' },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host'))
    return Response.json({ message: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 64 * 1024 * 1024)
      return Response.json({ message: 'ข้อมูลเกินขนาด 64 MB' }, { status: 413 });
    return Response.json(await updateStudio(JSON.parse(body), namespace(request)));
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof z.ZodError
            ? 'รูปแบบข้อมูลแมปหรือบูธไม่ถูกต้อง'
            : error instanceof Error
              ? error.message
              : 'บันทึกไฟล์ถาวรไม่สำเร็จ',
      },
      {
        status:
          error instanceof StudioConflict
            ? 409
            : error instanceof z.ZodError || error instanceof SyntaxError
              ? 400
              : 500,
      },
    );
  }
}
