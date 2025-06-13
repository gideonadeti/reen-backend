import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateUserRoleDto {
  /**
   * User's role
   * @example ADMIN
   */
  @IsNotEmpty()
  @IsIn(['ADMIN', 'NADMIN'])
  role: 'ADMIN' | 'NADMIN';
}
