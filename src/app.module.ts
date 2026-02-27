import { ApiModule } from '@api/api.module';
import { AuthController } from '@api/auth';
import { HelloController } from '@api/hello';
import { ProfileController } from '@api/profile';
import { ApplicationModule } from '@application/application.module';
import { ResponseInterceptor } from '@application/interceptors/response.interceptor';
import { LoggerMiddleware } from '@application/middlewere/logger.middleware';
import { ResponseService } from '@application/services/response.service';
import { HealthController } from '@infrastructure/shared/health/health.controller';
import { TerminusOptionsService } from '@infrastructure/shared/health/terminus-options.check';
import { LoggerModule } from '@infrastructure/shared/logger/logger.module';
import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ApiModule,
    ApplicationModule,
    TerminusModule,
    HttpModule,
    PrometheusModule.register(),
    LoggerModule,
  ],
  controllers: [HelloController, HealthController],
  providers: [
    TerminusOptionsService,
    ResponseService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(ProfileController, AuthController);
  }
}
