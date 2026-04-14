#!/usr/bin/env node
import fs from "node:fs";
import { planFromIntent } from "./planner.js";
import { listActions } from "./actions.js";
import { executePlan } from "./executor.js";
import { createAdapter, listAdapters } from "./adapters/index.js";

function parseArgs(argv) {
  const cmd = argv[0];
  const options = {
    execute: false,
    continueOnError: false,
    json: false,
    short: false,
    file: null,
    category: null,
    batch: null,
    adapter: "showcontrol-osc"
  };

  const intentParts = [];

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--execute") options.execute = true;
    else if (a === "--continue-on-error") options.continueOnError = true;
    else if (a === "--json") options.json = true;
    else if (a === "--short") options.short = true;
    else if (a === "--file") options.file = argv[++i] ?? null;
    else if (a === "--category") options.category = argv[++i] ?? null;
    else if (a === "--batch") options.batch = argv[++i] ?? null;
    else if (a === "--adapter") options.adapter = argv[++i] ?? "showcontrol-osc";
    else if (!a.startsWith("--")) intentParts.push(a);
  }

  return {
    cmd,
    intent: intentParts.join(" ").trim(),
    ...options
  };
}

function print(data, asJson = false) {
  if (asJson) return console.log(JSON.stringify(data, null, 2));
  if (typeof data === "string") return console.log(data);
  console.log(JSON.stringify(data, null, 2));
}

function renderHelp() {
  return `live-agent-cli

Usage:
  live-agent help
  live-agent plan "<intent>" [--json]
  live-agent run "<intent>" [--execute] [--continue-on-error]
  live-agent run --file <plan.json> [--execute]
  live-agent actions [--json] [--short] [--category <name>] [--batch <n>]
  live-agent adapters
  live-agent run ... [--adapter <showcontrol-osc|max4live>]

Commands:
  help       Show CLI help and examples
  plan       Convert natural language to a structured action plan
  run        Execute (or dry-run) a plan from intent or file
  actions    List available action functions
  adapters   List available adapter backends

Examples:
  live-agent actions --short
  live-agent actions --category transport
  live-agent actions --batch 2
  live-agent plan "create scene then fire scene 1"
  live-agent run "make a new midi track and play" --execute
  live-agent adapters
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.cmd || ["-h", "--help", "help"].includes(args.cmd)) {
    print(renderHelp());
    return;
  }

  if (args.cmd === "adapters") {
    return print({ adapters: listAdapters() }, args.json);
  }

  if (args.cmd === "actions") {
    const actions = listActions({ category: args.category, batch: args.batch });
    if (args.short) {
      return print(actions.map((a) => `/${a.action}`).join("\n"));
    }
    return print({ actions }, args.json);
  }

  if (args.cmd === "plan") {
    if (!args.intent) throw new Error("Missing intent text");
    const plan = planFromIntent(args.intent, args.adapter);
    print(plan, args.json);
    return;
  }

  if (args.cmd === "run") {
    const adapter = createAdapter(args.adapter);
    let plan;

    if (args.file) {
      plan = JSON.parse(fs.readFileSync(args.file, "utf8"));
    } else {
      if (!args.intent) throw new Error("Missing intent text or --file");
      plan = planFromIntent(args.intent, args.adapter);
    }

    const result = await executePlan(plan, adapter, {
      execute: args.execute,
      continueOnError: args.continueOnError
    });

    print({ plan, result }, args.json);
    process.exit(result.ok ? 0 : 1);
  }

  throw new Error(`Unknown command: ${args.cmd}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
