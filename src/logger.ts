/* eslint-disable no-console */
import kleur from 'kleur';
import ansi from 'sisteransi';

const SPINNERS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerTimeout: NodeJS.Timeout;

function load(text: string, first: boolean = true, nextSpinner: number = 0) {
  if (!first) {
    process.stdout.write(ansi.erase.lines(2));
  }
  console.log(`${kleur.cyan(SPINNERS[nextSpinner % SPINNERS.length])} ${text}...`);
  process.stdout.write(ansi.cursor.hide);
  clearTimeout(spinnerTimeout);
  spinnerTimeout = setTimeout(() => {
    load(text, false, (nextSpinner + 1) % SPINNERS.length);
  }, 80);
}

export const logger = {
  info: console.log,
  infoBold: (text: string) => console.log(kleur.bold(text)),
  success: (text: string) => console.log(kleur.green(`✔ ${text}`)),
  warn: (text: string) => console.log(kleur.yellow(`${kleur.bold('!')} ${text}`)),
  error: (text: unknown) => console.error(`${kleur.red('✖ Error:')} ${text}`),
  eraseLastRows: (n: number) => process.stdout.write(ansi.erase.lines(n)),
  startLoading: (text: string) => load(text),
  stopLoading: () => {
    if (spinnerTimeout) {
      clearTimeout(spinnerTimeout);
      process.stdout.write(ansi.erase.lines(2));
      process.stdout.write(ansi.cursor.show);
    }
  },
  clear: () => {
    clearTimeout(spinnerTimeout);
    process.stdout.write(ansi.cursor.show);
  },
};
