import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
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
  created_at: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cloudinaryService: CloudinaryService,
  ) { }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      image: user.image,
      role: user.role,
      created_at: user.created_at,
    };
  }

  async register(
    data: RegisterDto,
    file?: Express.Multer.File,
  ) {
    try {
      console.log('========== REGISTER ==========');

      console.log('Username:', data.username);
      console.log('Email:', data.email);

      console.log(
        'File:',
        file
          ? {
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
          }
          : 'NO FILE',
      );

      // Check username
      const existingUsername =
        await this.usersService.findByUsername(
          data.username,
        );

      if (existingUsername) {
        throw new ConflictException(
          'Username is already taken',
        );
      }

      // Check email
      const existingEmail =
        await this.usersService.findByEmail(
          data.email,
        );

      if (existingEmail) {
        throw new ConflictException(
          'Email is already registered',
        );
      }

      let imageUrl: string | null = null;

      // Upload image
      if (file) {
        console.log(
          '☁️ Starting Cloudinary upload...',
        );

        try {
          imageUrl =
            await this.cloudinaryService.uploadImage(
              file,
            );

          console.log(
            '✅ Cloudinary URL:',
            imageUrl,
          );
        } catch (error) {
          console.error(
            '❌ CLOUDINARY ERROR:',
            error,
          );

          throw new ServiceUnavailableException(
            'Image upload failed. Please try again.',
          );
        }
      }

      // Hash password
      const hashedPassword =
        await bcrypt.hash(
          data.password,
          10,
        );

      // Save user
      const user =
        await this.usersService.create({
          username: data.username.trim(),
          email: data.email.trim().toLowerCase(),
          password: hashedPassword,
          image: imageUrl,
          role: 'user',
        });

      console.log(
        '✅ User created:',
        user.id,
      );

      return {
        message: 'Register success',

        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          image: user.image,
          role: user.role,
          created_at: user.created_at,
        },
      };
    } catch (error) {
      console.error(
        '❌ REGISTER ERROR:',
        error,
      );

      throw error;
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
