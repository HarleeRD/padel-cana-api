import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsBoolean()
  @IsOptional()
  isResort?: boolean;
}
