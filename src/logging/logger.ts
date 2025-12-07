import winston, { type LeveledLogMethod } from "winston";

export type Logger = Awaited<ReturnType<typeof createLogger>>;

export const createLogger = async () => {
  const logger = winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });

  const info: LeveledLogMethod = logger.info.bind(logger);
  const warn: LeveledLogMethod = logger.warn.bind(logger);
  const error: LeveledLogMethod = logger.error.bind(logger);
  const debug: LeveledLogMethod = logger.debug.bind(logger);

  return {
    info,
    warn,
    error,
    debug,
  };
};
