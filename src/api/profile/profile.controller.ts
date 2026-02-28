import { SuccessResponseDto } from '@api/dto/common/api-response.dto';
import { CreateProfileRequestDto } from '@api/profile/create-profile-request.dto';
import { UpdateProfileDto } from '@api/profile/update-profile.dto';
import { Roles } from '@application/auth/decorators/roles.decorator';
import { RolesGuard } from '@application/auth/guards/roles.guard';
import { CurrentUserId } from '@application/decorators/current-user.decorator';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { ProfileService } from '@application/profile/profile.service';
import { ResponseService } from '@application/services/response.service';
import { ProfileError, ProfileErrorMessage } from '@application/shared/errors';
import { Role } from '@domain/shared/enums/role.enum';
import { Profile } from '@domain/profile';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'profile',
  version: '1',
})
@UseInterceptors(LoggingInterceptor)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly responseService: ResponseService,
  ) { }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('all')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns all users', type: [Profile] })
  async getAll(): Promise<SuccessResponseDto<Profile[]>> {
    const { data } = await this.profileService.find();
    return this.responseService.retrieved(data, 'All profiles retrieved successfully');
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admins')
  @ApiOperation({ summary: 'Get all admin users' })
  @ApiResponse({ status: 200, description: 'Returns all admin users', type: [Profile] })
  async getAdmins(): Promise<SuccessResponseDto<Profile[]>> {
    const admins = await this.profileService.findByRole(Role.ADMIN);
    return this.responseService.retrieved(admins, 'Admin profiles retrieved successfully');
  }

  @Post('')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created',
    type: Profile,
  })
  async create(@Body() profile: CreateProfileRequestDto): Promise<SuccessResponseDto<Profile>> {
    const newProfile = await this.profileService.create(profile);
    return this.responseService.created(newProfile, 'Profile created successfully');
  }
 
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile.', type: Profile })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async getMyProfile(
    @CurrentUserId() requestingUserId: string,
  ): Promise<SuccessResponseDto<Profile>> {
    const profile = await this.profileService.findByAuthId(requestingUserId);
    if (!profile) {
      throw new NotFoundException({
        code: ProfileError.PROFILE_NOT_FOUND,
        message: ProfileErrorMessage[ProfileError.PROFILE_NOT_FOUND],
      });
    }

    return this.responseService.retrieved(profile, 'Profile retrieved successfully');
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException({
        code: ProfileError.PROFILE_ID_REQUIRED,
        message: ProfileErrorMessage[ProfileError.PROFILE_ID_REQUIRED],
      });
    }

    const profile = await this.profileService.findById(id);
    if (!profile) {
      throw new NotFoundException({
        code: ProfileError.PROFILE_NOT_FOUND,
        message: ProfileErrorMessage[ProfileError.PROFILE_NOT_FOUND],
      });
    }

    return this.responseService.retrieved(profile, 'Profile retrieved successfully');
  }

  @Put('me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: Profile })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyProfile(
    @Body() updates: UpdateProfileDto,
    @CurrentUserId() requestingUserId: string,
  ): Promise<SuccessResponseDto<Profile>> {
    const updatedProfile = await this.profileService.updateMyProfile(updates, requestingUserId);
    return this.responseService.updated(updatedProfile, 'Profile updated successfully');
  }
}
