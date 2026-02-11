
// Basic parser to try and extract Question/Answer pairs from raw text
export const parsePDFText = (text: string) => {
    // 1. Clean up and split lines
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions: { question: string; answer: string }[] = [];
    
    // Regex Patterns
    const numberedStartRegex = /^(\d+)[.:]\s+/; // "1. " or "1: "
    const explicitQRegex = /^(Q|Question)\s*\d*[:.]\s*/i;
    const explicitARegex = /^(A|Ans|Answer)\s*[:.]\s*/i;
    
    // State
    let currentBlock: string[] = [];
    
    // Helper to process a collected block of lines
    const processBlock = (blockLines: string[]) => {
        if (blockLines.length === 0) return;
        
        const fullText = blockLines.join(' ');
        
        // Strategy 1: Explicit "Answer:" or "A:" inside the block
        // We look for the last occurrence of an answer marker to split
        // This is tricky if it's not at the start of a line.
        // Let's assume if "Answer:" exists, the user likely used a format we support.
        
        // Strategy 2: Quizlet PDF style (Two columns text extraction)
        // Often extracted as: "1. Question Text... Answer Text"
        // We look for a significant whitespace gap if possible, but pdf-parse often trims.
        // If we can't find a clear separator, we might have to use heuristics or just dump it all in Q.
        
        // Let's try to find an explicit answer marker in the joined text first
        const splitMatch = fullText.match(/\s+(A|Ans|Answer)[:.]\s+/i);
        if (splitMatch && splitMatch.index) {
             const qPart = fullText.substring(0, splitMatch.index).trim();
             const aPart = fullText.substring(splitMatch.index + splitMatch[0].length).trim();
             if (qPart && aPart) {
                 questions.push({ question: qPart, answer: aPart });
                 return;
             }
        }
        
        // Strategy 3: Just simple splitting by double space (if pdf-parse kept them)
        // This is risky but useful for column layouts
        const parts = fullText.split(/\s{3,}/); // 3 or more spaces
        if (parts.length >= 2) {
            // Assume last part is answer, rest is question
            const aPart = parts.pop()!;
            const qPart = parts.join(' ');
            questions.push({ question: qPart, answer: aPart });
            return;
        }

        // Strategy 4: Fallback - Everything is the Question
        // We mark the answer as "Edit me" so data isn't lost
        questions.push({ question: fullText, answer: '[Answer not detected - please edit]' });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this line starts a new card
        if (numberedStartRegex.test(line) || explicitQRegex.test(line)) {
            // Process previous block
            processBlock(currentBlock);
            
            // Start new block
            // Remove the numbering for cleaner text
            const cleanedLine = line.replace(numberedStartRegex, '').replace(explicitQRegex, '').trim();
            currentBlock = [cleanedLine];
        } else if (explicitARegex.test(line)) {
            // Explicit Answer line found - add to current block but maybe mark it?
            // Actually, we can just add it. processBlock will handle the splitting if we add a marker.
            // Let's normalize it to ensure processBlock finds it.
            currentBlock.push("Answer: " + line.replace(explicitARegex, '').trim());
        } else {
            // Continuation of current block
            if (currentBlock.length > 0) {
                currentBlock.push(line);
            }
        }
    }

    // Process final block
    processBlock(currentBlock);

    return questions;
};
