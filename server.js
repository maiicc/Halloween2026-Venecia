import express from "express";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const INTERVAL = Number(process.env.INTERVAL_SECONDS || 14400); // igual que Event.Interval
const MARKS = (process.env.MARKS || "3600,1800,600,60")
	.split(",").map(Number).sort((a, b) => b - a);
const PING = process.env.PING_ROLE_ID ? `<@&${process.env.PING_ROLE_ID}>` : undefined;

if (!WEBHOOK) throw new Error("Falta DISCORD_WEBHOOK_URL");

const app = express();

const sent = new Set(); // "timestamp:marca" ya avisados

const nowSec = () => Math.floor(Date.now() / 1000);
const nextSlot = (now) => (Math.floor(now / INTERVAL) + 1) * INTERVAL;

async function send(description, color = 0xff6a00) {
	const res = await fetch(WEBHOOK, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			content: PING,
			embeds: [{ title: "🧟 Invasión Zombie · Halloween", description, color }],
		}),
	});
	if (!res.ok) console.error("Discord respondió", res.status, await res.text());
}

async function tick() {
	const now = nowSec();
	const slot = nextSlot(now);

	for (const ts of [slot - INTERVAL, slot]) {
		const remaining = ts - now;

		// el evento acaba de empezar
		if (remaining <= 0 && remaining > -60) {
			const key = `${ts}:start`;
			if (!sent.has(key)) {
				sent.add(key);
				await send("🔦 **¡La invasión ha comenzado!** Entra y consigue kills.", 0xff2a2a);
			}
			continue;
		}
		if (remaining <= 0) continue;

		// si el servicio despertó tarde, manda un solo aviso en vez de uno por cada marca
		const due = MARKS.filter((m) => remaining <= m && !sent.has(`${ts}:${m}`));
		if (due.length === 0) continue;
		due.forEach((m) => sent.add(`${ts}:${m}`));
		await send(`⏳ La invasión empieza <t:${ts}:R> (<t:${ts}:t>).`);
	}

	if (sent.size > 500) sent.clear();
}

setInterval(() => tick().catch(console.error), 15_000);

app.get("/health", (_, res) => res.json({ ok: true, nextScheduled: nextSlot(nowSec()) }));

app.listen(process.env.PORT || 3000, () => console.log("Webhook listo"));
