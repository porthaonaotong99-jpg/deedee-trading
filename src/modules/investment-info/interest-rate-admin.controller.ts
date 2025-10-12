import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { DatabaseInterestRateService } from './database-interest-rate.service';
import {
  RiskTolerance,
  InterestTierName,
} from './entities/interest-rate-configuration.entity';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { handleSuccessOne } from '../../common/utils/response.util';

// DTOs for API
export class CreateInterestConfigApiDto {
  tier_name: InterestTierName;
  min_amount: number;
  max_amount?: number;
  risk_tolerance: RiskTolerance;
  base_interest_rate: number;
  risk_adjustment?: number;
  description?: string;
  conditions?: string;
}

export class UpdateInterestConfigApiDto {
  base_interest_rate?: number;
  risk_adjustment?: number;
  description?: string;
  conditions?: string;
  is_active?: boolean;
}

export class AdminCalculateRateDto {
  amount: number;
  risk_tolerance: RiskTolerance;
}

@ApiTags('interest-rate-admin')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@Controller('admin/interest-rates')
export class InterestRateAdminController {
  constructor(
    private readonly interestRateService: DatabaseInterestRateService,
  ) {}

  @Get('configurations')
  @ApiOperation({ summary: 'Get all interest rate configurations (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Interest rate configurations retrieved',
  })
  async getAllConfigurations(@AuthUser() user: JwtPayload) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view configurations');
    }
    const configs = await this.interestRateService.getAllActiveConfigurations();
    return handleSuccessOne({
      data: { items: configs, total: configs.length },
      message: 'Interest rate configurations retrieved successfully',
    });
  }

  @Get('configurations/risk-tolerance/:riskTolerance')
  @ApiOperation({ summary: 'Get configurations by risk tolerance (Admin)' })
  async getConfigurationsByRiskTolerance(
    @AuthUser() user: JwtPayload,
    @Param('riskTolerance') riskTolerance: RiskTolerance,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view configurations');
    }
    const configs =
      await this.interestRateService.getConfigurationsByRiskTolerance(
        riskTolerance,
      );
    return handleSuccessOne({
      data: {
        items: configs,
        risk_tolerance: riskTolerance,
        total: configs.length,
      },
      message: `Configurations for ${riskTolerance} risk tolerance retrieved successfully`,
    });
  }

  @Post('configurations')
  @ApiOperation({ summary: 'Create new interest rate configuration (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Interest rate configuration created',
  })
  async createConfiguration(
    @Body(ValidationPipe) dto: CreateInterestConfigApiDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can create configurations');
    }
    const config = await this.interestRateService.createConfiguration({
      ...dto,
      created_by: user.sub,
    });
    return handleSuccessOne({
      data: {
        ...config,
        formatted_description: config.formatted_description,
      },
      message: 'Interest rate configuration created successfully',
    });
  }

  @Put('configurations/:id')
  @ApiOperation({ summary: 'Update interest rate configuration (Admin)' })
  async updateConfiguration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateInterestConfigApiDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can update configurations');
    }
    const config = await this.interestRateService.updateConfiguration(id, {
      ...dto,
      updated_by: user.sub,
    });
    return handleSuccessOne({
      data: {
        ...config,
        formatted_description: config.formatted_description,
      },
      message: 'Interest rate configuration updated successfully',
    });
  }

  @Delete('configurations/:id')
  @ApiOperation({ summary: 'Deactivate interest rate configuration (Admin)' })
  async deactivateConfiguration(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can deactivate configurations');
    }
    await this.interestRateService.deactivateConfiguration(id);
    return handleSuccessOne({
      data: { id, is_active: false },
      message: 'Interest rate configuration deactivated successfully',
    });
  }

  @Get('configurations/:id')
  @ApiOperation({ summary: 'Get interest rate configuration by ID (Admin)' })
  async getConfigurationById(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view configurations');
    }
    const config = await this.interestRateService.getConfigurationById(id);
    if (!config) {
      throw new NotFoundException('Interest rate configuration not found');
    }
    return handleSuccessOne({
      data: {
        ...config,
        formatted_description: config.formatted_description,
      },
      message: 'Interest rate configuration retrieved successfully',
    });
  }

  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate interest rate for amount and risk tolerance (Admin)',
  })
  async calculateInterestRate(
    @Body(ValidationPipe) dto: AdminCalculateRateDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can calculate rate');
    }
    const result = await this.interestRateService.calculateInterestRate(
      dto.amount,
      dto.risk_tolerance,
    );

    if (!result) {
      return handleSuccessOne({
        data: {
          amount: dto.amount,
          risk_tolerance: dto.risk_tolerance,
          result: null,
        },
        message: 'No matching interest rate configuration found',
      });
    }
    return handleSuccessOne({
      data: {
        amount: dto.amount,
        risk_tolerance: dto.risk_tolerance,
        result,
        formatted_rate: `${(result.final_rate * 100).toFixed(2)}%`,
        breakdown: {
          base_rate: `${(result.base_rate * 100).toFixed(2)}%`,
          risk_adjustment: `${(result.risk_adjustment * 100).toFixed(2)}%`,
          final_rate: `${(result.final_rate * 100).toFixed(2)}%`,
        },
      },
      message: 'Interest rate calculated successfully',
    });
  }

  @Post('seed-defaults')
  @ApiOperation({
    summary: 'Seed default interest rate configurations (Admin)',
  })
  async seedDefaultConfigurations(@AuthUser() user: JwtPayload) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can seed configurations');
    }
    await this.interestRateService.seedDefaultConfigurations();
    return handleSuccessOne({
      data: { seeded: true },
      message: 'Default interest rate configurations seeded successfully',
    });
  }

  @Get('enums')
  @ApiOperation({
    summary: 'Get available enums for tier names and risk tolerance (Admin)',
  })
  getAvailableEnums(@AuthUser() user: JwtPayload) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admins can view enums');
    }
    return handleSuccessOne({
      data: {
        tier_names: Object.values(InterestTierName),
        risk_tolerance_levels: Object.values(RiskTolerance),
      },
      message: 'Available enums retrieved successfully',
    });
  }
}
