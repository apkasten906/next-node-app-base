export function GET(): Response {
  return Response.json({ ok: true }, { status: 200 });
}
