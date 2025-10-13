import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CopywritingService } from './copywriting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCopywritingDto } from './dto/create-copywriting.dto';
import { DeconstructDto } from './dto/deconstruct.dto';
import { AnalyzeDto } from './dto/analyze.dto';
import { RewriteDto } from './dto/rewrite.dto';
import { OptimizeDto } from './dto/optimize.dto';

@ApiTags('文案管理')
@Controller('copywriting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CopywritingController {
  constructor(private readonly copywritingService: CopywritingService) {}

  @Post('deconstruct')
  deconstruct(@Request() req, @Body() deconstructDto: DeconstructDto) {
    return this.copywritingService.deconstruct(req.user.id, deconstructDto, req.headers);
  }

  @Post('save-deconstruction')
  saveDeconstruction(@Request() req, @Body() data: any) {
    return this.copywritingService.saveDeconstruction(req.user.id, data);
  }

  @Post('analyze')
  analyze(@Request() req, @Body() analyzeDto: AnalyzeDto) {
    return this.copywritingService.analyze(analyzeDto, req.headers);
  }

  @Post('optimize')
  optimize(@Request() req, @Body() optimizeDto: OptimizeDto) {
    return this.copywritingService.optimize(optimizeDto, req.headers);
  }

  @Post('create')
  create(@Request() req, @Body() createDto: CreateCopywritingDto) {
    return this.copywritingService.create(req.user.id, createDto, req.headers);
  }

  @Post('rewrite')
  rewrite(@Request() req, @Body() rewriteDto: RewriteDto) {
    return this.copywritingService.rewrite(req.user.id, rewriteDto, req.headers);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    return this.copywritingService.findAll(req.user.id, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.copywritingService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateDto: any) {
    return this.copywritingService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.copywritingService.remove(id, req.user.id);
  }

  @Put(':id/share')
  shareToLibrary(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.copywritingService.shareToLibrary(id, req.user.id, body.action);
  }

  @Get('admin/share-requests')
  getShareRequests(@Request() req) {
    return this.copywritingService.getShareRequests(req.user);
  }

  @Get('admin/materials')
  getAllMaterials(@Request() req) {
    return this.copywritingService.getAllMaterials(req.user);
  }

  @Put('admin/share-requests/:id')
  reviewShareRequest(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.copywritingService.reviewShareRequest(id, req.user, body.action);
  }
}





