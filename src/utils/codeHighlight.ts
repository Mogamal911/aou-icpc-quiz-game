import type { CodeLanguage } from '../types/game';

export interface Token {
  type:
    | 'keyword'
    | 'type'
    | 'string'
    | 'number'
    | 'comment'
    | 'preprocessor'
    | 'function'
    | 'operator'
    | 'punctuation'
    | 'plain';
  value: string;
}

export interface HighlightedLine {
  lineNumber: number;
  tokens: Token[];
}

const CPP_KEYWORDS = new Set([
  'auto', 'break', 'case', 'catch', 'class', 'const', 'constexpr', 'continue',
  'default', 'delete', 'do', 'else', 'enum', 'explicit', 'export', 'extern',
  'for', 'friend', 'goto', 'if', 'inline', 'mutable', 'namespace', 'new',
  'noexcept', 'operator', 'private', 'protected', 'public', 'register',
  'reinterpret_cast', 'return', 'sizeof', 'static', 'static_assert', 'static_cast',
  'struct', 'switch', 'template', 'this', 'throw', 'try', 'typedef', 'typeid',
  'typename', 'union', 'using', 'virtual', 'volatile', 'while', 'nullptr',
  'true', 'false', 'override', 'final',
]);

const CPP_TYPES = new Set([
  'int', 'long', 'short', 'char', 'float', 'double', 'void', 'bool',
  'unsigned', 'signed', 'size_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t',
  'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'string', 'vector', 'pair',
  'map', 'set', 'unordered_map', 'unordered_set', 'queue', 'priority_queue',
  'stack', 'deque', 'array', 'list', 'cin', 'cout', 'cerr', 'endl', 'std',
]);

const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline',
  'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof',
  'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while', '_Bool', '_Complex', '_Imaginary', 'NULL', 'true', 'false',
]);

const C_TYPES = new Set([
  'int', 'long', 'short', 'char', 'float', 'double', 'void', 'size_t',
  'FILE', 'printf', 'scanf', 'malloc', 'calloc', 'free', 'realloc', 'exit',
]);

const PYTHON_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield', 'True', 'False', 'None',
]);

const PYTHON_TYPES = new Set([
  'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'range',
  'len', 'print', 'input', 'min', 'max', 'sum', 'abs', 'enumerate', 'zip',
  'map', 'filter', 'sorted', 'reversed', 'open', 'type', 'self', 'super',
]);

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'default', 'do', 'else', 'enum', 'extends', 'final', 'finally', 'for', 'goto',
  'if', 'implements', 'import', 'instanceof', 'interface', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while', 'true', 'false', 'null', 'var', 'record',
]);

const JAVA_TYPES = new Set([
  'String', 'System', 'Integer', 'Double', 'Float', 'Boolean', 'Character',
  'Byte', 'Short', 'Long', 'Scanner', 'Math', 'Arrays', 'Collections',
  'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'StringBuilder',
  'Object', 'Exception', 'Override', 'int', 'double', 'float', 'boolean', 'char',
  'byte', 'short', 'long',
]);

export function highlightCode(code: string, language: CodeLanguage = 'cpp'): HighlightedLine[] {
  const normalized = code.replace(/\r\n/g, '\n');
  const rawLines = normalized.split('\n');

  let inBlockComment = false;

  const keywords =
    language === 'python'
      ? PYTHON_KEYWORDS
      : language === 'java'
      ? JAVA_KEYWORDS
      : language === 'c'
      ? C_KEYWORDS
      : CPP_KEYWORDS;

  const types =
    language === 'python'
      ? PYTHON_TYPES
      : language === 'java'
      ? JAVA_TYPES
      : language === 'c'
      ? C_TYPES
      : CPP_TYPES;

  return rawLines.map((line, idx) => {
    const tokens: Token[] = [];
    let i = 0;
    const len = line.length;

    // Handle ongoing multiline block comment
    if (inBlockComment) {
      const endCommentIdx = line.indexOf('*/');
      if (endCommentIdx !== -1) {
        tokens.push({ type: 'comment', value: line.substring(0, endCommentIdx + 2) });
        i = endCommentIdx + 2;
        inBlockComment = false;
      } else {
        tokens.push({ type: 'comment', value: line });
        return { lineNumber: idx + 1, tokens };
      }
    }

    // Preprocessor line check for C / C++ (#include, #define, etc.)
    if ((language === 'cpp' || language === 'c') && /^\s*#\w+/.test(line.substring(i))) {
      // Find comment if any on the same line
      const commentIdx = line.indexOf('//', i);
      if (commentIdx !== -1) {
        tokens.push({ type: 'preprocessor', value: line.substring(i, commentIdx) });
        tokens.push({ type: 'comment', value: line.substring(commentIdx) });
        return { lineNumber: idx + 1, tokens };
      } else {
        tokens.push({ type: 'preprocessor', value: line.substring(i) });
        return { lineNumber: idx + 1, tokens };
      }
    }

    while (i < len) {
      const ch = line[i];

      // 1. Python single-line comment
      if (language === 'python' && ch === '#') {
        tokens.push({ type: 'comment', value: line.substring(i) });
        break;
      }

      // 2. C / C++ / Java single-line or multi-line comment start
      if ((language === 'cpp' || language === 'c' || language === 'java') && ch === '/' && i + 1 < len) {
        if (line[i + 1] === '/') {
          tokens.push({ type: 'comment', value: line.substring(i) });
          break;
        }
        if (line[i + 1] === '*') {
          const endCommentIdx = line.indexOf('*/', i + 2);
          if (endCommentIdx !== -1) {
            tokens.push({ type: 'comment', value: line.substring(i, endCommentIdx + 2) });
            i = endCommentIdx + 2;
            continue;
          } else {
            inBlockComment = true;
            tokens.push({ type: 'comment', value: line.substring(i) });
            break;
          }
        }
      }

      // 3. String literals (double quote or single quote)
      if (ch === '"' || (ch === "'" && language === 'python') || (ch === "'" && (language === 'cpp' || language === 'c' || language === 'java'))) {
        const quoteChar = ch;
        let strVal = quoteChar;
        let j = i + 1;
        let escaped = false;
        while (j < len) {
          const curr = line[j];
          strVal += curr;
          if (!escaped && curr === quoteChar) {
            j++;
            break;
          }
          if (curr === '\\' && !escaped) {
            escaped = true;
          } else {
            escaped = false;
          }
          j++;
        }
        tokens.push({ type: 'string', value: strVal });
        i = j;
        continue;
      }

      // 4. Numbers (hex, binary, float, decimal)
      if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(line[i + 1]))) {
        const numMatch = line.substring(i).match(/^(0x[0-9a-fA-F]+|0b[01]+|\d+(\.\d+)?([eE][+-]?\d+)?[uUlLfF]*)/);
        if (numMatch) {
          tokens.push({ type: 'number', value: numMatch[0] });
          i += numMatch[0].length;
          continue;
        }
      }

      // 5. Word tokens (Identifiers, Keywords, Types, Function names)
      if (/[a-zA-Z_]/.test(ch)) {
        const wordMatch = line.substring(i).match(/^[a-zA-Z_]\w*/);
        if (wordMatch) {
          const word = wordMatch[0];
          const afterWord = line.substring(i + word.length).trimStart();
          const isFuncCall = afterWord.startsWith('(');

          if (keywords.has(word)) {
            tokens.push({ type: 'keyword', value: word });
          } else if (types.has(word)) {
            tokens.push({ type: 'type', value: word });
          } else if (isFuncCall) {
            tokens.push({ type: 'function', value: word });
          } else {
            tokens.push({ type: 'plain', value: word });
          }
          i += word.length;
          continue;
        }
      }

      // 6. Multi-character and single-character operators
      const opMatch = line.substring(i).match(/^(<<|>>|<=|>=|==|!=|&&|\|\||\+\+|--|\+=|-=|\*=|(?:\/)=|%=|->|::)/);
      if (opMatch) {
        tokens.push({ type: 'operator', value: opMatch[0] });
        i += opMatch[0].length;
        continue;
      }

      if ('+-*/%<>=!&|^~?:'.includes(ch)) {
        tokens.push({ type: 'operator', value: ch });
        i++;
        continue;
      }

      // 7. Punctuation & Brackets
      if ('{}()[].,;'.includes(ch)) {
        tokens.push({ type: 'punctuation', value: ch });
        i++;
        continue;
      }

      // 8. Plain / Whitespace characters
      tokens.push({ type: 'plain', value: ch });
      i++;
    }

    return {
      lineNumber: idx + 1,
      tokens,
    };
  });
}

export function getLanguageLabel(lang: CodeLanguage = 'cpp'): string {
  switch (lang) {
    case 'cpp':
      return 'C++';
    case 'c':
      return 'C';
    case 'python':
      return 'Python';
    case 'java':
      return 'Java';
    default:
      return 'C++';
  }
}

export function getLanguageFileExtension(lang: CodeLanguage = 'cpp'): string {
  switch (lang) {
    case 'cpp':
      return 'solution.cpp';
    case 'c':
      return 'program.c';
    case 'python':
      return 'main.py';
    case 'java':
      return 'Solution.java';
    default:
      return 'solution.cpp';
  }
}

