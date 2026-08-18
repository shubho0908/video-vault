export function isOwnerEmail(candidateEmail: string | null | undefined, configuredOwnerEmail = process.env.OWNER_EMAIL) {
  const ownerEmail = configuredOwnerEmail?.trim().toLowerCase();
  return Boolean(ownerEmail && candidateEmail?.trim().toLowerCase() === ownerEmail);
}
