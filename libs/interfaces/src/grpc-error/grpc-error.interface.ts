import { Metadata } from '@grpc/grpc-js';

export interface GrpcError extends Error {
  code: number;
  details: string;
  metadata: Metadata;
}
