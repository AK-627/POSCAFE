import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued during login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
