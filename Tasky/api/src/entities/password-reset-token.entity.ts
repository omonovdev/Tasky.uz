import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'password_reset_tokens' })
export class PasswordResetToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'token' })
  token!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'used', type: 'boolean', default: false })
  used!: boolean;

  @ManyToOne(() => Profile, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
