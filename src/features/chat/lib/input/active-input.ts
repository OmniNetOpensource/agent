type ActiveInput = {
  getValue: () => string;
  setValue: (v: string) => void;
  focus: () => void;
} | null;

let activeInput: ActiveInput = null;
let defaultInput: ActiveInput = null;

export const setActiveInput = (input: ActiveInput) => {
  activeInput = input;
};

export const setDefaultInput = (input: ActiveInput) => {
  defaultInput = input;
};

export const insertQuote = (text: string) => {
  const target = activeInput ?? defaultInput;
  if (!target) return;
  const quotedText = text.split('\n').map(line => `> ${line}`).join('\n') + '\n';
  const currentValue = target.getValue();
  target.setValue(quotedText + currentValue);
  target.focus();
};
