import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  image: string | null;
  role: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(data: CreateUserInput) {
    const user = await this.repo.save(data);
    this.logger.log(
      `DATABASE: user created id=${user.id} image=${user.image ?? 'null'}`,
    );
    return user;
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByUsername(username: string) {
    return this.repo.findOne({ where: { username } });
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }
}
