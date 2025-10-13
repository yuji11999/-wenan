import { Controller, Post, Get, Put, Delete, UseGuards, Request, Body, Param, Query, HttpException, HttpStatus, Logger, Ip, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBody, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req, @Ip() ip: string, @Headers('user-agent') userAgent: string) {
    // AuthGuard已经处理了验证，这里直接返回登录结果
    // 获取真实IP（考虑代理）
    const realIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ip;
    const clientIp = Array.isArray(realIp) ? realIp[0] : realIp;
    
    return await this.authService.login(req.user, clientIp, userAgent);
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有用户列表（仅管理员）' })
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Put('users/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户状态（仅管理员）' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.authService.updateUserStatus(id, updateUserStatusDto.status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Request() req) {
    return this.authService.getUserProfile(req.user.id);
  }

  // ==================== 会话管理接口 ====================

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出' })
  async logout(@Request() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await this.authService.logout(token);
    }
    return { message: '登出成功' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的会话列表' })
  async getUserSessions(@Request() req) {
    return this.authService.getUserSessions(req.user.id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('users/:userId/sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取指定用户的会话列表（管理员）' })
  async getUserSessionsAdmin(@Param('userId') userId: string, @Request() req) {
    return this.authService.getUserSessions(userId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('sessions/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有活跃会话（管理员）' })
  async getAllActiveSessions(@Request() req) {
    return this.authService.getAllActiveSessions(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete('users/:userId/sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: '强制登出用户的所有会话（管理员）' })
  async forceLogoutUser(@Param('userId') userId: string, @Request() req) {
    await this.authService.forceLogoutUser(userId, req.user.id);
    return { message: '用户已强制登出' };
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '强制登出指定会话（管理员）' })
  async forceLogoutSession(@Param('sessionId') sessionId: string, @Request() req) {
    await this.authService.forceLogoutSession(sessionId, req.user.id);
    return { message: '会话已强制登出' };
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('logs/login')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取登录日志（管理员）' })
  @ApiQuery({ name: 'username', required: false, description: '用户名筛选' })
  @ApiQuery({ name: 'ipAddress', required: false, description: 'IP地址筛选' })
  @ApiQuery({ name: 'success', required: false, description: '是否成功筛选' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'limit', required: false, description: '限制条数，默认100' })
  async getLoginLogs(
    @Request() req,
    @Query('username') username?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('success') success?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};
    
    if (username) filters.username = username;
    if (ipAddress) filters.ipAddress = ipAddress;
    if (success !== undefined) filters.success = success === 'true';
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit);

    return this.authService.getLoginLogs(req.user.id, filters);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Put('users/:userId/unlock')
  @ApiBearerAuth()
  @ApiOperation({ summary: '解锁用户账号（管理员）' })
  async unlockUser(@Param('userId') userId: string, @Request() req) {
    await this.authService.unlockUser(userId, req.user.id);
    return { message: '用户账号已解锁' };
  }
}





