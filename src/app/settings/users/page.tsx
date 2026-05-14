import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui";
import { addUser, deleteUser } from "../actions";
import { DeleteUserButton } from "./DeleteUserButton";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Settings · Users" subtitle="Interní uživatelé. Role: admin / viewer." />
      <Section title="Přidat uživatele">
        <form action={addUser} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="label">Email</label>
            <input name="email" required className="input" placeholder="user@everbot.cz" />
          </div>
          <div>
            <label className="label">Jméno</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" defaultValue="viewer" className="input">
              <option value="admin">admin</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <button className="btn-primary">Uložit</button>
        </form>
      </Section>
      <Section title={`Uživatelé (${users.length})`}>
        <table className="table">
          <thead>
            <tr><th>Email</th><th>Jméno</th><th>Role</th><th>Aktivní</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-mono text-xs">{u.email}</td>
                <td>{u.name}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>{u.isActive ? "Ano" : "Ne"}</td>
                <td><DeleteUserButton id={u.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
