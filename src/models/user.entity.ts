import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { IsEmail, MinLength } from 'class-validator';
import bcrypt from 'bcrypt';

@Entity('users')
export class User extends CustomBaseEntity {
  @Column()
  @MinLength(2)
  firstName: string;

  @Column()
  @MinLength(2)
  lastName: string;

  @Column({ unique: true })
  @Index()
  @IsEmail()
  email: string;

  @Column()
  @MinLength(8)
  password: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt();
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const obj: any = { ...this };
    delete obj.password;
    delete obj.refreshToken;
    return obj;
  }
} 