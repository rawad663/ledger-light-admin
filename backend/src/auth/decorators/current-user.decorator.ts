import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();

    return req.user;
  },
);
