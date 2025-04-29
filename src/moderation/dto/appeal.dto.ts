import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateAppealDto {
  @IsNotEmpty()
  @IsUUID()
  penaltyId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ReviewAppealDto {
  @IsNotEmpty()
  @IsString()
  status: 'approved' | 'rejected';

  @IsNotEmpty()
  @IsString()
  moderatorResponse: string;
}