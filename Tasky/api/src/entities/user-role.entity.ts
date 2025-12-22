import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Profile } from './profile.entity';

export type AppRole = 'employee' | 'employer';

@Entity({ name: 'user_roles' })
export class UserRole extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  role!: AppRole;

  @ManyToOne(() => Profile, (user) => user.roles)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
