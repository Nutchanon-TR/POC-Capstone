import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { Database } from './database';

const rectangle = z.object({
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
const upload = z.object({
  name: z.string().trim().min(1).max(80),
  family: z.enum(['Prop', 'Layout', 'Floor']),
  image: z
    .string()
    .max(2800000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
  displayWidth: z.number().finite().positive().max(8192),
  depthY: z.number().finite().nonnegative(),
  collision: rectangle.nullable(),
});
type AssetRow = {
  id: number;
  name: string;
  family: 'Prop' | 'Layout' | 'Floor';
  width: number;
  height: number;
  display_width: number;
  depth_y: number;
  collision: z.infer<typeof rectangle> | null;
};
@Injectable()
export class AssetsService {
  constructor(@Inject(Database) private db: Database) {}
  async list() {
    return (
      await this.db.pool.query<AssetRow>(
        'SELECT id,name,family,width,height,display_width,depth_y,collision FROM editor_assets ORDER BY id',
      )
    ).rows;
  }
  async add(body: unknown) {
    const parsed = upload.safeParse(body);
    if (!parsed.success) throw new BadRequestException('ตรวจชื่อ ขนาด และกรอบชนของ asset อีกครั้ง');
    const input = parsed.data;
    const bytes = Buffer.from(input.image.slice(input.image.indexOf(',') + 1), 'base64');
    if (bytes.length > 2 * 1024 * 1024) throw new BadRequestException('PNG ต้องไม่เกิน 2 MB');
    let image: Buffer, width: number, height: number;
    try {
      const source = sharp(bytes, { limitInputPixels: 2048 * 2048 });
      const meta = await source.metadata();
      if (
        meta.format !== 'png' ||
        !meta.width ||
        !meta.height ||
        (meta.pages && meta.pages > 1) ||
        meta.width > 2048 ||
        meta.height > 2048
      )
        throw Error('invalid image');
      width = meta.width;
      height = meta.height;
      image = await source.png().toBuffer();
    } catch {
      throw new BadRequestException('ใช้ PNG ภาพนิ่งขนาดไม่เกิน 2048 × 2048');
    }
    if (
      input.depthY > height ||
      (input.displayWidth * height) / width > 8192 ||
      (input.collision &&
        (input.collision.x + input.collision.width > width ||
          input.collision.y + input.collision.height > height))
    )
      throw new BadRequestException('ตรวจขนาดแสดง แนวหน้าหลัง และกรอบชนภายในภาพต้นฉบับ');
    if (
      input.family === 'Floor' &&
      (width !== 32 || height !== 32 || input.displayWidth !== 32 || input.collision)
    )
      throw new BadRequestException('พื้นต้องเป็น PNG 32 × 32 แสดงขนาด 32 และไม่มีกรอบชน');
    const fingerprint = createHash('sha256')
      .update(image)
      .update(
        JSON.stringify({
          name: input.name,
          family: input.family,
          displayWidth: input.displayWidth,
          depthY: input.depthY,
          collision: input.collision,
        }),
      )
      .digest('hex');
    const inserted = await this.db.pool.query<{ id: number }>(
      'INSERT INTO editor_assets(fingerprint,name,family,image,width,height,display_width,depth_y,collision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(fingerprint) DO NOTHING RETURNING id',
      [
        fingerprint,
        input.name,
        input.family,
        image,
        width,
        height,
        input.displayWidth,
        input.depthY,
        input.collision,
      ],
    );
    const row =
      inserted.rows[0] ||
      (
        await this.db.pool.query<{ id: number }>(
          'SELECT id FROM editor_assets WHERE fingerprint=$1',
          [fingerprint],
        )
      ).rows[0];
    return { key: `custom-${row.id}` };
  }
  async image(id: string) {
    if (!/^\d{1,7}$/.test(id)) throw new NotFoundException('ไม่พบภาพ');
    const row = (
      await this.db.pool.query<{ image: Buffer }>('SELECT image FROM editor_assets WHERE id=$1', [
        Number(id),
      ])
    ).rows[0];
    if (!row) throw new NotFoundException('ไม่พบภาพ');
    return new StreamableFile(row.image, {
      type: 'image/png',
      length: row.image.length,
    });
  }
}
@Controller('assets')
export class AssetsController {
  constructor(@Inject(AssetsService) private assets: AssetsService) {}
  @Post() add(@Body() body: unknown) {
    return this.assets.add(body);
  }
  @Get(':id/image') image(@Param('id') id: string) {
    return this.assets.image(id);
  }
}
