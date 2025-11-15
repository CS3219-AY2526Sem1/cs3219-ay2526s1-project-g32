// Simple logger
const formatMessage = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  info(message: string) {
    console.log(formatMessage('info', message));
  },
  warn(message: string) {
    console.warn(formatMessage('warn', message));
  },
  error(message: string, err?: unknown) {
    if (err instanceof Error) {
      console.error(formatMessage('error', `${message} -> ${err.message}`), err.stack);
    } else {
      console.error(formatMessage('error', message));
    }
  },
};
