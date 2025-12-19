import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subgroup, SubgroupMember } from '../entities';
import { SubgroupsService } from './subgroups.service';
import { SubgroupsController } from './subgroups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Subgroup, SubgroupMember])],
  providers: [SubgroupsService],
  controllers: [SubgroupsController],
  exports: [SubgroupsService],
})
export class SubgroupsModule {}
