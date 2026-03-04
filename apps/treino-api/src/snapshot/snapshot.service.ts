import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOT_PATH =
  process.env.SNAPSHOT_PATH ??
  path.resolve(__dirname, '../../../../treino_autosave.json');

@Injectable()
export class SnapshotService implements OnModuleInit {
  private readonly logger = new Logger(SnapshotService.name);
  private data: Record<string, string> = {};

  onModuleInit() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(SNAPSHOT_PATH)) {
        const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
        this.data = JSON.parse(raw) as Record<string, string>;
        this.logger.log(`Snapshot loaded from ${SNAPSHOT_PATH}`);
      } else {
        this.logger.warn(`No snapshot file found at ${SNAPSHOT_PATH}, starting empty.`);
      }
    } catch (e) {
      this.logger.error('Failed to load snapshot', e);
    }
  }

  private persist() {
    try {
      const dir = path.dirname(SNAPSHOT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error('Failed to persist snapshot', e);
    }
  }

  getAll(): Record<string, string> {
    return this.data;
  }

  getKey(key: string): string | undefined {
    return this.data[key];
  }

  replaceAll(incoming: Record<string, string>): Record<string, string> {
    this.data = { ...incoming };
    this.persist();
    return this.data;
  }

  /**
   * Merge individual keys into the snapshot (PATCH semantics).
   * Pass `null` as a value to delete a key.
   */
  patch(updates: Record<string, string | null>): Record<string, string> {
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) {
        delete this.data[k];
      } else {
        this.data[k] = v;
      }
    }
    this.persist();
    return this.data;
  }

  deleteKey(key: string): void {
    if (key in this.data) {
      delete this.data[key];
      this.persist();
    }
  }
}
