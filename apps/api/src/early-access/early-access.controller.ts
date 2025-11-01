import { Controller, Post, Get, Body, Query, Header } from '@nestjs/common';
import { EarlyAccessService } from './early-access.service';
import { CreateEarlyAccessDto } from './dto/create-early-access.dto';

@Controller('early-access')
export class EarlyAccessController {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @Post('signup')
  async create(@Body() createEarlyAccessDto: CreateEarlyAccessDto) {
    return this.earlyAccessService.create(createEarlyAccessDto);
  }

  @Get('signups')
  async findAll(@Query('category') category?: string) {
    return this.earlyAccessService.findAll(category);
  }

  @Get('stats')
  async getStats() {
    return this.earlyAccessService.getStats();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="early-access-signups.csv"')
  async exportToCSV() {
    return this.earlyAccessService.exportToCSV();
  }
}

