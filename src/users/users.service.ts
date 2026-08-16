import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {

    // SAFE LOG: password and secrets are NEVER logged.
    console.log('USER DATA BEFORE SAVE:', {
      username: data.username,
      email: data.email,
      image: data.image,
      role: data.role,
    });

    const user =
      this.userRepository.create({
        username: data.username,
        email: data.email,
        password: data.password,
        image: data.image ?? null,
        role: data.role ?? 'user',
      });

    const savedUser =
      await this.userRepository.save(user);

    console.log('USER SAVED:', {
      id: savedUser.id,
      username: savedUser.username,
      image: savedUser.image,
    });

    return savedUser;
  }

  async findByEmail(
    email: string,
  ): Promise<User | null> {

    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByUsername(
    username: string,
  ): Promise<User | null> {

    return this.userRepository.findOne({
      where: { username },
    });
  }

  async findById(
    id: number,
  ): Promise<User | null> {

    return this.userRepository.findOne({
      where: { id },
    });
  }
}