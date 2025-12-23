import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subgroup, SubgroupMember } from '../entities';
import { CreateSubgroupDto } from './create-subgroup.dto';
import { UpdateSubgroupDto } from './update-subgroup.dto';
import { SetMembersDto } from './set-members.dto';

@Injectable()
export class SubgroupsService {
  constructor(
    @InjectRepository(Subgroup)
    private readonly subgroups: Repository<Subgroup>,
    @InjectRepository(SubgroupMember)
    private readonly members: Repository<SubgroupMember>,
  ) {}

  async list(organizationId: string) {
    return this.subgroups.find({
      where: { organizationId },
      relations: ['members'],
    });
  }

  async findOne(id: string) {
    const subgroup = await this.subgroups.findOne({
      where: { id },
      relations: ['members'],
    });
    if (!subgroup) throw new NotFoundException('Subgroup not found');
    return subgroup;
  }

  async create(dto: CreateSubgroupDto, userId: string) {
    const subgroup = this.subgroups.create({
      organizationId: dto.organizationId,
      name: dto.name,
      description: dto.description,
      createdBy: userId,
    });
    const saved = await this.subgroups.save(subgroup);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateSubgroupDto, userId: string) {
    const subgroup = await this.findOne(id);
    if (subgroup.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can update this subgroup');
    }
    subgroup.name = dto.name ?? subgroup.name;
    subgroup.description = dto.description ?? subgroup.description;
    await this.subgroups.save(subgroup);
    return this.findOne(id);
  }

  async delete(id: string, userId: string) {
    const subgroup = await this.findOne(id);
    if (subgroup.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can delete this subgroup');
    }
    await this.members.delete({ subgroupId: id });
    await this.subgroups.delete({ id });
    return { success: true };
  }

  async setMembers(id: string, dto: SetMembersDto) {
    await this.findOne(id);
    await this.members.delete({ subgroupId: id });
    const rows = dto.userIds.map((userId) =>
      this.members.create({ subgroupId: id, userId }),
    );
    if (rows.length) await this.members.save(rows);
    return this.findOne(id);
  }

  async removeMember(id: string, userId: string) {
    await this.members.delete({ subgroupId: id, userId });
    return this.findOne(id);
  }
}
