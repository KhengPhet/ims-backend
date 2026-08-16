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
    if (file) {
      this.logger.log(
        `[B] AuthService received file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
      );
    } else {
      this.logger.log('[B] AuthService received request WITHOUT an image file');
    }

    // 1. Check duplicate username
    const existingUsername = await this.usersService.findByUsername(
      data.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // 2. Check duplicate email
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // 3. Upload image to Cloudinary BEFORE creating the user.
    //    If the upload fails the user is never created.
    let image: string | null = null;
    if (file) {
      if (this.cloudinaryService.isConfigured()) {
        try {
          this.logger.log('[C] Uploading image to Cloudinary...');
          image = await this.cloudinaryService.uploadImage(file);
          this.logger.log(`[D] Cloudinary secure_url obtained: ${image}`);
        } catch (error) {
          this.logger.error(
            `[C] Cloudinary upload FAILED: ${(error as Error).message}`,
          );
          throw new ServiceUnavailableException(
            'Image upload failed. Please try again.',
          );
        }
      } else {
        this.logger.error(
          '[C] Cloudinary is NOT configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET on Railway.',
        );
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
        username: data.username,
        email: data.email,
        password: hashedPassword,
        image,
        role: 'user',
      });

      this.logger.log(
        `[E] PostgreSQL user created id=${user.id} image=${user.image ?? 'null'}`,
      );

      return {
        message: 'Register success',
        user: this.toPublicUser(user),
      };
    } catch (error) {
      if (image) {
        await this.cloudinaryService.deleteImage(image).catch(() => undefined);
      }
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
