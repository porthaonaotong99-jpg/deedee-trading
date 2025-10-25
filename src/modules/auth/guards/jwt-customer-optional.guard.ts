import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Customer Guard
 * Allows requests to pass through whether or not they have a valid JWT token.
 * If a valid token is present, it will be attached to the request.
 * If no token or invalid token, the request continues without authentication.
 */
@Injectable()
export class JwtCustomerOptionalGuard extends AuthGuard('jwt-customer') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, user: any, _info: any, _context: ExecutionContext) {
    // If there's an error or no user, just return null instead of throwing
    // This allows the request to continue without authentication
    if (err || !user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
