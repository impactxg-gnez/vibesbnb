import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserCategory {
  HOST = 'host',
  TRAVELLER = 'traveller',
  SERVICE_HOST = 'service_host',
  DISPENSARY = 'dispensary',
}

export class LocationDataDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  manualEntry?: boolean;
}

export class AirbnbDataDto {
  @IsOptional()
  @IsString()
  listingUrl?: string;

  @IsOptional()
  @IsString()
  propertyName?: string;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  guests?: number;
}

export class ServiceHostDataDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pincodes?: string[];
}

export class CreateEarlyAccessDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsEnum(UserCategory)
  category: UserCategory;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDataDto)
  location?: LocationDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceHostDataDto)
  serviceHostData?: ServiceHostDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AirbnbDataDto)
  airbnbData?: AirbnbDataDto;
}

