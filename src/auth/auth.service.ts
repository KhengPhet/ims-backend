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
import { UploadsService } from '../uploads/uploads.service';
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
    private uploadsService: UploadsService,
  ) {}

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

  async register(data: RegisterDto, file?: Express.Multer.File) {
    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();

    // ========== REGISTER LOG (password is NEVER logged) ==========
    this.logger.log(`REGISTER: username=${username} email=${email}`);
    if (file) {
      this.logger.log(
        `REGISTER: file name=${file.originalname} size=${file.size} mimetype=${file.mimetype}`,
      );
    } else {
      this.logger.log('REGISTER: no image file selected');
    }

    // 1. Check duplicate username
    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // 2. Check duplicate email
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // 3. Upload image to local storage BEFORE creating the user.
    //    If the upload fails the user is NOT created.
    let imageUrl: string | null = null;

    if (file) {
      try {
        imageUrl = this.uploadsService.saveImage(file);
      } catch (error) {
        const err = error as Error;

        this.logger.error(`IMAGE UPLOAD FAILED: ${err.message}`, err.stack);

        throw new ServiceUnavailableException(
          'Image upload failed. Please try again.',
        );
      }
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 5. Save user
    try {
      const user = await this.usersService.create({
        username,
        email,
        password: hashedPassword,
        image: imageUrl,
        role: 'user',
      });

      this.logger.log(
        `DATABASE: user created id=${user.id} image=${user.image ?? 'null'}`,
      );

      return {
        message: 'Register success',
        user: this.toPublicUser(user),
      };
    } catch (error) {
      // PostgreSQL unique violation (email/username) raced the check above.
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Email or username is already taken');
      }
      throw new ServiceUnavailableException(
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
