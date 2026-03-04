import { Module } from "@nestjs/common";
import { SnapshotModule } from "./snapshot/snapshot.module";

@Module({
  imports: [SnapshotModule],
})
export class AppModule {}
