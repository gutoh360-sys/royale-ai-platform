export interface SKUNormalizer {
  normalize(sku: string): Promise<string>;
  validate(sku: string): Promise<boolean>;
}

export interface ProductNameNormalizer {
  normalize(name: string): Promise<string>;
}

export interface CategoryNormalizer {
  normalize(category: string): Promise<string>;
  mapExternal(external: string): Promise<string>;
}

export interface BrandNormalizer {
  normalize(brand: string): Promise<string>;
}

export interface MarketplaceNormalizer {
  normalize(marketplace: string): Promise<string>;
  identify(raw: string): Promise<string>;
}
