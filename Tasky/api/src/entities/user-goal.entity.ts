import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'user_goals' })
export class UserGoal extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'goal_type' })
  goalType!: string; // weekly | monthly | yearly

  @Column({ name: 'goal_text' })
  goalText!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  deadline?: Date | null;

  @Column({ name: 'picture_url', type: 'text', nullable: true })
  pictureUrl?: string | null;

  @ManyToOne(() => Profile, (u) => u.goals)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
