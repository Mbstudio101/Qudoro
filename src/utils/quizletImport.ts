
export const parseQuizletHTML = (html: string) => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Strategy 1: Look for __NEXT_DATA__
    const nextDataScript = doc.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const json = JSON.parse(nextDataScript.textContent || '{}');
        // Traverse to find terms. This is tricky as structure changes.
        // We look for any object that looks like a term list.
        const terms = findTermsInObject(json);
        const title = findTitleInObject(json) || 'Imported Quizlet Set';
        
        if (terms.length > 0) {
          return { title, terms };
        }
      } catch (e) {
        console.warn('Failed to parse NEXT_DATA:', e);
      }
    }

    // Strategy 2: Class scraping (Fallback)
    const terms: { term: string; definition: string }[] = [];
    
    // Try multiple selector patterns used by Quizlet over the years
    const rowSelectors = [
        '.SetPageTerms-term',
        '.StudiableItem',
        '.TermRows-termRow',
        'div[aria-label="Term"]'
    ];

    let rows: NodeListOf<Element> | never[] = [];
    for (const selector of rowSelectors) {
        const found = doc.querySelectorAll(selector);
        if (found.length > 0) {
            rows = found;
            break;
        }
    }
    
    if (rows.length > 0) {
        rows.forEach(row => {
            // Try multiple word/def selectors
            const wordSelectors = ['.SetPageTerm-wordText', '.TermText', '.StudiableItem-term', '.TermContent-side--word'];
            const defSelectors = ['.SetPageTerm-definitionText', '.DefinitionText', '.StudiableItem-definition', '.TermContent-side--definition'];

            let word = '';
            let def = '';

            for (const s of wordSelectors) {
                const el = row.querySelector(s);
                if (el && el.textContent) {
                    word = el.textContent;
                    break;
                }
            }

            for (const s of defSelectors) {
                const el = row.querySelector(s);
                if (el && el.textContent) {
                    def = el.textContent;
                    break;
                }
            }

            if (word && def) {
                terms.push({ term: word, definition: def });
            }
        });
        
        if (terms.length > 0) {
            const title = doc.querySelector('title')?.textContent?.split('|')[0].trim() || 'Imported Set';
            return { title, terms };
        }
    }
    
    // Strategy 3: Regex match for window.Quizlet.setPageData
    // Sometimes data is in window.Quizlet = { ... }
    const scriptContent = Array.from(doc.scripts).find(s => s.textContent?.includes('window.Quizlet.setPageData'))?.textContent;
    if (scriptContent) {
        const match = scriptContent.match(/window\.Quizlet\.setPageData\s*=\s*({.*});/);
        if (match && match[1]) {
            const data = JSON.parse(match[1]);
            if (data.termIdToTermsMap) {
                const extractedTerms = Object.values(data.termIdToTermsMap).map((t: any) => ({
                    term: t.word,
                    definition: t.definition
                }));
                return { title: data.set.title || 'Imported Set', terms: extractedTerms };
            }
        }
    }

    // Strategy 4: JSON-LD (Schema.org)
    // Quizlet often includes a script type="application/ld+json" with the set data
    const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(ldScripts)) {
        try {
            const json = JSON.parse(script.textContent || '{}');
            // Look for @type: "LearningResource" or similar that contains "hasPart"
            if (json['@type'] === 'LearningResource' && Array.isArray(json.hasPart)) {
                 const terms = json.hasPart.map((part: any) => ({
                     term: part.name || '',
                     definition: part.text || ''
                 })).filter((t: any) => t.term && t.definition);
                 
                 if (terms.length > 0) {
                     return { title: json.name || 'Imported Set', terms };
                 }
            }
        } catch (e) {
            console.warn('Failed to parse JSON-LD:', e);
        }
    }

    return null;

  } catch (error) {
    console.error('Error parsing Quizlet HTML:', error);
    return null;
  }
};

// Helper to deeply search for terms array in unknown JSON structure
const findTermsInObject = (obj: any): { term: string; definition: string }[] => {
  if (!obj || typeof obj !== 'object') return [];

  // Check if this object looks like a term
  // Quizlet terms usually have 'word', 'definition', and 'id'
  if (Array.isArray(obj)) {
    // Check first element
    if (obj.length > 0 && obj[0] && typeof obj[0] === 'object' && 'word' in obj[0] && 'definition' in obj[0]) {
      return obj.map((t: any) => ({ term: t.word, definition: t.definition }));
    }
    
    // Recurse into array
    for (const item of obj) {
      const found = findTermsInObject(item);
      if (found.length > 0) return found;
    }
  }

  // Recurse into object values
  for (const key in obj) {
    // Optimization: Skip obviously irrelevant keys
    if (key === 'terms' || key === 'studiableItems') { 
        // These keys are promising
        if (Array.isArray(obj[key])) {
             const found = findTermsInObject(obj[key]);
             if (found.length > 0) return found;
        }
    }
    
    const found = findTermsInObject(obj[key]);
    if (found.length > 0) return found;
  }

  return [];
};

const findTitleInObject = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.set && obj.set.title) return obj.set.title;
    if (obj.title && typeof obj.title === 'string') return obj.title;
    
    for (const key in obj) {
        const found = findTitleInObject(obj[key]);
        if (found) return found;
    }
    return null;
}
