export interface PlotThreadItem {
  id: string;
  lineNumber: number;
  text: string;
  completed: boolean;
  category?: 'main' | 'quest' | 'npc' | 'secret' | 'loot' | 'general';
  tag?: string;
}

export interface PlotThreadsStats {
  total: number;
  completed: number;
  pending: number;
  percent: number;
}

/**
 * Extracts plot threads (checklists) and categorized objectives from DM markdown notes.
 * Matches patterns like:
 * - [ ] Search the dungeon
 * - [x] Defeat the goblin scout
 * - [ ] [PISTA] The strange altar in the crypt
 */
export function parsePlotThreads(markdown: string): PlotThreadItem[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const items: PlotThreadItem[] = [];

  const taskRegex = /^\s*[-*]\s*\[([ xX])\]\s*(.*)$/;
  const tagRegex = /\[(PELIGRO|PISTA|NPC|MISTERIO|BOTÍN|SECRETO|LORE|COMBATE)\]/i;

  let currentSection = 'general';

  lines.forEach((line, index) => {
    // Check for section headers that might categorize threads
    const headerMatch = line.match(/^#{1,4}\s*(.*)$/);
    if (headerMatch) {
      const headerText = headerMatch[1].toLowerCase();
      if (headerText.includes('principal') || headerText.includes('misión principal')) {
        currentSection = 'main';
      } else if (headerText.includes('secundari') || headerText.includes('misión')) {
        currentSection = 'quest';
      } else if (headerText.includes('npc') || headerText.includes('personaje')) {
        currentSection = 'npc';
      } else if (headerText.includes('pista') || headerText.includes('secreto') || headerText.includes('misterio')) {
        currentSection = 'secret';
      } else if (headerText.includes('botín') || headerText.includes('recompensa') || headerText.includes('tesoro')) {
        currentSection = 'loot';
      } else {
        currentSection = 'general';
      }
      return;
    }

    const match = line.match(taskRegex);
    if (match) {
      const isCompleted = match[1].toLowerCase() === 'x';
      const text = match[2].trim();

      // Check if line has an inline tag
      const tagMatch = text.match(tagRegex);
      const tag = tagMatch ? tagMatch[1].toUpperCase() : undefined;

      let category: PlotThreadItem['category'] = currentSection as PlotThreadItem['category'];
      if (tag === 'PELIGRO' || tag === 'COMBATE') category = 'quest';
      else if (tag === 'PISTA' || tag === 'SECRETO' || tag === 'MISTERIO') category = 'secret';
      else if (tag === 'NPC') category = 'npc';
      else if (tag === 'BOTÍN') category = 'loot';

      items.push({
        id: `thread-${index}`,
        lineNumber: index,
        text,
        completed: isCompleted,
        category,
        tag,
      });
    }
  });

  return items;
}

/**
 * Toggles the completion checkbox of a plot thread at the specified lineNumber.
 */
export function togglePlotThreadAtLine(markdown: string, lineNumber: number): string {
  const lines = markdown.split('\n');
  if (lineNumber < 0 || lineNumber >= lines.length) return markdown;

  const targetLine = lines[lineNumber];
  const uncheckedRegex = /^(\s*[-*]\s*\[) (\].*)$/;
  const checkedRegex = /^(\s*[-*]\s*\[)[xX](\].*)$/;

  if (uncheckedRegex.test(targetLine)) {
    lines[lineNumber] = targetLine.replace(uncheckedRegex, '$1x$2');
  } else if (checkedRegex.test(targetLine)) {
    lines[lineNumber] = targetLine.replace(checkedRegex, '$1 $2');
  }

  return lines.join('\n');
}

/**
 * Appends a new plot thread to the markdown notes.
 */
export function addPlotThreadToMarkdown(
  markdown: string,
  threadTitle: string,
  tag?: string
): string {
  const cleanTitle = threadTitle.trim();
  if (!cleanTitle) return markdown;

  const tagPrefix = tag ? `[${tag}] ` : '';
  const newThreadLine = `- [ ] ${tagPrefix}${cleanTitle}`;

  if (!markdown.trim()) {
    return `### 🎯 Hilos Argumentales\n${newThreadLine}\n`;
  }

  // Look for an existing "Hilos" or "Objetivos" section
  const lines = markdown.split('\n');
  let targetIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s*.*(hilos|objetivos|tramas|misiones)/i.test(lines[i])) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex !== -1) {
    // Insert right after the header or at the end of that section
    let insertAt = targetIndex + 1;
    while (insertAt < lines.length && (lines[insertAt].startsWith('-') || lines[insertAt].trim() === '')) {
      insertAt++;
    }
    lines.splice(insertAt, 0, newThreadLine);
    return lines.join('\n');
  }

  // Otherwise, append to bottom
  return `${markdown.trimEnd()}\n\n${newThreadLine}\n`;
}

/**
 * Computes statistics on plot threads (total, completed, pending, percentage)
 */
export function getPlotThreadsStats(threads: PlotThreadItem[]): PlotThreadsStats {
  const total = threads.length;
  const completed = threads.filter((t) => t.completed).length;
  const pending = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, pending, percent };
}

/**
 * Default rich text template for new encounters
 */
export const DEFAULT_DM_NOTES_TEMPLATE = `# 📜 Cuaderno del DM: Hilos Argumentales & Secretos

### 🎯 Trama Principal: El Ojo de Fabul
- [ ] Recuperar el orbe estelar en el altar del cráter sagrado.
- [x] Cruzar el sendero silvano y sortear la emboscada goblin.
- [ ] Impedir que Malakor canalice el ritual durante la luna de sangre.

### ⚔️ Estrategia del Encuentro Táctico
- **Jefe:** Behemoth alfa ancestral (Resiste daño cortante y contundente).
- **Táctica:** Al 50% HP ruge y desata *Meteo Menor*. ¡Mantener a los aliados dispersos!
- **Terreno:** Las calderas de lava infligen daño de fuego si son empujados.

### 🗝️ Pistas y Secretos (Sly Flourish)
- [ ] [PISTA] El chamán goblin lleva un medallón con runas de teletransporte.
- [ ] [SECRETO] Si se apaga la fogata central, el Behemoth pierde su furia elemental.
- [ ] [MISTERIO] Los antiguos muros tienen inscripciones en lengua dracónica.

### 🎭 PNJs y Diálogos Clave
- **Rosa:** Conoce el punto débil de la armadura del Behemoth.
- **Cecil:** Busca redimir su juramento de paladín protegiendo a los caídos.

### 💰 Botín & Recompensas
- [ ] [BOTÍN] 140 Monedas de Oro y 2 Pociones de Curación Mayor.
- [ ] [BOTÍN] Colmillo de Behemoth (material para forjar arma encantada).
`;
