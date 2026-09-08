"use client";

import { AlertCircle, Package } from "lucide-react";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryDetailHeader } from "./inventory-detail-header";
import { InventoryDetailSkeleton } from "./inventory-detail-skeleton";
import { useInventoryData } from "@/features/inventory-executive/hooks/use-inventory-data";

export function InventoryDetailPage() {
  const { inventory, status } = useInventoryData();

  if (status === "loading") {
    return (
      <ContentContainer>
        <InventoryDetailSkeleton />
      </ContentContainer>
    );
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados de estoque</p>
        </div>
      </ContentContainer>
    );
  }

  if (!inventory) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum dado de estoque encontrado</p>
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <InventoryDetailHeader inventory={inventory} />

        <section aria-label="Indicadores de estoque">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Estoque Total</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedItemsInStock}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Sem Estoque</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedItemsWithoutTurnover}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Itens Críticos</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedCriticalItems}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Capital Imobilizado</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedImmobilizedCapital}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-label="Produtos que precisam de atenção">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Atenção
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Produto</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Estoque</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.itemsWithoutTurnover > 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          {inventory.formattedItemsWithoutTurnover} produto(s) sem giro detectados
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          <Package className="size-4 mx-auto mb-2 text-muted-foreground" />
                          Nenhum produto com problema de estoque
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t border-border/50 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span>Última atualização: {new Date(inventory.lastUpdate).toLocaleString("pt-BR")}</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  );
}
