import { RibbonWrap } from "@/app/ui/ribbon-wrap";
import { SiteHeader } from "@/app/ui/site-header";

// Every signed-in page: the header, and the gift unwrapping on a full load.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <RibbonWrap mode="unwrap" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 pb-12">{children}</main>
    </>
  );
}
