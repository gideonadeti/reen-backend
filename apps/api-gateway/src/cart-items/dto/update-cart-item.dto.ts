import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCartItemDto {
  /**
   * Product's quantity
   * @example 10
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
