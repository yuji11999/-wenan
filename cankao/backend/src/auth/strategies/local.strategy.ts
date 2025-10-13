import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      passReqToCallback: true, // 启用将request对象传递给validate方法
    });
  }

  async validate(req: any, username: string, password: string): Promise<any> {
    // 获取IP地址和User-Agent
    const realIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip;
    const clientIp = Array.isArray(realIp) ? realIp[0] : realIp;
    const userAgent = req.headers['user-agent'] || 'unknown';

    const user = await this.authService.validateUser(username, password, clientIp, userAgent);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return user;
  }
}





