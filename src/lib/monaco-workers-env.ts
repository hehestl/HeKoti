/** Monaco workers — must run before any `monaco-editor` import (ESM hoist-safe). */
import { applyMonacoWorkersEnv } from "@/lib/monaco-workers-core";

applyMonacoWorkersEnv();
