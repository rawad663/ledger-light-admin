import { Controller, Get, Logger, Request, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import {
  JwtAuthGuard,
  OrganizationContextGuard,
  RolesGuard,
} from './auth/guards';
import type { RequestWithUser } from './auth/strategies/jwt.strategy';
import { Roles } from './auth/decorators/roles.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, RolesGuard)
  @Roles('MANAGER', 'SUPPORT')
  getHello(@Request() req: RequestWithUser): string {
    Logger.debug('Request user:', req.user);
    Logger.debug('Request organization:', req.organization);

    return this.appService.getHello();
  }
}
