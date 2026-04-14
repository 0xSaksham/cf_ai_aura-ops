import { Hono } from "hono";
import { IncidentDO } from "./incidentDO";
import { Env } from "./types";

export { IncidentDO };

const app = new Hono<{ Bindings: Env }>();

// Simple Health Check
app.get("/health", (c) => c.text("OK"));

// Pure Pass-through for Ingest
app.post("/ingest/:service", async (c) => {
  const service = c.req.param("service");
  const id = c.env.INCIDENT_ENGINE.idFromName(service);
  const stub = c.env.INCIDENT_ENGINE.get(id);
  return await stub.fetch(c.req.raw);
});

// Pure Pass-through for Chat
app.post("/chat/:service", async (c) => {
  const service = c.req.param("service");
  const id = c.env.INCIDENT_ENGINE.idFromName(service);
  const stub = c.env.INCIDENT_ENGINE.get(id);
  return await stub.fetch(c.req.raw);
});

// Pure Pass-through for Status
app.get("/status/:service", async (c) => {
  const service = c.req.param("service");
  const id = c.env.INCIDENT_ENGINE.idFromName(service);
  const stub = c.env.INCIDENT_ENGINE.get(id);
  return await stub.fetch(c.req.raw);
});

app.get("/", (c) => {
  return c.text(
    "Aura-Ops Engine is running. Use /ingest/:service, /status/:service, or /chat/:service",
  );
});

export default app;
