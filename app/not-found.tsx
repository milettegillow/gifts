import Link from "next/link";
import { RibbonHeader } from "@/app/ui/ribbon-header";
import { linkButtonClass } from "@/app/ui/styles";

export default function NotFound() {
  return (
    <>
      <RibbonHeader />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-start gap-5 px-4 pb-12">
        <h1 className="font-display text-3xl text-deep-red">Page not found</h1>
        <Link href="/" className={linkButtonClass}>
          Back to Giftbook
        </Link>
      </main>
    </>
  );
}
