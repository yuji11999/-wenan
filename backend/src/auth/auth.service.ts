import { Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private readonly logger = new Logger(AuthService.name);
  
  // 登录安全配置
  private readonly MAX_LOGIN_ATTEMPTS = 5;           // 最大登录尝试次数
  private readonly LOCK_TIME = 30 * 60 * 1000;      // 锁定时间：30分钟
  private readonly LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 登录尝试窗口：15分钟

  // 记录登录日志
  private async logLoginAttempt(
    username: string, 
    ipAddress: string, 
    userAgent: string, 
    success: boolean, 
    userId?: string, 
    failReason?: string
  ) {
    try {
      // 截断userAgent，防止手机浏览器的userAgent过长
      const truncatedUserAgent = userAgent ? userAgent.substring(0, 180) : null;

      await this.prisma.loginLog.create({
        data: {
          userId,
          username,
          ipAddress,
          userAgent: truncatedUserAgent,
          success,
          failReason,
        },
      });
    } catch (error) {
      this.logger.error('记录登录日志失败:', error.message);
    }
  }

  // 检查用户是否被锁定
  private async checkUserLockStatus(user: any): Promise<void> {
    if (!user.lockedUntil) return;

    const now = new Date();
    if (user.lockedUntil > now) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (1000 * 60));
      throw new UnauthorizedException(
        `账号已被锁定，请在 ${remainingMinutes} 分钟后重试。连续登录失败次数过多导致账号暂时锁定。`
      );
    }

    // 锁定时间已过，重置登录尝试次数
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  // 处理登录失败
  private async handleLoginFailure(user: any, reason: string): Promise<void> {
    const newAttempts = user.loginAttempts + 1;
    const updateData: any = {
      loginAttempts: newAttempts,
    };

    // 如果达到最大尝试次数，锁定账号
    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + this.LOCK_TIME);
      this.logger.warn(`用户 ${user.username} 登录失败次数达到 ${this.MAX_LOGIN_ATTEMPTS} 次，账号已锁定 ${this.LOCK_TIME / (1000 * 60)} 分钟`);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        `登录失败次数过多，账号已被锁定 ${this.LOCK_TIME / (1000 * 60)} 分钟。请稍后重试。`
      );
    } else {
      const remainingAttempts = this.MAX_LOGIN_ATTEMPTS - newAttempts;
      throw new UnauthorizedException(
        `${reason}。剩余尝试次数：${remainingAttempts}`
      );
    }
  }

  // 处理登录成功
  private async handleLoginSuccess(user: any, ipAddress: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  // 创建用户会话
  private async createUserSession(userId: string, token: string, ipAddress: string, userAgent: string): Promise<void> {
    // 清理过期的会话
    await this.cleanupExpiredSessions(userId);

    // 计算token过期时间（从JWT中提取或使用默认7天）
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

    // 截断userAgent，防止手机浏览器的userAgent过长导致数据库错误
    const truncatedUserAgent = userAgent ? userAgent.substring(0, 180) : null;

    await this.prisma.userSession.create({
      data: {
        userId,
        token: this.hashToken(token),
        ipAddress,
        userAgent: truncatedUserAgent,
        expiresAt,
      },
    });
  }

  // 清理过期会话
  private async cleanupExpiredSessions(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false },
        ],
      },
    });
  }

  // 对token进行哈希处理（用于存储）
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<any> {
    const clientIp = ipAddress || 'unknown';
    const clientAgent = userAgent || 'unknown';
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      // 用户不存在
      if (!user) {
        await this.logLoginAttempt(username, clientIp, clientAgent, false, undefined, '用户不存在');
        return null;
      }

      // 检查账号锁定状态
      await this.checkUserLockStatus(user);

      // 验证密码
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        await this.logLoginAttempt(username, clientIp, clientAgent, false, user.id, '密码错误');
        await this.handleLoginFailure(user, '用户名或密码错误');
        return null;
      }

      // 检查用户状态
      if (user.status === 'pending') {
        await this.logLoginAttempt(username, clientIp, clientAgent, false, user.id, '账号待审核');
        throw new UnauthorizedException('账号待审核，请等待管理员审核通过');
      }

      if (user.status === 'rejected') {
        await this.logLoginAttempt(username, clientIp, clientAgent, false, user.id, '账号审核未通过');
        throw new UnauthorizedException('账号审核未通过，请联系管理员');
      }

      if (user.status === 'disabled') {
        await this.logLoginAttempt(username, clientIp, clientAgent, false, user.id, '账号已禁用');
        throw new UnauthorizedException('账号已被禁用，请联系管理员');
      }

      // 登录成功，记录日志并更新用户信息
      await this.logLoginAttempt(username, clientIp, clientAgent, true, user.id);
      await this.handleLoginSuccess(user, clientIp);

      const { password: _, loginAttempts, lockedUntil, ...result } = user;
      return result;
    } catch (error) {
      // 如果是已知的 UnauthorizedException，直接向上抛出
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // 未知错误记录日志
      this.logger.error('登录校验失败');
      await this.logLoginAttempt(username, clientIp, clientAgent, false, undefined, `系统错误: ${error.message}`);
      return null;
    }
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      status: user.status,
      sessionId: crypto.randomUUID(), // 添加会话ID
    };
    
    const token = this.jwtService.sign(payload);
    
    // 创建用户会话记录
    if (ipAddress && userAgent) {
      await this.createUserSession(user.id, token, ipAddress, userAgent);
    }
    
    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new UnauthorizedException('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户，默认状态为 pending（待审核）
    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        status: 'pending',
      },
    });

    const { password: _, ...result } = user;

    // 注册成功，返回提示信息而不是直接登录
    return {
      message: '注册成功，请等待管理员审核',
      user: {
        id: result.id,
        username: result.username,
        status: result.status,
      },
    };
  }

  // 获取所有用户（管理员功能）
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  // 更新用户状态（管理员功能）
  async updateUserStatus(userId: string, status: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: '用户状态更新成功',
      user: updatedUser,
    };
  }

  // 获取用户信息
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  // ==================== 会话管理方法 ====================

  // 验证token是否有效（会话管理）
  async validateSession(token: string): Promise<boolean> {
    try {
      const hashedToken = this.hashToken(token);
      const session = await this.prisma.userSession.findUnique({
        where: { token: hashedToken },
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return false;
      }

      // 更新最后使用时间
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsed: new Date() },
      });

      return true;
    } catch (error) {
      this.logger.error('验证会话失败:', error.message);
      return false;
    }
  }

  // 登出（使当前会话失效）
  async logout(token: string): Promise<void> {
    try {
      const hashedToken = this.hashToken(token);
      await this.prisma.userSession.updateMany({
        where: { token: hashedToken },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error('登出失败:', error.message);
    }
  }

  // 强制登出用户的所有会话（管理员功能）
  async forceLogoutUser(userId: string, adminUserId: string): Promise<void> {
    // 验证管理员权限
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('权限不足');
    }

    // 使用户所有会话失效
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    this.logger.log(`管理员 ${admin.username} 强制登出用户 ${userId} 的所有会话`);
  }

  // 强制登出指定会话（管理员功能）
  async forceLogoutSession(sessionId: string, adminUserId: string): Promise<void> {
    // 验证管理员权限
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('权限不足');
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    this.logger.log(`管理员 ${admin.username} 强制登出用户 ${session.user.username} 的会话 ${sessionId}`);
  }

  // 获取用户的活跃会话列表（管理员或用户本人）
  async getUserSessions(userId: string, requestUserId: string): Promise<any[]> {
    // 检查权限：管理员或用户本人
    const requestUser = await this.prisma.user.findUnique({
      where: { id: requestUserId },
    });

    if (!requestUser) {
      throw new UnauthorizedException('用户不存在');
    }

    if (requestUser.role !== 'admin' && requestUserId !== userId) {
      throw new UnauthorizedException('权限不足');
    }

    return this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsed: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsed: 'desc' },
    });
  }

  // 获取所有活跃会话（管理员功能）
  async getAllActiveSessions(adminUserId: string): Promise<any[]> {
    // 验证管理员权限
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('权限不足');
    }

    return this.prisma.userSession.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { lastUsed: 'desc' },
    });
  }

  // 获取登录日志（管理员功能）
  async getLoginLogs(adminUserId: string, filters?: {
    username?: string;
    ipAddress?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    // 验证管理员权限
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('权限不足');
    }

    const where: any = {};

    if (filters?.username) {
      where.username = { contains: filters.username };
    }

    if (filters?.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters?.success !== undefined) {
      where.success = filters.success;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.loginLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  // 解锁用户账号（管理员功能）
  async unlockUser(userId: string, adminUserId: string): Promise<void> {
    // 验证管理员权限
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('权限不足');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    this.logger.log(`管理员 ${admin.username} 解锁用户 ${user.username}`);
  }

  // 清理过期会话和日志（定时任务）
  async cleanupExpiredData(): Promise<void> {
    try {
      // 清理过期会话
      const expiredSessions = await this.prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false, lastUsed: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7天前的非活跃会话
          ],
        },
      });

      // 清理30天前的登录日志
      const oldLogs = await this.prisma.loginLog.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      this.logger.log(`清理完成：删除 ${expiredSessions.count} 个过期会话，${oldLogs.count} 条过期日志`);
    } catch (error) {
      this.logger.error('清理过期数据失败:', error.message);
    }
  }
}





