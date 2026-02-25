import { sanitizeImportedTerms, type ImportedTerm } from '../utils/importSanitizer';

type SanitizerRequest = {
  terms: ImportedTerm[];
};

type SanitizerResponse = {
  terms: ImportedTerm[];
};

self.onmessage = (event: MessageEvent<SanitizerRequest>) => {
  try {
    const terms = Array.isArray(event.data?.terms) ? event.data.terms : [];
    const sanitized = sanitizeImportedTerms(
      terms.map((term) => ({
        term: typeof term.term === 'string' ? term.term : '',
        def: typeof term.def === 'string' ? term.def : '',
      })),
    );
    const response: SanitizerResponse = { terms: sanitized };
    self.postMessage(response);
  } catch {
    const fallback: SanitizerResponse = { terms: [] };
    self.postMessage(fallback);
  }
};
