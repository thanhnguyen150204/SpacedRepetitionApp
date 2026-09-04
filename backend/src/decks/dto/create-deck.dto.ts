import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateDeckDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
