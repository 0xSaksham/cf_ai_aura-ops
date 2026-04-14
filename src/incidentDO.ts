import { DurableObject } from "cloudflare:workers";
import { Incident, LogEntry, Env } from "./types";

export class IncidentDO extends DurableObject<Env> {
  private logs: LogEntry[] = [];
  private incident: Incident | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Load state from storage on wake-up
    this.ctx.blockConcurrencyWhile(async () => {
      this.logs = (await this.ctx.storage.get<LogEntry[]>("logs")) || [];
      this.incident =
        (await this.ctx.storage.get<Incident>("incident")) || null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CHAT
    if (url.pathname.startsWith("/chat")) {
      try {
        const body = await request.json<{ message: string }>();
        const context = JSON.stringify(this.logs.slice(-10));

        const result = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          prompt: `System Logs: ${context}\nUser Question: ${body.message}\nAnswer as an SRE assistant.`,
        });
        return Response.json({ response: result.response });
      } catch (e) {
        return Response.json(
          {
            response:
              "I couldn't process that request. Ensure you are sending JSON with a 'message' field.",
          },
          { status: 400 },
        );
      }
    }

    // INGEST
    if (url.pathname.startsWith("/ingest")) {
      const log = await request.json<LogEntry>();
      this.logs.push({ ...log, timestamp: Date.now() });
      if (this.logs.length > 50) this.logs.shift();

      await this.ctx.storage.put("logs", this.logs);

      const errorLogs = this.logs.filter((l) => l.level === "error");
      if (errorLogs.length > 5 && !this.incident) {
        // Simple analysis logic
        this.incident = {
          status: "active",
          count: errorLogs.length,
          last_seen: new Date().toISOString(),
          analysis: "AI Analysis triggered via automated workflow.",
        };
        await this.ctx.storage.put("incident", this.incident);
      }
      return Response.json({ status: "ok", incident: this.incident });
    }

    // STATUS
    if (url.pathname.startsWith("/status")) {
      return Response.json({ logs: this.logs, incident: this.incident });
    }

    return new Response("Not Found", { status: 404 });
  }
}
