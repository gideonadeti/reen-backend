import { UserRole } from '@app/protos/generated/auth';

export interface AuthPayload {
  email: string;
  sub: string;
  role: UserRole;
  jti: string;
}
