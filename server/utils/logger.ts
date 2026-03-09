import pino from "pino";
import pretty from "pino-pretty";

export const logger = pino(
  pretty({
    colorize: true,
    ignore: "pid,hostname",
    levelFirst: true,
    sync: false,
    translateTime: "HH:MM:ss",
  }),
);
