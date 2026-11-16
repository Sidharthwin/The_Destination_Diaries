export type ServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "CONFLICT"
  | "INFEASIBLE"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED";

const STATUS: Record<ServiceErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  VALIDATION: 400,
  CONFLICT: 409,
  INFEASIBLE: 422,
  PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
};

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly details?: unknown;

  constructor(code: ServiceErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export function notFound(what = "Resource"): ServiceError {
  return new ServiceError("NOT_FOUND", `${what} not found`);
}

export function forbidden(message = "You do not have access to this resource"): ServiceError {
  return new ServiceError("FORBIDDEN", message);
}

export function unauthorized(message = "Authentication required"): ServiceError {
  return new ServiceError("UNAUTHORIZED", message);
}
