import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCartItemDto {
  /**
   * Product's ID
   * @example 'cmbfmzoqz0000ja2m4ky8w3aa'
   */
  @IsNotEmpty()
  @IsString()
  productId: string;

  /**
   * Product's quantity
   * @example 10
   */
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantity: number;
}
