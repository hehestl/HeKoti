import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, isValidEmail } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let body: { currentPassword?: string; newEmail?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newEmailRaw = body.newEmail;
  const newPasswordRaw = body.newPassword;

  if (!currentPassword) {
    return NextResponse.json({ ok: false, message: "Current password is required." }, { status: 400 });
  }

  const full = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!full) {
    return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  }

  if (!full.passwordHash) {
    return NextResponse.json({ ok: false, message: "Password login is not available for this account." }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, full.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "Wrong current password." }, { status: 401 });
  }

  const newEmail =
    typeof newEmailRaw === "string"
      ? newEmailRaw.trim()
      : newEmailRaw === undefined || newEmailRaw === null
        ? ""
        : String(newEmailRaw).trim();
  const newPassword = typeof newPasswordRaw === "string" ? newPasswordRaw : "";

  if (!newEmail && !newPassword) {
    return NextResponse.json({ ok: false, message: "Enter a new login or new password." }, { status: 400 });
  }

  // Validate new email format if provided
  if (newEmail && !isValidEmail(newEmail)) {
    return NextResponse.json({ ok: false, message: "Invalid email format." }, { status: 400 });
  }

  // Validate password length and complexity
  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, message: "New password must be at least 8 characters." }, { status: 400 });
    }
    // Check for minimum complexity (at least one letter and one number)
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ ok: false, message: "New password must contain at least one letter and one number." }, { status: 400 });
    }
  }

  if (newEmail && newEmail !== full.email) {
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) {
      return NextResponse.json({ ok: false, message: "This login is already in use." }, { status: 409 });
    }
  }

  const data: { email?: string; passwordHash?: string } = {};
  if (newEmail && newEmail !== full.email) {
    data.email = newEmail;
  }
  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, message: "Nothing to change." });
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data,
  });

  if (data.passwordHash) {
    await prisma.session.deleteMany({ where: { userId: sessionUser.id } });
    return NextResponse.json({
      ok: true,
      relogin: true,
      message: "Password changed. Sign in again.",
    });
  }

  return NextResponse.json({ ok: true, message: "Login updated." });
}
