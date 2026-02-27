import { Profile } from './Profile';
import { Role } from '@domain/shared/enums/role.enum';
import { FindAllParams, PaginatedResult } from '@domain/shared';

export interface IProfileRepository {
  create(profile: Partial<Profile>): Promise<Profile>;
  findById(id: string): Promise<Profile | null>;
  findByAuthId(authId: string): Promise<Profile | null>;
  findAll(params?: FindAllParams): Promise<PaginatedResult<Profile>>;
  findByRole(role: Role): Promise<Profile[]>;
  update(id: string, profile: Partial<Profile>): Promise<Profile>;
  delete(id: string): Promise<void>;
}
