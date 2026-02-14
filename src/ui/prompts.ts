/**
 * Interactive prompts using Node.js readline
 * No external dependencies
 */

import * as readline from 'readline';

/**
 * Create a readline interface
 */
function createInterface(): readline.ReadLine {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for text input
 */
export async function promptText(message: string, defaultValue?: string): Promise<string> {
  const rl = createInterface();

  const prompt = defaultValue
    ? `${message} [${defaultValue}]: `
    : `${message}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const result = answer.trim() || defaultValue || '';
      resolve(result);
    });
  });
}

/**
 * Prompt for selection from a list of options
 */
export async function promptSelect(message: string, options: string[]): Promise<string> {
  if (options.length === 0) {
    throw new Error('No options provided for selection');
  }

  // Display options
  console.log(`\n${message}`);
  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option}`);
  });
  console.log('');

  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question('Select option (number): ', (answer) => {
      rl.close();

      const trimmed = answer.trim();

      // Check if it's a number
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        resolve(options[num - 1]);
        return;
      }

      // Check if it matches an option exactly
      const exactMatch = options.find(
        (opt) => opt.toLowerCase() === trimmed.toLowerCase()
      );
      if (exactMatch) {
        resolve(exactMatch);
        return;
      }

      // Default to first option if invalid
      console.log(`Invalid selection, defaulting to: ${options[0]}`);
      resolve(options[0]);
    });
  });
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(message: string, defaultValue?: boolean): Promise<boolean> {
  const defaultHint = defaultValue === true ? 'Y/n' : defaultValue === false ? 'y/N' : 'y/n';
  const prompt = `${message} [${defaultHint}]: `;

  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();

      const trimmed = answer.trim().toLowerCase();

      if (trimmed === '') {
        resolve(defaultValue ?? false);
        return;
      }

      if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true);
        return;
      }

      if (trimmed === 'n' || trimmed === 'no') {
        resolve(false);
        return;
      }

      // Default fallback
      resolve(defaultValue ?? false);
    });
  });
}

/**
 * Prompt for multiple selections from a list
 */
export async function promptMultiSelect(message: string, options: string[]): Promise<string[]> {
  if (options.length === 0) {
    return [];
  }

  // Display options
  console.log(`\n${message}`);
  console.log(muted('  (Enter comma-separated numbers or "all" for all)'));
  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option}`);
  });
  console.log('');

  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question('Select options: ', (answer) => {
      rl.close();

      const trimmed = answer.trim().toLowerCase();

      if (trimmed === 'all' || trimmed === '*') {
        resolve([...options]);
        return;
      }

      const selected: string[] = [];
      const parts = trimmed.split(/[,\s]+/);

      for (const part of parts) {
        if (part === '') continue;

        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= options.length) {
          const option = options[num - 1];
          if (!selected.includes(option)) {
            selected.push(option);
          }
          continue;
        }

        // Check exact match
        const exactMatch = options.find(
          (opt) => opt.toLowerCase() === part.toLowerCase()
        );
        if (exactMatch && !selected.includes(exactMatch)) {
          selected.push(exactMatch);
        }
      }

      resolve(selected);
    });
  });
}

/**
 * Prompt for password/input with masking
 */
export async function promptPassword(message: string): Promise<string> {
  const rl = createInterface();

  return new Promise((resolve) => {
    // Hide input
    process.stdout.write(`${message}: `);

    const stdin = process.stdin;
    const originalRawMode = stdin.isTTY ? stdin.setRawMode : null;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let password = '';

    const onData = (char: Buffer) => {
      const c = char.toString('utf8');

      switch (c) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          if (stdin.isTTY && originalRawMode) {
            stdin.setRawMode(false);
          }
          stdin.removeListener('data', onData);
          stdin.pause();
          rl.close();
          process.stdout.write('\n');
          resolve(password);
          break;

        case '\u0003': // Ctrl+C
          process.exit();

        case '\u007F': // Backspace
        case '\b':
          password = password.slice(0, -1);
          break;

        default:
          password += c;
          break;
      }
    };

    stdin.resume();
    stdin.on('data', onData);
  });
}

/**
 * Import muted for display
 */
function muted(text: string): string {
  // Use ANSI codes directly to avoid circular dependency issues
  return `\x1b[90m${text}\x1b[0m`;
}
