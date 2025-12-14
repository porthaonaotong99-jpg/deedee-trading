import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { SystemSettings } from './entities/system-settings.entity';
import {
  UpdateNotificationSettingsDto,
  CreateSystemSettingDto,
  UpdateSystemSettingDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(SystemSettings)
    private readonly systemSettingsRepository: Repository<SystemSettings>,
  ) {}

  // ============================================================================
  // User Notification Settings
  // ============================================================================

  async getUserSettings(userId: string): Promise<UserSettings> {
    let settings = await this.userSettingsRepository.findOne({
      where: { user_id: userId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = this.userSettingsRepository.create({
        user_id: userId,
        notify_new_customers: true,
        notify_payments: true,
        notify_investments: true,
        notify_stock_activity: true,
        notify_system_alerts: true,
        notify_email: false,
      });
      await this.userSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateUserSettings(
    userId: string,
    updateDto: UpdateNotificationSettingsDto,
  ): Promise<UserSettings> {
    let settings = await this.userSettingsRepository.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      // Create with provided values
      settings = this.userSettingsRepository.create({
        user_id: userId,
        ...updateDto,
      });
    } else {
      // Update existing
      Object.assign(settings, updateDto);
    }

    return this.userSettingsRepository.save(settings);
  }

  // ============================================================================
  // System Settings
  // ============================================================================

  async getAllSystemSettings(): Promise<SystemSettings[]> {
    return this.systemSettingsRepository.find({
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  async getSystemSettingsByCategory(
    category: string,
  ): Promise<SystemSettings[]> {
    return this.systemSettingsRepository.find({
      where: { category },
      order: { key: 'ASC' },
    });
  }

  async getSystemSetting(key: string): Promise<SystemSettings | null> {
    return this.systemSettingsRepository.findOne({
      where: { key },
    });
  }

  async getSystemSettingValue(
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    const setting = await this.getSystemSetting(key);
    return setting?.value ?? defaultValue ?? null;
  }

  async setSystemSetting(
    key: string,
    value: string,
    options?: {
      type?: 'string' | 'number' | 'boolean' | 'json';
      category?: string;
      description?: string;
      is_public?: boolean;
    },
  ): Promise<SystemSettings> {
    let setting = await this.getSystemSetting(key);

    if (!setting) {
      setting = this.systemSettingsRepository.create({
        key,
        value,
        type: options?.type || 'string',
        category: options?.category,
        description: options?.description,
        is_public: options?.is_public ?? false,
      });
    } else {
      setting.value = value;
      if (options?.type) setting.type = options.type;
      if (options?.category !== undefined) setting.category = options.category;
      if (options?.description !== undefined)
        setting.description = options.description;
      if (options?.is_public !== undefined)
        setting.is_public = options.is_public;
    }

    return this.systemSettingsRepository.save(setting);
  }

  async createSystemSetting(
    dto: CreateSystemSettingDto,
  ): Promise<SystemSettings> {
    const existing = await this.getSystemSetting(dto.key);
    if (existing) {
      throw new Error(`Setting with key "${dto.key}" already exists`);
    }

    const setting = this.systemSettingsRepository.create({
      key: dto.key,
      value: dto.value,
      type: dto.type || 'string',
      category: dto.category,
      description: dto.description,
      is_public: dto.is_public ?? false,
    });

    return this.systemSettingsRepository.save(setting);
  }

  async updateSystemSetting(
    key: string,
    dto: UpdateSystemSettingDto,
  ): Promise<SystemSettings> {
    const setting = await this.getSystemSetting(key);
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    setting.value = dto.value;
    return this.systemSettingsRepository.save(setting);
  }

  async deleteSystemSetting(key: string): Promise<void> {
    const setting = await this.getSystemSetting(key);
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    await this.systemSettingsRepository.remove(setting);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  async isMaintenanceMode(): Promise<boolean> {
    const value = await this.getSystemSettingValue('maintenance_mode', 'false');
    return value === 'true';
  }

  async setMaintenanceMode(enabled: boolean): Promise<SystemSettings> {
    return this.setSystemSetting('maintenance_mode', String(enabled), {
      type: 'boolean',
      category: 'system',
      description: 'Enable/disable maintenance mode',
    });
  }

  // Initialize default system settings
  async initializeDefaults(): Promise<void> {
    const defaults: CreateSystemSettingDto[] = [
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        category: 'system',
        description: 'Enable/disable maintenance mode',
        is_public: true,
      },
      {
        key: 'backup_frequency',
        value: 'daily',
        type: 'string',
        category: 'system',
        description: 'Auto backup frequency: daily, weekly, monthly',
      },
      {
        key: 'api_rate_limit',
        value: '100',
        type: 'number',
        category: 'api',
        description: 'API rate limit per minute',
      },
    ];

    for (const setting of defaults) {
      const existing = await this.getSystemSetting(setting.key);
      if (!existing) {
        await this.createSystemSetting(setting);
      }
    }
  }
}
