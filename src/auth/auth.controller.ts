import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../users/user.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|webp|gif/;

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService ,  private readonly cloudinaryService: CloudinaryService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_req, file, cb) => {
        const extMatches = ALLOWED_IMAGE_TYPES.test(
          file.originalname.toLowerCase().split('.').pop() ?? '',
        );
        if (!file.mimetype.startsWith('image/') || !extMatches) {
          return cb(
            new BadRequestException(
              'Only image files (jpeg, png, webp, gif) are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  register(
    @Body() data: RegisterDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // SAFE DEBUG LOG (password is NEVER logged)
    this.logger.log('REGISTER BODY:', {
      username: data.username,
      email: data.email,
    });

    this.logger.log(
      'REGISTER FILE:',
      file
        ? {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
          }
        : 'NO FILE',
    );

    return this.authService.register(data, file);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser() user: User) {
    return user;
  }

   @Get('cloudinary-test')
  async cloudinaryTest() {
    return this.cloudinaryService.testConnection();
  }
}
