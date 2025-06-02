import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
  /**
   * Product's name
   * @example 'Laptop'
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Product's price
   * @example 99.99
   */
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  /**
   * Product's quantity
   * @example 10
   */
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  quantity: number;
}
