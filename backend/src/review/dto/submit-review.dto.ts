import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class SubmitReviewDto {
  @IsString()
  cardId: string;

  @IsInt()
  @Min(0)
  @Max(5)
  quality: number;

  @IsOptional()
  @IsInt()
  responseTimeMs?: number;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
