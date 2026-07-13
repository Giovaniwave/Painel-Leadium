# Variantes preservadas

`PerformanceIris.tsx` contém a versão aprovada do indicador **Faturamento vs Meta** com 24 lâminas facetadas, órbita e percentual central. Os estilos `.goal-iris*` permanecem em `src/index.css`.

Para restaurar, importe o componente no `DashboardView` e use:

```tsx
<PerformanceIris percentage={percentageRevenueReached} theme={theme} />
```
