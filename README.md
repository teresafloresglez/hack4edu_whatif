# WHAT IF? 🤔

App de minijuegos para niños de **6 a 10 años** que descubre **cómo piensa** cada niño, no cuánto sabe.
Pensada para países con pocos recursos: **funciona sin conexión**, es ligera, no necesita saber leer
(todos los botones tienen **dibujos** y todo se lee en **voz alta**), está en **español, inglés y francés**
y guarda los datos solo en el dispositivo.

```
Juego → huellas → evaluación → perfil → siguiente juego adaptado
```

## Cómo usarla

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run qa
```

`npm run qa` hace la comprobación de tipos, ejecuta las pruebas y compila. La versión para repartir queda en `dist/`:
es una web estática que se puede copiar a cualquier servidor, o servir desde un portátil en la red local de la escuela.
Tras abrirla **una vez** con conexión, el *service worker* la guarda y funciona offline; en Android/iOS se puede
"Añadir a pantalla de inicio" y se abre como una app.

- **Idioma:** banderas en la pantalla de inicio (o *Ajustes* del docente). Cambia pantallas, juegos, informe y voz.
- **Niños:** ➕ → animal → edad → **continente** (África, América, Asia, Europa, Oceanía) → nombre; luego "Empezar un proyecto" → eligen tema → juegan las fases.
- **Docente:** botón 👩‍🏫 de la pantalla de inicio, **PIN 1234** (cámbielo en *Ajustes*). Ahí está el informe de cada alumno
  (imprimible, y desde él se puede borrar al alumno), el resumen de clase, el modo clase, la región cultural, la voz y las copias de seguridad.

## Del documento del proyecto al código

| Documento | Implementación |
|---|---|
| 4 tipos de respuesta (cerrada, abierta, decisión, proceso) | `GameDef.kind`; cada juego devuelve un `GameOutcome` con sus huellas (`src/core/types.ts`) |
| Huellas = contrato entre juegos y motor | `Observation { dim, value 0..1, weight }` + métricas y etiquetas; solo `applyOutcome` toca el perfil |
| Fluidez, flexibilidad, originalidad (Torrance) | `src/games/ideas.ts`, `src/games/garabato.ts` |
| Originalidad comparada con niños de **su región** | frecuencias previas por región + niños reales del dispositivo (`ideaFrequency`) |
| Predicción antes / comparación después (calibración) | pantalla de predicción en `src/ui/app.ts`; `metacognicion` en `evaluation.ts` |
| La naranja (competir/ceder/compromiso/evitar/integrar + preguntas antes de decidir) | `src/games/naranja.ts` |
| El reparto (justicia, reciprocidad tras trampa, anticipar al otro) | `src/games/reparto.ts` |
| El camino (tiempo antes de mover, eficiencia, reacción al error, pistas; flechas del teclado; llave que recoger en el último mapa de los niveles 4–5) | `src/games/camino.ts` |
| Regla de oro: el niño solo ve estrellas (participar, intentarlo, mejorar su marca) | `computeStars` en `evaluation.ts` |
| Superpoderes: los puntos fuertes (70 o más con 2 partidas) se le muestran al niño como superpoderes, sin cifras, y se conservan una vez ganados | `src/core/superpowers.ts`, `src/contenido/superpoderes.json`, botón ⚡ junto a las estrellas |
| Informe docente: una columna, criterio bajo cada bloque y el marco que lo respalda con los datos del niño | `src/ui/informe.ts`, `src/contenido/informe.json` |
| Nunca concluir con una partida | `MIN_EVIDENCE = 2` en `report.ts`; las partidas abandonadas pesan la mitad |
| ABP: 5 fases, tema elegido por el niño, producto final, reflexión | `src/core/project.ts`, `src/games/reflexion.ts`, `src/data/themes.ts` |
| Avanzar depende de participar, no de acertar | `runGame` en `src/ui/session.ts` |
| Niveles: 2 logros suben, 1 fallo baja; en juegos abiertos "logro" = mejorar su marca | `updateLevel` en `adaptation.ts` |
| Tres ejes: estilo por edad, cultura por región, dificultad por nivel | clase `young` (6–7: voz, dibujos grandes y texto), `src/data/cultures.ts`, `entryLevel` |
| "IA" sencilla que elige el siguiente juego | `scoreCandidates`/`planPhase`: necesidad + incertidumbre + fortaleza + variedad; repetición si hay un área débil |
| Modo clase | *Ajustes → Modo clase*: el docente fija el tema común |
| Idiomas (es / en / fr) | `src/i18n/` (`t()`, `tr()`); contenidos como `{ es, en, fr }` |
| Dibujos en los botones | `src/ui/icons.ts` (SVG en línea, sin archivos) |
| ✓ / ✗ con lectura en voz alta | `confirmChoice` en `src/games/common.ts` (Mil usos y "¿Qué harías distinto?") |
| Respuestas sin sentido en Mil usos | `nonsense: true` en `src/data/ideas.ts`; no cuentan como ideas y generan una señal en el informe |

### Dimensiones del perfil (internas)

Atención · Memoria · Lógica · Planificación · Fluidez · Flexibilidad · Originalidad · Elaboración ·
Justicia · Perspectiva del otro · Repertorio ante conflictos · Autorregulación · Autoconocimiento.

### Señales para observar (no diagnósticos)

El informe puede sugerir **observar** en el aula: confusión de colores parecidos (con formas bien reconocidas),
respuestas muy rápidas con errores, ritmo lento, dificultad para procesar/recordar lo visual en varios juegos,
dificultad generalizada, dificultad para ponerse en el lugar del otro, abandonos frecuentes y selección
indiscriminada o aceptar usos sin sentido en Mil usos. Siempre con lenguaje de observación y la recomendación de contrastarlo; nunca etiquetas clínicas.

## Estructura

```
src/
  core/      tipos, evaluación, adaptación, proyecto, informe, almacenamiento, voz
  data/      culturas (regiones), temas, banco de tarjetas de ideas
  games/     un archivo por minijuego + registry.ts
  ui/        app.ts (niño), teacher.ts (docente), session.ts (orquesta una partida)
tests/       Vitest + happy-dom; bot.ts juega tocando al azar en todos los niveles
```

## Limitaciones conocidas

- La voz usa las voces instaladas en el dispositivo; si no hay voz en español, los textos se muestran siempre.
- Las ideas grabadas por voz (en "¿Qué pasaría si…?" y al decir qué es el garabato) aparecen en el informe del docente para escucharlas, pero no se transcriben (no hay
  reconocimiento de voz offline fiable en móviles básicos); cuentan para fluidez y con una originalidad estimada.
- La voz en inglés o francés necesita que el dispositivo tenga instalada una voz de ese idioma; los textos se muestran siempre.
- Los datos viven en el dispositivo: use *Exportar copia de seguridad* para moverlos o guardarlos.
