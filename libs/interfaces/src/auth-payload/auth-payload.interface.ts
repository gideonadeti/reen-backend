import { UserRole } from '@app/protos';

export interface AuthPayload {
  email: string;
  sub: string;
  role: UserRole;
  jti: string;
}
