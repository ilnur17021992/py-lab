// js/core/markdownParser.js - Zero-dependency Markdown & YAML Frontmatter Parser for Topics

/**
 * Parses YAML frontmatter between leading '---' markers.
 * Handles simple strings, quoted strings, and list items (- "item").
 * @param {string} rawText 
 * @returns {{ frontmatter: Record<string, any>, body: string }}
 */
export function parseFrontmatter(rawText) {
  const normalized = rawText.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: normalized };
  }

  const rawYaml = match[1];
  const body = match[2].trim();
  const frontmatter = {};

  let currentKey = null;

  for (const line of rawYaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for list item: "  - value"
    if (trimmed.startsWith('- ') && currentKey) {
      const val = cleanYamlValue(trimmed.slice(2));
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(val);
      continue;
    }

    // Check for key-value pair: "key: value" or "key:"
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      const rawVal = trimmed.slice(colonIdx + 1).trim();

      if (rawVal === '') {
        currentKey = key;
        frontmatter[key] = [];
      } else {
        currentKey = null;
        frontmatter[key] = cleanYamlValue(rawVal);
      }
    }
  }

  return { frontmatter, body };
}

function cleanYamlValue(str) {
  let val = str.trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    try {
      return JSON.parse(val);
    } catch {
      return val.slice(1, -1);
    }
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(Number(val)) && val !== '') return Number(val);
  return val;
}

/**
 * Parses full Topic Markdown into a structured Topic object compatible with topics.js.
 * @param {string} markdownText 
 * @returns {{
 *   id: string,
 *   title: string,
 *   category: string,
 *   icon: string,
 *   summary: string[],
 *   theory: string,
 *   examples: Array<{ title: string, desc: string, code: string }>
 * }}
 */
export function parseTopicMarkdown(markdownText) {
  const { frontmatter, body } = parseFrontmatter(markdownText);

  let theory = '';
  const examples = [];

  // Split body into sections: ## Теория vs ## Примеры кода
  const theoryHeaderRegex = /^##\s+(?:Теория|Theory)/im;
  const examplesHeaderRegex = /^##\s+(?:Примеры(?:\s+кода)?|Examples)/im;

  const examplesIndex = body.search(examplesHeaderRegex);

  let theorySection = '';
  let examplesSection = '';

  if (examplesIndex !== -1) {
    theorySection = body.slice(0, examplesIndex).trim();
    examplesSection = body.slice(examplesIndex).trim();
  } else {
    theorySection = body.trim();
  }

  // Remove the '## Теория' header line itself
  theory = theorySection.replace(theoryHeaderRegex, '').trim();

  // Parse examples section
  if (examplesSection) {
    // Remove the '## Примеры кода' header
    const cleanExamplesText = examplesSection.replace(examplesHeaderRegex, '').trim();

    // Each example starts with '### <Title>'
    const exampleBlocks = cleanExamplesText.split(/(?=^###\s+)/m);

    for (const block of exampleBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock.startsWith('###')) continue;

      const lines = trimmedBlock.split('\n');
      const title = lines[0].replace(/^###\s+/, '').trim();

      const remainingBlock = lines.slice(1).join('\n');

      // Extract code fence: ```python ... ```
      const codeMatch = remainingBlock.match(/```(?:python|py)?\n([\s\S]*?)\n```/);
      let code = '';
      let desc = '';

      if (codeMatch) {
        code = codeMatch[1];
        // Description is everything before the code block
        const descText = remainingBlock.slice(0, codeMatch.index).trim();
        desc = descText;
      } else {
        desc = remainingBlock.trim();
      }

      examples.push({
        title,
        desc,
        code
      });
    }
  }

  // Parse and normalize tags (supports YAML lists, inline arrays, comma-separated strings)
  let rawTags = [];
  if (Array.isArray(frontmatter.tags)) {
    rawTags = frontmatter.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  } else if (typeof frontmatter.tags === 'string') {
    const raw = frontmatter.tags.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          rawTags = parsed.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
        }
      } catch {
        rawTags = raw.slice(1, -1).split(',').map((t) => t.replace(/['"]/g, '').trim().toLowerCase()).filter(Boolean);
      }
    } else {
      rawTags = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
  }

  // Fallback: if no explicit tags provided, derive from category
  if (rawTags.length === 0 && frontmatter.category) {
    rawTags = [String(frontmatter.category).trim().toLowerCase()];
  }

  // Deduplicate tags while preserving order
  const tags = Array.from(new Set(rawTags));

  return {
    id: frontmatter.id || '',
    title: frontmatter.title || '',
    category: frontmatter.category || '',
    tags,
    icon: frontmatter.icon || '📘',
    summary: Array.isArray(frontmatter.summary) ? frontmatter.summary : [],
    theory,
    examples
  };
}
