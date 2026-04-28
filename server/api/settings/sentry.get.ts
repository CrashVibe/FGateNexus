import { defineEventHandler } from "h3";

import { configManager } from "../../utils/config";

export default defineEventHandler((_event) => configManager.config.sentry);
