export interface MicroserviceError {
  code?: string;
  meta?: {
    modelName?: string;
    target?: string;
  };
  clientVersion?: string;
  name?: string;
  message?: string;
}
