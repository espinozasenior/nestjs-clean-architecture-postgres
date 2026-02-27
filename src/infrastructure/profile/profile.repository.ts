import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsOrder,
  FindOptionsWhere,
  IsNull,
  Repository,
} from 'typeorm';
import { Profile, IProfileRepository } from '@domain/profile';
import { Role } from '@domain/shared/enums/role.enum';
import { FindAllParams, PaginatedResult } from '@domain/shared';
import { ProfileEntity } from '@infrastructure/profile/profile.entity';

export type ProfileResponse = Profile & {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class ProfileRepository implements IProfileRepository {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
  ) {}

  async create(profile: Partial<Profile>): Promise<Profile> {
    const newProfile = this.profileRepository.create(profile);
    const savedProfile = await this.profileRepository.save(newProfile);
    return this.mapToProfile(savedProfile);
  }

  async findAll(params?: FindAllParams): Promise<PaginatedResult<Profile>> {
    const [profiles, count] = await this.profileRepository.findAndCount({
      relations: ['auth'],
      skip: params?.skip,
      take: params?.take,
      where: params?.where as FindOptionsWhere<ProfileEntity>,
      order: params?.orderBy as FindOptionsOrder<ProfileEntity>,
    });
    return {
      data: profiles.map(profile => this.mapToProfile(profile)),
      count,
    };
  }

  async findById(id: string): Promise<Profile | null> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['auth'],
    });
    return profile ? this.mapToProfile(profile) : null;
  }

  async findByAuthId(authId: string): Promise<Profile | null> {
    const profile = await this.profileRepository.findOne({
      where: { authId },
      relations: ['auth'],
    });
    return profile ? this.mapToProfile(profile) : null;
  }

  async findByRole(role: Role): Promise<Profile[]> {
    const profiles = await this.profileRepository.find({
      relations: ['auth'],
      where: {
        auth: {
          role: role
        }
      }
    });
    return profiles.map(profile => this.mapToProfile(profile));
  }

  async update(id: string, profileData: Partial<Profile>): Promise<Profile> {
    const criteria: FindOptionsWhere<ProfileEntity> = {
      id,
      deletedAt: IsNull(),
    };

    const updateResult = await this.profileRepository.update(criteria, profileData);
    
    if (updateResult.affected === 0) {
      throw new Error('Profile not found');
    }
    
    const updatedProfile = await this.profileRepository.findOne({
      where: { id },
      relations: ['auth'],
    });

    return this.mapToProfile(updatedProfile);
  }

  async delete(id: string): Promise<void> {
    await this.profileRepository.softDelete({ id });
  }

  private mapToProfile(profileEntity: ProfileEntity): ProfileResponse {
    return {
      id: profileEntity.id,
      authId: profileEntity.authId,
      name: profileEntity.name,
      lastname: profileEntity.lastname,
      age: profileEntity.age,
      createdAt: profileEntity.createdAt,
      updatedAt: profileEntity.updatedAt,
      deletedAt: profileEntity.deletedAt ?? null,
    };
  }
}
