import { AuthController } from '@api/auth';
import { HelloController } from '@api/hello';
import { ProfileController } from '@api/profile';
import { ApplicationModule } from '@application/application.module';
import { ResponseInterceptor } from '@application/interceptors/response.interceptor';
import { ResponseService } from '@application/services/response.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ApplicationModule],
  controllers: [AuthController, ProfileController, HelloController],
  providers: [ResponseService, ResponseInterceptor],
})
export class ApiModule { }