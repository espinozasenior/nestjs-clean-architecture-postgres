import { SoftDeletableEntity } from '@infrastructure/entities/base/soft-deletable.entity';
import type { AuthEntity } from '@infrastructure/auth/auth.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, Relation } from 'typeorm';

@Entity('profiles')
export class ProfileEntity extends SoftDeletableEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  authId: string;

  @OneToOne('AuthEntity')
  @JoinColumn({ name: 'authId' })
  auth: Relation<AuthEntity>;

  @Column()
  name: string;

  @Column({ nullable: true })
  lastname?: string;

  @Column({ nullable: true })
  age?: number;
}
