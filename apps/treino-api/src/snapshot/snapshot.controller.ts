import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import { SnapshotService } from './snapshot.service';

@Controller('snapshot')
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  /** Return the full snapshot */
  @Get()
  getAll(): Record<string, string> {
    return this.snapshotService.getAll();
  }

  /** Return a single key */
  @Get(':key')
  getKey(@Param('key') key: string): { key: string; value: string | null } {
    const value = this.snapshotService.getKey(key) ?? null;
    return { key, value };
  }

  /** Replace the entire snapshot (full save) */
  @Put()
  replaceAll(
    @Body() body: Record<string, string>,
  ): Record<string, string> {
    return this.snapshotService.replaceAll(body);
  }

  /**
   * Merge partial updates into the snapshot.
   * Send `{ "key": null }` to delete a key.
   */
  @Patch()
  patch(
    @Body() body: Record<string, string | null>,
  ): Record<string, string> {
    return this.snapshotService.patch(body);
  }

  /** Delete a single key */
  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteKey(@Param('key') key: string): void {
    this.snapshotService.deleteKey(key);
  }
}
