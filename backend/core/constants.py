from enum import Enum


class Environment(str, Enum):
    DEV = "dev"
    HOMOLOG = "homolog"
    PROD = "prod"


class Marketplace(str, Enum):
    BLING = "bling"
    MERCADO_LIVRE = "mercadolivre"
    SHOPEE = "shopee"
    AMAZON = "amazon"
    MAGALU = "magalu"
    TIKTOK = "tiktok"


DEFAULT_ENCODING = "utf-8"
MAX_RETRY_COUNT = 3
DEFAULT_TIMEOUT_SECONDS = 30
CACHE_TTL_DEFAULT = 300
CACHE_TTL_FEATURE_FLAG = 60
