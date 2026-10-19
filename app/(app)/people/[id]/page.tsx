import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerson } from "@/lib/people";
import { requireUser } from "@/lib/users";
import { Avatar } from "@/app/ui/avatar";
import { EditPerson } from "./edit-person";

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  return (
    <Suspense>
      <PersonView params={params} />
    </Suspense>
  );
}

async function PersonView({ params }: { params: PageProps<"/people/[id]">["params"] }) {
  const { id } = await params;
  const userId = await requireUser();
  const person = await getPerson(id, userId);
  if (!person) notFound();
  return (
    <div className="flex flex-col gap-8 pt-2">
      <Link href="/" className="self-start text-ink underline">
        All people
      </Link>
      <div className="flex items-center gap-4">
        <Avatar name={person.name} photo={person.photo} size={88} />
        <h1 className="min-w-0 flex-1 font-display text-3xl break-words text-deep-red">{person.name}</h1>
        <EditPerson person={{ id: person.id, name: person.name, photo: person.photo }} />
      </div>
      <p>No gifts yet</p>
    </div>
  );
}
