# shadcn/ui en Oracular V2

## Objetivo

Oracular V2 usa shadcn/ui de forma incremental para compartir primitivas accesibles sin reemplazar la UI existente. Los componentes viven en el repositorio: se pueden inspeccionar, adaptar y versionar junto con la aplicación.

La integración conserva deliberadamente:

- La identidad visual gris tipo glass, sus transparencias y blur.
- Las clases `oracular-*`, que siguen siendo la capa visual específica del producto.
- La jerarquía, posición y comportamiento de paneles, mapa y loader.
- Tailwind CSS 3 por compatibilidad con el proyecto actual. Una migración futura a Tailwind 4 debe tratarse como un cambio separado.

## Configuración

| Archivo | Responsabilidad |
| --- | --- |
| `components.json` | Configura el estilo `new-york`, TypeScript, variables CSS, aliases y Lucide. |
| `src/lib/utils.ts` | Expone `cn()`, que combina clases condicionales y resuelve conflictos de Tailwind. |
| `src/components/UI/button.tsx` | Primitiva `Button`, variantes y tamaños. |
| `src/components/UI/card.tsx` | Primitivas `Card`, `CardHeader` y `CardContent`. |
| `src/index.css` | Tokens semánticos neutrales compatibles con shadcn/ui. |
| `tailwind.config.js` | Mapea los tokens CSS al tema de Tailwind. |
| `vite.config.ts` y `tsconfig*.json` | Definen el alias `@` hacia `src`. |

El alias de UI apunta a `@/components/UI` —con `UI` en mayúscula— porque esa carpeta ya contenía el loader del producto. Esto evita una migración de rutas sensible a mayúsculas/minúsculas.

## Uso

Se puede añadir shadcn a un control sin alterar su apariencia. Las clases de Oracular V2 se pasan al componente y tienen prioridad sobre la variante base:

```tsx
import { Button } from '@/components/UI/button';

<Button
  type="button"
  variant="ghost"
  className="oracular-icon-button"
  aria-label="Search"
>
  <Search />
</Button>
```

Para superficies flotantes:

```tsx
import { Card } from '@/components/UI/card';

<Card className="oracular-popover" role="dialog">
  {/* contenido existente */}
</Card>
```

Actualmente `Button` se usa en las acciones principales de la cabecera y `Card` en los popovers de fechas, sensores y búsqueda. El resto se puede migrar gradualmente cuando exista una razón funcional o de reutilización.

## Añadir componentes

Desde la raíz del proyecto:

```bash
npx shadcn@latest add dialog
```

La CLI usa `components.json` y escribe los componentes bajo `src/components/UI`. Cada componente generado debe revisarse antes de integrarlo: dependencias nuevas, tokens CSS, accesibilidad y posibles estilos que entren en conflicto con `oracular-*`.

## Reglas de integración

1. Mantener las clases `oracular-*` cuando se migre un elemento ya existente.
2. Preferir tokens neutrales y variantes `ghost`, `outline` o `secondary`; no introducir color de marca en hover dentro de los paneles.
3. No acoplar estados de Leaflet, consultas Copernicus ni lógica de análisis a una primitiva visual.
4. No modificar `ParameterLoader` al agregar componentes shadcn/ui.
5. Verificar teclado, foco visible, estados `disabled`, móvil y ausencia de solapamientos.
6. Ejecutar `npm run check` después de agregar o actualizar un componente.

## Referencias oficiales

- [Instalación con Vite](https://ui.shadcn.com/docs/installation/vite)
- [Configuración de `components.json`](https://ui.shadcn.com/docs/components-json)
- [CLI](https://ui.shadcn.com/docs/cli)
- [Button](https://ui.shadcn.com/docs/components/base/button)
