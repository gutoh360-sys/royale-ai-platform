import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

interface ProductsInsightInput {
  products: {
    name: string
    revenue: number
    formattedRevenue: string
    margin: number
    formattedMargin: string
    growth: number
    share: number
    formattedShare: string
  }[]
  categories: {
    name: string
    formattedRevenue: string
    growth: number
  }[]
  totalRevenue: string
  topSkuName: string
  topSkuRevenue: string
}

export function buildProductsInsights(input: ProductsInsightInput): InsightData[] {
  const insights: InsightData[] = []

  const sortedByRevenue = [...input.products].sort((a, b) => b.revenue - a.revenue)
  const top3 = sortedByRevenue.slice(0, 3)
  const top3Share = top3.reduce((s, p) => s + p.share, 0)

  insights.push({
    fact: `${top3[0].name} lidera a receita com ${top3[0].formattedRevenue}, seguido por ${top3[1].name} (${top3[1].formattedRevenue}) e ${top3[2].name} (${top3[2].formattedRevenue}).`,
    reason: `Os três produtos concentram ${top3Share.toFixed(1)}% da receita total de ${input.totalRevenue}, evidenciando a dependência do portfólio em poucos itens.`,
    impact: "A alta concentração eleva o risco: qualquer oscilação nesses produtos afeta diretamente o resultado consolidado.",
    action: "Diversificar o portfólio com novos produtos de alto potencial para reduzir a dependência dos líderes atuais.",
  })

  const sortedByMargin = [...input.products].sort((a, b) => b.margin - a.margin)
  const topMargin = sortedByMargin.slice(0, 2)
  const bottomMargin = sortedByMargin.slice(-2)

  insights.push({
    fact: `${topMargin[0].name} possui a maior margem (${topMargin[0].formattedMargin}), enquanto ${bottomMargin[1].name} apresenta a menor margem do portfólio (${bottomMargin[1].formattedMargin}).`,
    reason: topMargin[0].margin > 50
      ? `Produtos com margem superior a 50% indicam diferenciação competitiva e baixa sensibilidade a preço.`
      : `A margem média do portfólio reflete o posicionamento de mercado atual.`,
    impact: bottomMargin[0].margin < 30
      ? "Produtos com margem reduzida comprimem a rentabilidade geral e podem exigir subsídio cruzado."
      : "A margem do portfólio está equilibrada, sem pressão significativa sobre a rentabilidade.",
    action: bottomMargin[0].margin < 30
      ? "Revisar precificação e custos dos produtos de menor margem para proteger a rentabilidade do portfólio."
      : "Manter a estratégia de precificação atual e monitorar tendências de mercado.",
  })

  const growingCategories = input.categories.filter((c) => c.growth > 0).sort((a, b) => b.growth - a.growth)
  const decliningCategories = input.categories.filter((c) => c.growth <= 0)

  if (growingCategories.length > 0) {
    const topCat = growingCategories[0]
    insights.push({
      fact: `${topCat.name} lidera o crescimento entre as categorias com ${topCat.growth}% de evolução.`,
      reason: growingCategories.length > 1
        ? `${growingCategories.length} de ${input.categories.length} categorias apresentaram crescimento positivo no período, indicando saúde geral do portfólio.`
        : `Apenas ${topCat.name} apresentou crescimento positivo, enquanto as demais categorias estabilizaram ou recuaram.`,
      impact: topCat.growth > 20
        ? "Crescimento acelerado requer atenção à reposição de estoque e capacidade de atendimento."
        : "Crescimento moderado permite planejamento ordenado de reposição e investimento.",
      action: "Ampliar o sortimento na categoria de maior crescimento e avaliar oportunidades nas categorias emergentes.",
    })
  }

  if (decliningCategories.length > 0) {
    const worstCat = decliningCategories.sort((a, b) => a.growth - b.growth)[0]
    insights.push({
      fact: `${worstCat.name} apresentou a menor evolução entre as categorias (${worstCat.growth}%).`,
      reason: `O desempenho abaixo da média pode refletir mudanças na demanda, sazonalidade ou pressão competitiva.`,
      impact: decliningCategories.length > 1
        ? `${decliningCategories.length} categorias em declínio podem comprometer o resultado consolidado se a tendência se manter.`
        : "O impacto é pontual e não representa risco sistêmico para o portfólio.",
      action: "Investigar causas do declínio na categoria e avaliar ajustes de precificação, sortimento ou promoção.",
    })
  }

  return insights
}

export function buildProductsRecommendations(input: ProductsInsightInput): RecommendationData[] {
  const recs: RecommendationData[] = []

  const sortedByRevenue = [...input.products].sort((a, b) => b.revenue - a.revenue)
  const top3 = sortedByRevenue.slice(0, 3)
  const top3Share = top3.reduce((s, p) => s + p.share, 0)

  if (top3Share > 35) {
    recs.push({
      action: "Reduzir concentração no portfólio",
      reason: `Os três principais produtos representam ${top3Share.toFixed(1)}% da receita. Avaliar lançamentos e parcerias para diversificar fontes de receita.`,
    })
  }

  const lowMarginProducts = input.products.filter((p) => p.margin < 30)
  if (lowMarginProducts.length > 0) {
    recs.push({
      action: "Revisar margens dos produtos críticos",
      reason: `${lowMarginProducts.length} produto${lowMarginProducts.length > 1 ? "s" : ""} com margem inferior a 30%. Analisar custos e precificação para evitar erosão da rentabilidade.`,
    })
  }

  const decliningProducts = input.products.filter((p) => p.growth < -5)
  if (decliningProducts.length > 0) {
    recs.push({
      action: "Avaliar produtos em declínio",
      reason: `${decliningProducts.length} produto${decliningProducts.length > 1 ? "s" : ""} com crescimento negativo superior a 5%. Identificar causas e decidir entre revitalização ou descontinuação.`,
    })
  }

  const growingCategories = input.categories.filter((c) => c.growth > 15)
  if (growingCategories.length > 0) {
    recs.push({
      action: "Investir nas categorias de alto crescimento",
      reason: `${growingCategories.length} categoria${growingCategories.length > 1 ? "s" : ""} com crescimento superior a 15%. Ampliar sortimento e reforçar estoque para capturar demanda.`,
    })
  }

  const highMarginProducts = input.products.filter((p) => p.margin > 50)
  if (highMarginProducts.length > 0) {
    recs.push({
      action: "Impulsionar produtos de alta margem",
      reason: `${highMarginProducts.length} produto${highMarginProducts.length > 1 ? "s" : ""} com margem superior a 50% têm potencial para aumentar a rentabilidade com investimento em marketing e visibilidade.`,
    })
  }

  if (recs.length === 0) {
    recs.push({
      action: "Manter estratégia de portfólio",
      reason: "Indicadores dentro da normalidade. Continuar monitoramento semanal do desempenho dos produtos e categorias.",
    })
  }

  return recs
}
