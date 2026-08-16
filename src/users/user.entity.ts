import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  username: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  image: string | null;

  @Column({
    default: 'user',
  })
  role: string;

  @CreateDateColumn()
  created_at: Date;
}
