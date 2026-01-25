import pino from "pino";
import pretty from "pino-pretty";

export const logger = pino(
  pretty({
    colorize: true,
    levelFirst: true,
    translateTime: "HH:MM:ss",
    ignore: "pid,hostname"
  })
);
