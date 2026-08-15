import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  image: string | null;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cloudinaryService: CloudinaryService,
  ) {}

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      image: user.image,
      role: user.role,
    };
  }

  async register(data: RegisterDto, file?: Express.Multer.File) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    let image: string | null = null;
    if (file) {
      try {
        image = await this.cloudinaryService.uploadImage(file);
      } catch (error) {
        throw new BadRequestException(
          `Image upload failed, please try again: ${(error as Error).message}`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      const user = await this.usersService.create({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        image,
        role: 'user',
      });

      return {
        message: 'Register success',
        user: this.toPublicUser(user),
      };
    } catch (error) {
      if (image) {
        await this.cloudinaryService.deleteImage(image).catch(() => undefined);
      }
      throw new InternalServerErrorException(
        'Failed to create account. Please try again.',
      );
    }
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: this.toPublicUser(user),
    };
  }

  async validateUser(id: number): Promise<PublicUser | null> {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    return this.toPublicUser(user);
  }
}
