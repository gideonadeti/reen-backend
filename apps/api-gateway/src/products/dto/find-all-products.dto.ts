import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class FindAllProductsDto {
  /** Optional search term (partial match on product name)
   * @example 'shoe'
   */
  @IsOptional()
  @IsString()
  name?: string;

  /** Minimum price filter
   * @example 9.99
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  /** Maximum price filter
   * @example 99.99
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  /** Minimum quantity filter
   * @example 2
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  /** Maximum quantity filter
   * @example 10
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  /** Sort by this field */
  @IsOptional()
  @IsIn(['name', 'price', 'quantity', 'createdAt', 'updatedAt'])
  sortBy?: 'name' | 'price' | 'quantity' | 'createdAt' | 'updatedAt';

  /** Sort order: ascending or descending */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  /** Results per page */
  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number;

  /** Page number */
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number;
}
