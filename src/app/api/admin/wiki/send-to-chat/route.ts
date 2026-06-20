import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { forwardArticleToHekotiAgent, HeheChatForwardError } from "@/lib/hehe-chat-client";
import { isAdminRole } from "@/lib/user-role";
import { wikiPublicHref } from "@/lib/wiki-path";

type SendBody = {
  pageId?: string;
  title?: string;
  lang?: string;
  path?: string;
  slug?: string;
  contentMd?: string;
  isPublished?: boolean;
  updatedAt?: string;
};

function buildSourceId(pageId: string, lang: string, updatedAt: string): string {
  return `hekoti:page:${pageId}:${lang}:${updatedAt}`;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!sessionUser.heronSubjectId) {
    return NextResponse.json(
      { ok: false, code: "heron_required", message: "Heron login required." },
      { status: 401 },
    );
  }

  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const pageId = typeof body.pageId === "string" ? body.pageId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const lang = typeof body.lang === "string" ? body.lang.trim() : "";
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const contentMd = typeof body.contentMd === "string" ? body.contentMd : "";
  const isPublished = body.isPublished === true;
  const updatedAt =
    typeof body.updatedAt === "string" && body.updatedAt.trim()
      ? body.updatedAt.trim()
      : new Date().toISOString();

  if (!pageId || !title || !lang || !path) {
    return NextResponse.json({ ok: false, message: "Missing required fields." }, { status: 400 });
  }

  const appUrl = env.APP_URL.replace(/\/$/, "");
  const publicPath = wikiPublicHref(lang, path);
  const publicUrl = `${appUrl}${publicPath}`;

  try {
    const result = await forwardArticleToHekotiAgent({
      hehestlUserId: sessionUser.heronSubjectId,
      sourceId: buildSourceId(pageId, lang, updatedAt),
      title,
      lang,
      path,
      slug,
      publicUrl,
      contentMd,
      updatedAt,
      isPublished,
      senderDisplayName: sessionUser.email,
    });

    return NextResponse.json({
      ok: true,
      roomId: result.roomId,
      messengerUrl: result.messengerUrl,
    });
  } catch (e) {
    if (e instanceof HeheChatForwardError) {
      const status = e.code === "chat_account_required" ? 409 : e.status;
      return NextResponse.json(
        { ok: false, code: e.code, message: e.message },
        { status },
      );
    }
    return NextResponse.json({ ok: false, message: "Forward failed." }, { status: 500 });
  }
}
