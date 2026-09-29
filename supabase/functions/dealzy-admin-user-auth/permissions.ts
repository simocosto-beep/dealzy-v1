export function targetActionDenied(
  callerRole: string,
  targetRole: string,
  isSelf: boolean,
  action: string,
): string | null {
  if (targetRole === "superadmin") return "Protected superadmin account";
  if (callerRole !== "superadmin" && ["admin", "viewer"].includes(targetRole)) {
    return "Admins can only manage normal users";
  }
  if (isSelf && action === "set_status") return "You cannot change your own account status";
  if (action === "set_password" && callerRole !== "superadmin") return "Superadmin required";
  return null;
}
