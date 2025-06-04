import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  /**
   * Product's quantity
   * @example 10
   */
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantity: number;
}
