import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { Database } from './database';
import { CatalogService } from './catalog';
const payload = z.object({
  name: z.string().trim().min(1).max(100),
  revision: z.number().int().positive(),
  document: z.record(z.string(), z.unknown()),
});
const mapShape = z.object({
  orientation: z.literal('orthogonal'),
  infinite: z.literal(false),
  width: z.number().int().min(1).max(256),
  height: z.number().int().min(1).max(256),
  tilewidth: z.literal(32),
  tileheight: z.literal(32),
  layers: z.array(z.unknown()).max(2000),
  tilesets: z
    .array(
      z.object({ firstgid: z.literal(1), source: z.string().regex(/(?:^|\/)exhibition\.tsj$/) }),
    )
    .length(1),
});
function toRecord(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}
@Injectable()
export class MapsService {
  constructor(
    @Inject(Database) private db: Database,
    @Inject(CatalogService) private catalog: CatalogService,
  ) {}
  async seed() {
    if ((await this.db.pool.query('SELECT id FROM maps LIMIT 1')).rowCount) return;
    const document = JSON.parse(await readFile('maps/exhibition.tmj', 'utf8'));
    await this.compile(document);
    await this.db.pool.query('INSERT INTO maps(name,document) VALUES($1,$2)', [
      'Exhibition Hall',
      document,
    ]);
  }
  async compile(document: unknown) {
    try {
      mapShape.parse(document);
      const { compileDocument } = await import(
        pathToFileURL(path.resolve('shared/map/compile.mjs')).href
      );
      const catalog = await this.catalog.get();
      return compileDocument(document, catalog.tiles, catalog.textures);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid map');
    }
  }
  async get(id = 'default') {
    if (id !== 'default' && !z.string().uuid().safeParse(id).success)
      throw new BadRequestException('Invalid map ID');
    const result =
      id === 'default'
        ? await this.db.pool.query('SELECT * FROM maps ORDER BY updated_at,id LIMIT 1')
        : await this.db.pool.query('SELECT * FROM maps WHERE id=$1', [id]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Map not found');
    return toRecord(row);
  }
  async save(id: string, body: unknown) {
    const parsed = payload.safeParse(body);
    if (!parsed.success || !z.string().uuid().safeParse(id).success)
      throw new BadRequestException('Invalid map request');
    const { name, document, revision } = parsed.data;
    await this.compile(document);
    const result = await this.db.pool.query(
      'UPDATE maps SET name=$1,document=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND revision=$4 RETURNING *',
      [name, document, id, revision],
    );
    if (!result.rowCount)
      throw new ConflictException(
        'แมปมีการแก้ไขจากอีกหน้าต่าง กรุณา Export ฉบับนี้ก่อนโหลดฉบับล่าสุด',
      );
    return toRecord(result.rows[0]);
  }
}
@Controller()
export class MapsController {
  constructor(
    @Inject(MapsService) private maps: MapsService,
    @Inject(CatalogService) private catalog: CatalogService,
  ) {}
  @Get('catalog') getCatalog() {
    return this.catalog.get();
  }
  @Get('maps/:id') get(@Param('id') id: string) {
    return this.maps.get(id);
  }
  @Get('maps/:id/runtime') async runtime(@Param('id') id: string) {
    const map = await this.maps.get(id);
    return { ...(await this.maps.compile(map.document)), sessionKey: `${map.id}:${map.revision}` };
  }
  @Put('maps/:id') save(@Param('id') id: string, @Body() body: unknown) {
    return this.maps.save(id, body);
  }
}
